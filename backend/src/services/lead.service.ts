import { PrismaClient, Prisma } from '@prisma/client';
import { createNotification } from './notification.service.js';

const prisma = new PrismaClient();

export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  source: string;
  message?: string;
  destination?: string;
  whatsappMsgId?: string;
  instagramLeadId?: string;
  metaPageId?: string;
  adId?: string;
  adName?: string;
  groupSize?: number;
  budget?: number;
  preferredDate?: string;
}

export const matchCampaign = async (input: {
  whatsappNumber?: string;
  instagramAdId?: string;
  message?: string;
}): Promise<string | null> => {
  const campaigns = await prisma.campaign.findMany({ where: { status: 'ACTIVE' } });

  for (const campaign of campaigns) {
    if (input.whatsappNumber && campaign.whatsappNumber === input.whatsappNumber) return campaign.id;
    if (input.instagramAdId && campaign.instagramAdId === input.instagramAdId) return campaign.id;
    if (input.message) {
      const keywords: string[] = JSON.parse(campaign.keywords || '[]');
      if (keywords.length > 0) {
        const msgLower = input.message.toLowerCase();
        const matched = keywords.some((kw) => msgLower.includes(kw.toLowerCase()));
        if (matched) return campaign.id;
      }
    }
  }
  return null;
};

export const assignEmployeeForCampaign = async (campaignId: string): Promise<string | null> => {
  const assignments = await prisma.campaignEmployee.findMany({
    where: { campaignId },
    include: {
      user: {
        include: { assignedLeads: { where: { status: { notIn: ['CONFIRMED', 'LOST'] } } } },
      },
    },
  });

  if (assignments.length === 0) return null;
  const sorted = assignments.sort((a, b) => a.user.assignedLeads.length - b.user.assignedLeads.length);
  return sorted[0].user.id;
};

export const createLead = async (
  input: CreateLeadInput,
  matchOptions?: { whatsappNumber?: string; instagramAdId?: string }
) => {
  const campaignId = await matchCampaign({
    whatsappNumber: matchOptions?.whatsappNumber,
    instagramAdId: matchOptions?.instagramAdId,
    message: input.message,
  });

  const assignedToId = campaignId ? await assignEmployeeForCampaign(campaignId) : null;

  const lead = await prisma.lead.create({
    data: {
      ...input,
      campaignId: campaignId ?? undefined,
      assignedToId: assignedToId ?? undefined,
    },
    include: { campaign: true, assignedTo: true },
  });

  if (assignedToId) {
    await createNotification(
      assignedToId,
      'NEW_LEAD_ASSIGNED',
      'New Lead Assigned',
      `New lead from ${input.source}: ${input.name} - "${input.message?.slice(0, 80) ?? 'No message'}"`,
      lead.id
    );
  }

  return lead;
};

export const getLeadStats = async (userId?: string, role?: string) => {
  const where: Prisma.LeadWhereInput = role === 'EMPLOYEE' && userId ? { assignedToId: userId } : {};

  const [total, byStatus, bySource, overdue] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ['status'], where, _count: true }),
    prisma.lead.groupBy({ by: ['source'], where, _count: true }),
    prisma.lead.count({
      where: { ...where, status: 'FOLLOW_UP_SCHEDULED', followUpDone: false, followUpDate: { lt: new Date() } },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  byStatus.forEach((s) => (statusMap[s.status] = s._count));

  const sourceMap: Record<string, number> = {};
  bySource.forEach((s) => (sourceMap[s.source] = s._count));

  return { total, byStatus: statusMap, bySource: sourceMap, overdue };
};
