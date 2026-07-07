import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

const prisma = new PrismaClient();
let io: Server | null = null;

export const setSocketServer = (socketServer: Server) => { io = socketServer; };

export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  leadId?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, leadId },
  });
  if (io) io.to(`user:${userId}`).emit('notification', notification);
  return notification;
};

export const sendFollowUpReminders = async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const dueLeads = await prisma.lead.findMany({
    where: { status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { gte: now, lte: oneHourLater }, assignedToId: { not: null } },
  });

  for (const lead of dueLeads) {
    if (!lead.assignedToId) continue;
    const alreadyNotified = await prisma.notification.findFirst({
      where: { leadId: lead.id, type: 'FOLLOW_UP_DUE', createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    });
    if (!alreadyNotified) {
      await createNotification(lead.assignedToId, 'FOLLOW_UP_DUE', 'Follow-up Due Soon',
        `Follow-up with ${lead.name} is due within the hour.${lead.followUpNotes ? ' Note: ' + lead.followUpNotes : ''}`, lead.id);
    }
  }

  const overdueLeads = await prisma.lead.findMany({
    where: { status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { lt: now }, assignedToId: { not: null } },
  });

  for (const lead of overdueLeads) {
    if (!lead.assignedToId) continue;
    const existing = await prisma.notification.findFirst({
      where: { leadId: lead.id, type: 'FOLLOW_UP_OVERDUE', createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    if (!existing) {
      await createNotification(lead.assignedToId, 'FOLLOW_UP_OVERDUE', 'Overdue Follow-up',
        `Follow-up with ${lead.name} is overdue! Please take action immediately.`, lead.id);
    }
  }
};

export const emitLeadUpdated = (leadId: string) => {
  if (io) io.emit('lead_updated', { leadId });
};
