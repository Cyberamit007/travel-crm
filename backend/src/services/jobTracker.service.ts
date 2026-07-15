import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';

// Wraps a scheduled job with a ScheduledJobRun row so its history becomes
// queryable (System Health dashboard) instead of only visible in Railway's
// console logs. Never throws — a tracking failure must not take down the
// cron job it's wrapping.
export async function runTrackedJob(jobName: string, fn: () => Promise<void>): Promise<void> {
  let runId: string | null = null;
  try {
    const run = await prisma.scheduledJobRun.create({ data: { jobName, startedAt: new Date(), status: 'RUNNING' } });
    runId = run.id;
  } catch (err) {
    logger.error(`Failed to record job start: ${jobName}`, err);
  }

  try {
    await fn();
    if (runId) {
      await prisma.scheduledJobRun.update({ where: { id: runId }, data: { status: 'SUCCESS', finishedAt: new Date() } }).catch(() => {});
    }
  } catch (err) {
    logger.error(`Scheduled job failed: ${jobName}`, err);
    if (runId) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.scheduledJobRun.update({ where: { id: runId }, data: { status: 'FAILED', finishedAt: new Date(), errorMessage } }).catch(() => {});
    }
  }
}
