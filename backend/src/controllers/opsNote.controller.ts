import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { emitOperationsUpdated } from '../services/notification.service.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// Internal notes are only ever exposed to ADMIN/OPERATIONS — enforced entirely by
// requireOperationsOrAdmin gating every route in operations.routes.ts, so no
// additional visibility field is needed here.

export const createNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const departure = await prisma.departure.findFirst({
      where: { id: departureId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!departure) { res.status(404).json({ success: false, error: 'Departure not found' }); return; }

    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ success: false, error: 'Note content is required' }); return; }

    const note = await prisma.operationsNote.create({
      data: { departureId, content: content.trim(), authorId: req.user!.id },
      include: { author: { select: { id: true, name: true } } },
    });

    emitOperationsUpdated(departureId);
    res.status(201).json({ success: true, data: note });
  } catch (e) {
    console.error('[operations] createNote error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.operationsNote.findUnique({ where: { id }, include: { departure: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Note not found' }); return; }
    if (orgId(req) && existing.departure.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Note not found' }); return; }
    if (req.user?.role !== 'ADMIN' && existing.authorId !== req.user?.id) {
      res.status(403).json({ success: false, error: 'Only the author or an admin can delete this note' });
      return;
    }

    await prisma.operationsNote.delete({ where: { id } });
    emitOperationsUpdated(existing.departureId);
    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[operations] deleteNote error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
