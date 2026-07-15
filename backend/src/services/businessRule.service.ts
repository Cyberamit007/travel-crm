import prisma from '../lib/prisma.js';

// Simple in-process TTL cache — no Redis. A rule edit takes up to TTL_MS to
// take effect everywhere; acceptable for thresholds like "advance %" or
// "reminder days" that don't need instant propagation.
const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 60 * 1000;

export async function getRule(key: string, fallback: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const rule = await prisma.businessRule.findUnique({ where: { key } });
  const value = rule?.value ?? fallback;
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export async function getRuleNumber(key: string, fallback: number): Promise<number> {
  const raw = await getRule(key, String(fallback));
  const parsed = Number(raw);
  return isNaN(parsed) ? fallback : parsed;
}

export function invalidateRuleCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

// ─── Known rule keys ──────────────────────────────────────────────────────────
// Every rule this phase makes configurable, with the exact value that was
// previously hardcoded — used both as the runtime fallback and to seed the
// Business Rules admin page with sensible defaults on first load.
export const RULE_DEFAULTS: { key: string; value: string; description: string; category: string }[] = [
  { key: 'PAYMENT_ADVANCE_PCT', value: '0.2', description: 'Advance payment percentage auto-generated at booking confirmation (0.2 = 20%)', category: 'FINANCE' },
  { key: 'PAYMENT_BALANCE_DAYS_BEFORE_DEPARTURE', value: '7', description: 'Days before departure the balance payment is due', category: 'FINANCE' },
  { key: 'FOLLOWUP_DUE_SOON_MINUTES', value: '60', description: 'Minutes before a scheduled follow-up to send a "due soon" reminder', category: 'SALES' },
  { key: 'FOLLOWUP_ESCALATION_HOURS', value: '24', description: 'Hours a follow-up can stay overdue before escalating to Admin', category: 'SALES' },
];
