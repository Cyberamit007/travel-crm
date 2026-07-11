import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// ─── Auto-generate tasks from package itinerary ───────────────────────────────

export async function generateTasksFromItinerary(
  bookingId: string,
  packageId: string,
  departureDate: Date,
  defaultAssigneeId?: string
): Promise<void> {
  const items = await (prisma as any).packageItinerary.findMany({
    where: { packageId },
    orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
  });

  if (!items.length) return;

  const tasks = items.map((item: any) => {
    const dueDate = new Date(departureDate);
    dueDate.setDate(dueDate.getDate() + item.dayOffset);

    return {
      bookingId,
      title: item.title,
      description: item.description || null,
      notes: item.notes || null,
      dueDate,
      dayOffset: item.dayOffset,
      taskType: item.taskType,
      department: item.department,
      status: 'PENDING',
      priority: item.dayOffset < 0 && Math.abs(item.dayOffset) <= 3 ? 'HIGH' : 'MEDIUM',
      assigneeId: defaultAssigneeId || null,
    };
  });

  await (prisma as any).bookingTask.createMany({ data: tasks });
}

// ─── Get tasks for a booking ──────────────────────────────────────────────────

export const getBookingTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const tasks = await (prisma as any).bookingTask.findMany({
      where: { bookingId },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
      orderBy: [{ dueDate: 'asc' }, { dayOffset: 'asc' }],
    });

    res.json({ success: true, data: tasks });
  } catch (e) {
    console.error('[tasks] getBookingTasks error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Update task status ───────────────────────────────────────────────────────

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await (prisma as any).bookingTask.findFirst({
      where: { id },
      include: { booking: { select: { organizationId: true, leadId: true } } },
    });
    if (!task || task.booking.organizationId !== orgId(req)) {
      res.status(404).json({ success: false, error: 'Task not found' }); return;
    }

    const { status, notes, assigneeId, dueDate, priority } = req.body;

    const completedAt = status === 'DONE' && task.status !== 'DONE' ? new Date() :
      status !== 'DONE' ? null : task.completedAt;

    const updated = await (prisma as any).bookingTask.update({
      where: { id },
      data: {
        status: status ?? task.status,
        notes: notes !== undefined ? notes?.trim() || null : task.notes,
        assigneeId: assigneeId !== undefined ? assigneeId || null : task.assigneeId,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate,
        priority: priority ?? task.priority,
        completedAt,
      },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    if (status === 'DONE' && task.status !== 'DONE') {
      await prisma.activityLog.create({
        data: {
          action: 'Task Completed',
          details: `Task "${task.title}" marked as done`,
          userId: req.user!.id,
          leadId: task.booking.leadId,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[tasks] updateTask error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Get my tasks (for employees) ────────────────────────────────────────────

export const getMyTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const oid = orgId(req);
    const { status, from, to, department } = req.query;

    const where: any = {
      assigneeId: userId,
      booking: { organizationId: oid },
    };

    if (status) where.status = status;
    if (department) where.department = department;
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from as string);
      if (to) where.dueDate.lte = new Date(to as string);
    }

    const tasks = await (prisma as any).bookingTask.findMany({
      where,
      include: {
        booking: {
          include: {
            lead: { select: { id: true, name: true, phone: true, destination: true } },
          },
        },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
    });

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pending = tasks.filter((t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const overdue = pending.filter((t: any) => t.dueDate && new Date(t.dueDate) < now);
    const todayTasks = pending.filter((t: any) => t.dueDate && t.dueDate.toISOString().startsWith(todayStr));
    const upcoming = pending.filter((t: any) => t.dueDate && new Date(t.dueDate) >= tomorrow);
    const completed = tasks.filter((t: any) => t.status === 'DONE' || t.status === 'SKIPPED');

    res.json({
      success: true,
      data: { overdue, today: todayTasks, upcoming, completed, all: tasks },
    });
  } catch (e) {
    console.error('[tasks] getMyTasks error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Get all tasks for admin ──────────────────────────────────────────────────

export const getAllTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const oid = orgId(req);
    const { status, department, assigneeId, bookingId } = req.query;

    const where: any = { booking: { organizationId: oid } };
    if (status) where.status = status;
    if (department) where.department = department;
    if (assigneeId) where.assigneeId = assigneeId;
    if (bookingId) where.bookingId = bookingId;

    const tasks = await (prisma as any).bookingTask.findMany({
      where,
      include: {
        booking: {
          include: {
            lead: { select: { id: true, name: true, phone: true, destination: true } },
          },
        },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ dueDate: 'asc' }],
      take: 200,
    });

    res.json({ success: true, data: tasks });
  } catch (e) {
    console.error('[tasks] getAllTasks error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Create manual task ───────────────────────────────────────────────────────

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const { title, description, notes, dueDate, taskType, department, assigneeId, priority } = req.body;
    if (!title?.trim()) { res.status(400).json({ success: false, error: 'Title is required' }); return; }

    const task = await (prisma as any).bookingTask.create({
      data: {
        bookingId,
        title: title.trim(),
        description: description?.trim() || null,
        notes: notes?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        taskType: taskType || 'GENERAL',
        department: department || 'SALES',
        assigneeId: assigneeId || null,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
      },
      include: { assignee: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json({ success: true, data: task });
  } catch (e) {
    console.error('[tasks] createTask error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
