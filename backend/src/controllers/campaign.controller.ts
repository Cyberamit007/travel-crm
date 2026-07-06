import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types/index.js';

const prisma = new PrismaClient();

export const getCampaigns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { destination: { contains: search as string } },
      ];
    }

    if (req.user?.role === 'EMPLOYEE') {
      where.employees = { some: { userId: req.user.id } };
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          employees: { include: { user: { select: { id: true, name: true, email: true } } } },
          _count: { select: { leads: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      success: true,
      data: campaigns,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCampaignById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        employees: { include: { user: { select: { id: true, name: true, email: true } } } },
        leads: {
          include: { assignedTo: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { leads: true } },
      },
    });

    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createCampaign = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name, destination, description, status, startDate, endDate,
      targetLeads, budget, whatsappNumber, instagramAdId,
      utmSource, utmCampaign, keywords, employeeIds,
    } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        name, destination, description,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        targetLeads: targetLeads ? Number(targetLeads) : undefined,
        budget: budget ? Number(budget) : undefined,
        whatsappNumber, instagramAdId, utmSource, utmCampaign,
        keywords: JSON.stringify(keywords || []),
        employees: employeeIds?.length
          ? { create: employeeIds.map((uid: string) => ({ userId: uid })) }
          : undefined,
      },
      include: {
        employees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.status(201).json({ success: true, data: campaign });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateCampaign = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { employeeIds, ...rest } = req.body;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        startDate: rest.startDate ? new Date(rest.startDate) : undefined,
        endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        targetLeads: rest.targetLeads ? Number(rest.targetLeads) : undefined,
        budget: rest.budget ? Number(rest.budget) : undefined,
      },
    });

    if (employeeIds !== undefined) {
      await prisma.campaignEmployee.deleteMany({ where: { campaignId: id } });
      if (employeeIds.length > 0) {
        await prisma.campaignEmployee.createMany({
          data: employeeIds.map((uid: string) => ({ campaignId: id, userId: uid })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.campaign.findUnique({
      where: { id },
      include: {
        employees: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { leads: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteCampaign = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.campaign.update({ where: { id }, data: { status: 'COMPLETED' } });
    res.json({ success: true, message: 'Campaign marked as completed' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCampaignStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        leads: { select: { status: true } },
        _count: { select: { leads: true } },
      },
    });

    const stats = campaigns.map((c) => {
      const total = c.leads.length;
      const confirmed = c.leads.filter((l) => l.status === 'CONFIRMED').length;
      const lost = c.leads.filter((l) => l.status === 'LOST').length;
      const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0';
      return {
        id: c.id, name: c.name, destination: c.destination, status: c.status,
        total, confirmed, lost, active: total - confirmed - lost,
        conversionRate, targetLeads: c.targetLeads,
      };
    });

    res.json({ success: true, data: stats });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
