import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { createNotification } from '../services/notification.service.js';

const leaveInclude = {
  employee: { select: { id: true, name: true, email: true, avatar: true } },
  approvedBy: { select: { id: true, name: true } },
};

function orgFilter(req: AuthenticatedRequest) {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}

export const getLeaveRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, employeeId } = req.query;
    const where: any = { ...orgFilter(req) };

    if (req.user?.role === 'EMPLOYEE') {
      where.employeeId = req.user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) where.status = status;

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: leaveInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: leaves });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason?.trim()) {
      res.status(400).json({ success: false, error: 'startDate, endDate, and reason are required' }); return;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason.trim(),
        employeeId: req.user!.id,
        ...orgFilter(req) as any,
      },
      include: leaveInclude,
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', ...orgFilter(req) as any, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification(a.id, 'SYSTEM', 'Leave Request', `${req.user?.name} has requested leave from ${startDate} to ${endDate}.`)
      )
    );

    res.status(201).json({ success: true, data: leave });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' }); return;
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: { status, adminNote: adminNote?.trim() || null, approvedById: req.user!.id },
      include: leaveInclude,
    });

    // Notify the employee
    const verb = status === 'APPROVED' ? 'approved' : 'rejected';
    await createNotification(
      leave.employeeId, 'SYSTEM', `Leave ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
      `Your leave request has been ${verb}${adminNote ? `: ${adminNote}` : '.'}`
    );

    res.json({ success: true, data: leave });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteLeaveRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    if (req.user?.role === 'EMPLOYEE' && leave.employeeId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Not authorized' }); return;
    }
    if (leave.status !== 'PENDING' && req.user?.role === 'EMPLOYEE') {
      res.status(400).json({ success: false, error: 'Cannot delete non-pending requests' }); return;
    }
    await prisma.leaveRequest.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getUpcomingLeaves = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        ...orgFilter(req) as any,
        status: 'APPROVED',
        startDate: { gte: new Date() },
      },
      include: leaveInclude,
      orderBy: { startDate: 'asc' },
      take: 20,
    });
    res.json({ success: true, data: leaves });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
