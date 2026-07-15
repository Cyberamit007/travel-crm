import prisma from '../lib/prisma.js';
import { createNotification } from './notification.service.js';

// ─── Automation Builder engine ───────────────────────────────────────────────
// Form-based trigger/condition/action rules, additive on top of this app's
// existing hardcoded automation (createLead, createBooking's cascade) — those
// are NOT touched. fireEvent() is called as one more fire-and-forget step at
// the end of those flows, evaluating any admin-defined AutomationRule rows
// matching the trigger.

interface Condition { field: string; operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan'; value: unknown }
interface Action { type: string; config: Record<string, unknown> }

function getField(context: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((obj, key) => (obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined), context);
}

function evaluateCondition(context: Record<string, unknown>, cond: Condition): boolean {
  const actual = getField(context, cond.field);
  switch (cond.operator) {
    case 'equals': return actual === cond.value;
    case 'notEquals': return actual !== cond.value;
    case 'contains': return typeof actual === 'string' && actual.includes(String(cond.value));
    case 'greaterThan': return Number(actual) > Number(cond.value);
    case 'lessThan': return Number(actual) < Number(cond.value);
    default: return true;
  }
}

// v1 action library — every action reuses an existing service/model rather
// than introducing new side-effect code.
async function executeAction(action: Action, context: Record<string, unknown>): Promise<void> {
  const { type, config } = action;
  const leadId = context.leadId as string | undefined;

  switch (type) {
    case 'ASSIGN_EMPLOYEE': {
      const employeeId = config.employeeId as string | undefined;
      if (leadId && employeeId) {
        await prisma.lead.update({ where: { id: leadId }, data: { assignedToId: employeeId } });
      }
      break;
    }
    case 'NOTIFY_EMPLOYEE': {
      const userId = (context.assignedToId as string | undefined) ?? (config.employeeId as string | undefined);
      if (userId) {
        await createNotification(userId, 'AUTOMATION_NOTIFY', String(config.title ?? 'Automation'), String(config.message ?? ''), leadId, undefined, 'INFO', 'SYSTEM');
      }
      break;
    }
    case 'NOTIFY_MANAGER': {
      const organizationId = context.organizationId as string | null | undefined;
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true, ...(organizationId ? { organizationId } : {}) },
        select: { id: true },
      });
      for (const admin of admins) {
        await createNotification(admin.id, 'AUTOMATION_ESCALATED', String(config.title ?? 'Automation Escalation'), String(config.message ?? ''), leadId, undefined, 'WARNING', 'SYSTEM');
      }
      break;
    }
    case 'SCHEDULE_FOLLOWUP': {
      const days = Number(config.days ?? 1);
      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: 'FOLLOW_UP_SCHEDULED', followUpDate: new Date(Date.now() + days * 86400000), followUpDone: false, followUpNotes: config.notes ? String(config.notes) : undefined },
        });
      }
      break;
    }
    case 'SEND_REMINDER': {
      const userId = context.assignedToId as string | undefined;
      if (userId) {
        await createNotification(userId, 'AUTOMATION_REMINDER', String(config.title ?? 'Reminder'), String(config.message ?? ''), leadId, undefined, 'REMINDER', 'SYSTEM');
      }
      break;
    }
    default:
      console.warn(`[automation] Unknown action type: ${type}`);
  }
}

// Called additively from existing flows (createLead, createBooking) — never
// blocks or throws into the caller; every failure is caught per-rule.
export async function fireEvent(triggerType: string, context: Record<string, unknown>): Promise<void> {
  try {
    const rules = await prisma.automationRule.findMany({ where: { triggerType, isActive: true } });
    for (const rule of rules) {
      try {
        const conditions = (rule.conditions as unknown as Condition[]) ?? [];
        if (!conditions.every((c) => evaluateCondition(context, c))) continue;

        if (rule.delayMinutes && rule.delayMinutes > 0) {
          await prisma.automationExecution.create({
            data: {
              ruleId: rule.id,
              triggerContext: context as object,
              status: 'PENDING',
              scheduledFor: new Date(Date.now() + rule.delayMinutes * 60 * 1000),
            },
          });
        } else {
          const actions = (rule.actions as unknown as Action[]) ?? [];
          for (const action of actions) await executeAction(action, context);
        }
      } catch (err) {
        console.error(`[automation] rule ${rule.id} (${rule.name}) failed:`, err);
      }
    }
  } catch (err) {
    console.error(`[automation] fireEvent(${triggerType}) error:`, err);
  }
}

// Cron sweep — executes AutomationExecution rows whose delay has elapsed.
// This is what makes "Wait 24 Hours -> Notify Manager" actually fire.
export async function processDueAutomationExecutions(): Promise<void> {
  const due = await prisma.automationExecution.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
    include: { rule: true },
  });
  for (const exec of due) {
    try {
      const actions = (exec.rule.actions as unknown as Action[]) ?? [];
      const context = exec.triggerContext as Record<string, unknown>;
      for (const action of actions) await executeAction(action, context);
      await prisma.automationExecution.update({ where: { id: exec.id }, data: { status: 'EXECUTED', executedAt: new Date() } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.automationExecution.update({ where: { id: exec.id }, data: { status: 'FAILED', executedAt: new Date(), errorMessage } }).catch(() => {});
    }
  }
}
