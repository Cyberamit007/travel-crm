import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  const adminPw = await bcrypt.hash('admin123', 12);
  const empPw   = await bcrypt.hash('emp123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@travelcrm.com' },
    update: { organizationId: OID },
    create: { name: 'Admin User', email: 'admin@travelcrm.com', password: adminPw, role: 'ADMIN', phone: '+91-9876543210', organizationId: OID },
  });
  const emp1 = await prisma.user.upsert({
    where: { email: 'amit@travelcrm.com' },
    update: { name: 'Amit Kumar', organizationId: OID },
    create: { name: 'Amit Kumar', email: 'amit@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543211', organizationId: OID },
  });
  const emp2 = await prisma.user.upsert({
    where: { email: 'kaptan@travelcrm.com' },
    update: { name: 'Kaptan Singh', organizationId: OID },
    create: { name: 'Kaptan Singh', email: 'kaptan@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543212', organizationId: OID },
  });
  const emp3 = await prisma.user.upsert({
    where: { email: 'biswas@travelcrm.com' },
    update: { name: 'Biswas Dey', organizationId: OID },
    create: { name: 'Biswas Dey', email: 'biswas@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543213', organizationId: OID },
  });
  const emp4 = await prisma.user.upsert({
    where: { email: 'abhay@travelcrm.com' },
    update: { name: 'Abhay Verma', organizationId: OID },
    create: { name: 'Abhay Verma', email: 'abhay@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543214', organizationId: OID },
  });
  const emp5 = await prisma.user.upsert({
    where: { email: 'priya@travelcrm.com' },
    update: { name: 'Priya Sharma', organizationId: OID },
    create: { name: 'Priya Sharma', email: 'priya@travelcrm.com', password: empPw, role: 'EMPLOYEE', phone: '+91-9876543215', organizationId: OID },
  });
  const opsPw = await bcrypt.hash('ops123', 12);
  const ops1 = await prisma.user.upsert({
    where: { email: 'ops@travelcrm.com' },
    update: { name: 'Rohan Bisht', organizationId: OID },
    create: { name: 'Rohan Bisht', email: 'ops@travelcrm.com', password: opsPw, role: 'OPERATIONS', phone: '+91-9876543216', organizationId: OID },
  });

  await prisma.user.updateMany({ where: { organizationId: null }, data: { organizationId: OID } });
  console.log('  ~ Users ready: admin, amit, kaptan, biswas, abhay, priya, ops');

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
  const destMan  = await upsertDestination(OID, { name: 'Manali', country: 'India', state: 'Himachal Pradesh', type: 'DOMESTIC', description: 'Popular hill station and gateway to Lahaul-Spiti' });
  const destHar  = await upsertDestination(OID, { name: 'Haridwar-Rishikesh', country: 'India', state: 'Uttarakhand', type: 'DOMESTIC', description: 'Gateway to Char Dham, sacred Ganga ghats' });
  const destNep  = await upsertDestination(OID, { name: 'Nepal Pashupatinath', country: 'Nepal', city: 'Kathmandu', type: 'INTERNATIONAL', description: 'Sacred Hindu temple complex in Kathmandu' });
  const destBhu  = await upsertDestination(OID, { name: 'Bhutan', country: 'Bhutan', city: 'Thimphu', type: 'INTERNATIONAL', description: 'Kingdom of Happiness, Tiger\'s Nest monastery' });

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
  console.log('  ~ Campaigns ready');

  // ── 7. Leads ──────────────────────────────────────────────────────────────
  await prisma.lead.updateMany({ where: { organizationId: null }, data: { organizationId: OID } });

  const today = new Date().toISOString().split('T')[0];
  const nextWeek  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
  const in2Weeks  = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const in1Month  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const in45Days  = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];
  const in2Months = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
  const in3Months = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const demoLeads = [
    // === CRM Leads (various statuses) ===
    { phone: '+91-9811223344', name: 'Deepak Verma',   email: 'deepak@gmail.com',    source: 'WHATSAPP',  status: 'INTERESTED',          destination: 'Kedarnath',    campaignId: campaign1.id, assignedToId: emp1.id, groupSize: 4,  budget: 48000,  preferredDate: nextWeek,  isRead: true,  notes: 'Family of 4, wants helicopter option' },
    { phone: '+91-9922334455', name: 'Sunita Patel',   email: 'sunita.p@gmail.com',  source: 'INSTAGRAM', status: 'FOLLOW_UP_SCHEDULED',  destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, groupSize: 2,  budget: 44000,  followUpDate: new Date(Date.now() + 2 * 86400000), followUpNotes: 'Call to discuss Zanskar pricing', isRead: true },
    { phone: '+91-9833445566', name: 'Rajesh Gupta',   source: 'WHATSAPP',           status: 'NEW',         destination: 'Kedarnath',    campaignId: campaign1.id, assignedToId: emp1.id, isRead: false },
    { phone: '+91-9744556677', name: 'Meera Joshi',    email: 'meera.j@gmail.com',   source: 'INSTAGRAM', status: 'CONTACTED',           destination: 'Char Dham',    campaignId: campaign3.id, assignedToId: emp3.id, groupSize: 6,  budget: 150000, isRead: true },
    { phone: '+91-9566778899', name: 'Anita Sharma',   email: 'anita.s@gmail.com',   source: 'INSTAGRAM', status: 'LOST',   lostReason: 'PRICE',    destination: 'Kedarnath',    campaignId: campaign1.id, assignedToId: emp2.id, notes: 'Budget constraint', isRead: true },
    { phone: '+91-9477889900', name: 'Suresh Nair',    source: 'WHATSAPP',           status: 'NEW',         destination: 'Char Dham',    campaignId: campaign3.id, assignedToId: emp1.id, isRead: false },
    { phone: '+91-9388990011', name: 'Kavita Reddy',   email: 'kavita.r@gmail.com',  source: 'MANUAL',    status: 'INTERESTED',          destination: 'Spiti Valley', campaignId: campaign4.id, assignedToId: emp4.id, groupSize: 5,  budget: 90000,  isRead: true },
    { phone: '+91-9299001122', name: 'Pradeep Mishra', source: 'WHATSAPP',           status: 'FOLLOW_UP_SCHEDULED', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, followUpDate: new Date(Date.now() - 1 * 86400000), followUpNotes: 'Send price quote', groupSize: 5, isRead: true },
    { phone: '+91-9100112233', name: 'Lakshmi Devi',   email: 'lakshmi@yahoo.com',   source: 'INSTAGRAM', status: 'NEW',                 destination: 'Char Dham',    campaignId: campaign3.id, assignedToId: emp4.id, isRead: false },
    { phone: '+91-9011223300', name: 'Arjun Mehta',    email: 'arjun.m@gmail.com',   source: 'WHATSAPP',  status: 'INTERESTED',          destination: 'Leh-Ladakh',   campaignId: campaign5.id, assignedToId: emp5.id, groupSize: 3,  budget: 84000,  isRead: true },
    { phone: '+91-8922334411', name: 'Pooja Agarwal',  email: 'pooja.a@gmail.com',   source: 'INSTAGRAM', status: 'CONTACTED',           destination: 'Valley of Flowers', assignedToId: emp3.id, groupSize: 2, budget: 22000, isRead: true },
    { phone: '+91-8833445522', name: 'Dinesh Puri',    source: 'WHATSAPP',           status: 'NEW',         destination: 'Amarnath',     assignedToId: emp2.id, isRead: false },
    { phone: '+91-8744556633', name: 'Ritu Kapoor',    email: 'ritu.k@gmail.com',    source: 'MANUAL',    status: 'INTERESTED',          destination: 'Nepal Pashupatinath', assignedToId: emp5.id, groupSize: 4, budget: 72000, isRead: true },

    // === CONFIRMED leads (will get bookings below) ===
    { phone: '+91-9655667788', name: 'Vikram Singh',   source: 'WHATSAPP',  status: 'CONFIRMED', destination: 'Zanskar Valley', campaignId: campaign2.id, assignedToId: emp2.id, groupSize: 3,  budget: 66000,  preferredDate: nextWeek,  isRead: true },
    { phone: '+91-9001122334', name: 'Ravi Sharma',    email: 'ravi.s@gmail.com',  source: 'INSTAGRAM', status: 'CONFIRMED', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, groupSize: 5, budget: 60000, preferredDate: in2Weeks, isRead: true },
    { phone: '+91-8901122335', name: 'Nisha Patel',    email: 'nisha.p@gmail.com', source: 'MANUAL',    status: 'CONFIRMED', destination: 'Char Dham',    campaignId: campaign3.id, assignedToId: emp3.id, groupSize: 4, budget: 100000, preferredDate: in1Month, isRead: true },
    { phone: '+91-8801122336', name: 'Sanjay Tiwari',  email: 'sanjay.t@gmail.com', source: 'WHATSAPP', status: 'CONFIRMED', destination: 'Leh-Ladakh',  campaignId: campaign5.id, assignedToId: emp5.id, groupSize: 2, budget: 56000, preferredDate: in2Weeks, isRead: true },
    { phone: '+91-8701122337', name: 'Geeta Malhotra', source: 'INSTAGRAM', status: 'CONFIRMED', destination: 'Vaishno Devi', assignedToId: emp2.id, groupSize: 6, budget: 48000, preferredDate: nextWeek, isRead: true },
    { phone: '+91-8601122338', name: 'Sunil Rawat',    email: 'sunil.r@gmail.com', source: 'WHATSAPP', status: 'CONFIRMED', destination: 'Spiti Valley', campaignId: campaign4.id, assignedToId: emp4.id, groupSize: 4, budget: 72000, preferredDate: in45Days, isRead: true },
    { phone: '+91-8501122339', name: 'Kavya Nair',     email: 'kavya.n@gmail.com', source: 'INSTAGRAM', status: 'CONFIRMED', destination: 'Kedarnath', campaignId: campaign1.id, assignedToId: emp1.id, groupSize: 2, budget: 24000, preferredDate: in2Months, isRead: true },
    { phone: '+91-8401122330', name: 'Harish Bhat',    source: 'MANUAL',   status: 'CONFIRMED', destination: 'Amarnath', assignedToId: emp3.id, groupSize: 3, budget: 45000, preferredDate: in3Months, isRead: true },
    { phone: '+91-8301122331', name: 'Mamta Soni',     email: 'mamta.s@gmail.com', source: 'WHATSAPP', status: 'CONFIRMED', destination: 'Nepal Pashupatinath', assignedToId: emp5.id, groupSize: 4, budget: 72000, preferredDate: in1Month, isRead: true },
  ];

  let inserted = 0; let skipped = 0;
  const leadMap: Record<string, string> = {};

  for (const lead of demoLeads) {
    const exists = await prisma.lead.findFirst({ where: { phone: lead.phone, deletedAt: null } });
    if (!exists) {
      const created = await prisma.lead.create({ data: { ...lead, organizationId: OID } as any });
      leadMap[lead.phone] = created.id;
      inserted++;
    } else {
      leadMap[lead.phone] = exists.id;
      skipped++;
    }
  }
  console.log(`  ~ Demo leads: ${inserted} inserted, ${skipped} already exist`);

  // ── 8. Bookings for confirmed leads ───────────────────────────────────────
  const confirmedBookings = [
    {
      phone: '+91-9655667788', // Vikram Singh — Zanskar
      travelerName: 'Vikram Singh', numberOfTravelers: 3, tourType: 'GIT',
      foodPreference: 'VEG', roomSharing: 'TRIPLE', departureLocation: 'Delhi',
      departurePackage: 'ZAN-10N11D-DEL', finalPrice: 66000, amountPaid: 66000,
      packageId: 'pkg-zanskar-10n11d', departureDate: new Date(nextWeek),
    },
    {
      phone: '+91-9001122334', // Ravi Sharma — Kedarnath
      travelerName: 'Ravi Sharma', numberOfTravelers: 5, tourType: 'GIT',
      foodPreference: 'VEG', roomSharing: 'TRIPLE', departureLocation: 'Delhi',
      departurePackage: 'KED-6N7D-DEL', finalPrice: 60000, amountPaid: 36000,
      balanceDueDate: new Date(Date.now() + 10 * 86400000),
      packageId: 'pkg-kedarnath-6n7d', departureDate: new Date(in2Weeks),
    },
    {
      phone: '+91-8901122335', // Nisha Patel — Char Dham
      travelerName: 'Nisha Patel', numberOfTravelers: 4, tourType: 'GIT',
      foodPreference: 'JAIN', roomSharing: 'DOUBLE', departureLocation: 'Haridwar',
      departurePackage: 'CHAR-12N13D', finalPrice: 100000, amountPaid: 50000,
      balanceDueDate: new Date(Date.now() + 20 * 86400000),
      specialRequest: 'Jain food strictly required. No root vegetables.',
    },
    {
      phone: '+91-8801122336', // Sanjay Tiwari — Leh
      travelerName: 'Sanjay Tiwari', numberOfTravelers: 2, tourType: 'FIT',
      foodPreference: 'NON_VEG', roomSharing: 'DOUBLE', departureLocation: 'Delhi',
      departurePackage: 'LEH-7N8D-DEL', finalPrice: 56000, amountPaid: 56000,
    },
    {
      phone: '+91-8701122337', // Geeta Malhotra — Vaishno Devi
      travelerName: 'Geeta Malhotra', numberOfTravelers: 6, tourType: 'GIT',
      foodPreference: 'VEG', roomSharing: 'TRIPLE', departureLocation: 'Delhi',
      departurePackage: 'VAIS-2N3D-DEL', finalPrice: 48000, amountPaid: 20000,
      balanceDueDate: new Date(Date.now() - 5 * 86400000), // OVERDUE
      specialRequest: 'Senior citizens in group — need slow-pace route',
    },
    {
      phone: '+91-8601122338', // Sunil Rawat — Spiti
      travelerName: 'Sunil Rawat', numberOfTravelers: 4, tourType: 'GIT',
      foodPreference: 'NO_PREFERENCE', roomSharing: 'DOUBLE', departureLocation: 'Manali',
      departurePackage: 'SPIT-8N9D-MAN', finalPrice: 72000, amountPaid: 35000,
      balanceDueDate: new Date(Date.now() + 35 * 86400000),
    },
    {
      phone: '+91-8501122339', // Kavya Nair — Kedarnath
      travelerName: 'Kavya Nair', numberOfTravelers: 2, tourType: 'FIT',
      foodPreference: 'VEG', roomSharing: 'DOUBLE', departureLocation: 'Delhi',
      departurePackage: 'KED-6N7D-DEL', finalPrice: 24000, amountPaid: 24000,
    },
    {
      phone: '+91-8401122330', // Harish Bhat — Amarnath
      travelerName: 'Harish Bhat', numberOfTravelers: 3, tourType: 'GIT',
      foodPreference: 'VEG', roomSharing: 'TRIPLE', departureLocation: 'Jammu',
      departurePackage: 'AMAR-5N6D-JAM', finalPrice: 45000, amountPaid: 22500,
      balanceDueDate: new Date(Date.now() + 60 * 86400000),
    },
    {
      phone: '+91-8301122331', // Mamta Soni — Nepal
      travelerName: 'Mamta Soni', numberOfTravelers: 4, tourType: 'GIT',
      foodPreference: 'VEG', roomSharing: 'DOUBLE', departureLocation: 'Delhi',
      departurePackage: 'NEP-5N6D-DEL', finalPrice: 72000, amountPaid: 30000,
      balanceDueDate: new Date(Date.now() + 25 * 86400000),
      specialRequest: 'Birthday celebration for one traveler',
    },
  ];

  let bookingsCreated = 0;
  const bookingMap: Record<string, string> = {};
  for (const b of confirmedBookings) {
    const leadId = leadMap[b.phone];
    if (!leadId) continue;
    const exists = await prisma.booking.findFirst({ where: { leadId } });
    if (!exists) {
      const paid = Number(b.amountPaid);
      const price = Number(b.finalPrice);
      const balance = Math.max(0, price - paid);
      const created = await prisma.booking.create({
        data: {
          leadId,
          organizationId: OID,
          travelerName: b.travelerName,
          numberOfTravelers: b.numberOfTravelers,
          tourType: b.tourType,
          foodPreference: b.foodPreference,
          roomSharing: b.roomSharing,
          departureLocation: b.departureLocation,
          departurePackage: b.departurePackage,
          packageId: (b as any).packageId || null,
          departureDate: (b as any).departureDate || null,
          finalPrice: price,
          amountPaid: paid,
          balanceAmount: balance,
          balanceDueDate: (b as any).balanceDueDate || null,
          specialRequest: (b as any).specialRequest || null,
          status: 'ACTIVE',
        },
      });
      bookingMap[b.phone] = created.id;
      bookingsCreated++;
    } else {
      bookingMap[b.phone] = exists.id;
    }
  }
  console.log(`  ~ ${bookingsCreated} bookings created`);

  // ── 9b. Operations demo data (Departures/Hotels/Vehicles/Travelers) ──────
  // Mirrors what linkBookingToDeparture() does automatically at runtime when
  // Sales confirms a booking through the app — done directly here since seeding
  // bypasses the HTTP layer.
  const opsDemo: Array<{ phone: string; packageId: string; destination: string; departureDate: Date; hotel: Record<string, unknown>; vehicle: Record<string, unknown> }> = [
    {
      phone: '+91-9655667788', packageId: 'pkg-zanskar-10n11d', destination: 'Zanskar Valley', departureDate: new Date(nextWeek),
      hotel: { name: 'Zanskar Base Camp', location: 'Padum', numberOfRooms: 2, roomAllocation: '1 Triple, extra mattress', vendorName: 'Ladakh Camps Co.', vendorContact: '+91-9419012345', confirmationNumber: 'ZBC-2026-0714', status: 'CONFIRMED' },
      vehicle: { vehicleType: 'Tempo Traveller', vehicleNumber: 'JK10-A-4521', driverName: 'Tenzin Norbu', driverMobile: '+91-9419098765', pickupLocation: 'Leh Bus Stand', status: 'CONFIRMED' },
    },
    {
      phone: '+91-9001122334', packageId: 'pkg-kedarnath-6n7d', destination: 'Kedarnath', departureDate: new Date(in2Weeks),
      hotel: { name: 'Hotel Mandakini Heights', location: 'Guptkashi', numberOfRooms: 3, roomAllocation: null, vendorName: 'Himalayan Stays', vendorContact: '+91-9412034567', status: 'PENDING' },
      vehicle: { vehicleType: 'AC Bus', vehicleNumber: null, driverName: null, status: 'PENDING' },
    },
  ];

  let departuresCreated = 0;
  for (const d of opsDemo) {
    const bookingId = bookingMap[d.phone];
    if (!bookingId) continue;

    let departure = await prisma.departure.findFirst({ where: { packageId: d.packageId, departureDate: d.departureDate } });
    if (!departure) {
      departure = await prisma.departure.create({
        data: { organizationId: OID, packageId: d.packageId, destination: d.destination, departureDate: d.departureDate, status: 'UPCOMING' },
      });
      departuresCreated++;

      const items = itineraries[d.packageId]?.filter((i) => i.department === 'OPERATIONS' || i.department === 'ALL') ?? [];
      if (items.length) {
        await prisma.departureTask.createMany({
          data: items.map((i) => ({ departureId: departure!.id, dayOffset: i.dayOffset, title: i.title, status: 'PENDING', sortOrder: i.sortOrder })),
        });
      }
      await prisma.hotel.create({ data: { departureId: departure.id, ...(d.hotel as any) } });
      await prisma.vehicle.create({ data: { departureId: departure.id, ...(d.vehicle as any) } });
    }

    await prisma.booking.update({ where: { id: bookingId }, data: { departureId: departure.id } });
  }
  console.log(`  ~ ${departuresCreated} operations departures ready (with hotel/vehicle/timeline)`);

  await prisma.vendor.upsert({
    where: { id: 'vendor-himalayan-stays' },
    update: { organizationId: OID },
    create: { id: 'vendor-himalayan-stays', organizationId: OID, name: 'Himalayan Stays', type: 'HOTEL', contact: '+91-9412034567', notes: 'Preferred hotel vendor for Uttarakhand routes.' },
  });
  await prisma.vendor.upsert({
    where: { id: 'vendor-ladakh-camps' },
    update: { organizationId: OID },
    create: { id: 'vendor-ladakh-camps', organizationId: OID, name: 'Ladakh Camps Co.', type: 'VEHICLE', contact: '+91-9419012345', notes: 'Camping + transport vendor for Ladakh/Zanskar treks.' },
  });

  // ── 9. Activity logs ──────────────────────────────────────────────────────
  const logCount = await prisma.activityLog.count();
  if (logCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        { action: 'Lead Created',        details: 'Deepak Verma — Kedarnath inquiry via WhatsApp', userId: admin.id },
        { action: 'Status Updated',      details: 'Vikram Singh marked as Confirmed',              userId: emp2.id },
        { action: 'Follow-up Scheduled', details: 'Follow-up set for Sunita Patel',                userId: emp2.id },
        { action: 'Campaign Created',    details: 'Kedarnath July Batch campaign created',         userId: admin.id },
        { action: 'Booking Confirmed',   details: 'Ravi Sharma — 5 pax, ₹60,000',                userId: emp1.id },
        { action: 'Package Created',     details: 'Char Dham Yatra 12N13D package added',         userId: admin.id },
        { action: 'Lead Confirmed',      details: 'Nisha Patel — Char Dham, 4 pax',              userId: emp3.id },
      ],
    });
  }

  console.log('\n✅ Database seeded successfully!\n');
  console.log('Login Credentials:');
  console.log('  Admin:   admin@travelcrm.com  / admin123');
  console.log('  Amit:    amit@travelcrm.com   / emp123');
  console.log('  Kaptan:  kaptan@travelcrm.com / emp123');
  console.log('  Biswas:  biswas@travelcrm.com / emp123');
  console.log('  Abhay:   abhay@travelcrm.com  / emp123');
  console.log('  Priya:   priya@travelcrm.com  / emp123');
  console.log('  Ops:     ops@travelcrm.com    / ops123\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
