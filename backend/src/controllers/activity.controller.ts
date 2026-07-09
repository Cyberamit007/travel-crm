import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export const getActivityFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, entityType, userId: filterUserId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (filterUserId) where.userId = filterUserId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatar: true, role: true } },
          lead: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
