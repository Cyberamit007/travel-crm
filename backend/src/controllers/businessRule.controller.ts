import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { RULE_DEFAULTS, invalidateRuleCache } from '../services/businessRule.service.js';

// ─── GET /business-rules ──────────────────────────────────────────────────────
// Merges known RULE_DEFAULTS with whatever's actually stored, so every rule
// this app supports always shows up in the admin UI even before it's ever
// been edited — the DB stays empty until an Admin actually changes something.
export const listBusinessRules = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stored = await prisma.businessRule.findMany({ include: { updatedBy: { select: { id: true, name: true } } } });
    const storedByKey = new Map(stored.map((r) => [r.key, r]));

    const rules = RULE_DEFAULTS.map((d) => {
      const existing = storedByKey.get(d.key);
      return existing
        ? { ...existing, defaultValue: d.value }
        : { id: null, key: d.key, value: d.value, description: d.description, category: d.category, updatedById: null, updatedBy: null, updatedAt: null, defaultValue: d.value };
    });

    // Any stored rule not in RULE_DEFAULTS (shouldn't normally happen, but
    // don't silently hide it if it does) gets appended too.
    for (const r of stored) {
      if (!RULE_DEFAULTS.some((d) => d.key === r.key)) rules.push({ ...r, defaultValue: r.value });
    }

    res.json({ success: true, data: rules });
  } catch (e) {
    console.error('[businessRule] listBusinessRules error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── PUT /business-rules/:key ─────────────────────────────────────────────────

export const updateBusinessRule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined || value === null || String(value).trim() === '') {
      res.status(400).json({ success: false, error: 'A value is required' }); return;
    }

    const known = RULE_DEFAULTS.find((d) => d.key === key);
    const description = known?.description ?? null;
    const category = known?.category ?? 'SYSTEM';

    const rule = await prisma.businessRule.upsert({
      where: { key },
      create: { key, value: String(value).trim(), description, category, updatedById: req.user!.id },
      update: { value: String(value).trim(), updatedById: req.user!.id },
    });

    invalidateRuleCache(key);
    res.json({ success: true, data: rule });
  } catch (e) {
    console.error('[businessRule] updateBusinessRule error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
