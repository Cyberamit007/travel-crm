import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { emitOperationsUpdated } from '../services/notification.service.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// Mirrors generateTasksFromItinerary in bookingTask.controller.ts, but materializes
// one shared task set per Departure (not per booking) filtered to Operations-relevant
// itinerary steps, so the day-wise timeline is generated once from the same package
// authoring data Sales already relies on for BookingTask.
export async function generateOpsTasksFromItinerary(departureId: string, packageId: string, departureDate: Date): Promise<void> {
  const items = await prisma.packageItinerary.findMany({
    where: { packageId, department: { in: ['OPERATIONS', 'ALL'] } },
    orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
  });
  if (!items.length) return;

  const tasks = items.map((item) => ({
    departureId,
    dayOffset: item.dayOffset,
    title: item.title,
    description: item.description || null,
    status: 'PENDING',
    sortOrder: item.sortOrder,
  }));

  await prisma.departureTask.createMany({ data: tasks });
}

// ─── Standard Ops task set ────────────────────────────────────────────────────
// One fixed checklist of operational tasks generated for every new Departure,
// independent of (and in addition to) any package-itinerary-driven tasks above.
// dayOffset is a literal day count from departureDate (can be negative for
// pre-trip prep, or positive/past the trip length for post-trip follow-up).
function buildStandardTasks(tripDays: number): { title: string; description: string; dayOffset: number }[] {
  const returnOffset = Math.max(tripDays - 1, 0);
  return [
    { title: 'Collect Traveller Details', description: 'Share the traveler portal link and follow up until every traveler has submitted their details.', dayOffset: -14 },
    { title: 'Verify Traveller Details', description: 'Review submitted traveler details and government ID documents.', dayOffset: -10 },
    { title: 'Confirm Hotel', description: 'Finalize and confirm hotel bookings for the group.', dayOffset: -10 },
    { title: 'Confirm Vehicle', description: 'Finalize and confirm vehicle/transport bookings.', dayOffset: -10 },
    { title: 'Assign Driver', description: 'Assign a driver to each vehicle for this departure.', dayOffset: -5 },
    { title: 'Assign Guide', description: 'Assign a local guide for this departure.', dayOffset: -5 },
    { title: 'Room Allocation', description: 'Allocate rooms across travelers by gender/family/age grouping.', dayOffset: -3 },
    { title: 'Collect Balance Payment', description: 'Follow up with travelers who still have a pending balance.', dayOffset: -7 },
    { title: 'Share Driver Details', description: "Share the driver's name and contact number with all travelers.", dayOffset: -1 },
    { title: 'Final Reminder', description: 'Send a final pre-departure reminder with pickup point and time.', dayOffset: -1 },
    { title: 'Collect Review', description: 'Request a review from travelers after their trip.', dayOffset: returnOffset + 2 },
    { title: 'Collect Referral', description: 'Ask satisfied travelers for referrals.', dayOffset: returnOffset + 5 },
  ];
}

export async function generateStandardOpsTasks(departureId: string, tripDays: number): Promise<void> {
  const tasks = buildStandardTasks(tripDays).map((t, i) => ({
    departureId,
    dayOffset: t.dayOffset,
    title: t.title,
    description: t.description,
    status: 'PENDING',
    sortOrder: i,
  }));
  await prisma.departureTask.createMany({ data: tasks });
}

export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const existing = await prisma.departureTask.findUnique({ where: { id }, include: { departure: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Task not found' }); return; }
    if (orgId(req) && existing.departure.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Task not found' }); return; }

    const task = await prisma.departureTask.update({
      where: { id },
      data: { status, updatedById: req.user!.id },
    });

    emitOperationsUpdated(existing.departureId);
    res.json({ success: true, data: task });
  } catch (e) {
    console.error('[operations] updateTaskStatus error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const departure = await prisma.departure.findFirst({
      where: { id: departureId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!departure) { res.status(404).json({ success: false, error: 'Departure not found' }); return; }

    const { title, description, dayOffset } = req.body;
    if (!title?.trim()) { res.status(400).json({ success: false, error: 'Task title is required' }); return; }

    const maxSort = await prisma.departureTask.aggregate({ where: { departureId }, _max: { sortOrder: true } });

    const task = await prisma.departureTask.create({
      data: {
        departureId,
        title: title.trim(),
        description: description?.trim() || null,
        dayOffset: dayOffset !== undefined && dayOffset !== '' ? Number(dayOffset) : 0,
        status: 'PENDING',
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    emitOperationsUpdated(departureId);
    res.status(201).json({ success: true, data: task });
  } catch (e) {
    console.error('[operations] createTask error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
