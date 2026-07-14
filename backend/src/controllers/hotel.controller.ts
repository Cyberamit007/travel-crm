import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { emitOperationsUpdated, notifyOperationsTeam } from '../services/notification.service.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

async function assertDepartureAccess(req: AuthenticatedRequest, departureId: string) {
  const departure = await prisma.departure.findFirst({
    where: { id: departureId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
  });
  return departure;
}

export const createHotel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const departure = await assertDepartureAccess(req, departureId);
    if (!departure) { res.status(404).json({ success: false, error: 'Departure not found' }); return; }

    const { name, location, checkInDate, checkOutDate, numberOfRooms, roomAllocation, vendorName, vendorContact, confirmationNumber, status } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Hotel name is required' }); return; }

    const hotel = await prisma.hotel.create({
      data: {
        departureId,
        name: name.trim(),
        location: location?.trim() || null,
        checkInDate: checkInDate ? new Date(checkInDate) : null,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : null,
        numberOfRooms: numberOfRooms !== undefined && numberOfRooms !== '' ? Number(numberOfRooms) : null,
        roomAllocation: roomAllocation?.trim() || null,
        vendorName: vendorName?.trim() || null,
        vendorContact: vendorContact?.trim() || null,
        confirmationNumber: confirmationNumber?.trim() || null,
        status: status || 'PENDING',
      },
    });

    await prisma.activityLog.create({
      data: { action: 'Hotel Added', details: `Hotel "${hotel.name}" added for ${departure.destination}`, entityType: 'HOTEL', entityId: hotel.id, userId: req.user!.id },
    });
    emitOperationsUpdated(departureId);

    res.status(201).json({ success: true, data: hotel });
  } catch (e) {
    console.error('[operations] createHotel error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateHotel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.hotel.findUnique({ where: { id }, include: { departure: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Hotel not found' }); return; }
    if (orgId(req) && existing.departure.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Hotel not found' }); return; }

    const b = req.body;
    const wasPending = existing.status === 'PENDING';
    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        name: b.name !== undefined ? String(b.name).trim() : existing.name,
        location: b.location !== undefined ? b.location?.trim() || null : existing.location,
        checkInDate: b.checkInDate !== undefined ? (b.checkInDate ? new Date(b.checkInDate) : null) : existing.checkInDate,
        checkOutDate: b.checkOutDate !== undefined ? (b.checkOutDate ? new Date(b.checkOutDate) : null) : existing.checkOutDate,
        numberOfRooms: b.numberOfRooms !== undefined ? (b.numberOfRooms === '' || b.numberOfRooms === null ? null : Number(b.numberOfRooms)) : existing.numberOfRooms,
        roomAllocation: b.roomAllocation !== undefined ? b.roomAllocation?.trim() || null : existing.roomAllocation,
        vendorName: b.vendorName !== undefined ? b.vendorName?.trim() || null : existing.vendorName,
        vendorContact: b.vendorContact !== undefined ? b.vendorContact?.trim() || null : existing.vendorContact,
        confirmationNumber: b.confirmationNumber !== undefined ? b.confirmationNumber?.trim() || null : existing.confirmationNumber,
        status: b.status ?? existing.status,
        voucherUrl: b.voucherUrl !== undefined ? b.voucherUrl : existing.voucherUrl,
      },
    });

    await prisma.activityLog.create({
      data: { action: 'Hotel Updated', details: `Hotel "${hotel.name}" updated by ${req.user?.name}`, entityType: 'HOTEL', entityId: id, userId: req.user!.id },
    });
    emitOperationsUpdated(existing.departureId);
    if (wasPending && hotel.status === 'CONFIRMED') {
      await notifyOperationsTeam(existing.departure.organizationId, 'HOTEL_CONFIRMED', 'Hotel Confirmed', `Hotel "${hotel.name}" confirmed for ${existing.departure.destination}`, existing.departureId);
    }

    res.json({ success: true, data: hotel });
  } catch (e) {
    console.error('[operations] updateHotel error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteHotel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.hotel.findUnique({ where: { id }, include: { departure: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Hotel not found' }); return; }
    if (orgId(req) && existing.departure.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Hotel not found' }); return; }

    await prisma.hotel.delete({ where: { id } });
    emitOperationsUpdated(existing.departureId);
    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[operations] deleteHotel error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
