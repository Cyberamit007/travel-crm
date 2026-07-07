import { Response } from 'express';

import { AuthenticatedRequest } from '../types/index.js';

import prisma from '../lib/prisma.js';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.user!.id,
      ...(unreadOnly === 'true' ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: Number(limit),
        include: { lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)), unreadCount },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
