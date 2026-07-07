import { Response } from 'express';

import { AuthenticatedRequest } from '../types/index.js';

import prisma from '../lib/prisma.js';

export const submitFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, title, description, page, priority } = req.body;
    const feedback = await prisma.feedback.create({
      data: {
        type,
        title,
        description,
        page: page || null,
        priority: priority || 'MEDIUM',
        submittedById: req.user!.id,
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    res.status(201).json({ success: true, data: feedback });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;

    const [items, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          submittedBy: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const feedback = await prisma.feedback.update({
      where: { id },
      data,
      include: { submittedBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, data: feedback });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.feedback.delete({ where: { id } });
    res.json({ success: true, message: 'Feedback deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getFeedbackStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [total, open, inProgress, bugs, suggestions] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'OPEN' } }),
      prisma.feedback.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.feedback.count({ where: { type: 'BUG' } }),
      prisma.feedback.count({ where: { type: 'SUGGESTION' } }),
    ]);
    res.json({ success: true, data: { total, open, inProgress, bugs, suggestions } });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
