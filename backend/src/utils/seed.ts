import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaignEmployee.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@travelcrm.com', password: adminPassword, role: 'ADMIN', phone: '+91-9876543210' },
  });

  const empPassword = await bcrypt.hash('emp123', 12);
  const emp1 = await prisma.user.create({
    data: { name: 'Rahul Sharma', email: 'rahul@travelcrm.com', password: empPassword, role: 'EMPLOYEE', phone: '+91-9876543211' },
  });
  const emp2 = await prisma.user.create({
    data: { name: 'Priya Singh', email: 'priya@travelcrm.com', password: empPassword, role: 'EMPLOYEE', phone: '+91-9876543212' },
  });
  const emp3 = await prisma.user.create({
    data: { name: 'Amit Kumar', email: 'amit@travelcrm.com', password: empPassword, role: 'EMPLOYEE', phone: '+91-9876543213' },
  });

  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Kedarnath July Batch', destination: 'Kedarnath', status: 'ACTIVE',
      description: 'Sacred Kedarnath Yatra - July 2026 batch. Trek through the Himalayas to the ancient Shiva temple.',
      startDate: new Date('2026-07-10'), endDate: new Date('2026-07-20'),
      targetLeads: 50, budget: 150000, whatsappNumber: '+918800000001',
      utmCampaign: 'kedarnath-july-2026',
      keywords: JSON.stringify(['kedarnath', 'kedar', 'shiva', 'july yatra']),
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Zanskar Valley August', destination: 'Zanskar Valley', status: 'ACTIVE',
      description: 'Epic Zanskar Valley trek through remote Ladakh region. August 2026 batch.',
      startDate: new Date('2026-08-05'), endDate: new Date('2026-08-18'),
      targetLeads: 30, budget: 200000, whatsappNumber: '+918800000002',
      instagramAdId: 'ig_ad_zanskar_2026', utmCampaign: 'zanskar-august-2026',
      keywords: JSON.stringify(['zanskar', 'ladakh', 'valley trek', 'august trek']),
    },
  });

  const campaign3 = await prisma.campaign.create({
    data: {
      name: 'Char Dham Yatra 2026', destination: 'Char Dham', status: 'ACTIVE',
      description: 'Complete Char Dham Yatra covering Yamunotri, Gangotri, Kedarnath, and Badrinath.',
      startDate: new Date('2026-09-01'), endDate: new Date('2026-09-15'),
      targetLeads: 40, budget: 300000, utmCampaign: 'char-dham-2026',
      keywords: JSON.stringify(['char dham', 'yamunotri', 'gangotri', 'badrinath', 'pilgrimage']),
    },
  });

  const campaign4 = await prisma.campaign.create({
    data: {
      name: 'Spiti Valley October', destination: 'Spiti Valley', status: 'DRAFT',
      description: 'Hidden paradise of Spiti Valley - October 2026 batch before snow closure.',
      startDate: new Date('2026-10-01'), endDate: new Date('2026-10-12'),
      targetLeads: 25, budget: 180000, utmCampaign: 'spiti-october-2026',
      keywords: JSON.stringify(['spiti', 'himachal', 'monasteries', 'high altitude']),
    },
  });

  await prisma.campaignEmployee.createMany({
    data: [
      { campaignId: campaign1.id, userId: emp1.id },
      { campaignId: campaign1.id, userId: emp2.id },
      { campaignId: campaign2.id, userId: emp2.id },
      { campaignId: campaign2.id, userId: emp3.id },
      { campaignId: campaign3.id, userId: emp1.id },
      { campaignId: campaign3.id, userId: emp3.id },
      { campaignId: campaign4.id, userId: emp3.id },
    ],
  });

  const leadsData = [
    { name: 'Deepak Verma', phone: '+91-9811223344', email: 'deepak@gmail.com', source: 'WHATSAPP', status: 'INTERESTED', message: 'Hi, I want to book Kedarnath trip for July. How much does it cost?', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, groupSize: 4, preferredDate: 'July 10-20', notes: 'Family of 4, interested in July batch', isRead: true },
    { name: 'Sunita Patel', phone: '+91-9922334455', email: 'sunita@gmail.com', source: 'INSTAGRAM', status: 'FOLLOW_UP_SCHEDULED', message: 'Saw your Zanskar Valley post! Is there availability for August?', destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), followUpNotes: 'Call to discuss package details and pricing', groupSize: 2, preferredDate: 'August 5-15', isRead: true },
    { name: 'Rajesh Gupta', phone: '+91-9833445566', source: 'WHATSAPP', status: 'NEW', message: 'Kedarnath trip available? Need details', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, isRead: false },
    { name: 'Meera Joshi', phone: '+91-9744556677', email: 'meera@gmail.com', source: 'INSTAGRAM', status: 'CONTACTED', message: 'I want to do Char Dham Yatra. What packages do you offer?', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp3.id, groupSize: 6, budget: 50000, isRead: true },
    { name: 'Vikram Singh', phone: '+91-9655667788', source: 'WHATSAPP', status: 'CONFIRMED', message: 'Booking confirmed for Zanskar trek August batch', destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, groupSize: 3, budget: 45000, isRead: true },
    { name: 'Anita Sharma', phone: '+91-9566778899', email: 'anita.sharma@gmail.com', source: 'INSTAGRAM', status: 'LOST', message: 'Too expensive. Will look elsewhere.', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp2.id, notes: 'Budget constraint, found cheaper option', isRead: true },
    { name: 'Suresh Nair', phone: '+91-9477889900', source: 'WHATSAPP', status: 'NEW', message: 'Hello, planning a Char Dham trip for September', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp1.id, isRead: false },
    { name: 'Kavita Reddy', phone: '+91-9388990011', email: 'kavita@gmail.com', source: 'MANUAL', status: 'INTERESTED', message: 'Enquired via website contact form about Spiti Valley', destination: 'Spiti Valley', campaignId: campaign4.id, assignedToId: emp3.id, groupSize: 5, preferredDate: 'October 2026', isRead: true },
    { name: 'Pradeep Mishra', phone: '+91-9299001122', source: 'WHATSAPP', status: 'FOLLOW_UP_SCHEDULED', message: 'Want Kedarnath package for family', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, followUpDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), followUpNotes: 'Send price quote and itinerary', groupSize: 5, isRead: true },
    { name: 'Lakshmi Devi', phone: '+91-9100112233', email: 'lakshmi@yahoo.com', source: 'INSTAGRAM', status: 'NEW', message: 'Is Char Dham trip possible for senior citizens?', destination: 'Char Dham', campaignId: campaign3.id, assignedToId: emp3.id, isRead: false },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({ data: lead });
  }

  await prisma.activityLog.createMany({
    data: [
      { action: 'Lead Created', details: 'Deepak Verma - Kedarnath inquiry via WhatsApp', userId: admin.id },
      { action: 'Status Updated', details: 'Vikram Singh marked as Confirmed', userId: emp2.id },
      { action: 'Follow-up Scheduled', details: 'Follow-up set for Sunita Patel', userId: emp2.id },
      { action: 'Campaign Created', details: 'Kedarnath July Batch campaign created', userId: admin.id },
    ],
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin:      admin@travelcrm.com / admin123');
  console.log('   Employee 1: rahul@travelcrm.com / emp123');
  console.log('   Employee 2: priya@travelcrm.com / emp123');
  console.log('   Employee 3: amit@travelcrm.com / emp123\n');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
