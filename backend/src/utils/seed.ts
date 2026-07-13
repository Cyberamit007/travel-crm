import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { linkBookingToDeparture } from '../controllers/departure.controller.js';
import { notifyFinanceTeam, updateDepartureStatuses } from '../services/notification.service.js';

// ─── Small random-data helpers (used by the bulk demo generator below) ──────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}
function pickWeighted<T>(weights: Array<[T, number]>): T {
  const sumW = weights.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * sumW;
  for (const [label, w] of weights) { if (r < w) return label; r -= w; }
  return weights[weights.length - 1][0];
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function partitionCounts(total: number, buckets: number, min: number, max: number): number[] {
  const raw = Array.from({ length: buckets }, () => min + Math.random() * (max - min));
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => Math.round((v * total) / sum));
  let diff = total - scaled.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0) { scaled[i % buckets] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; i++; }
  return scaled;
}
function weightedFill<T>(total: number, weights: Array<[T, number]>): T[] {
  const sumW = weights.reduce((a, [, w]) => a + w, 0);
  const counts = weights.map(([label, w]) => [label, Math.round((w / sumW) * total)] as [T, number]);
  let diff = total - counts.reduce((a, [, c]) => a + c, 0);
  let i = 0;
  while (diff !== 0) { counts[i % counts.length][1] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; i++; }
  const out: T[] = [];
  for (const [label, c] of counts) for (let k = 0; k < c; k++) out.push(label);
  return shuffle(out);
}
function randomMobile(used: Set<string>): string {
  let phone = '';
  do {
    const first = pick(['6', '7', '8', '9']);
    let rest = '';
    for (let i = 0; i < 9; i++) rest += randomInt(0, 9);
    phone = `+91-${first}${rest}`;
  } while (used.has(phone));
  used.add(phone);
  return phone;
}
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function isoDate(d: Date): string { return d.toISOString().split('T')[0]; }
function avatarFor(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
}

async function upsertDestination(organizationId: string, data: {
  name: string; country: string; state?: string; city?: string;
  type: string; description?: string; isPopular?: boolean;
}) {
  return prisma.destination.upsert({
    where: { id: `dest-${data.name.toLowerCase().replace(/\s+/g, '-')}` },
    update: { ...data, organizationId },
    create: { id: `dest-${data.name.toLowerCase().replace(/\s+/g, '-')}`, ...data, organizationId, status: 'ACTIVE' },
  });
}

async function upsertCategory(organizationId: string, data: {
  name: string; icon?: string; description?: string; sortOrder: number;
}) {
  return prisma.tourCategory.upsert({
    where: { id: `cat-${data.name.toLowerCase().replace(/\s+/g, '-')}` },
    update: { ...data, organizationId },
    create: { id: `cat-${data.name.toLowerCase().replace(/\s+/g, '-')}`, ...data, organizationId, status: 'ACTIVE' },
  });
}

async function findOrCreateCampaign(name: string, data: Record<string, unknown>) {
  const existing = await prisma.campaign.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.campaign.create({ data: data as any });
}

async function upsertDepartment(organizationId: string, code: string, name: string) {
  return prisma.department.upsert({
    where: { code_organizationId: { code, organizationId } },
    update: { name },
    create: { organizationId, code, name, status: 'ACTIVE' },
  });
}

async function findOrCreateDesignation(departmentId: string, name: string) {
  const existing = await prisma.designation.findFirst({ where: { departmentId, name } });
  if (existing) return existing;
  return prisma.designation.create({ data: { departmentId, name, status: 'ACTIVE' } });
}

// Only backfills fields that are currently null — never overwrites a name,
// phone, or other field a real user may have already edited via the app.
async function backfillEmployeeProfile(userId: string, fields: { employeeId: string; departmentId: string; designationId: string; avatarName: string }) {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { employeeId: true, departmentId: true, designationId: true, avatar: true } });
  if (!existing) return;
  const data: Record<string, unknown> = {};
  if (!existing.employeeId) data.employeeId = fields.employeeId;
  if (!existing.departmentId) data.departmentId = fields.departmentId;
  if (!existing.designationId) data.designationId = fields.designationId;
  if (!existing.avatar) data.avatar = avatarFor(fields.avatarName);
  if (Object.keys(data).length > 0) await prisma.user.update({ where: { id: userId }, data });
}

async function main() {
  console.log('Seeding database...');

  // ── 1. Organization ───────────────────────────────────────────────────────
  let org = await prisma.organization.findFirst({ where: { slug: 'default' } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Default Organization', slug: 'default', plan: 'PRO', status: 'ACTIVE' },
    });
    console.log('  + Organization created');
  } else {
    console.log('  ~ Organization already exists');
  }
  const OID = org.id;

  // ── 2. Users ──────────────────────────────────────────────────────────────
  // Existing accounts are matched by email and NEVER have name/phone overwritten
  // here — an admin may have already renamed/edited them via the Employees UI.
  const adminPw = await bcrypt.hash('admin123', 12);
  const empPw   = await bcrypt.hash('emp123', 12);
  const opsPw   = await bcrypt.hash('ops123', 12);
  const financePw = await bcrypt.hash('finance123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Admin User', email: 'admin@travelcrm.com', password: adminPw, role: 'ADMIN', phone: '+91-9876543210', organizationId: OID },
  });
  const emp1 = await prisma.user.upsert({
    where: { email: 'amit@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Amit Kumar', email: 'amit@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543211', organizationId: OID },
  });
  const emp2 = await prisma.user.upsert({
    where: { email: 'kaptan@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Kaptan Singh', email: 'kaptan@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543212', organizationId: OID },
  });
  const emp3 = await prisma.user.upsert({
    where: { email: 'biswas@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Biswas Dey', email: 'biswas@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543213', organizationId: OID },
  });
  const emp4 = await prisma.user.upsert({
    where: { email: 'abhay@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Abhay Verma', email: 'abhay@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543214', organizationId: OID },
  });
  const emp5 = await prisma.user.upsert({
    where: { email: 'priya@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Priya Sharma', email: 'priya@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543215', organizationId: OID },
  });
  const ops1 = await prisma.user.upsert({
    where: { email: 'ops@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Rohan Bisht', email: 'ops@travelcrm.com', password: opsPw, role: 'OPERATIONS', phone: '+91-9876543216', organizationId: OID },
  });
  const ops2 = await prisma.user.upsert({
    where: { email: 'ops2@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Simran Kaur', email: 'ops2@travelcrm.com', password: opsPw, role: 'OPERATIONS', phone: '+91-9876543217', organizationId: OID },
  });
  const fin1 = await prisma.user.upsert({
    where: { email: 'finance1@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Ananya Iyer', email: 'finance1@travelcrm.com', password: financePw, role: 'FINANCE', phone: '+91-9876543218', organizationId: OID },
  });
  const fin2 = await prisma.user.upsert({
    where: { email: 'finance2@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Rahul Deshmukh', email: 'finance2@travelcrm.com', password: financePw, role: 'FINANCE', phone: '+91-9876543219', organizationId: OID },
  });

  await prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: OID } });

  // Departments / Designations + additive employee-profile backfill (employeeId,
  // department, designation, avatar placeholder) — only fills fields left null.
  const deptAdmin = await upsertDepartment(OID, 'ADMIN', 'Administration');
  const deptSales = await upsertDepartment(OID, 'SALES', 'Sales');
  const deptOps = await upsertDepartment(OID, 'OPS', 'Operations');
  const deptFinance = await upsertDepartment(OID, 'FINANCE', 'Finance');
  const desigAdmin = await findOrCreateDesignation(deptAdmin.id, 'Administrator');
  const desigSales = await findOrCreateDesignation(deptSales.id, 'Sales Executive');
  const desigOps = await findOrCreateDesignation(deptOps.id, 'Operations Executive');
  const desigFinance = await findOrCreateDesignation(deptFinance.id, 'Finance Executive');

  const employeeProfiles: Array<{ user: { id: string; name: string }; employeeId: string; departmentId: string; designationId: string }> = [
    { user: admin, employeeId: 'EMP-ADM-001', departmentId: deptAdmin.id, designationId: desigAdmin.id },
    { user: emp1, employeeId: 'EMP-SLS-001', departmentId: deptSales.id, designationId: desigSales.id },
    { user: emp2, employeeId: 'EMP-SLS-002', departmentId: deptSales.id, designationId: desigSales.id },
    { user: emp3, employeeId: 'EMP-SLS-003', departmentId: deptSales.id, designationId: desigSales.id },
    { user: emp4, employeeId: 'EMP-SLS-004', departmentId: deptSales.id, designationId: desigSales.id },
    { user: emp5, employeeId: 'EMP-SLS-005', departmentId: deptSales.id, designationId: desigSales.id },
    { user: ops1, employeeId: 'EMP-OPS-001', departmentId: deptOps.id, designationId: desigOps.id },
    { user: ops2, employeeId: 'EMP-OPS-002', departmentId: deptOps.id, designationId: desigOps.id },
    { user: fin1, employeeId: 'EMP-FIN-001', departmentId: deptFinance.id, designationId: desigFinance.id },
    { user: fin2, employeeId: 'EMP-FIN-002', departmentId: deptFinance.id, designationId: desigFinance.id },
  ];
  for (const p of employeeProfiles) {
    await backfillEmployeeProfile(p.user.id, { employeeId: p.employeeId, departmentId: p.departmentId, designationId: p.designationId, avatarName: p.user.name });
  }
  console.log('  ~ Users ready: 1 Admin, 5 Sales, 2 Operations, 2 Finance');

  // ── 3. Destinations ───────────────────────────────────────────────────────
  const destKed  = await upsertDestination(OID, { name: 'Kedarnath', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', isPopular: true, description: 'Sacred Shiva temple at 3,583m in the Himalayas' });
  const destBad  = await upsertDestination(OID, { name: 'Badrinath', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', isPopular: true, description: 'One of the Char Dham, sacred to Lord Vishnu' });
  const destYam  = await upsertDestination(OID, { name: 'Yamunotri', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', description: 'Source of Yamuna River, first of Char Dham' });
  const destGan  = await upsertDestination(OID, { name: 'Gangotri', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', description: 'Origin of Ganga River, sacred pilgrimage site' });
  const destAmar = await upsertDestination(OID, { name: 'Amarnath', country: 'India', state: 'Jammu & Kashmir', type: 'DOMESTIC', isPopular: true, description: 'Sacred cave shrine of Lord Shiva at 3,888m' });
  const destVais = await upsertDestination(OID, { name: 'Vaishno Devi', country: 'India', state: 'Jammu & Kashmir', type: 'DOMESTIC', isPopular: true, description: 'Revered Hindu pilgrimage in Trikuta Mountains' });
  const destZan  = await upsertDestination(OID, { name: 'Zanskar Valley', country: 'India', state: 'Ladakh', type: 'DOMESTIC', description: 'Remote valley ideal for high-altitude trekking' });
  const destSpit = await upsertDestination(OID, { name: 'Spiti Valley', country: 'India', state: 'Himachal Pradesh', type: 'DOMESTIC', isPopular: true, description: 'Cold desert mountain valley, "The Middle Land"' });
  const destLeh  = await upsertDestination(OID, { name: 'Leh-Ladakh', country: 'India', state: 'Ladakh', type: 'DOMESTIC', isPopular: true, description: 'Land of high passes — stunning Buddhist culture and landscapes' });
  const destVof  = await upsertDestination(OID, { name: 'Valley of Flowers', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', description: 'UNESCO World Heritage Site, bloom season Jul-Sep' });
  const destMan  = await upsertDestination(OID, { name: 'Manali', country: 'India', state: 'Himachal Pradesh', type: 'DOMESTIC', isPopular: true, description: 'Popular hill station and gateway to Lahaul-Spiti' });
  const destHar  = await upsertDestination(OID, { name: 'Haridwar-Rishikesh', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', description: 'Gateway to Char Dham, sacred Ganga ghats' });
  const destNep  = await upsertDestination(OID, { name: 'Nepal Pashupatinath', country: 'Nepal', city: 'Kathmandu', type: 'INTERNATIONAL', description: 'Sacred Hindu temple complex in Kathmandu' });
  const destBhu  = await upsertDestination(OID, { name: 'Bhutan', country: 'Bhutan', city: 'Thimphu', type: 'INTERNATIONAL', description: 'Kingdom of Happiness, Tiger\'s Nest monastery' });
  const destKash = await upsertDestination(OID, { name: 'Kashmir', country: 'India', state: 'Jammu & Kashmir', city: 'Srinagar', type: 'DOMESTIC', isPopular: true, description: 'Paradise on Earth — Dal Lake shikara rides, Gulmarg, Pahalgam and Sonmarg' });
  const destRaj  = await upsertDestination(OID, { name: 'Rajasthan', country: 'India', state: 'Rajasthan', city: 'Jaipur', type: 'DOMESTIC', isPopular: true, description: 'Land of Kings — forts, palaces, desert safaris and vibrant culture' });

  console.log('  ~ Destinations ready');

  // ── 4. Tour Categories ────────────────────────────────────────────────────
  const catCharDham  = await upsertCategory(OID, { name: 'Char Dham', icon: '🙏', sortOrder: 1, description: 'Yamunotri · Gangotri · Kedarnath · Badrinath' });
  const catPilgrim   = await upsertCategory(OID, { name: 'Pilgrimage', icon: '⛩️', sortOrder: 2, description: 'Sacred journeys to religious destinations' });
  const catTrek      = await upsertCategory(OID, { name: 'Trek', icon: '🏔️', sortOrder: 3, description: 'Himalayan trekking adventures' });
  const catAdventure = await upsertCategory(OID, { name: 'Adventure', icon: '🧗', sortOrder: 4, description: 'Thrill-seeking tours and expeditions' });
  const catHeritage  = await upsertCategory(OID, { name: 'Heritage', icon: '🏛️', sortOrder: 5, description: 'Historical and cultural tours' });
  const catWildlife  = await upsertCategory(OID, { name: 'Wildlife', icon: '🦁', sortOrder: 6, description: 'National parks and wildlife safaris' });
  const catIntl      = await upsertCategory(OID, { name: 'International', icon: '✈️', sortOrder: 7, description: 'International religious and leisure tours' });
  const catWeekend   = await upsertCategory(OID, { name: 'Weekend Getaway', icon: '🌄', sortOrder: 8, description: 'Short 2-3 day trips from metro cities' });
  const catLeisure   = await upsertCategory(OID, { name: 'Leisure', icon: '🏖️', sortOrder: 9, description: 'Relaxed sightseeing and leisure holidays' });

  console.log('  ~ Tour Categories ready');

  // ── 5. Packages ───────────────────────────────────────────────────────────
  const inclKed = JSON.stringify(['Transportation by Tempo Traveller/Bus', 'Accommodation (3★ hotel + dharmshala)', 'Breakfast & Dinner daily', 'Helicopter option (extra cost)', 'Expert pilgrimage guide', 'Pony/Palanquin arrangement at base camp', 'All tolls & parking charges']);
  const exclKed = JSON.stringify(['Personal expenses & tips', 'Lunch during journey', 'Helicopter charges if opted', 'Medical insurance', 'GST extra as applicable']);
  const hlKed   = JSON.stringify(['Kedarnath Temple darshan', 'Gaurikund base camp', 'Vasuki Tal optional trek', 'Triyuginarayan temple visit', 'Sunrise view from Kedarnath summit']);

  const inclChar = JSON.stringify(['AC Vehicle for entire route', 'Hotel stay (double sharing) on MAP plan', 'All Char Dham darshan arrangements', 'Expert guide at each shrine', 'Helicopter options available', 'Mule/Palanquin at Kedarnath', 'All tolls, permits & entry fees']);
  const exclChar = JSON.stringify(['Airfare / train tickets', 'Personal shopping & laundry', 'Pony/helicopter charges', 'Extra meals beyond MAP plan', 'Travel insurance']);
  const hlChar   = JSON.stringify(['Complete Char Dham circuit', 'Yamunotri — source of Yamuna', 'Gangotri — source of Ganga', 'Kedarnath temple at 3583m', 'Badrinath — Chardham completion', 'Mana village — last Indian village']);

  const inclZan = JSON.stringify(['Tented camping with meals', 'Expert trek leader & cook', 'Permits for restricted areas', 'Ponies for luggage', 'Safety equipment & first aid', 'Transport from/to Leh', 'Emergency evacuation cover']);
  const exclZan = JSON.stringify(['Personal trekking gear', 'Travel & medical insurance', 'Sleeping bag (can be rented)', 'Alcoholic beverages', 'Charges for medical emergencies']);
  const hlZan   = JSON.stringify(['Zanskar River canyon walk', 'Phuktal Monastery (remote gem)', 'High passes above 5000m', 'Authentic Zanskari village stays', 'Pristine untouched landscapes']);

  const inclLeh = JSON.stringify(['Hotel accommodation (3★)', 'Airport transfers', 'Tempo Traveller for sightseeing', 'Breakfast & Dinner daily', 'Inner line permits', 'English-speaking local guide', 'Rafting on Zanskar River (optional)']);
  const exclLeh = JSON.stringify(['Airfare to/from Leh', 'Bike rental charges', 'Paragliding/zip-line extras', 'Personal expenses', 'Travel insurance']);
  const hlLeh   = JSON.stringify(['Pangong Tso lake', 'Nubra Valley sand dunes', 'Khardung La pass (5359m)', 'Hemis & Thiksey Monasteries', 'Magnetic Hill & Gurudwara Pathar Sahib', 'Zanskar River confluence']);

  const inclAmar = JSON.stringify(['Transportation (Delhi ↔ Jammu ↔ Pahalgam/Baltal)', 'Hotel + tent accommodation', 'All meals during trek', 'Yatra registration & permits', 'Pony arrangement option', 'RFID card assistance', 'Medical team at base camp']);
  const exclAmar = JSON.stringify(['Airfare / train tickets', 'Helicopter darshan (extra)', 'Personal gear & clothing', 'Medical emergencies beyond basic', 'Tips to staff']);
  const hlAmar   = JSON.stringify(['Amarnath Cave shrine (ice lingam)', 'Pahalgam or Baltal route options', 'Sheshnag Lake', 'Pissu Top', 'Panchtarni meadows']);

  const inclVais = JSON.stringify(['Katra ↔ Vaishno Devi transportation', 'Hotel in Katra (2 nights)', 'Porters for luggage', 'RFID yatra registration', 'Darshan at Bhawan', 'Return by ropeway (optional)', 'Meals as per plan']);
  const exclVais = JSON.stringify(['Train / flight tickets', 'Pony / helicopter charges', 'Personal donations at temple', 'Extra meals beyond plan']);
  const hlVais   = JSON.stringify(['Mata Vaishno Devi Bhawan', 'Ardhkuwari cave shrine', 'Bhairavnath temple', 'Tarakote viewpoint', 'Shiv Khori temple sidetrip']);

  const packages = [
    {
      id: 'pkg-kedarnath-6n7d', name: 'Kedarnath Yatra 6N7D', code: 'KED-6N7D-DEL',
      description: 'Complete Kedarnath Yatra package from Delhi. Includes all transport, accommodation and guided pilgrimage.',
      destinationId: destKed.id, tourCategoryId: catPilgrim.id,
      nights: 6, days: 7, pricePerPerson: 12000, priceSingle: 16000, priceDouble: 12000, priceTriple: 10500,
      isPopular: true, inclusions: inclKed, exclusions: exclKed, highlights: hlKed,
    },
    {
      id: 'pkg-char-dham-12n13d', name: 'Char Dham Yatra 12N13D', code: 'CHAR-12N13D',
      description: 'Complete Char Dham circuit — Yamunotri, Gangotri, Kedarnath, Badrinath — from Haridwar.',
      destinationId: destBad.id, tourCategoryId: catCharDham.id,
      nights: 12, days: 13, pricePerPerson: 25000, priceSingle: 32000, priceDouble: 25000, priceTriple: 22000, priceQuad: 20000,
      isPopular: true, inclusions: inclChar, exclusions: exclChar, highlights: hlChar,
    },
    {
      id: 'pkg-zanskar-10n11d', name: 'Zanskar Valley Trek 10N11D', code: 'ZAN-10N11D-DEL',
      description: 'High-altitude trekking through the spectacular Zanskar Valley. Full camp support with experienced guides.',
      destinationId: destZan.id, tourCategoryId: catTrek.id,
      nights: 10, days: 11, pricePerPerson: 22000, priceSingle: 28000, priceDouble: 22000, priceTriple: 19000,
      isPopular: true, inclusions: inclZan, exclusions: exclZan, highlights: hlZan,
    },
    {
      id: 'pkg-leh-ladakh-7n8d', name: 'Leh-Ladakh Explorer 7N8D', code: 'LEH-7N8D-DEL',
      description: 'Discover the Land of High Passes — Pangong Lake, Nubra Valley, monasteries and mountain passes.',
      destinationId: destLeh.id, tourCategoryId: catAdventure.id,
      nights: 7, days: 8, pricePerPerson: 28000, priceSingle: 36000, priceDouble: 28000, priceTriple: 24000,
      isPopular: true, inclusions: inclLeh, exclusions: exclLeh, highlights: hlLeh,
    },
    {
      id: 'pkg-amarnath-5n6d', name: 'Amarnath Yatra 5N6D', code: 'AMAR-5N6D-JAM',
      description: 'Sacred Amarnath pilgrimage — Pahalgam route with full support and permits.',
      destinationId: destAmar.id, tourCategoryId: catPilgrim.id,
      nights: 5, days: 6, pricePerPerson: 15000, priceSingle: 19000, priceDouble: 15000, priceTriple: 13000,
      isPopular: false, inclusions: inclAmar, exclusions: exclAmar, highlights: hlAmar,
    },
    {
      id: 'pkg-vaishno-devi-2n3d', name: 'Vaishno Devi 2N3D', code: 'VAIS-2N3D-DEL',
      description: 'Short Vaishno Devi pilgrimage from Delhi. Perfect weekend spiritual trip.',
      destinationId: destVais.id, tourCategoryId: catPilgrim.id,
      nights: 2, days: 3, pricePerPerson: 8000, priceSingle: 10500, priceDouble: 8000, priceTriple: 7000, priceQuad: 6500,
      isPopular: true, inclusions: inclVais, exclusions: exclVais, highlights: hlVais,
    },
    {
      id: 'pkg-spiti-8n9d', name: 'Spiti Valley 8N9D', code: 'SPIT-8N9D-MAN',
      description: 'Explore the cold desert of Spiti Valley — ancient monasteries, villages and dramatic landscapes.',
      destinationId: destSpit.id, tourCategoryId: catAdventure.id,
      nights: 8, days: 9, pricePerPerson: 18000, priceSingle: 23000, priceDouble: 18000, priceTriple: 16000,
      isPopular: false,
      inclusions: JSON.stringify(['Tempo Traveller Delhi-Delhi', 'Hotel + homestay accommodation', 'Breakfast & Dinner', 'Local guide', 'Inner line permits', 'Monastery entry fees']),
      exclusions: JSON.stringify(['Personal expenses', 'Alcoholic beverages', 'Travel insurance', 'Bike rent if opted', 'Lunch during travel']),
      highlights: JSON.stringify(['Key Monastery (4166m)', 'Tabo Monastery (996 AD)', 'Pin Valley National Park', 'Kibber village drive', 'Dhankar Lake hike', 'Kaza local market']),
    },
    {
      id: 'pkg-valley-flowers-5n6d', name: 'Valley of Flowers 5N6D', code: 'VOF-5N6D-DEL',
      description: 'Trek to the UNESCO World Heritage Valley of Flowers during bloom season (Jul-Sep).',
      destinationId: destVof.id, tourCategoryId: catTrek.id,
      nights: 5, days: 6, pricePerPerson: 11000, priceSingle: 14000, priceDouble: 11000, priceTriple: 9500,
      isPopular: false,
      inclusions: JSON.stringify(['Transport Delhi to Joshimath', 'Trek support (guide + cook)', 'Forest dept. permits', 'Camp meals (breakfast, lunch, dinner)', 'Return transfer']),
      exclusions: JSON.stringify(['Personal trekking gear', 'Sleeping bag', 'Travel insurance', 'Tips']),
      highlights: JSON.stringify(['Valley of Flowers National Park', 'Hemkund Sahib Gurudwara', 'Bhyundar village', 'Alpine wildflowers (500+ species)', 'Pushpawati River camp']),
    },
    {
      id: 'pkg-manali-3n4d', name: 'Manali Weekend 3N4D', code: 'MAN-3N4D-DEL',
      description: 'Quick Manali getaway — Rohtang Pass, Solang Valley, river rafting and snow activities.',
      destinationId: destMan.id, tourCategoryId: catWeekend.id,
      nights: 3, days: 4, pricePerPerson: 9000, priceSingle: 12000, priceDouble: 9000, priceTriple: 7800, priceQuad: 7200,
      isPopular: true,
      inclusions: JSON.stringify(['AC Volvo bus / Tempo Traveller', 'Hotel (2★-3★) on CP plan', 'Rohtang Pass permit', 'Solang Valley cable car', 'Local sightseeing']),
      exclusions: JSON.stringify(['Snow activities gear rental', 'River rafting charges', 'Lunch', 'Personal expenses']),
      highlights: JSON.stringify(['Rohtang Pass (3978m)', 'Solang Valley snowfields', 'Hadimba Devi Temple', 'Old Manali market', 'Beas River rafting', 'Sissu waterfall']),
    },
    {
      id: 'pkg-nepal-5n6d', name: 'Nepal Spiritual Tour 5N6D', code: 'NEP-5N6D-DEL',
      description: 'International spiritual journey — Pashupatinath, Muktinath, Janakpur and Lumbini.',
      destinationId: destNep.id, tourCategoryId: catIntl.id,
      nights: 5, days: 6, pricePerPerson: 18000, priceSingle: 24000, priceDouble: 18000, priceTriple: 16000,
      isPopular: false,
      inclusions: JSON.stringify(['Delhi-Kathmandu-Delhi flights', '3★ hotel accommodation', 'Airport transfers', 'All Nepal visa fees', 'Guide & transport in Nepal', 'Pashupatinath aarti', 'Muktinath visit (extra if incl.)']),
      exclusions: JSON.stringify(['Personal expenses', 'Meals unless stated', 'Travel insurance', 'Tipping']),
      highlights: JSON.stringify(['Pashupatinath Temple (UNESCO)', 'Swayambhunath Stupa', 'Boudhanath — largest stupa', 'Janakpur Dham', 'Lumbini — Buddha birthplace']),
    },
    {
      id: 'pkg-kashmir-6n7d', name: 'Kashmir Paradise 6N7D', code: 'KASH-6N7D-SRI',
      description: 'Srinagar, Gulmarg, Pahalgam and Sonmarg — houseboat stay, shikara ride and the best of the valley.',
      destinationId: destKash.id, tourCategoryId: catLeisure.id,
      nights: 6, days: 7, pricePerPerson: 22000, priceSingle: 28000, priceDouble: 22000, priceTriple: 19500,
      isPopular: true,
      inclusions: JSON.stringify(['Airport/rail transfers', 'Houseboat stay on Dal Lake (1 night)', 'Hotel accommodation (4★) rest of trip', 'Breakfast & Dinner daily', 'Shikara ride', 'Private cab for sightseeing', 'Gondola ride (Phase 1)']),
      exclusions: JSON.stringify(['Airfare / train tickets', 'Gondola Phase 2 charges', 'Pony/sledge charges at Gulmarg', 'Personal expenses', 'Travel insurance']),
      highlights: JSON.stringify(['Dal Lake shikara ride & houseboat stay', 'Gulmarg gondola & meadows', 'Betaab Valley, Pahalgam', 'Sonmarg glacier point', 'Mughal Gardens, Srinagar']),
    },
    {
      id: 'pkg-rajasthan-7n8d', name: 'Rajasthan Royal Heritage 7N8D', code: 'RAJ-7N8D-JAI',
      description: 'Jaipur, Jodhpur, Udaipur and Jaisalmer — forts, palaces, desert safari and royal heritage.',
      destinationId: destRaj.id, tourCategoryId: catHeritage.id,
      nights: 7, days: 8, pricePerPerson: 26000, priceSingle: 33000, priceDouble: 26000, priceTriple: 23000,
      isPopular: true,
      inclusions: JSON.stringify(['AC vehicle for entire circuit', 'Heritage hotel accommodation', 'Breakfast daily', 'Desert safari & camel ride in Jaisalmer', 'Fort & palace entry fees', 'Local heritage guide']),
      exclusions: JSON.stringify(['Airfare / train tickets', 'Lunch & dinner (except desert camp)', 'Camera fees at monuments', 'Personal expenses', 'Travel insurance']),
      highlights: JSON.stringify(['Amber Fort & City Palace, Jaipur', 'Mehrangarh Fort, Jodhpur', 'Lake Pichola, Udaipur', 'Jaisalmer desert safari & camp', 'Sam Sand Dunes sunset']),
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { id: pkg.id },
      update: { ...pkg, organizationId: OID, status: 'ACTIVE' },
      create: { ...pkg, organizationId: OID, status: 'ACTIVE' },
    });
  }
  console.log(`  ~ ${packages.length} packages ready`);

  // ── 5b. Package Itinerary (day-wise workflow template) ────────────────────
  // Drives both Sales' BookingTask generation and Operations' DepartureTask
  // generation — configured once per package, reused by both panels.
  const itineraries: Record<string, Array<{ dayOffset: number; title: string; description?: string; taskType: string; department: string; sortOrder: number }>> = {
    'pkg-kedarnath-6n7d': [
      { dayOffset: -7, title: 'Collect traveler documents', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -3, title: 'Confirm hotel booking', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -2, title: 'Confirm vehicle & driver', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: -1, title: 'Send reminder & packing checklist', taskType: 'SEND_REMINDER', department: 'ALL', sortOrder: 4 },
      { dayOffset: 0, title: 'Departure from Delhi', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 1, title: 'Arrival & hotel check-in', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
      { dayOffset: 2, title: 'Kedarnath trek & darshan', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 7 },
      { dayOffset: 6, title: 'Return journey to Delhi', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 8 },
      { dayOffset: 8, title: 'Collect review & feedback', taskType: 'COLLECT_REVIEW', department: 'SALES', sortOrder: 9 },
    ],
    'pkg-zanskar-10n11d': [
      { dayOffset: -10, title: 'Collect traveler documents & medical fitness', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -4, title: 'Confirm camping & permits', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -2, title: 'Confirm transport from Leh', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: -1, title: 'Send altitude sickness briefing', taskType: 'SEND_REMINDER', department: 'ALL', sortOrder: 4 },
      { dayOffset: 0, title: 'Departure from Leh', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 3, title: 'Zanskar River canyon trek', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
      { dayOffset: 6, title: 'Phuktal Monastery visit', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 7 },
      { dayOffset: 10, title: 'Return journey to Leh', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 8 },
    ],
    'pkg-kashmir-6n7d': [
      { dayOffset: -5, title: 'Collect traveler documents', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -3, title: 'Confirm houseboat & hotel booking', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -2, title: 'Confirm cab & driver', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: -1, title: 'Send packing checklist & itinerary', taskType: 'SEND_REMINDER', department: 'ALL', sortOrder: 4 },
      { dayOffset: 0, title: 'Arrival in Srinagar, houseboat check-in', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 2, title: 'Gulmarg gondola excursion', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
      { dayOffset: 6, title: 'Departure transfer', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 7 },
      { dayOffset: 8, title: 'Collect review & feedback', taskType: 'COLLECT_REVIEW', department: 'SALES', sortOrder: 8 },
    ],
    'pkg-manali-3n4d': [
      { dayOffset: -3, title: 'Collect traveler documents', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -1, title: 'Confirm hotel & Volvo booking', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: 0, title: 'Departure from Delhi', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: 1, title: 'Rohtang Pass / Solang Valley excursion', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 4 },
      { dayOffset: 3, title: 'Return journey to Delhi', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
    ],
    'pkg-spiti-8n9d': [
      { dayOffset: -6, title: 'Collect traveler documents', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -3, title: 'Confirm homestay & permits', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -2, title: 'Confirm Tempo Traveller', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: 0, title: 'Departure from Manali', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 4 },
      { dayOffset: 4, title: 'Key & Tabo Monastery visit', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 8, title: 'Return journey to Manali', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
    ],
    'pkg-leh-ladakh-7n8d': [
      { dayOffset: -5, title: 'Collect traveler documents & inner line permits', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -2, title: 'Confirm hotel booking', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -1, title: 'Confirm Innova/Tempo Traveller', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: 0, title: 'Arrival in Leh, acclimatization day', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 4 },
      { dayOffset: 3, title: 'Pangong Tso excursion', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 5, title: 'Nubra Valley & Khardung La', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
      { dayOffset: 7, title: 'Departure transfer', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 7 },
    ],
    'pkg-rajasthan-7n8d': [
      { dayOffset: -5, title: 'Collect traveler documents', taskType: 'COLLECT_DOCS', department: 'SALES', sortOrder: 1 },
      { dayOffset: -2, title: 'Confirm heritage hotel booking', taskType: 'CONFIRM_HOTEL', department: 'OPERATIONS', sortOrder: 2 },
      { dayOffset: -1, title: 'Confirm AC vehicle for circuit', taskType: 'CONFIRM_VEHICLE', department: 'OPERATIONS', sortOrder: 3 },
      { dayOffset: 0, title: 'Arrival in Jaipur, City Palace visit', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 4 },
      { dayOffset: 3, title: 'Mehrangarh Fort, Jodhpur', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 5 },
      { dayOffset: 5, title: 'Jaisalmer desert safari & camp', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 6 },
      { dayOffset: 7, title: 'Departure transfer', taskType: 'TRIP_DAY', department: 'OPERATIONS', sortOrder: 7 },
    ],
  };

  let itinerariesCreated = 0;
  for (const [packageId, items] of Object.entries(itineraries)) {
    const existingCount = await prisma.packageItinerary.count({ where: { packageId } });
    if (existingCount === 0) {
      await prisma.packageItinerary.createMany({ data: items.map((i) => ({ ...i, packageId })) });
      itinerariesCreated += items.length;
    }
  }
  console.log(`  ~ ${itinerariesCreated} package itinerary steps ready`);

  // ── 6. Campaigns ─────────────────────────────────────────────────────────
  const campaign1 = await findOrCreateCampaign('Kedarnath July Batch', {
    name: 'Kedarnath July Batch', destination: 'Kedarnath', status: 'ACTIVE',
    description: 'Sacred Kedarnath Yatra — July 2026 batch.',
    startDate: new Date('2026-07-10'), endDate: new Date('2026-07-20'),
    targetLeads: 50, budget: 150000, whatsappNumber: '+918800000001',
    utmCampaign: 'kedarnath-july-2026',
    keywords: JSON.stringify(['kedarnath', 'kedar', 'shiva', 'july yatra']),
    organizationId: OID,
  });
  const campaign2 = await findOrCreateCampaign('Zanskar Valley August', {
    name: 'Zanskar Valley August', destination: 'Zanskar Valley', status: 'ACTIVE',
    description: 'Epic Zanskar Valley trek — August 2026 batch.',
    startDate: new Date('2026-08-05'), endDate: new Date('2026-08-18'),
    targetLeads: 30, budget: 200000, whatsappNumber: '+918800000002',
    instagramAdId: 'ig_ad_zanskar_2026', utmCampaign: 'zanskar-august-2026',
    keywords: JSON.stringify(['zanskar', 'ladakh', 'valley trek', 'august trek']),
    organizationId: OID,
  });
  const campaign3 = await findOrCreateCampaign('Char Dham Yatra 2026', {
    name: 'Char Dham Yatra 2026', destination: 'Char Dham', status: 'ACTIVE',
    description: 'Complete Char Dham Yatra — Yamunotri, Gangotri, Kedarnath, Badrinath.',
    startDate: new Date('2026-09-01'), endDate: new Date('2026-09-15'),
    targetLeads: 40, budget: 300000, utmCampaign: 'char-dham-2026',
    keywords: JSON.stringify(['char dham', 'yamunotri', 'gangotri', 'badrinath', 'pilgrimage']),
    organizationId: OID,
  });
  const campaign4 = await findOrCreateCampaign('Spiti Valley October', {
    name: 'Spiti Valley October', destination: 'Spiti Valley', status: 'DRAFT',
    description: 'Hidden paradise of Spiti Valley — October 2026 before snow closure.',
    startDate: new Date('2026-10-01'), endDate: new Date('2026-10-12'),
    targetLeads: 25, budget: 180000, utmCampaign: 'spiti-october-2026',
    keywords: JSON.stringify(['spiti', 'himachal', 'monasteries', 'high altitude']),
    organizationId: OID,
  });
  const campaign5 = await findOrCreateCampaign('Leh-Ladakh Explorer July', {
    name: 'Leh-Ladakh Explorer July', destination: 'Leh-Ladakh', status: 'ACTIVE',
    description: 'Comprehensive Ladakh tour — July 2026.',
    startDate: new Date('2026-07-15'), endDate: new Date('2026-07-31'),
    targetLeads: 35, budget: 250000, utmCampaign: 'leh-july-2026',
    keywords: JSON.stringify(['leh', 'ladakh', 'pangong', 'nubra', 'khardung']),
    organizationId: OID,
  });

  await prisma.campaign.updateMany({ where: { organizationId: null }, data: { organizationId: OID } });

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
      { campaignId: campaign5.id, userId: emp2.id },
      { campaignId: campaign5.id, userId: emp5.id },
    ],
  });

  // Meta Ads campaigns for the 5 headline destinations — the source for all
  // demo leads generated below, so Campaign Management shows real spend context.
  const now0 = new Date();
  const metaCampaignStart = addDays(now0, -15);
  const metaCampaigns: Record<string, Awaited<ReturnType<typeof findOrCreateCampaign>>> = {};
  const metaCampaignDefs = [
    { key: 'Kashmir', name: 'Kashmir Paradise — Meta Ads', destination: 'Kashmir', budget: 220000 },
    { key: 'Manali', name: 'Manali Weekend — Meta Ads', destination: 'Manali', budget: 140000 },
    { key: 'Spiti', name: 'Spiti Valley — Meta Ads', destination: 'Spiti', budget: 180000 },
    { key: 'Ladakh', name: 'Leh-Ladakh Explorer — Meta Ads', destination: 'Ladakh', budget: 260000 },
    { key: 'Rajasthan', name: 'Rajasthan Royal Heritage — Meta Ads', destination: 'Rajasthan', budget: 200000 },
  ];
  for (const c of metaCampaignDefs) {
    metaCampaigns[c.key] = await findOrCreateCampaign(c.name, {
      name: c.name, destination: c.destination, status: 'ACTIVE',
      description: `Meta (Facebook/Instagram) lead-generation campaign for ${c.destination}.`,
      startDate: metaCampaignStart, endDate: addDays(now0, 45),
      targetLeads: 100, budget: c.budget, isFromMeta: true, utmSource: 'meta',
      utmCampaign: `${c.key.toLowerCase()}-meta-ads`,
      organizationId: OID,
    });
  }
  await prisma.campaignEmployee.createMany({
    skipDuplicates: true,
    data: Object.values(metaCampaigns).flatMap((c) => [emp1, emp2, emp3, emp4, emp5].map((e) => ({ campaignId: c.id, userId: e.id }))),
  });
  console.log('  ~ Campaigns ready (incl. 5 Meta Ads campaigns)');

  // ── 7. Vendors (shared Operations/Finance master list) ───────────────────
  const vendorDefs = [
    { id: 'vendor-himalayan-stays', name: 'Himalayan Stays', type: 'HOTEL', contact: '+91-9412034567', notes: 'Preferred hotel vendor for Uttarakhand routes.' },
    { id: 'vendor-ladakh-camps', name: 'Ladakh Camps Co.', type: 'VEHICLE', contact: '+91-9419012345', notes: 'Camping + transport vendor for Ladakh/Zanskar treks.' },
    { id: 'vendor-kashmir-hotels', name: 'Kashmir Heritage Hotels', type: 'HOTEL', contact: '+91-9906112233', notes: 'Houseboats and hotels across Srinagar, Gulmarg, Pahalgam.' },
    { id: 'vendor-kashmir-cabs', name: 'Kashmir Valley Cabs', type: 'VEHICLE', contact: '+91-9906223344', notes: 'Private cabs for Kashmir sightseeing circuit.' },
    { id: 'vendor-manali-hotels', name: 'Manali Hotels Co.', type: 'HOTEL', contact: '+91-9816112233', notes: 'Budget to premium hotels across Manali.' },
    { id: 'vendor-manali-travels', name: 'Manali Volvo Travels', type: 'VEHICLE', contact: '+91-9816223344', notes: 'Volvo & Tempo Traveller fleet for Manali routes.' },
    { id: 'vendor-spiti-homestays', name: 'Spiti Homestays Network', type: 'HOTEL', contact: '+91-9805112233', notes: 'Homestay + guesthouse network across Spiti villages.' },
    { id: 'vendor-spiti-transport', name: 'Spiti Adventure Transport', type: 'VEHICLE', contact: '+91-9805223344', notes: 'High-altitude rated Tempo Travellers for Spiti circuit.' },
    { id: 'vendor-leh-hotels', name: 'Leh Palace Hotels', type: 'HOTEL', contact: '+91-9419334455', notes: 'Hotels across Leh town for Ladakh tours.' },
    { id: 'vendor-rajasthan-hotels', name: 'Rajasthan Heritage Hotels', type: 'HOTEL', contact: '+91-9829112233', notes: 'Heritage havelis and forts converted to hotels.' },
    { id: 'vendor-rajasthan-cabs', name: 'Rajasthan Desert Cabs', type: 'VEHICLE', contact: '+91-9829223344', notes: 'AC vehicles for the Jaipur-Jodhpur-Udaipur-Jaisalmer circuit.' },
    { id: 'vendor-trip-captains-guild', name: 'Himalayan Trip Captains Guild', type: 'LOCAL_GUIDE', contact: '+91-9412998877', notes: 'Freelance trip captains / tour leaders pool used across destinations.' },
  ];
  const vendors: Record<string, Awaited<ReturnType<typeof prisma.vendor.upsert>>> = {};
  for (const v of vendorDefs) {
    vendors[v.id] = await prisma.vendor.upsert({
      where: { id: v.id },
      update: { organizationId: OID },
      create: { ...v, organizationId: OID },
    });
  }
  console.log(`  ~ ${vendorDefs.length} vendors ready`);

  // ── 8. Bulk demo generator: 500 leads / 150 confirmed bookings ───────────
  // Guarded so re-running the seed never duplicates the bulk demo dataset —
  // it only generates once (checked via the META_ADS source marker, which
  // this generator is the sole producer of).
  const existingBulkLeads = await prisma.lead.count({ where: { organizationId: OID, source: 'META_ADS' } });
  if (existingBulkLeads >= 400) {
    console.log(`  ~ Bulk demo dataset already present (${existingBulkLeads} Meta Ads leads) — skipping generation`);
  } else {
    console.log('  + Generating bulk demo dataset (500 leads / 150 confirmed bookings)...');
    const now = new Date();
    const salesUsers = [emp1, emp2, emp3, emp4, emp5];
    const financeUsers = [fin1, fin2];

    const maleFirstNames = ['Rahul', 'Amit', 'Rohit', 'Vikas', 'Sanjay', 'Deepak', 'Anil', 'Suresh', 'Manoj', 'Ravi', 'Ajay', 'Vinod', 'Rajesh', 'Naveen', 'Pankaj', 'Arvind', 'Ashok', 'Gaurav', 'Nitin', 'Sandeep', 'Vikram', 'Sunil', 'Praveen', 'Yogesh', 'Dinesh', 'Mahesh', 'Ramesh', 'Sachin', 'Vivek', 'Alok', 'Harish', 'Rajeev', 'Anand', 'Manish', 'Kunal', 'Siddharth', 'Abhishek', 'Karan', 'Varun', 'Aditya'];
    const femaleFirstNames = ['Priya', 'Neha', 'Pooja', 'Anjali', 'Kavita', 'Sunita', 'Meena', 'Rekha', 'Anita', 'Sneha', 'Divya', 'Shweta', 'Ritu', 'Nisha', 'Swati', 'Aarti', 'Kiran', 'Preeti', 'Deepika', 'Anu', 'Geeta', 'Lata', 'Radha', 'Seema', 'Vandana', 'Jyoti', 'Manisha', 'Suman', 'Usha', 'Bharti', 'Kavya', 'Ishita', 'Tanya', 'Simran', 'Payal', 'Komal', 'Shalini', 'Vidya', 'Meera', 'Archana'];
    const lastNames = ['Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Yadav', 'Mishra', 'Jain', 'Agarwal', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Chaudhary', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia', 'Saxena', 'Tiwari', 'Pandey', 'Dubey', 'Joshi', 'Desai', 'Shah', 'Mehta', 'Bose', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Das', 'Ghosh', 'Naidu', 'Pillai', 'Rawat', 'Bisht', 'Negi', 'Thakur'];
    const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Surat', 'Indore', 'Nagpur', 'Bhopal', 'Patna', 'Kanpur', 'Gurgaon', 'Noida', 'Ludhiana', 'Coimbatore', 'Vadodara', 'Nashik', 'Rajkot', 'Kochi'];

    const leadNotesPool = [
      'Interested in family package, asked for discount on group booking',
      'Requested callback after 6 PM due to work schedule',
      'Compared prices with another travel agency, wants best rate',
      'Wants a fully customized itinerary with extra sightseeing days',
      'Group booking — college friends reunion trip',
      'Honeymoon couple — looking for premium hotel upgrade',
      'Asked about EMI / installment payment options',
      'Senior citizens in group — requested slow-paced itinerary',
      'Wants to know about travel insurance coverage',
      'Referred by a previous customer',
      'Asked for a private cab instead of shared transport',
      'Interested but waiting on leave approval from office',
      'Wants Jain food arrangements throughout the trip',
      'Corporate group booking — requested GST invoice',
      'Asked about photography/videography add-on package',
      'First-time Himalayan traveler — has altitude sickness concerns',
      'Wants to extend the trip by 2 extra days',
      'Comparing helicopter vs road option',
      'Repeat customer — booked with us before',
      'Large family group with kids under 10 years',
    ];
    const followUpNotesPool = [
      'Call to share final itinerary and pricing',
      'Follow up on advance payment confirmation',
      'Send updated package brochure via WhatsApp',
      'Check if they have decided on travel dates',
      'Confirm number of travelers before finalizing quote',
      'Discuss room-sharing preferences and finalize booking',
    ];
    const lostReasonsPool = ['Budget Issue', 'No Response', 'Booked Elsewhere', 'Date Not Suitable', 'Cancelled Trip', 'Not Interested'];
    const financeRejectReasons = ['Screenshot unclear, please re-upload payment proof', 'Amount does not match the UTR reference provided', 'Duplicate entry — already verified in an earlier submission', 'Transaction reference number missing, please provide UTR'];
    const financeCorrectionNotes = ['Please confirm the correct payment mode used', 'Receipt number missing, kindly update and resubmit', 'Amount entered seems higher than the shared screenshot'];
    const refundReasons = ['Trip date changed by customer', 'Medical emergency — cancellation', 'Duplicate payment entry', 'Customer cancelled due to personal reasons', 'Partial cancellation — one traveler dropped out'];
    const tripCaptainPool = [
      { name: 'Suraj Thapa', phone: '+91-9419087654' },
      { name: 'Iqbal Ahmed', phone: '+91-9906123456' },
      { name: 'Karma Namgyal', phone: '+91-9419234567' },
      { name: 'Devendra Bhandari', phone: '+91-9816345678' },
      { name: 'Ramlal Gujjar', phone: '+91-9799456789' },
      { name: 'Sonam Wangchuk', phone: '+91-9419567890' },
    ];
    const driverPool = ['Mohd. Yasin', 'Bunty Thakur', 'Rinchen Dorjay', 'Gopal Meena', 'Fayaz Ahmed', 'Suresh Bhandari', 'Lakhvinder Singh', 'Om Prakash Sharma'];
    const vehicleTypes = ['Tempo Traveller', 'AC Innova Crysta', 'AC Bus', 'Sumo/Xylo', 'Tata Winger'];

    type DestCfg = { label: string; packageId: string; packageCode: string; pricePerPerson: number; nights: number; departureLocation: string; destinationName: string; hotelVendorId: string; vehicleVendorId: string; hotelNames: string[] };
    const destinationConfigs: DestCfg[] = [
      { label: 'Kashmir', packageId: 'pkg-kashmir-6n7d', packageCode: 'KASH-6N7D-SRI', pricePerPerson: 22000, nights: 6, departureLocation: 'Delhi', destinationName: destKash.name, hotelVendorId: 'vendor-kashmir-hotels', vehicleVendorId: 'vendor-kashmir-cabs', hotelNames: ['Hotel Dal View', 'Heevan Retreat', 'Grand Mumtaz Srinagar', 'Hotel Gulmarg Heights'] },
      { label: 'Manali', packageId: 'pkg-manali-3n4d', packageCode: 'MAN-3N4D-DEL', pricePerPerson: 9000, nights: 3, departureLocation: 'Delhi', destinationName: destMan.name, hotelVendorId: 'vendor-manali-hotels', vehicleVendorId: 'vendor-manali-travels', hotelNames: ['Hotel Snow Valley Resorts', 'The Himalayan', 'Manali River Retreat', 'Hotel Mount View'] },
      { label: 'Spiti', packageId: 'pkg-spiti-8n9d', packageCode: 'SPIT-8N9D-MAN', pricePerPerson: 18000, nights: 8, departureLocation: 'Manali', destinationName: destSpit.name, hotelVendorId: 'vendor-spiti-homestays', vehicleVendorId: 'vendor-spiti-transport', hotelNames: ['Spiti Sarai Eco Lodge', 'Zostel Spiti', 'Kaza Continental Homestay', 'Grand Dewachen'] },
      { label: 'Ladakh', packageId: 'pkg-leh-ladakh-7n8d', packageCode: 'LEH-7N8D-DEL', pricePerPerson: 28000, nights: 7, departureLocation: 'Delhi', destinationName: destLeh.name, hotelVendorId: 'vendor-leh-hotels', vehicleVendorId: 'vendor-ladakh-camps', hotelNames: ['Hotel Ladakh Greens', 'The Grand Dragon Ladakh', 'Lchang Nang Retreat', 'Hotel Singge Palace'] },
      { label: 'Rajasthan', packageId: 'pkg-rajasthan-7n8d', packageCode: 'RAJ-7N8D-JAI', pricePerPerson: 26000, nights: 7, departureLocation: 'Delhi', destinationName: destRaj.name, hotelVendorId: 'vendor-rajasthan-hotels', vehicleVendorId: 'vendor-rajasthan-cabs', hotelNames: ['Hotel Pearl Palace', 'Fort Rajwada', 'Umaid Bhawan Heritage', 'The Rajasthan Haveli'] },
    ];

    const TOTAL_LEADS = 500;
    const TOTAL_CONFIRMED = 150;
    const DAYS = 15;

    const dayCounts = partitionCounts(TOTAL_LEADS, DAYS, 20, 40); // index 0 = 14 days ago ... index 14 = today
    const dayIndexPerSlot = shuffle(dayCounts.flatMap((count, d) => Array(count).fill(d)));
    const statusPerSlot = shuffle([
      ...Array(TOTAL_CONFIRMED).fill('CONFIRMED'),
      ...weightedFill(TOTAL_LEADS - TOTAL_CONFIRMED, [
        ['NEW', 24], ['CONTACTED', 22], ['INTERESTED', 20], ['FOLLOW_UP_SCHEDULED', 19], ['LOST', 15],
      ]),
    ]);
    const destPerSlot = shuffle(destinationConfigs.flatMap((d) => Array(TOTAL_LEADS / destinationConfigs.length).fill(d)));
    const salesPerSlot = weightedFill(TOTAL_LEADS, salesUsers.map((u, i) => [u, [1.3, 1.15, 1.0, 0.9, 0.75][i]] as [typeof u, number]));

    const usedPhones = new Set<string>();
    const usedBookingNumbers = new Set<string>();

    const leadsCreateData: any[] = [];
    const activityLogData: any[] = [];
    type LeadPlan = { id: string; leadId: string; name: string; assignedToId: string; destCfg: DestCfg; groupSize: number; departureDate: Date; createdAt: Date };
    const confirmedPlans: LeadPlan[] = [];

    for (let i = 0; i < TOTAL_LEADS; i++) {
      const dayIndex = dayIndexPerSlot[i];
      const dayDate = addDays(now, -(DAYS - 1) + dayIndex);
      const createdAt = new Date(dayDate);
      createdAt.setHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59), 0);
      if (createdAt > now) createdAt.setTime(now.getTime() - randomInt(0, 3600000));

      const status = statusPerSlot[i];
      const destCfg = destPerSlot[i];
      const assignedTo = salesPerSlot[i];
      const isMale = Math.random() < 0.55;
      const name = `${pick(isMale ? maleFirstNames : femaleFirstNames)} ${pick(lastNames)}`;
      const phone = randomMobile(usedPhones);
      const city = pick(cities);
      const groupSize = pick([1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6]);
      const travelDaysFromNow = randomInt(10, 120);
      const preferredDate = isoDate(addDays(createdAt, travelDaysFromNow));
      const budget = Math.round((groupSize * destCfg.pricePerPerson * (0.9 + Math.random() * 0.3)) / 500) * 500;
      const leadId = randomUUID();

      // Lead has no dedicated "city" column — folded into notes instead of a
      // schema change (the repo's migration constraints just bit us once this
      // session on Payment.updatedAt, so new required/queried columns are avoided).
      const baseNote = Math.random() < 0.6 ? pick(leadNotesPool) : null;
      const notes = baseNote ? `${baseNote} (from ${city})` : `Inquiry from ${city}`;

      const leadData: any = {
        id: leadId,
        organizationId: OID,
        name, phone,
        source: 'META_ADS',
        status,
        destination: destCfg.label,
        campaignId: metaCampaigns[destCfg.label].id,
        assignedToId: assignedTo.id,
        groupSize,
        budget,
        preferredDate,
        notes,
        isRead: dayIndex < DAYS - 2 ? true : Math.random() < 0.4,
        createdAt,
        updatedAt: createdAt,
      };

      if (status === 'LOST') {
        leadData.lostReason = pick(lostReasonsPool);
      }
      if (status === 'FOLLOW_UP_SCHEDULED') {
        const followUpOffset = randomInt(-3, 5);
        leadData.followUpDate = addDays(now, followUpOffset);
        leadData.followUpNotes = pick(followUpNotesPool);
      }

      leadsCreateData.push(leadData);
      activityLogData.push({ action: 'Lead Created', details: `${name} — ${destCfg.label} inquiry via Meta Ads`, entityType: 'LEAD', entityId: leadId, userId: assignedTo.id, leadId, createdAt });

      if (['CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED'].includes(status) && Math.random() < 0.4) {
        const followUpAt = new Date(createdAt.getTime() + randomInt(3600000, (now.getTime() - createdAt.getTime()) || 3600000));
        activityLogData.push({ action: 'Follow-up Call', details: pick(followUpNotesPool), entityType: 'LEAD', entityId: leadId, userId: assignedTo.id, leadId, createdAt: followUpAt > now ? now : followUpAt });
      }
      if (status === 'LOST') {
        activityLogData.push({ action: 'Lead Marked Lost', details: `Reason: ${leadData.lostReason}`, entityType: 'LEAD', entityId: leadId, userId: assignedTo.id, leadId, createdAt });
      }

      if (status === 'CONFIRMED') {
        const bookingConfirmedAt = new Date(createdAt.getTime() + randomInt(0, 3) * 86400000);
        confirmedPlans.push({
          id: randomUUID(), leadId, name, assignedToId: assignedTo.id, destCfg, groupSize,
          departureDate: new Date(preferredDate), createdAt: bookingConfirmedAt > now ? now : bookingConfirmedAt,
        });
      }
    }

    await prisma.lead.createMany({ data: leadsCreateData });
    console.log(`  ~ ${leadsCreateData.length} leads created (${confirmedPlans.length} confirmed)`);

    // ── Bookings + Payments ─────────────────────────────────────────────────
    const bookingsCreateData: any[] = [];
    const paymentsCreateData: any[] = [];
    const bookingLedger: Record<string, { finalPrice: number; amountPaid: number; leadId: string; assignedToId: string; departureDate: Date }> = {};
    const financeNotifyQueue: Array<{ name: string; amount: number; bookingNumber: string }> = [];

    for (const plan of confirmedPlans) {
      const bucketRoll = Math.random();
      let departureDate: Date;
      let bucket: 'COMPLETED' | 'ACTIVE' | 'UPCOMING';
      if (bucketRoll < 0.2) {
        bucket = 'COMPLETED';
        departureDate = addDays(now, -randomInt(5, 60));
      } else if (bucketRoll < 0.3) {
        bucket = 'ACTIVE';
        departureDate = addDays(now, -randomInt(0, Math.min(3, plan.destCfg.nights - 1)));
      } else {
        bucket = 'UPCOMING';
        departureDate = plan.departureDate < addDays(now, 3) ? addDays(now, randomInt(3, 100)) : plan.departureDate;
      }
      const returnDate = addDays(departureDate, plan.destCfg.nights);

      const priceVariance = 0.92 + Math.random() * 0.16;
      const finalPrice = Math.round((plan.groupSize * plan.destCfg.pricePerPerson * priceVariance) / 100) * 100;

      let datePart = isoDate(plan.createdAt).replace(/-/g, '');
      let bookingNumber = '';
      do { bookingNumber = `BKG-${datePart}-${randomInt(1000, 9999)}`; } while (usedBookingNumbers.has(bookingNumber));
      usedBookingNumbers.add(bookingNumber);

      // Payment plan — mirrors booking.controller.ts's Finance-gated flow:
      // amountPaid only reflects VERIFIED payments, never the raw advance.
      const fullyPaidBucket = bucket === 'COMPLETED';
      const payments: Array<{ amount: number; type: string; method: string; status: string; createdAt: Date; verifiedAt?: Date }> = [];
      const methodPool: Array<[string, number]> = [['UPI', 45], ['BANK_TRANSFER', 25], ['CASH', 15], ['CHEQUE', 5], ['ONLINE', 10]];
      const statusPool: Array<[string, number]> = fullyPaidBucket
        ? [['VERIFIED', 96], ['PENDING', 4]]
        : [['VERIFIED', 82], ['PENDING', 12], ['REJECTED', 3], ['CORRECTION_REQUESTED', 3]];

      const advanceAmount = fullyPaidBucket ? finalPrice : Math.round((finalPrice * (0.3 + Math.random() * 0.3)) / 100) * 100;
      payments.push({ amount: advanceAmount, type: 'ADVANCE', method: pickWeighted(methodPool), status: pickWeighted(statusPool), createdAt: plan.createdAt });

      if (!fullyPaidBucket && advanceAmount < finalPrice && Math.random() < 0.35) {
        const remaining = finalPrice - advanceAmount;
        const secondAmount = bucket === 'ACTIVE' ? remaining : Math.round((remaining * (0.4 + Math.random() * 0.6)) / 100) * 100;
        const secondCreatedAt = new Date(Math.min(plan.createdAt.getTime() + randomInt(3, 20) * 86400000, now.getTime()));
        payments.push({ amount: secondAmount, type: secondAmount >= remaining ? 'FINAL' : 'PARTIAL', method: pickWeighted(methodPool), status: pickWeighted(statusPool), createdAt: secondCreatedAt });
      } else if (bucket === 'ACTIVE' && advanceAmount < finalPrice && Math.random() < 0.8) {
        const remaining = finalPrice - advanceAmount;
        const secondCreatedAt = new Date(Math.min(plan.createdAt.getTime() + randomInt(3, 15) * 86400000, now.getTime()));
        payments.push({ amount: remaining, type: 'FINAL', method: pickWeighted(methodPool), status: pickWeighted([['VERIFIED', 92], ['PENDING', 8]]), createdAt: secondCreatedAt });
      }

      let amountPaid = 0;
      for (const p of payments) {
        const verifiedAt = p.status === 'VERIFIED' ? new Date(Math.min(p.createdAt.getTime() + randomInt(1, 48) * 3600000, now.getTime())) : undefined;
        if (p.status === 'VERIFIED') amountPaid += p.amount;
        const financeUser = pick(financeUsers);
        paymentsCreateData.push({
          id: randomUUID(),
          bookingId: plan.id,
          amount: p.amount,
          type: p.type,
          method: p.method,
          reference: p.method === 'UPI' ? `UPI${randomInt(100000000000, 999999999999)}` : (p.method === 'BANK_TRANSFER' || p.method === 'ONLINE') ? `UTR${randomInt(1000000000, 9999999999)}` : p.method === 'CHEQUE' ? `CHQ${randomInt(100000, 999999)}` : null,
          proofUrl: Math.random() < 0.7 ? '/uploads/demo/payment-proof-placeholder.jpg' : null,
          status: p.status,
          financeNote: p.status === 'REJECTED' ? pick(financeRejectReasons) : p.status === 'CORRECTION_REQUESTED' ? pick(financeCorrectionNotes) : null,
          verifiedById: p.status === 'VERIFIED' ? financeUser.id : null,
          verifiedAt: verifiedAt ?? null,
          recordedById: plan.assignedToId,
          createdAt: p.createdAt,
          updatedAt: verifiedAt ?? p.createdAt,
        });
        activityLogData.push({ action: 'Payment Submitted', details: `₹${p.amount.toLocaleString()} via ${p.method} — ${bookingNumber}`, entityType: 'PAYMENT', entityId: plan.id, userId: plan.assignedToId, leadId: plan.leadId, createdAt: p.createdAt });
        if (p.status === 'VERIFIED') {
          activityLogData.push({ action: 'Payment Verified', details: `₹${p.amount.toLocaleString()} verified — ${bookingNumber}`, entityType: 'PAYMENT', entityId: plan.id, userId: financeUser.id, leadId: plan.leadId, createdAt: verifiedAt! });
        } else if (p.status === 'PENDING') {
          financeNotifyQueue.push({ name: plan.name, amount: p.amount, bookingNumber });
        } else if (p.status === 'REJECTED') {
          activityLogData.push({ action: 'Payment Rejected', details: `₹${p.amount.toLocaleString()} rejected — ${bookingNumber}`, entityType: 'PAYMENT', entityId: plan.id, userId: financeUser.id, leadId: plan.leadId, createdAt: p.createdAt });
        }
      }

      const balanceAmount = Math.max(0, finalPrice - amountPaid);
      const balanceDueDate = balanceAmount > 0 ? addDays(departureDate, -7) : null;

      bookingsCreateData.push({
        id: plan.id,
        organizationId: OID,
        leadId: plan.leadId,
        bookingNumber,
        packageId: plan.destCfg.packageId,
        travelerName: plan.name,
        numberOfTravelers: plan.groupSize,
        foodPreference: pickWeighted([['VEG', 55], ['NON_VEG', 30], ['JAIN', 8], ['NO_PREFERENCE', 7]]),
        roomSharing: pickWeighted([['DOUBLE', 50], ['TRIPLE', 30], ['SINGLE', 12], ['QUAD', 8]]),
        departureLocation: plan.destCfg.departureLocation,
        departurePackage: plan.destCfg.packageCode,
        tourType: Math.random() < 0.85 ? 'GIT' : 'FIT',
        departureDate, returnDate,
        finalPrice, amountPaid, balanceAmount, balanceDueDate,
        status: bucket === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
        createdAt: plan.createdAt, updatedAt: plan.createdAt,
      });
      bookingLedger[plan.id] = { finalPrice, amountPaid, leadId: plan.leadId, assignedToId: plan.assignedToId, departureDate };
      activityLogData.push({ action: 'Lead Confirmed', details: `Booking ${bookingNumber} created — ${plan.groupSize} traveler(s), ₹${finalPrice.toLocaleString()} finalised`, entityType: 'LEAD', entityId: plan.leadId, userId: plan.assignedToId, leadId: plan.leadId, createdAt: plan.createdAt });
    }

    await prisma.booking.createMany({ data: bookingsCreateData });
    await prisma.payment.createMany({ data: paymentsCreateData });
    console.log(`  ~ ${bookingsCreateData.length} bookings + ${paymentsCreateData.length} payments created`);

    for (const item of financeNotifyQueue.slice(0, 40)) {
      await notifyFinanceTeam(OID, 'NEW_PAYMENT_SUBMITTED', 'New Payment Awaiting Verification', `${item.name} — ₹${item.amount.toLocaleString()} payment needs verification (Booking ${item.bookingNumber}).`);
    }

    // ── Link every confirmed booking to its Departure (Operations Panel) ────
    // Reuses the exact production function so Operations sees the same data
    // Sales just confirmed, with no separate sync step.
    for (const b of bookingsCreateData) {
      await linkBookingToDeparture(b.id, OID, b.packageId, b.departureDate, destinationConfigs.find((d) => d.packageId === b.packageId)!.destinationName).catch(console.error);
    }
    console.log('  ~ Confirmed bookings linked to Departures');

    // ── Hotels / Vehicles / Trip Captains per Departure ──────────────────────
    const departures = await prisma.departure.findMany({
      where: { organizationId: OID, packageId: { in: destinationConfigs.map((d) => d.packageId) } },
      include: { bookings: { select: { numberOfTravelers: true } }, hotels: true, vehicles: true },
    });
    const vendorPaymentsCreateData: any[] = [];
    for (const dep of departures) {
      const destCfg = destinationConfigs.find((d) => d.packageId === dep.packageId);
      if (!destCfg) continue;
      const totalTravelers = dep.bookings.reduce((s, b) => s + b.numberOfTravelers, 0) || 2;
      const isPastOrActive = dep.departureDate <= now;
      const confirmedChance = isPastOrActive ? 1 : 0.7;

      if (dep.hotels.length === 0) {
        const hotelStatus = Math.random() < confirmedChance ? 'CONFIRMED' : 'PENDING';
        const rooms = Math.ceil(totalTravelers / 2);
        await prisma.hotel.create({
          data: {
            departureId: dep.id, name: pick(destCfg.hotelNames), location: destCfg.destinationName,
            checkInDate: dep.departureDate, checkOutDate: dep.returnDate ?? addDays(dep.departureDate, destCfg.nights),
            numberOfRooms: rooms, roomAllocation: hotelStatus === 'CONFIRMED' ? `${Math.ceil(rooms * 0.6)} Double, ${Math.floor(rooms * 0.4)} Triple` : null,
            vendorName: vendors[destCfg.hotelVendorId].name, vendorContact: vendors[destCfg.hotelVendorId].contact,
            confirmationNumber: hotelStatus === 'CONFIRMED' ? `${destCfg.label.slice(0, 3).toUpperCase()}-${randomInt(1000, 9999)}` : null,
            status: hotelStatus,
          },
        });
        const hotelRate = Math.round(destCfg.pricePerPerson * 0.35);
        const hotelTotal = hotelRate * rooms;
        const hotelAdvance = hotelStatus === 'CONFIRMED' ? Math.round(hotelTotal * (0.5 + Math.random() * 0.5)) : Math.round(hotelTotal * Math.random() * 0.3);
        vendorPaymentsCreateData.push({
          id: randomUUID(), organizationId: OID, vendorId: destCfg.hotelVendorId, departureId: dep.id,
          serviceType: 'HOTEL', totalAmount: hotelTotal, advancePaid: hotelAdvance, balanceAmount: Math.max(0, hotelTotal - hotelAdvance),
          dueDate: addDays(dep.departureDate, -3),
          status: hotelAdvance >= hotelTotal ? 'PAID' : hotelAdvance > 0 ? 'PARTIAL' : (addDays(dep.departureDate, -3) < now ? 'OVERDUE' : 'PENDING'),
          invoiceUrl: Math.random() < 0.6 ? '/uploads/demo/invoice-placeholder.pdf' : null,
          notes: `Room booking for ${dep.destination} departure on ${isoDate(dep.departureDate)}`,
          createdById: pick(financeUsers).id, createdAt: dep.createdAt, updatedAt: dep.createdAt,
        });
      }
      if (dep.vehicles.length === 0) {
        const vehicleStatus = Math.random() < confirmedChance ? 'CONFIRMED' : 'PENDING';
        await prisma.vehicle.create({
          data: {
            departureId: dep.id, vehicleType: pick(vehicleTypes),
            vehicleNumber: vehicleStatus === 'CONFIRMED' ? `${['DL', 'HP', 'JK', 'RJ'][randomInt(0, 3)]}${randomInt(1, 14)}-${['A', 'B', 'C'][randomInt(0, 2)]}-${randomInt(1000, 9999)}` : null,
            driverName: vehicleStatus === 'CONFIRMED' ? pick(driverPool) : null,
            driverMobile: vehicleStatus === 'CONFIRMED' ? `+91-9${randomInt(100000000, 999999999)}` : null,
            pickupLocation: destCfg.departureLocation,
            vendorName: vendors[destCfg.vehicleVendorId].name, vendorContact: vendors[destCfg.vehicleVendorId].contact,
            status: vehicleStatus,
          },
        });
        const vehicleTotal = Math.round(destCfg.pricePerPerson * 0.25 * Math.max(1, Math.ceil(totalTravelers / 6)));
        const vehicleAdvance = vehicleStatus === 'CONFIRMED' ? Math.round(vehicleTotal * (0.5 + Math.random() * 0.5)) : Math.round(vehicleTotal * Math.random() * 0.3);
        vendorPaymentsCreateData.push({
          id: randomUUID(), organizationId: OID, vendorId: destCfg.vehicleVendorId, departureId: dep.id,
          serviceType: 'VEHICLE', totalAmount: vehicleTotal, advancePaid: vehicleAdvance, balanceAmount: Math.max(0, vehicleTotal - vehicleAdvance),
          dueDate: addDays(dep.departureDate, -3),
          status: vehicleAdvance >= vehicleTotal ? 'PAID' : vehicleAdvance > 0 ? 'PARTIAL' : (addDays(dep.departureDate, -3) < now ? 'OVERDUE' : 'PENDING'),
          invoiceUrl: Math.random() < 0.6 ? '/uploads/demo/invoice-placeholder.pdf' : null,
          notes: `Transport for ${dep.destination} departure on ${isoDate(dep.departureDate)}`,
          createdById: pick(financeUsers).id, createdAt: dep.createdAt, updatedAt: dep.createdAt,
        });
      }

      // Trip captain assignment
      const captainChance = isPastOrActive ? 0.9 : 0.55;
      if (Math.random() < captainChance) {
        const captain = pick(tripCaptainPool);
        await prisma.departure.update({
          where: { id: dep.id },
          data: { tripCaptainName: captain.name, tripCaptainPhone: captain.phone, tripCaptainStatus: isPastOrActive || Math.random() < 0.5 ? 'CONFIRMED' : 'ASSIGNED' },
        });
        if (Math.random() < 0.3) {
          vendorPaymentsCreateData.push({
            id: randomUUID(), organizationId: OID, vendorId: 'vendor-trip-captains-guild', departureId: dep.id,
            serviceType: 'TRIP_CAPTAIN', totalAmount: 5000, advancePaid: isPastOrActive ? 5000 : 2500, balanceAmount: isPastOrActive ? 0 : 2500,
            dueDate: addDays(dep.departureDate, -1), status: isPastOrActive ? 'PAID' : 'PARTIAL',
            notes: `Trip captain fee — ${captain.name} for ${dep.destination}`,
            createdById: pick(financeUsers).id, createdAt: dep.createdAt, updatedAt: dep.createdAt,
          });
        }
      }
    }
    await prisma.vendorPayment.createMany({ data: vendorPaymentsCreateData });
    console.log(`  ~ ${departures.length} departures enriched with hotels/vehicles/trip captains, ${vendorPaymentsCreateData.length} vendor payments created`);

    // Auto-transition UPCOMING → ACTIVE → COMPLETED based on real dates —
    // same logic the production cron runs every few minutes.
    await updateDepartureStatuses();

    // ── Refunds — a handful of sample bookings ────────────────────────────
    const refundCandidates = shuffle(bookingsCreateData.filter((b) => bookingLedger[b.id].amountPaid > 0)).slice(0, 8);
    for (const b of refundCandidates) {
      const ledgerRow = bookingLedger[b.id];
      const amount = Math.round((ledgerRow.amountPaid * (0.2 + Math.random() * 0.4)) / 100) * 100;
      const status = pickWeighted<'PAID' | 'APPROVED' | 'REQUESTED' | 'REJECTED'>([['PAID', 40], ['APPROVED', 20], ['REQUESTED', 25], ['REJECTED', 15]]);
      const requestedAt = new Date(Math.min(ledgerRow.departureDate.getTime() - randomInt(1, 10) * 86400000, now.getTime()));
      const approver = pick(financeUsers);
      await prisma.refund.create({
        data: {
          organizationId: OID, bookingId: b.id, amount, reason: pick(refundReasons), status,
          requestedById: ledgerRow.assignedToId,
          approvedById: status === 'REQUESTED' ? null : approver.id,
          refundDate: status === 'PAID' ? new Date(Math.min(requestedAt.getTime() + randomInt(1, 5) * 86400000, now.getTime())) : null,
          transactionId: status === 'PAID' ? `RFND${randomInt(100000, 999999)}` : null,
          createdAt: requestedAt, updatedAt: requestedAt,
        },
      });
      activityLogData.push({ action: 'Refund Requested', details: `₹${amount.toLocaleString()} refund — ${pick(refundReasons)}`, entityType: 'REFUND', entityId: b.id, userId: ledgerRow.assignedToId, leadId: ledgerRow.leadId, createdAt: requestedAt });
      if (status === 'PAID') {
        const newAmountPaid = Math.max(0, ledgerRow.amountPaid - amount);
        await prisma.booking.update({ where: { id: b.id }, data: { amountPaid: newAmountPaid, balanceAmount: Math.max(0, ledgerRow.finalPrice - newAmountPaid) } });
        activityLogData.push({ action: 'Refund Paid', details: `₹${amount.toLocaleString()} refunded`, entityType: 'REFUND', entityId: b.id, userId: approver.id, leadId: ledgerRow.leadId, createdAt: requestedAt });
      }
    }
    console.log(`  ~ ${refundCandidates.length} sample refunds created`);

    if (activityLogData.length > 0) {
      await prisma.activityLog.createMany({ data: activityLogData });
    }
    console.log(`  ~ ${activityLogData.length} activity log entries created`);
  }

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Login Credentials:');
  console.log('  Admin:     admin@travelcrm.com     / admin123');
  console.log('  Sales:     amit@travelcrm.com       / emp123  (+ kaptan, biswas, abhay, priya @travelcrm.com)');
  console.log('  Ops:       ops@travelcrm.com        / ops123  (+ ops2@travelcrm.com)');
  console.log('  Finance:   finance1@travelcrm.com   / finance123  (+ finance2@travelcrm.com)\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
