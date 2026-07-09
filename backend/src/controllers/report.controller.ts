import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import prisma from '../lib/prisma.js';

function orgFilter(req: AuthenticatedRequest): Record<string, unknown> {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}

function parseRange(req: AuthenticatedRequest) {
  const { startDate, endDate } = req.query as Record<string, string>;
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();
  return { start, end };
}

export const getLeadReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const org = orgFilter(req);
    const { start, end } = parseRange(req);
    const baseWhere = { ...org, createdAt: { gte: start, lte: end } };

    const [
      totalLeads,
      byStatus,
      bySource,
      byPriority,
      confirmedLeads,
      lostLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: baseWhere }),
      prisma.lead.groupBy({ by: ['status'], where: baseWhere, _count: true }),
      prisma.lead.groupBy({ by: ['source'], where: baseWhere, _count: true }),
      prisma.lead.groupBy({ by: ['priority' as any], where: baseWhere, _count: true }),
      prisma.lead.count({ where: { ...baseWhere, status: 'CONFIRMED' } }),
      prisma.lead.count({ where: { ...baseWhere, status: 'LOST' } }),
    ]);

    const conversionRate = totalLeads > 0 ? ((confirmedLeads / totalLeads) * 100).toFixed(1) : '0';

    res.json({
      success: true,
      data: {
        summary: { totalLeads, confirmedLeads, lostLeads, conversionRate: parseFloat(conversionRate) },
        byStatus: byStatus.map((r) => ({ name: r.status, count: r._count })),
        bySource: bySource.map((r) => ({ name: r.source || 'Unknown', count: r._count })),
        byPriority: (byPriority as any[]).map((r) => ({ name: r.priority || 'MEDIUM', count: r._count })),
      },
    });
  } catch (e) {
    console.error('[reports] getLeadReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getPerformanceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const org = orgFilter(req);
    const { start, end } = parseRange(req);
    const baseWhere = { ...org, createdAt: { gte: start, lte: end } };

    const employees = await (prisma as any).user.findMany({
      where: { ...org, role: 'EMPLOYEE', isActive: true },
      select: { id: true, name: true, avatar: true },
    });

    const employeeStats = await Promise.all(
      employees.map(async (emp: any) => {
        const [totalLeads, confirmed, lost, followUps] = await Promise.all([
          prisma.lead.count({ where: { ...baseWhere, assignedToId: emp.id } }),
          prisma.lead.count({ where: { ...baseWhere, assignedToId: emp.id, status: 'CONFIRMED' } }),
          prisma.lead.count({ where: { ...baseWhere, assignedToId: emp.id, status: 'LOST' } }),
          (prisma as any).followUp.count({ where: { lead: { ...org }, userId: emp.id, scheduledAt: { gte: start, lte: end } } }).catch(() => 0),
        ]);
        return {
          id: emp.id,
          name: emp.name,
          avatar: emp.avatar,
          totalLeads,
          confirmed,
          lost,
          followUps,
          conversionRate: totalLeads > 0 ? parseFloat(((confirmed / totalLeads) * 100).toFixed(1)) : 0,
        };
      })
    );

    // Sort by confirmed leads desc
    employeeStats.sort((a, b) => b.confirmed - a.confirmed);

    const topCampaigns = await (prisma as any).campaign.findMany({
      where: { ...org, leads: { some: { createdAt: { gte: start, lte: end } } } },
      select: {
        id: true, name: true,
        _count: { select: { leads: true } },
      },
      orderBy: { leads: { _count: 'desc' } },
      take: 5,
    }).catch(() => []);

    res.json({
      success: true,
      data: { employees: employeeStats, topCampaigns },
    });
  } catch (e) {
    console.error('[reports] getPerformanceReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
