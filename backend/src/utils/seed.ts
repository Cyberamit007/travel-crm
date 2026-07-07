import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findOrCreateCampaign(name: string, data: Record<string, unknown>) {
  const existing = await prisma.campaign.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.campaign.create({ data: data as any });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding database...');

  // ── 1. Default Organization (SaaS tenant foundation) ──────────────────────
  let org = await prisma.organization.findFirst({ where: { slug: 'default' } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Default Organization', slug: 'default', plan: 'PRO', status: 'ACTIVE' },
    });
    console.log('  + Organization created:', org.id);
  } else {
    console.log('  ~ Organization already exists:', org.id);
  }

  // ── 2. Users ──────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const empPassword = await bcrypt.hash('emp123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@travelcrm.com' },
    update: { organizationId: org.id },
    create: {
      name: 'Admin User', email: 'admin@travelcrm.com',
      password: adminPassword, role: 'ADMIN',
      phone: '+91-9876543210', organizationId: org.id,
    },
  });

  const emp1 = await prisma.user.upsert({
    where: { email: 'amit@travelcrm.com' },
    update: { name: 'Amit', organizationId: org.id },
    create: {
      name: 'Amit', email: 'amit@travelcrm.com',
      password: empPassword, role: 'EMPLOYEE',
      phone: '+91-9876543211', organizationId: org.id,
    },
  });

  const emp2 = await prisma.user.upsert({
    where: { email: 'kaptan@travelcrm.com' },
    update: { name: 'Kaptan', organizationId: org.id },
    create: {
      name: 'Kaptan', email: 'kaptan@travelcrm.com',
      password: empPassword, role: 'EMPLOYEE',
      phone: '+91-9876543212', organizationId: org.id,
    },
  });

  const emp3 = await prisma.user.upsert({
    where: { email: 'biswas@travelcrm.com' },
    update: { name: 'Biswas', organizationId: org.id },
    create: {
      name: 'Biswas', email: 'biswas@travelcrm.com',
      password: empPassword, role: 'EMPLOYEE',
      phone: '+91-9876543213', organizationId: org.id,
    },
  });

  const emp4 = await prisma.user.upsert({
    where: { email: 'abhay@travelcrm.com' },
    update: { name: 'Abhay', organizationId: org.id },
    create: {
      name: 'Abhay', email: 'abhay@travelcrm.com',
      password: empPassword, role: 'EMPLOYEE',
      phone: '+91-9876543214', organizationId: org.id,
    },
  });

  // Remove old test accounts
  await prisma.user.deleteMany({ where: { email: { in: ['rahul@travelcrm.com', 'priya@travelcrm.com'] } } });

  // Assign any un-org'd users to default org
  await prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });

  console.log('  ~ Users ready: admin, amit, kaptan, biswas, abhay');

  // ── 3. Campaigns ──────────────────────────────────────────────────────────
  const campaign1 = await findOrCreateCampaign('Kedarnath July Batch', {
    name: 'Kedarnath July Batch', destination: 'Kedarnath', status: 'ACTIVE',
    description: 'Sacred Kedarnath Yatra — July 2026 batch.',
    startDate: new Date('2026-07-10'), endDate: new Date('2026-07-20'),
    targetLeads: 50, budget: 150000, whatsappNumber: '+918800000001',
    utmCampaign: 'kedarnath-july-2026',
    keywords: JSON.stringify(['kedarnath', 'kedar', 'shiva', 'july yatra']),
    organizationId: org.id,
  });

  const campaign2 = await findOrCreateCampaign('Zanskar Valley August', {
    name: 'Zanskar Valley August', destination: 'Zanskar Valley', status: 'ACTIVE',
    description: 'Epic Zanskar Valley trek — August 2026 batch.',
    startDate: new Date('2026-08-05'), endDate: new Date('2026-08-18'),
    targetLeads: 30, budget: 200000, whatsappNumber: '+918800000002',
    instagramAdId: 'ig_ad_zanskar_2026', utmCampaign: 'zanskar-august-2026',
    keywords: JSON.stringify(['zanskar', 'ladakh', 'valley trek', 'august trek']),
    organizationId: org.id,
  });

  const campaign3 = await findOrCreateCampaign('Char Dham Yatra 2026', {
    name: 'Char Dham Yatra 2026', destination: 'Char Dham', status: 'ACTIVE',
    description: 'Complete Char Dham Yatra — Yamunotri, Gangotri, Kedarnath, Badrinath.',
    startDate: new Date('2026-09-01'), endDate: new Date('2026-09-15'),
    targetLeads: 40, budget: 300000, utmCampaign: 'char-dham-2026',
    keywords: JSON.stringify(['char dham', 'yamunotri', 'gangotri', 'badrinath', 'pilgrimage']),
    organizationId: org.id,
  });

  const campaign4 = await findOrCreateCampaign('Spiti Valley October', {
    name: 'Spiti Valley October', destination: 'Spiti Valley', status: 'DRAFT',
    description: 'Hidden paradise of Spiti Valley — October 2026 before snow closure.',
    startDate: new Date('2026-10-01'), endDate: new Date('2026-10-12'),
    targetLeads: 25, budget: 180000, utmCampaign: 'spiti-october-2026',
    keywords: JSON.stringify(['spiti', 'himachal', 'monasteries', 'high altitude']),
    organizationId: org.id,
  });

  // Assign un-org'd campaigns to default org
  await prisma.campaign.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });

  // Campaign-employee assignments (skip duplicates)
  await prisma.campaignEmployee.createMany({
    skipDuplicates: true,
    data: [
      { campaignId: campaign1.id, userId: emp1.id },
      { campaignId: campaign1.id, userId: emp2.id },
      { campaignId: campaign2.id, userId: emp2.id },
      { campaignId: campaign2.id, userId: emp3.id },
      { campaignId: campaign3.id, userId: emp1.id },
      { campaignId: campaign3.id, userId: emp4.id },
      { campaignId: campaign4.id, userId: emp3.id },
      { campaignId: campaign4.id, userId: emp4.id },
    ],
  });

  console.log('  ~ Campaigns ready');

  // ── 4. Demo Leads — check by phone number (never re-insert) ───────────────

  // Assign un-org'd leads to default org
  await prisma.lead.updateMany({ where: { organizationId: null }, data: { organizationId: org.id } });

  const demoLeads = [
    { phone: '+91-9811223344', name: 'Deepak Verma', email: 'deepak@gmail.com', source: 'WHATSAPP', status: 'INTERESTED', message: 'Hi, I want to book Kedarnath trip for July. How much does it cost?', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, groupSize: 4, preferredDate: 'July 10-20', notes: 'Family of 4', isRead: true },
    { phone: '+91-9922334455', name: 'Sunita Patel', email: 'sunita@gmail.com', source: 'INSTAGRAM', status: 'FOLLOW_UP_SCHEDULED', message: 'Saw your Zanskar Valley post! Is there availability for August?', destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), followUpNotes: 'Call to discuss pricing', groupSize: 2, isRead: true },
    { phone: '+91-9833445566', name: 'Rajesh Gupta', source: 'WHATSAPP', status: 'NEW', message: 'Kedarnath trip available? Need details', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, isRead: false },
    { phone: '+91-9744556677', name: 'Meera Joshi', email: 'meera@gmail.com', source: 'INSTAGRAM', status: 'CONTACTED', message: 'What Char Dham packages do you offer?', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp3.id, groupSize: 6, budget: 50000, isRead: true },
    { phone: '+91-9655667788', name: 'Vikram Singh', source: 'WHATSAPP', status: 'CONFIRMED', message: 'Booking confirmed for Zanskar trek August batch', destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, groupSize: 3, budget: 45000, isRead: true },
    { phone: '+91-9566778899', name: 'Anita Sharma', email: 'anita.sharma@gmail.com', source: 'INSTAGRAM', status: 'LOST', message: 'Too expensive. Will look elsewhere.', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp2.id, notes: 'Budget constraint', isRead: true },
    { phone: '+91-9477889900', name: 'Suresh Nair', source: 'WHATSAPP', status: 'NEW', message: 'Planning a Char Dham trip for September', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp1.id, isRead: false },
    { phone: '+91-9388990011', name: 'Kavita Reddy', email: 'kavita@gmail.com', source: 'MANUAL', status: 'INTERESTED', message: 'Enquired about Spiti Valley via website', destination: 'Spiti Valley', campaignId: campaign4.id, assignedToId: emp4.id, groupSize: 5, isRead: true },
    { phone: '+91-9299001122', name: 'Pradeep Mishra', source: 'WHATSAPP', status: 'FOLLOW_UP_SCHEDULED', message: 'Want Kedarnath package for family', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, followUpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), followUpNotes: 'Send price quote', groupSize: 5, isRead: true },
    { phone: '+91-9100112233', name: 'Lakshmi Devi', email: 'lakshmi@yahoo.com', source: 'INSTAGRAM', status: 'NEW', message: 'Is Char Dham trip possible for senior citizens?', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp4.id, isRead: false },
  ];

  let inserted = 0;
  let skipped = 0;

  for (const lead of demoLeads) {
    const exists = await prisma.lead.findFirst({ where: { phone: lead.phone, deletedAt: null } });
    if (!exists) {
      await prisma.lead.create({ data: { ...lead, organizationId: org.id } as any });
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`  ~ Demo leads: ${inserted} inserted, ${skipped} already exist`);

  // Seed activity logs only if none exist
  const logCount = await prisma.activityLog.count();
  if (logCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        { action: 'Lead Created', details: 'Deepak Verma — Kedarnath inquiry via WhatsApp', userId: admin.id },
        { action: 'Status Updated', details: 'Vikram Singh marked as Confirmed', userId: emp2.id },
        { action: 'Follow-up Scheduled', details: 'Follow-up set for Sunita Patel', userId: emp2.id },
        { action: 'Campaign Created', details: 'Kedarnath July Batch campaign created', userId: admin.id },
      ],
    });
  }

  console.log('\nDatabase seeded successfully!');
  console.log('\nLogin Credentials:');
  console.log('  Admin:    admin@travelcrm.com  / admin123');
  console.log('  Amit:     amit@travelcrm.com   / emp123');
  console.log('  Kaptan:   kaptan@travelcrm.com / emp123');
  console.log('  Biswas:   biswas@travelcrm.com / emp123');
  console.log('  Abhay:    abhay@travelcrm.com  / emp123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
