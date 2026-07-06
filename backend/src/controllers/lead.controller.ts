import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/index.js';
import { createLead, getLeadStats } from '../services/lead.service.js';
import { createNotification } from '../services/notification.service.js';

const prisma = new PrismaClient();

export const getLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, source, campaignId, assignedToId, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (req.user?.role === 'EMPLOYEE') where.assignedToId = req.user.id;
    if (status) where.status = status;
    if (source) where.source = source;
    if (campaignId) where.campaignId = campaignId;
    if (assignedToId && req.user?.role === 'ADMIN') where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
        { email: { contains: search as string } },
        { destination: { contains: search as string } },
        { message: { contains: search as string } },
      ];
    }

    const orderBy: Record<string, unknown> = { [sortBy as string]: sortOrder };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          campaign: { select: { id: true, name: true, destination: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        activityLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }
    if (req.user?.role === 'EMPLOYEE' && lead.assignedToId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' }); return;
    }
    if (!lead.isRead) await prisma.lead.update({ where: { id }, data: { isRead: true } });

    res.json({ success: true, data: lead });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createLeadManual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const lead = await createLead({ ...req.body, source: req.body.source || 'MANUAL' });
    await prisma.activityLog.create({
      data: { action: 'Lead Created', details: `Lead created manually by ${req.user?.name}`, userId: req.user!.id, leadId: lead.id },
    });
    res.status(201).json({ success: true, data: lead });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }
    if (req.user?.role === 'EMPLOYEE' && existing.assignedToId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' }); return;
    }

    const { status, notes, followUpDate, followUpNotes, followUpDone, campaignId, assignedToId, ...rest } = req.body;

    const updateData: Record<string, unknown> = { ...rest };
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (followUpDate !== undefined) updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
    if (followUpDone !== undefined) updateData.followUpDone = followUpDone;
    if (campaignId !== undefined && req.user?.role === 'ADMIN') updateData.campaignId = campaignId || null;
    if (assignedToId !== undefined && req.user?.role === 'ADMIN') updateData.assignedToId = assignedToId || null;

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const changes: string[] = [];
    if (status && status !== existing.status) changes.push(`Status: ${existing.status} → ${status}`);
    if (assignedToId && assignedToId !== existing.assignedToId) {
      changes.push('Reassigned to new employee');
      await createNotification(assignedToId, 'NEW_LEAD_ASSIGNED', 'Lead Assigned to You',
        `Lead ${lead.name} has been assigned to you.`, id);
    }

    if (changes.length > 0) {
      await prisma.activityLog.create({
        data: { action: 'Lead Updated', details: changes.join(', '), userId: req.user!.id, leadId: id },
      });
    }

    res.json({ success: true, data: lead });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.lead.delete({ where: { id } });
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await getLeadStats(req.user?.id, req.user?.role);
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getOverdueFollowUps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: Record<string, unknown> = { status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { lt: new Date() } };
    if (req.user?.role === 'EMPLOYEE') where.assignedToId = req.user.id;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { followUpDate: 'asc' },
    });
    res.json({ success: true, data: leads });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getRecentActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: Record<string, unknown> = req.user?.role === 'EMPLOYEE' ? { userId: req.user.id } : {};
    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: logs });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
