import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// ─── Get booking by lead ──────────────────────────────────────────────────────

export const getBookingByLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { leadId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }
    res.json({ success: true, data: booking });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Create booking ───────────────────────────────────────────────────────────

export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      leadId, travelerName, numberOfTravelers, aadharNumber,
      foodPreference, roomSharing, departureLocation, departurePackage,
      tourType, specialRequest, finalPrice, amountPaid, balanceDueDate,
    } = req.body;

    if (!leadId) { res.status(400).json({ success: false, error: 'leadId is required' }); return; }
    if (!travelerName?.trim()) { res.status(400).json({ success: false, error: 'Traveler name is required' }); return; }
    if (!numberOfTravelers || isNaN(Number(numberOfTravelers))) { res.status(400).json({ success: false, error: 'Number of travelers is required' }); return; }
    if (finalPrice === undefined || isNaN(Number(finalPrice))) { res.status(400).json({ success: false, error: 'Final price is required' }); return; }

    const paid = Number(amountPaid ?? 0);
    const price = Number(finalPrice);
    const balance = Math.max(0, price - paid);

    // Confirm the lead status at the same time
    const [booking] = await prisma.$transaction([
      prisma.booking.upsert({
        where: { leadId },
        create: {
          leadId,
          organizationId: orgId(req),
          travelerName: travelerName.trim(),
          numberOfTravelers: Number(numberOfTravelers),
          aadharNumber: aadharNumber?.trim() || null,
          foodPreference: foodPreference || 'NO_PREFERENCE',
          roomSharing: roomSharing || 'DOUBLE',
          departureLocation: departureLocation?.trim() || null,
          departurePackage: departurePackage?.trim() || null,
          tourType: tourType || 'GIT',
          specialRequest: specialRequest?.trim() || null,
          finalPrice: price,
          amountPaid: paid,
          balanceAmount: balance,
          balanceDueDate: balanceDueDate ? new Date(balanceDueDate) : null,
        },
        update: {
          travelerName: travelerName.trim(),
          numberOfTravelers: Number(numberOfTravelers),
          aadharNumber: aadharNumber?.trim() || null,
          foodPreference: foodPreference || 'NO_PREFERENCE',
          roomSharing: roomSharing || 'DOUBLE',
          departureLocation: departureLocation?.trim() || null,
          departurePackage: departurePackage?.trim() || null,
          tourType: tourType || 'GIT',
          specialRequest: specialRequest?.trim() || null,
          finalPrice: price,
          amountPaid: paid,
          balanceAmount: balance,
          balanceDueDate: balanceDueDate ? new Date(balanceDueDate) : null,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        action: 'Lead Confirmed',
        details: `Booking created — ${numberOfTravelers} traveler(s), ₹${price.toLocaleString()} finalised`,
        userId: req.user!.id,
        leadId,
      },
    });

    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    console.error('[bookings] createBooking error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Update booking ───────────────────────────────────────────────────────────

export const updateBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.booking.findFirst({
      where: { id, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!existing) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const {
      travelerName, numberOfTravelers, aadharNumber,
      foodPreference, roomSharing, departureLocation, departurePackage,
      tourType, specialRequest, finalPrice, amountPaid, balanceDueDate, status,
    } = req.body;

    const price = finalPrice !== undefined ? Number(finalPrice) : existing.finalPrice;
    const paid = amountPaid !== undefined ? Number(amountPaid) : existing.amountPaid;
    const balance = Math.max(0, price - paid);

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        travelerName: travelerName?.trim() ?? existing.travelerName,
        numberOfTravelers: numberOfTravelers !== undefined ? Number(numberOfTravelers) : existing.numberOfTravelers,
        aadharNumber: aadharNumber !== undefined ? aadharNumber?.trim() || null : existing.aadharNumber,
        foodPreference: foodPreference ?? existing.foodPreference,
        roomSharing: roomSharing ?? existing.roomSharing,
        departureLocation: departureLocation !== undefined ? departureLocation?.trim() || null : existing.departureLocation,
        departurePackage: departurePackage !== undefined ? departurePackage?.trim() || null : existing.departurePackage,
        tourType: tourType ?? existing.tourType,
        specialRequest: specialRequest !== undefined ? specialRequest?.trim() || null : existing.specialRequest,
        finalPrice: price,
        amountPaid: paid,
        balanceAmount: balance,
        balanceDueDate: balanceDueDate !== undefined ? (balanceDueDate ? new Date(balanceDueDate) : null) : existing.balanceDueDate,
        status: status ?? existing.status,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'Booking Updated',
        details: `Booking details updated by ${req.user?.name}`,
        userId: req.user!.id,
        leadId: existing.leadId,
      },
    });

    res.json({ success: true, data: booking });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
