import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { createLead, getLeadStats } from '../services/lead.service.js';
import { createNotification, emitLeadUpdated } from '../services/notification.service.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function orgFilter(req: AuthenticatedRequest): Record<string, unknown> {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getLeads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      status, source, campaignId, assignedToId,
      search, page = 1, limit = 20,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {
      ...orgFilter(req),
      deletedAt: null, // only active leads
    };

    if (req.user?.role === 'EMPLOYEE') where.assignedToId = req.user.id;
    if (status) where.status = status;
    if (source) where.source = source;
    if (campaignId) where.campaignId = campaignId;
    if (assignedToId && req.user?.role === 'ADMIN') where.assignedToId = assignedToId;

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { destination: { contains: search as string, mode: 'insensitive' } },
        { message: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          campaign: { select: { id: true, name: true, destination: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) {
    console.error('[leads] getLeads error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter(req) },
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

// ─── Create ───────────────────────────────────────────────────────────────────

export const createLeadManual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name, phone, email, source, message, destination, notes,
      followUpDate, followUpNotes, status, campaignId, assignedToId,
      groupSize, budget, preferredDate,
    } = req.body;

    if (!name?.trim() || !phone?.trim()) {
      res.status(400).json({ success: false, error: 'Name and phone are required' });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        source: source || 'MANUAL',
        message: message || null,
        destination: destination?.trim() || null,
        notes: notes || null,
        status: status || 'NEW',
        campaignId: campaignId || null,
        assignedToId: assignedToId || null,
        groupSize: groupSize && !isNaN(Number(groupSize)) ? Number(groupSize) : null,
        budget: budget && !isNaN(Number(budget)) ? Number(budget) : null,
        preferredDate: preferredDate || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpNotes: followUpNotes || null,
        organizationId: req.user?.organizationId ?? null,
      },
      include: {
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'Lead Created',
        details: `Created manually by ${req.user?.name}`,
        userId: req.user!.id,
        leadId: lead.id,
      },
    });

    if (lead.assignedToId) {
      await createNotification(
        lead.assignedToId, 'NEW_LEAD_ASSIGNED',
        'New Lead Assigned',
        `Lead "${lead.name}" has been assigned to you.`,
        lead.id,
      );
    }

    emitLeadUpdated(lead.id);
    res.status(201).json({ success: true, data: lead });
  } catch (e) {
    console.error('[leads] createLeadManual error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...orgFilter(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }
    if (req.user?.role === 'EMPLOYEE' && existing.assignedToId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' }); return;
    }

    const { status, notes, followUpDate, followUpNotes, followUpDone, campaignId, assignedToId, ...rest } = req.body;
    const updateData: Record<string, unknown> = { ...rest };

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
    if (followUpDone !== undefined) updateData.followUpDone = followUpDone;

    if (followUpDate !== undefined) {
      const parsed = followUpDate ? new Date(followUpDate) : null;
      if (parsed && parsed < existing.createdAt) {
        res.status(400).json({ success: false, error: 'Follow-up date cannot be before the lead creation date' });
        return;
      }
      updateData.followUpDate = parsed;
    }

    if (req.user?.role === 'ADMIN') {
      if (campaignId !== undefined) updateData.campaignId = campaignId || null;
      if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    }

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
      changes.push('Reassigned');
      await createNotification(
        assignedToId, 'NEW_LEAD_ASSIGNED',
        'Lead Assigned to You',
        `Lead "${lead.name}" has been assigned to you.`,
        id,
      );
    }

    if (changes.length > 0) {
      await prisma.activityLog.create({
        data: { action: 'Lead Updated', details: changes.join(', '), userId: req.user!.id, leadId: id },
      });
    }

    emitLeadUpdated(id);
    res.json({ success: true, data: lead });
  } catch (e) {
    console.error('[leads] updateLead error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Transfer ─────────────────────────────────────────────────────────────────

export const transferLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedToId, reason } = req.body;

    if (!assignedToId) {
      res.status(400).json({ success: false, error: 'assignedToId is required' });
      return;
    }

    const existing = await prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter(req) },
      include: { assignedTo: { select: { name: true } } },
    });
    if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }

    if (req.user?.role === 'EMPLOYEE' && existing.assignedToId !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only transfer leads assigned to you' });
      return;
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: assignedToId, organizationId: req.user?.organizationId ?? null, isActive: true },
      select: { id: true, name: true },
    });
    if (!targetUser) { res.status(404).json({ success: false, error: 'Target employee not found' }); return; }

    const lead = await prisma.lead.update({
      where: { id },
      data: { assignedToId },
      include: {
        campaign: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const fromName = existing.assignedTo?.name ?? 'Unassigned';
    const details = reason
      ? `Transferred from ${fromName} to ${targetUser.name} — ${reason}`
      : `Transferred from ${fromName} to ${targetUser.name}`;

    await prisma.activityLog.create({
      data: { action: 'Lead Transferred', details, userId: req.user!.id, leadId: id },
    });

    await createNotification(
      assignedToId, 'NEW_LEAD_ASSIGNED',
      'Lead Transferred to You',
      `"${lead.name}" was transferred to you by ${req.user?.name}.`,
      id,
    );

    emitLeadUpdated(id);
    res.json({ success: true, data: lead });
  } catch (e) {
    console.error('[leads] transferLead error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Delete (soft) ────────────────────────────────────────────────────────────

export const deleteLead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null, ...orgFilter(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }

    await prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });

    await prisma.activityLog.create({
      data: { action: 'Lead Deleted', details: `Deleted by ${req.user?.name}`, userId: req.user!.id, leadId: id },
    });

    res.json({ success: true, message: 'Lead deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Stats & Misc ─────────────────────────────────────────────────────────────

export const getStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stats = await getLeadStats(req.user?.id, req.user?.role, req.user?.organizationId);
    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getOverdueFollowUps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const where: Record<string, unknown> = {
      ...orgFilter(req),
      deletedAt: null,
      status: 'FOLLOW_UP_SCHEDULED',
      followUpDone: false,
      followUpDate: { lt: new Date() },
    };
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
    const where: Record<string, unknown> =
      req.user?.role === 'EMPLOYEE' ? { userId: req.user.id } : {};

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
