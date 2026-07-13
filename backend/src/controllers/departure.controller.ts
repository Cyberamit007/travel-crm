import { Response } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { emitOperationsUpdated, notifyOperationsTeam } from '../services/notification.service.js';
import { generateOpsTasksFromItinerary } from './departureTask.controller.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;
const orgFilter = (req: AuthenticatedRequest) => (orgId(req) ? { organizationId: orgId(req) } : {});

function ageFromDob(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ─── Traveler placeholder records ────────────────────────────────────────────
// A confirmed booking only stores a headcount — this materializes it into real
// per-traveler rows ("Traveler 1"..."Traveler N") for the customer to fill in
// via the Traveler Portal, or Operations to edit directly. Idempotent: only
// tops up the count, never duplicates travelers that already exist (so it's
// safe to call again from updateBooking if numberOfTravelers changes).
export async function createPlaceholderTravelers(bookingId: string, numberOfTravelers: number): Promise<void> {
  const existingCount = await prisma.traveler.count({ where: { bookingId } });
  if (existingCount >= numberOfTravelers) return;

  const toCreate = numberOfTravelers - existingCount;
  await prisma.traveler.createMany({
    data: Array.from({ length: toCreate }, (_, i) => ({
      bookingId,
      name: `Traveler ${existingCount + i + 1}`,
      verificationStatus: 'PENDING',
    })),
  });
}

// ─── Traveler Portal token ────────────────────────────────────────────────────
// Generates a random link token, stores only its SHA-256 hash (never the raw
// value — same idiom as RefreshToken), and returns the raw token once so the
// caller can hand it to Operations to copy/share. Idempotent per-call: always
// issues a fresh token (invalidating any previous one), since re-confirming a
// booking is a reasonable moment to also refresh an expired link.
export async function issueTravelerPortalToken(bookingId: string, departureDate: Date | null): Promise<string> {
  const rawToken = randomBytes(24).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = departureDate
    ? new Date(departureDate.getTime() + 7 * 86400000)
    : new Date(Date.now() + 180 * 86400000);

  await prisma.booking.update({
    where: { id: bookingId },
    data: { travelerPortalTokenHash: tokenHash, travelerPortalTokenExpiresAt: expiresAt },
  });

  return rawToken;
}

// ─── Auto-link a confirmed booking to its Departure ──────────────────────────
// Called from booking.controller.ts whenever Sales confirms a booking. Finds an
// existing Departure sharing the same trip (packageId+date, or destination+date
// for package-less bookings) or creates one — Operations never creates these
// manually. This is the sole mechanism that makes confirmed bookings "appear"
// in the Operations Panel automatically.
export async function linkBookingToDeparture(
  bookingId: string,
  organizationId: string | null,
  packageId: string | null,
  departureDate: Date,
  destination: string
): Promise<string> {
  const where = packageId
    ? { organizationId, packageId, departureDate }
    : { organizationId, packageId: null, departureDate, destination };

  let departure = await prisma.departure.findFirst({ where });
  let isNew = false;
  if (!departure) {
    departure = await prisma.departure.create({
      data: { organizationId, packageId: packageId || null, destination, departureDate, status: 'UPCOMING' },
    });
    isNew = true;
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { departureId: departure.id } });

  if (isNew && packageId) {
    await generateOpsTasksFromItinerary(departure.id, packageId, departureDate).catch(console.error);
  }

  await notifyOperationsTeam(
    organizationId,
    'NEW_CONFIRMED_BOOKING',
    'New Confirmed Booking',
    `${destination} — departure on ${departureDate.toDateString()} has a new confirmed booking.`
  );
  emitOperationsUpdated(departure.id);

  return departure.id;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const in7 = addDays(today, 7);
    const in30 = addDays(today, 30);

    const [
      todaysDepartures,
      upcomingDepartures,
      activeTrips,
      completedTrips,
      todaysBookings,
      pendingHotels,
      pendingVehicles,
      unassignedCaptains,
      todaysCheckins,
      todaysCheckouts,
      todaysVehicles,
      activeTripBookings,
      pendingRoomAllocation,
      candidateTasks,
    ] = await Promise.all([
      prisma.departure.count({ where: { ...orgFilter(req), departureDate: { gte: today, lte: todayEnd } } }),
      prisma.departure.count({ where: { ...orgFilter(req), departureDate: { gt: todayEnd, lte: in30 }, status: 'UPCOMING' } }),
      prisma.departure.count({ where: { ...orgFilter(req), status: 'ACTIVE' } }),
      prisma.departure.count({ where: { ...orgFilter(req), status: 'COMPLETED' } }),
      prisma.booking.findMany({ where: { departure: { ...orgFilter(req), departureDate: { gte: today, lte: todayEnd } } }, select: { numberOfTravelers: true } }),
      prisma.hotel.count({ where: { status: 'PENDING', departure: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } } } }),
      prisma.vehicle.count({ where: { status: 'PENDING', departure: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } } } }),
      prisma.departure.count({ where: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] }, tripCaptainStatus: 'UNASSIGNED' } }),
      prisma.hotel.count({ where: { checkInDate: { gte: today, lte: todayEnd }, departure: { ...orgFilter(req) } } }),
      prisma.hotel.count({ where: { checkOutDate: { gte: today, lte: todayEnd }, departure: { ...orgFilter(req) } } }),
      prisma.vehicle.count({ where: { pickupTime: { gte: today, lte: todayEnd }, departure: { ...orgFilter(req) } } }),
      prisma.booking.findMany({ where: { departure: { ...orgFilter(req), status: 'ACTIVE' } }, select: { numberOfTravelers: true } }),
      prisma.hotel.count({ where: { OR: [{ roomAllocation: null }, { roomAllocation: '' }], departure: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } } } }),
      prisma.departureTask.findMany({
        where: { status: { not: 'COMPLETED' }, departure: { ...orgFilter(req), departureDate: { gte: addDays(today, -30), lte: in30 } } },
        select: { dayOffset: true, departure: { select: { departureDate: true } } },
      }),
    ]);

    const upcomingActivities = candidateTasks.filter((t) => {
      const activityDate = addDays(startOfDay(t.departure.departureDate), t.dayOffset);
      return activityDate >= today && activityDate <= in7;
    }).length;

    const totalTravelersToday = todaysBookings.reduce((s, b) => s + b.numberOfTravelers, 0);
    const totalTravelersOnTour = activeTripBookings.reduce((s, b) => s + b.numberOfTravelers, 0);

    res.json({
      success: true,
      data: {
        todaysDepartures, upcomingDepartures, activeTrips, completedTrips,
        totalTravelersToday,
        pendingHotelBookings: pendingHotels,
        pendingVehicleBookings: pendingVehicles,
        pendingRoomAllocation,
        pendingTripCaptainAssignment: unassignedCaptains,
        todaysCheckins, todaysCheckouts, todaysTransfers: todaysVehicles,
        upcomingActivities, totalTravelersOnTour,
      },
    });
  } catch (e) {
    console.error('[operations] getDashboardStats error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── List departures (date-wise) ─────────────────────────────────────────────

export const listDepartures = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, status, from, to, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { ...orgFilter(req) };
    if (status) where.status = status;
    if (search) where.destination = { contains: String(search), mode: 'insensitive' };
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(String(from));
      if (to) range.lte = new Date(String(to));
      where.departureDate = range;
    }

    const [departures, total] = await Promise.all([
      prisma.departure.findMany({
        where,
        include: {
          package: { select: { id: true, name: true, code: true } },
          bookings: { select: { id: true, numberOfTravelers: true, finalPrice: true, amountPaid: true, balanceAmount: true } },
          hotels: { select: { id: true, status: true } },
          vehicles: { select: { id: true, status: true } },
        },
        orderBy: { departureDate: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.departure.count({ where }),
    ]);

    const data = departures.map((d) => ({
      ...d,
      totalTravelers: d.bookings.reduce((s, b) => s + b.numberOfTravelers, 0),
      totalRevenue: d.bookings.reduce((s, b) => s + b.finalPrice, 0),
      totalPending: d.bookings.reduce((s, b) => s + b.balanceAmount, 0),
      bookingCount: d.bookings.length,
      hotelsPending: d.hotels.filter((h) => h.status === 'PENDING').length,
      vehiclesPending: d.vehicles.filter((v) => v.status === 'PENDING').length,
    }));

    res.json({ success: true, data, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (e) {
    console.error('[operations] listDepartures error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Departure detail (passenger list + computed group summary) ─────────────

export const getDepartureDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const departure = await prisma.departure.findFirst({
      where: { id, ...orgFilter(req) },
      include: {
        package: { select: { id: true, name: true, code: true, nights: true, days: true } },
        bookings: {
          include: {
            lead: { select: { id: true, name: true, phone: true, email: true } },
            travelers: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        hotels: { orderBy: { createdAt: 'asc' } },
        vehicles: { orderBy: { createdAt: 'asc' } },
        documents: { include: { uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        timeline: { orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }] },
      },
    });
    if (!departure) { res.status(404).json({ success: false, error: 'Departure not found' }); return; }

    // Group summary is always computed live — never stored — so it reflects the
    // current bookings/travelers automatically, with no separate sync step needed.
    let totalTravelers = 0, male = 0, female = 0, children = 0, seniors = 0, extraMattress = 0;
    let veg = 0, nonVeg = 0, jain = 0;
    const roomCounts: Record<string, number> = { SINGLE: 0, DOUBLE: 0, TRIPLE: 0, QUAD: 0 };
    let pendingPayments = 0, totalPendingAmount = 0;

    for (const booking of departure.bookings) {
      totalTravelers += booking.numberOfTravelers;
      if (booking.balanceAmount > 0) { pendingPayments += 1; totalPendingAmount += booking.balanceAmount; }

      if (booking.travelers.length > 0) {
        for (const t of booking.travelers) {
          if (t.gender === 'MALE') male += 1;
          else if (t.gender === 'FEMALE') female += 1;
          if (t.isChild) children += 1;
          if (t.isSeniorCitizen) seniors += 1;
          if (t.needsExtraMattress) extraMattress += 1;
          const food = t.foodPreference ?? booking.foodPreference;
          if (food === 'VEG') veg += 1; else if (food === 'NON_VEG') nonVeg += 1; else if (food === 'JAIN') jain += 1;
          const room = t.roomSharing ?? booking.roomSharing;
          if (room in roomCounts) roomCounts[room] += 1;
        }
      } else {
        // no individual traveler records entered yet — fall back to the booking-level aggregate
        if (booking.foodPreference === 'VEG') veg += booking.numberOfTravelers;
        else if (booking.foodPreference === 'NON_VEG') nonVeg += booking.numberOfTravelers;
        else if (booking.foodPreference === 'JAIN') jain += booking.numberOfTravelers;
        if (booking.roomSharing in roomCounts) roomCounts[booking.roomSharing] += booking.numberOfTravelers;
      }
    }

    const roomCapacity: Record<string, number> = { SINGLE: 1, DOUBLE: 2, TRIPLE: 3, QUAD: 4 };
    const groupSummary = {
      totalTravelers, maleCount: male, femaleCount: female,
      doubleSharingRoomsRequired: Math.ceil(roomCounts.DOUBLE / roomCapacity.DOUBLE),
      tripleSharingRoomsRequired: Math.ceil(roomCounts.TRIPLE / roomCapacity.TRIPLE),
      quadSharingRoomsRequired: Math.ceil(roomCounts.QUAD / roomCapacity.QUAD),
      extraMattressRequired: extraMattress,
      vegMeals: veg, nonVegMeals: nonVeg, jainMeals: jain,
      childrenCount: children, seniorCitizenCount: seniors,
      pendingPayments, totalPendingAmount,
    };

    res.json({ success: true, data: { ...departure, groupSummary } });
  } catch (e) {
    console.error('[operations] getDepartureDetail error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Update departure (status / trip captain) ────────────────────────────────

export const updateDeparture = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.departure.findFirst({ where: { id, ...orgFilter(req) } });
    if (!existing) { res.status(404).json({ success: false, error: 'Departure not found' }); return; }

    const { status, tripCaptainName, tripCaptainPhone, tripCaptainStatus, returnDate } = req.body;

    const departure = await prisma.departure.update({
      where: { id },
      data: {
        status: status ?? existing.status,
        tripCaptainName: tripCaptainName !== undefined ? tripCaptainName?.trim() || null : existing.tripCaptainName,
        tripCaptainPhone: tripCaptainPhone !== undefined ? tripCaptainPhone?.trim() || null : existing.tripCaptainPhone,
        tripCaptainStatus: tripCaptainStatus ?? existing.tripCaptainStatus,
        returnDate: returnDate !== undefined ? (returnDate ? new Date(returnDate) : null) : existing.returnDate,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'Departure Updated',
        details: `Departure for ${existing.destination} on ${existing.departureDate.toDateString()} updated by ${req.user?.name}`,
        entityType: 'DEPARTURE',
        entityId: id,
        userId: req.user!.id,
      },
    });
    emitOperationsUpdated(id);

    res.json({ success: true, data: departure });
  } catch (e) {
    console.error('[operations] updateDeparture error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Traveler CRUD (Operations enriches an already-confirmed booking) ───────

export const createTraveler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, ...orgFilter(req) } });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const {
      name, mobile, email, gender, dob, age, bloodGroup, nationality, seatNumber, pickupPoint,
      emergencyContactName, emergencyContactPhone, roomSharing, foodPreference,
      isChild, isSeniorCitizen, needsExtraMattress, specialNotes,
      govIdType, govIdNumber, govIdDocumentUrl, medicalConditions, arrivalDetails, departureDetails,
    } = req.body;
    if (!name?.trim()) { res.status(400).json({ success: false, error: 'Traveler name is required' }); return; }

    const dobDate = dob ? new Date(dob) : null;
    const resolvedAge = age !== undefined && age !== null && age !== '' ? Number(age) : (dobDate ? ageFromDob(dobDate) : null);

    const traveler = await prisma.traveler.create({
      data: {
        bookingId,
        name: name.trim(),
        mobile: mobile?.trim() || null,
        email: email?.trim() || null,
        gender: gender || null,
        dob: dobDate,
        age: resolvedAge,
        bloodGroup: bloodGroup?.trim() || null,
        nationality: nationality?.trim() || null,
        seatNumber: seatNumber?.trim() || null,
        pickupPoint: pickupPoint?.trim() || null,
        emergencyContactName: emergencyContactName?.trim() || null,
        emergencyContactPhone: emergencyContactPhone?.trim() || null,
        roomSharing: roomSharing || null,
        foodPreference: foodPreference || null,
        isChild: !!isChild,
        isSeniorCitizen: !!isSeniorCitizen,
        needsExtraMattress: !!needsExtraMattress,
        specialNotes: specialNotes?.trim() || null,
        govIdType: govIdType || null,
        govIdNumber: govIdNumber?.trim() || null,
        govIdDocumentUrl: govIdDocumentUrl?.trim() || null,
        medicalConditions: medicalConditions?.trim() || null,
        arrivalDetails: arrivalDetails?.trim() || null,
        departureDetails: departureDetails?.trim() || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'Traveler Added',
        details: `Traveler ${traveler.name} added to booking ${booking.bookingNumber ?? booking.id}`,
        entityType: 'TRAVELER',
        entityId: traveler.id,
        userId: req.user!.id,
      },
    });
    if (booking.departureId) emitOperationsUpdated(booking.departureId);

    res.status(201).json({ success: true, data: traveler });
  } catch (e) {
    console.error('[operations] createTraveler error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateTraveler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.traveler.findUnique({ where: { id }, include: { booking: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Traveler not found' }); return; }
    if (orgId(req) && existing.booking.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Traveler not found' }); return; }

    const b = req.body;
    const dobDate = b.dob !== undefined ? (b.dob ? new Date(b.dob) : null) : existing.dob;
    const resolvedAge = b.age !== undefined
      ? (b.age === null || b.age === '' ? null : Number(b.age))
      : (b.dob !== undefined && dobDate ? ageFromDob(dobDate) : existing.age);

    const traveler = await prisma.traveler.update({
      where: { id },
      data: {
        name: b.name !== undefined ? String(b.name).trim() : existing.name,
        mobile: b.mobile !== undefined ? b.mobile?.trim() || null : existing.mobile,
        email: b.email !== undefined ? b.email?.trim() || null : existing.email,
        gender: b.gender !== undefined ? b.gender || null : existing.gender,
        dob: dobDate,
        age: resolvedAge,
        bloodGroup: b.bloodGroup !== undefined ? b.bloodGroup?.trim() || null : existing.bloodGroup,
        nationality: b.nationality !== undefined ? b.nationality?.trim() || null : existing.nationality,
        seatNumber: b.seatNumber !== undefined ? b.seatNumber?.trim() || null : existing.seatNumber,
        pickupPoint: b.pickupPoint !== undefined ? b.pickupPoint?.trim() || null : existing.pickupPoint,
        emergencyContactName: b.emergencyContactName !== undefined ? b.emergencyContactName?.trim() || null : existing.emergencyContactName,
        emergencyContactPhone: b.emergencyContactPhone !== undefined ? b.emergencyContactPhone?.trim() || null : existing.emergencyContactPhone,
        roomSharing: b.roomSharing !== undefined ? b.roomSharing || null : existing.roomSharing,
        foodPreference: b.foodPreference !== undefined ? b.foodPreference || null : existing.foodPreference,
        isChild: b.isChild !== undefined ? !!b.isChild : existing.isChild,
        isSeniorCitizen: b.isSeniorCitizen !== undefined ? !!b.isSeniorCitizen : existing.isSeniorCitizen,
        needsExtraMattress: b.needsExtraMattress !== undefined ? !!b.needsExtraMattress : existing.needsExtraMattress,
        specialNotes: b.specialNotes !== undefined ? b.specialNotes?.trim() || null : existing.specialNotes,
        govIdType: b.govIdType !== undefined ? b.govIdType || null : existing.govIdType,
        govIdNumber: b.govIdNumber !== undefined ? b.govIdNumber?.trim() || null : existing.govIdNumber,
        govIdDocumentUrl: b.govIdDocumentUrl !== undefined ? b.govIdDocumentUrl?.trim() || null : existing.govIdDocumentUrl,
        medicalConditions: b.medicalConditions !== undefined ? b.medicalConditions?.trim() || null : existing.medicalConditions,
        arrivalDetails: b.arrivalDetails !== undefined ? b.arrivalDetails?.trim() || null : existing.arrivalDetails,
        departureDetails: b.departureDetails !== undefined ? b.departureDetails?.trim() || null : existing.departureDetails,
      },
    });

    if (existing.booking.departureId) emitOperationsUpdated(existing.booking.departureId);
    res.json({ success: true, data: traveler });
  } catch (e) {
    console.error('[operations] updateTraveler error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteTraveler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.traveler.findUnique({ where: { id }, include: { booking: true } });
    if (!existing) { res.status(404).json({ success: false, error: 'Traveler not found' }); return; }
    if (orgId(req) && existing.booking.organizationId !== orgId(req)) { res.status(404).json({ success: false, error: 'Traveler not found' }); return; }

    await prisma.traveler.delete({ where: { id } });
    if (existing.booking.departureId) emitOperationsUpdated(existing.booking.departureId);
    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error('[operations] deleteTraveler error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
