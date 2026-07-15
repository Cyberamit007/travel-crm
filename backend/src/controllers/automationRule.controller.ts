import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export const listAutomationRules = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rules = await prisma.automationRule.findMany({
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: rules });
  } catch (e) {
    console.error('[automation] listAutomationRules error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createAutomationRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, triggerType, conditions, actions, delayMinutes } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Rule name is required' }); return; }
    if (!triggerType) { res.status(400).json({ success: false, error: 'Trigger type is required' }); return; }
    if (!Array.isArray(actions) || actions.length === 0) { res.status(400).json({ success: false, error: 'At least one action is required' }); return; }

    const rule = await prisma.automationRule.create({
      data: {
        name: name.trim(),
        triggerType,
        conditions: Array.isArray(conditions) ? conditions : [],
        actions,
        delayMinutes: delayMinutes !== undefined && delayMinutes !== '' ? Number(delayMinutes) : null,
        createdById: req.user!.id,
      },
    });
    res.status(201).json({ success: true, data: rule });
  } catch (e) {
    console.error('[automation] createAutomationRule error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAutomationRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Automation rule not found' }); return; }

    const { name, triggerType, conditions, actions, delayMinutes, isActive } = req.body;
    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        triggerType: triggerType ?? existing.triggerType,
        conditions: conditions !== undefined ? conditions : existing.conditions ?? undefined,
        actions: actions !== undefined ? actions : existing.actions ?? undefined,
        delayMinutes: delayMinutes !== undefined ? (delayMinutes === '' || delayMinutes === null ? null : Number(delayMinutes)) : existing.delayMinutes,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });
    res.json({ success: true, data: rule });
  } catch (e) {
    console.error('[automation] updateAutomationRule error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteAutomationRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.automationRule.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Automation rule not found' }); return; }

    await prisma.automationRule.delete({ where: { id } });
    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[automation] deleteAutomationRule error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
