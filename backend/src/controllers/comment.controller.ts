import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const commentInclude = {
  author: { select: { id: true, name: true, avatar: true, role: true } },
  replies: {
    include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

export const getLeadComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const comments = await prisma.leadComment.findMany({
      where: { leadId, parentId: null },
      include: commentInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: comments });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { content, parentId } = req.body;
    if (!content?.trim()) { res.status(400).json({ success: false, error: 'Content is required' }); return; }

    const comment = await prisma.leadComment.create({
      data: { content: content.trim(), leadId, authorId: req.user!.id, parentId: parentId || null },
      include: commentInclude,
    });
    res.status(201).json({ success: true, data: comment });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const existing = await prisma.leadComment.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Comment not found' }); return; }
    if (existing.authorId !== req.user!.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Not authorized' }); return;
    }
    const comment = await prisma.leadComment.update({
      where: { id },
      data: { content: content.trim(), isEdited: true },
      include: commentInclude,
    });
    res.json({ success: true, data: comment });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.leadComment.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Comment not found' }); return; }
    if (existing.authorId !== req.user!.id && req.user?.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Not authorized' }); return;
    }
    await prisma.leadComment.delete({ where: { id } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
