
import { Server } from 'socket.io';

import prisma from '../lib/prisma.js';
let io: Server | null = null;

export const setSocketServer = (socketServer: Server) => { io = socketServer; };

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  leadId?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, leadId },
  });
  if (io) io.to(`user:${userId}`).emit('notification', notification);
  return notification;
};

export const sendFollowUpReminders = async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const dueLeads = await prisma.lead.findMany({
    where: { status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { gte: now, lte: oneHourLater }, assignedToId: { not: null } },
  });

  for (const lead of dueLeads) {
    if (!lead.assignedToId) continue;
    const alreadyNotified = await prisma.notification.findFirst({
      where: { leadId: lead.id, type: 'FOLLOW_UP_DUE', createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    });
    if (!alreadyNotified) {
      await createNotification(lead.assignedToId, 'FOLLOW_UP_DUE', 'Follow-up Due Soon',
        `Follow-up with ${lead.name} is due within the hour.${lead.followUpNotes ? ' Note: ' + lead.followUpNotes : ''}`, lead.id);
    }
  }

  const overdueLeads = await prisma.lead.findMany({
    where: { status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { lt: now }, assignedToId: { not: null } },
  });

  for (const lead of overdueLeads) {
    if (!lead.assignedToId) continue;
    const existing = await prisma.notification.findFirst({
      where: { leadId: lead.id, type: 'FOLLOW_UP_OVERDUE', createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    if (!existing) {
      await createNotification(lead.assignedToId, 'FOLLOW_UP_OVERDUE', 'Overdue Follow-up',
        `Follow-up with ${lead.name} is overdue! Please take action immediately.`, lead.id);
    }
  }
};

export const emitLeadUpdated = (leadId: string) => {
  if (io) io.emit('lead_updated', { leadId });
};

// ─── Operations Panel ────────────────────────────────────────────────────────

export const emitOperationsUpdated = (departureId: string) => {
  if (io) io.to('admin').to('operations').emit('operations_updated', { departureId });
};

export const notifyOperationsTeam = async (
  organizationId: string | null,
  type: string,
  title: string,
  message: string
) => {
  const team = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'OPERATIONS'] }, isActive: true, ...(organizationId ? { organizationId } : {}) },
    select: { id: true },
  });
  for (const member of team) {
    await createNotification(member.id, type, title, message);
  }
};

export const sendOperationsReminders = async () => {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dedupWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const upcomingDepartures = await prisma.departure.findMany({
    where: { status: { in: ['UPCOMING', 'ACTIVE'] }, departureDate: { gte: startOfToday, lte: in48h } },
    include: {
      hotels: { select: { status: true } },
      vehicles: { select: { status: true } },
      bookings: { select: { balanceAmount: true } },
    },
  });

  for (const dep of upcomingDepartures) {
    const checks: Array<{ type: string; title: string; message: string; when: boolean }> = [
      {
        type: 'DEPARTURE_APPROACHING',
        title: 'Departure Approaching',
        message: `${dep.destination} departs ${dep.departureDate.toDateString()} — within 48 hours.`,
        when: true,
      },
      {
        type: 'HOTEL_PENDING',
        title: 'Hotel Booking Pending',
        message: `${dep.destination} (${dep.departureDate.toDateString()}) has no confirmed hotel yet.`,
        when: dep.hotels.length === 0 || dep.hotels.every((h) => h.status === 'PENDING'),
      },
      {
        type: 'VEHICLE_PENDING',
        title: 'Vehicle Booking Pending',
        message: `${dep.destination} (${dep.departureDate.toDateString()}) has no confirmed vehicle yet.`,
        when: dep.vehicles.length === 0 || dep.vehicles.every((v) => v.status === 'PENDING'),
      },
      {
        type: 'ROOM_ALLOCATION_PENDING',
        title: 'Room Allocation Pending',
        message: `${dep.destination} (${dep.departureDate.toDateString()}) still needs room allocation.`,
        when: dep.hotels.length > 0 && dep.hotels.every((h) => !(h as unknown as { roomAllocation?: string }).roomAllocation),
      },
      {
        type: 'TRIP_CAPTAIN_PENDING',
        title: 'Trip Captain Not Assigned',
        message: `${dep.destination} (${dep.departureDate.toDateString()}) has no trip captain assigned.`,
        when: dep.tripCaptainStatus === 'UNASSIGNED',
      },
      {
        type: 'PAYMENT_PENDING_OPS',
        title: 'Customer Payment Pending',
        message: `${dep.destination} (${dep.departureDate.toDateString()}) has travelers with pending balance.`,
        when: dep.bookings.some((b) => b.balanceAmount > 0),
      },
    ];

    for (const check of checks) {
      if (!check.when) continue;
      const alreadyNotified = await prisma.notification.findFirst({
        where: { type: check.type, message: check.message, createdAt: { gte: dedupWindow } },
      });
      if (!alreadyNotified) {
        await notifyOperationsTeam(dep.organizationId, check.type, check.title, check.message);
      }
    }
  }
};

// Auto-transitions departure status based on today vs. departure/return dates —
// keeps Active Trips / Completed Trips dashboard counts accurate without manual input.
export const updateDepartureStatuses = async () => {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);

  await prisma.departure.updateMany({
    where: { status: 'UPCOMING', departureDate: { lte: now } },
    data: { status: 'ACTIVE' },
  });

  const active = await prisma.departure.findMany({ where: { status: 'ACTIVE' }, select: { id: true, departureDate: true, returnDate: true } });
  const toComplete = active
    .filter((d) => (d.returnDate ?? d.departureDate) < today)
    .map((d) => d.id);
  if (toComplete.length) {
    await prisma.departure.updateMany({ where: { id: { in: toComplete } }, data: { status: 'COMPLETED' } });
  }
};

// ─── Finance Panel ───────────────────────────────────────────────────────────

export const emitFinanceUpdated = () => {
  if (io) io.to('admin').to('finance').emit('finance_updated', {});
};

export const notifyFinanceTeam = async (
  organizationId: string | null,
  type: string,
  title: string,
  message: string
) => {
  const team = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'FINANCE'] }, isActive: true, ...(organizationId ? { organizationId } : {}) },
    select: { id: true },
  });
  for (const member of team) {
    await createNotification(member.id, type, title, message);
  }
};

export const sendFinanceReminders = async () => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dedupWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Overdue customer balances
  const overdueBookings = await prisma.booking.findMany({
    where: { status: 'ACTIVE', balanceAmount: { gt: 0 }, balanceDueDate: { lt: now } },
    include: { lead: { select: { name: true } } },
  });
  for (const b of overdueBookings) {
    const message = `${b.lead.name} — ₹${b.balanceAmount.toLocaleString()} overdue since ${b.balanceDueDate!.toDateString()}.`;
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: 'OVERDUE_CUSTOMER_PAYMENT', message, createdAt: { gte: dedupWindow } },
    });
    if (!alreadyNotified) {
      await notifyFinanceTeam(b.organizationId, 'OVERDUE_CUSTOMER_PAYMENT', 'Overdue Customer Payment', message);
    }
  }

  // Vendor payments due within 7 days
  const dueVendorPayments = await prisma.vendorPayment.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gte: now, lte: in7Days } },
    include: { vendor: { select: { name: true } } },
  });
  for (const vp of dueVendorPayments) {
    const message = `${vp.vendor.name} — ₹${vp.balanceAmount.toLocaleString()} due ${vp.dueDate!.toDateString()}.`;
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: 'VENDOR_PAYMENT_DUE', message, createdAt: { gte: dedupWindow } },
    });
    if (!alreadyNotified) {
      await notifyFinanceTeam(vp.organizationId, 'VENDOR_PAYMENT_DUE', 'Vendor Payment Due', message);
    }
  }
};
