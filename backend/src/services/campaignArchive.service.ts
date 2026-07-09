import ExcelJS from 'exceljs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { createNotification } from './notification.service.js';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

function sanitizeForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Archives a campaign to S3 as Excel, then soft-deletes all its leads and marks
 * the campaign as ENDED. Safe to call multiple times — idempotent via archivedAt check.
 *
 * Throws on S3 failure so the caller can retry on the next sync cycle.
 * DB is never mutated unless S3 upload is confirmed (ETag present).
 */
export async function archiveCampaign(
  campaignId: string,
  orgId: string,
  orgSlug: string,
): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Idempotency guard — already archived
  if ((campaign as any).archivedAt) {
    logger.info(`[archive] Campaign ${campaignId} already archived — skipping`);
    return;
  }

  // Fetch ALL leads including previously soft-deleted ones (no deletedAt filter)
  const leads = await prisma.lead.findMany({
    where: { campaignId },
    include: {
      assignedTo: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  logger.info(`[archive] Building Excel for campaign "${campaign.name}" — ${leads.length} leads`);

  // ── Build Excel ──────────────────────────────────────────────────────────────

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Travel CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Leads');

  sheet.columns = [
    { header: 'Lead ID',          key: 'id',            width: 38 },
    { header: 'Name',             key: 'name',          width: 24 },
    { header: 'Phone',            key: 'phone',         width: 16 },
    { header: 'Email',            key: 'email',         width: 28 },
    { header: 'Source',           key: 'source',        width: 14 },
    { header: 'Status',           key: 'status',        width: 22 },
    { header: 'Priority',         key: 'priority',      width: 10 },
    { header: 'Destination',      key: 'destination',   width: 20 },
    { header: 'Assigned Employee',key: 'employee',      width: 22 },
    { header: 'Budget (INR)',     key: 'budget',        width: 14 },
    { header: 'Group Size',       key: 'groupSize',     width: 12 },
    { header: 'Preferred Date',   key: 'preferredDate', width: 16 },
    { header: 'Message',          key: 'message',       width: 40 },
    { header: 'Notes',            key: 'notes',         width: 30 },
    { header: 'Lost Reason',      key: 'lostReason',    width: 20 },
    { header: 'Follow-up Date',   key: 'followUpDate',  width: 22 },
    { header: 'Created At',       key: 'createdAt',     width: 22 },
    { header: 'Updated At',       key: 'updatedAt',     width: 22 },
    { header: 'Tags',             key: 'tags',          width: 30 },
    { header: 'Ad ID',            key: 'adId',          width: 20 },
    { header: 'Ad Name',          key: 'adName',        width: 24 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 20;

  for (const lead of leads) {
    const tagNames = ((lead as any).tags ?? [])
      .map((lt: any) => lt.tag?.name ?? '')
      .filter(Boolean)
      .join(', ');

    sheet.addRow({
      id:            lead.id,
      name:          lead.name,
      phone:         lead.phone,
      email:         lead.email ?? '',
      source:        lead.source,
      status:        lead.status,
      priority:      (lead as any).priority ?? 'MEDIUM',
      destination:   lead.destination ?? '',
      employee:      (lead as any).assignedTo?.name ?? '',
      budget:        lead.budget ?? '',
      groupSize:     lead.groupSize ?? '',
      preferredDate: lead.preferredDate ?? '',
      message:       lead.message ?? '',
      notes:         lead.notes ?? '',
      lostReason:    (lead as any).lostReason ?? '',
      followUpDate:  lead.followUpDate ? lead.followUpDate.toISOString() : '',
      createdAt:     lead.createdAt.toISOString(),
      updatedAt:     lead.updatedAt.toISOString(),
      tags:          tagNames,
      adId:          lead.adId ?? '',
      adName:        lead.adName ?? '',
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  // ── Upload to S3 ─────────────────────────────────────────────────────────────

  const bucket = process.env.ARCHIVE_S3_BUCKET;
  if (!bucket) throw new Error('ARCHIVE_S3_BUCKET env var is not set');

  const metaCampaignId = (campaign as any).metaCampaignId ?? campaignId;
  const s3Key = `${sanitizeForFilename(orgSlug)}/${sanitizeForFilename(campaign.name)}_${metaCampaignId}_${isoDate()}.xlsx`;

  logger.info(`[archive] Uploading to s3://${bucket}/${s3Key} (${buffer.byteLength} bytes)`);

  const putResult = await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: buffer,
    ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ContentDisposition: `attachment; filename="${sanitizeForFilename(campaign.name)}_${isoDate()}.xlsx"`,
    Metadata: {
      campaignId,
      metaCampaignId,
      orgId,
      leadCount: String(leads.length),
    },
  }));

  if (!putResult.ETag) {
    throw new Error('S3 PutObject returned no ETag — upload may have failed');
  }

  logger.info(`[archive] S3 upload confirmed ETag=${putResult.ETag}`);

  // ── DB writes — only after S3 is confirmed ──────────────────────────────────

  const now = new Date();

  await prisma.$transaction([
    (prisma as any).campaignArchive.create({
      data: {
        organizationId: orgId,
        metaCampaignId,
        campaignName: campaign.name,
        leadCount: leads.length,
        s3Key,
        s3Bucket: bucket,
        fileSizeBytes: buffer.byteLength,
      },
    }),
    prisma.lead.updateMany({
      where: { campaignId },
      data: { deletedAt: now },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'ENDED',
        archivedAt: now,
        archiveS3Key: s3Key,
      } as any,
    }),
  ]);

  // Notify all org admins
  const admins = await prisma.user.findMany({
    where: { organizationId: orgId, role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification(
        admin.id,
        'CAMPAIGN_UPDATE',
        'Campaign Archived',
        `"${campaign.name}" was deleted in Meta Ads Manager — ${leads.length} lead${leads.length !== 1 ? 's' : ''} archived to S3.`,
      ),
    ),
  );

  logger.info(`[archive] Campaign ${campaignId} archived — ${leads.length} leads soft-deleted, admins notified`);
}
