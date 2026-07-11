import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { generateTasksFromItinerary } from './bookingTask.controller.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// ─── Get booking by lead ──────────────────────────────────────────────────────

export const getBookingByLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { leadId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
      include: {
        package: { select: { id: true, name: true, code: true, nights: true, days: true } },
        payments: {
          include: { recordedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: [{ dueDate: 'asc' }],
        },
      },
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
      packageId, departureDate, returnDate, bookingNotes,
    } = req.body;

    if (!leadId) { res.status(400).json({ success: false, error: 'leadId is required' }); return; }
    if (!travelerName?.trim()) { res.status(400).json({ success: false, error: 'Traveler name is required' }); return; }
    if (!numberOfTravelers || isNaN(Number(numberOfTravelers))) { res.status(400).json({ success: false, error: 'Number of travelers is required' }); return; }
    if (finalPrice === undefined || isNaN(Number(finalPrice))) { res.status(400).json({ success: false, error: 'Final price is required' }); return; }

    const paid = Number(amountPaid ?? 0);
    const price = Number(finalPrice);
    const balance = Math.max(0, price - paid);
    const depDate = departureDate ? new Date(departureDate) : null;

    // Auto-generate booking number: BKG-YYYYMMDD-XXXX
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `BKG-${datePart}-${rand}`;

    const [booking] = await prisma.$transaction([
      prisma.booking.upsert({
        where: { leadId },
        create: {
          leadId,
          organizationId: orgId(req),
          bookingNumber,
          packageId: packageId || null,
          travelerName: travelerName.trim(),
          numberOfTravelers: Number(numberOfTravelers),
          aadharNumber: aadharNumber?.trim() || null,
          foodPreference: foodPreference || 'NO_PREFERENCE',
          roomSharing: roomSharing || 'DOUBLE',
          departureLocation: departureLocation?.trim() || null,
          departurePackage: departurePackage?.trim() || null,
          tourType: tourType || 'GIT',
          specialRequest: specialRequest?.trim() || null,
          bookingNotes: bookingNotes?.trim() || null,
          finalPrice: price,
          amountPaid: paid,
          balanceAmount: balance,
          balanceDueDate: balanceDueDate ? new Date(balanceDueDate) : null,
          departureDate: depDate,
          returnDate: returnDate ? new Date(returnDate) : null,
        },
        update: {
          packageId: packageId !== undefined ? packageId || null : undefined,
          travelerName: travelerName.trim(),
          numberOfTravelers: Number(numberOfTravelers),
          aadharNumber: aadharNumber?.trim() || null,
          foodPreference: foodPreference || 'NO_PREFERENCE',
          roomSharing: roomSharing || 'DOUBLE',
          departureLocation: departureLocation?.trim() || null,
          departurePackage: departurePackage?.trim() || null,
          tourType: tourType || 'GIT',
          specialRequest: specialRequest?.trim() || null,
          bookingNotes: bookingNotes?.trim() || null,
          finalPrice: price,
          amountPaid: paid,
          balanceAmount: balance,
          balanceDueDate: balanceDueDate ? new Date(balanceDueDate) : null,
          departureDate: depDate,
          returnDate: returnDate ? new Date(returnDate) : null,
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    // Record advance payment if provided
    if (paid > 0) {
      await (prisma as any).payment.create({
        data: {
          bookingId: booking.id,
          amount: paid,
          type: 'ADVANCE',
          method: 'CASH',
          notes: 'Initial payment at booking',
          recordedById: req.user!.id,
        },
      });
    }

    // Auto-generate tasks from package itinerary if package + departure date provided
    if (packageId && depDate) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } });
      await generateTasksFromItinerary(booking.id, packageId, depDate, lead?.assignedToId ?? undefined).catch(console.error);
    }

    // Create notification for lead assignee
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { assignedToId: true } });
    if (lead?.assignedToId) {
      await prisma.notification.create({
        data: {
          type: 'LEAD_STATUS_CHANGED',
          title: 'Booking Confirmed',
          message: `Booking ${bookingNumber} created — ${numberOfTravelers} traveler(s), ₹${price.toLocaleString()}`,
          userId: lead.assignedToId,
          leadId,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        action: 'Lead Confirmed',
        details: `Booking ${bookingNumber} created — ${numberOfTravelers} traveler(s), ₹${price.toLocaleString()} finalised`,
        userId: req.user!.id,
        leadId,
      },
    });

    // Return the full booking with relations
    const fullBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        package: { select: { id: true, name: true, code: true } },
        payments: { include: { recordedBy: { select: { id: true, name: true } } } },
        tasks: { orderBy: [{ dueDate: 'asc' }] },
      },
    });

    res.status(201).json({ success: true, data: fullBooking });
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
      tourType, specialRequest, bookingNotes, finalPrice, amountPaid,
      balanceDueDate, status, packageId, departureDate, returnDate,
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
        bookingNotes: bookingNotes !== undefined ? bookingNotes?.trim() || null : existing.bookingNotes,
        finalPrice: price,
        amountPaid: paid,
        balanceAmount: balance,
        balanceDueDate: balanceDueDate !== undefined ? (balanceDueDate ? new Date(balanceDueDate) : null) : existing.balanceDueDate,
        status: status ?? existing.status,
        packageId: packageId !== undefined ? packageId || null : existing.packageId,
        departureDate: departureDate !== undefined ? (departureDate ? new Date(departureDate) : null) : existing.departureDate,
        returnDate: returnDate !== undefined ? (returnDate ? new Date(returnDate) : null) : existing.returnDate,
      },
      include: {
        package: { select: { id: true, name: true, code: true } },
        payments: { include: { recordedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        tasks: { include: { assignee: { select: { id: true, name: true } } }, orderBy: [{ dueDate: 'asc' }] },
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
