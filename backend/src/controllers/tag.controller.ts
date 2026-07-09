import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

function orgFilter(req: AuthenticatedRequest) {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}

export const getTags = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({
      where: orgFilter(req) as any,
      include: { _count: { select: { leads: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: tags });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createTag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Name is required' }); return; }

    const tag = await prisma.tag.create({
      data: { name: name.trim(), color: color || '#6366f1', ...orgFilter(req) as any },
    });
    res.status(201).json({ success: true, data: tag });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Tag with this name already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};

export const updateTag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const tag = await prisma.tag.update({
      where: { id },
      data: { name: name?.trim(), color },
    });
    res.json({ success: true, data: tag });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteTag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.tag.delete({ where: { id } });
    res.json({ success: true, message: 'Tag deleted' });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const assignTag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { tagId } = req.body;
    await prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId, tagId } },
      create: { leadId, tagId },
      update: {},
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const removeTag = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId, tagId } = req.params;
    await prisma.leadTag.deleteMany({ where: { leadId, tagId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const setLeadTags = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const { tagIds } = req.body; // array of tag IDs (replaces all)
    const ids: string[] = Array.isArray(tagIds) ? tagIds : [];

    await prisma.leadTag.deleteMany({ where: { leadId } });
    if (ids.length > 0) {
      await prisma.leadTag.createMany({
        data: ids.map((tagId) => ({ leadId, tagId })),
        skipDuplicates: true,
      });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
