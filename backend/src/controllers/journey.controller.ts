import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

function orgFilter(req: AuthenticatedRequest): Record<string, unknown> {
  return req.user?.organizationId ? { organizationId: req.user.organizationId } : {};
}

// ─── Customer Journey Tracker ────────────────────────────────────────────────
// Pure read-only aggregation over fields that already exist elsewhere in the
// app (Lead.status, Booking, Payment, Traveler, Hotel/Vehicle, Departure) —
// same "compute on read, never store" philosophy as Departure's groupSummary
// and checklist. The only fields with no other backing source are
// Booking.reviewSubmittedAt/referralReceivedAt, added for exactly this.
const STAGE_ORDER = [
  'LEAD_CREATED', 'INTERESTED', 'PACKAGE_SHARED', 'BOOKING_CONFIRMED', 'ADVANCE_PAID',
  'TRAVELER_DETAILS_SUBMITTED', 'TRAVELER_DETAILS_VERIFIED', 'HOTEL_CONFIRMED', 'VEHICLE_ASSIGNED',
  'ROOM_ALLOCATED', 'CAPTAIN_ASSIGNED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'REVIEW_COLLECTED', 'REFERRAL_RECEIVED',
] as const;
type StageKey = (typeof STAGE_ORDER)[number];

const STAGE_LABELS: Record<StageKey, string> = {
  LEAD_CREATED: 'Lead Created',
  INTERESTED: 'Interested',
  PACKAGE_SHARED: 'Package Shared',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  ADVANCE_PAID: 'Advance Paid',
  TRAVELER_DETAILS_SUBMITTED: 'Traveller Details Submitted',
  TRAVELER_DETAILS_VERIFIED: 'Traveller Details Verified',
  HOTEL_CONFIRMED: 'Hotel Confirmed',
  VEHICLE_ASSIGNED: 'Vehicle Assigned',
  ROOM_ALLOCATED: 'Room Allocated',
  CAPTAIN_ASSIGNED: 'Captain Assigned',
  TRIP_STARTED: 'Trip Started',
  TRIP_COMPLETED: 'Trip Completed',
  REVIEW_COLLECTED: 'Review Collected',
  REFERRAL_RECEIVED: 'Referral Received',
};

export interface JourneyLeadInput {
  status: string;
  createdAt: Date;
  updatedAt: Date;
  activityLogs: { action: string; createdAt: Date }[];
  booking: {
    createdAt: Date;
    reviewSubmittedAt: Date | null;
    referralReceivedAt: Date | null;
    payments: { status: string; verifiedAt: Date | null }[];
    travelers: { verificationStatus: string; submittedAt: Date | null; verifiedAt: Date | null }[];
    departure: {
      status: string;
      tripCaptainStatus: string;
      updatedAt: Date;
      hotels: { status: string; roomAllocation: string | null }[];
      vehicles: { status: string }[];
    } | null;
  } | null;
}

// Pure computation, no DB access — shared by getLeadJourney (full detail) and
// getDepartureDetail (compact per-booking progress in the Trip Workspace).
export function computeJourney(lead: JourneyLeadInput) {
  const booking = lead.booking;
  const departure = booking?.departure ?? null;
  const packageSharedLog = lead.activityLogs.find((l) => l.action.toLowerCase().includes('package shared'));
  const at = (done: boolean, date: Date | null | undefined) => (done && date ? date : null);

  const stageDone: Record<StageKey, { done: boolean; at: Date | null }> = {
    LEAD_CREATED: { done: true, at: lead.createdAt },
    INTERESTED: {
      done: ['INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED'].includes(lead.status),
      at: at(['INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED'].includes(lead.status), lead.updatedAt),
    },
    PACKAGE_SHARED: {
      done: !!packageSharedLog || !!booking,
      at: packageSharedLog?.createdAt ?? (booking ? booking.createdAt : null),
    },
    BOOKING_CONFIRMED: { done: !!booking, at: booking?.createdAt ?? null },
    ADVANCE_PAID: {
      done: !!booking?.payments.some((p) => p.status === 'VERIFIED'),
      at: booking?.payments.filter((p) => p.status === 'VERIFIED' && p.verifiedAt).sort((a, b) => a.verifiedAt!.getTime() - b.verifiedAt!.getTime())[0]?.verifiedAt ?? null,
    },
    TRAVELER_DETAILS_SUBMITTED: {
      done: !!booking?.travelers.some((t) => t.verificationStatus !== 'PENDING'),
      at: booking?.travelers.map((t) => t.submittedAt).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
    },
    TRAVELER_DETAILS_VERIFIED: {
      done: !!booking && booking.travelers.length > 0 && booking.travelers.every((t) => t.verificationStatus === 'VERIFIED'),
      at: booking?.travelers.map((t) => t.verifiedAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
    },
    HOTEL_CONFIRMED: {
      done: !!departure && departure.hotels.length > 0 && departure.hotels.every((h) => h.status === 'CONFIRMED'),
      at: at(!!departure && departure.hotels.length > 0 && departure.hotels.every((h) => h.status === 'CONFIRMED'), departure?.updatedAt),
    },
    VEHICLE_ASSIGNED: {
      done: !!departure && departure.vehicles.length > 0 && departure.vehicles.every((v) => v.status === 'CONFIRMED'),
      at: at(!!departure && departure.vehicles.length > 0 && departure.vehicles.every((v) => v.status === 'CONFIRMED'), departure?.updatedAt),
    },
    ROOM_ALLOCATED: {
      done: !!departure && departure.hotels.length > 0 && departure.hotels.every((h) => !!h.roomAllocation?.trim()),
      at: at(!!departure && departure.hotels.length > 0 && departure.hotels.every((h) => !!h.roomAllocation?.trim()), departure?.updatedAt),
    },
    CAPTAIN_ASSIGNED: {
      done: departure?.tripCaptainStatus !== undefined && departure.tripCaptainStatus !== 'UNASSIGNED',
      at: at(departure?.tripCaptainStatus !== undefined && departure.tripCaptainStatus !== 'UNASSIGNED', departure?.updatedAt),
    },
    TRIP_STARTED: {
      done: departure?.status === 'ACTIVE' || departure?.status === 'COMPLETED',
      at: at(departure?.status === 'ACTIVE' || departure?.status === 'COMPLETED', departure?.updatedAt),
    },
    TRIP_COMPLETED: { done: departure?.status === 'COMPLETED', at: at(departure?.status === 'COMPLETED', departure?.updatedAt) },
    REVIEW_COLLECTED: { done: !!booking?.reviewSubmittedAt, at: booking?.reviewSubmittedAt ?? null },
    REFERRAL_RECEIVED: { done: !!booking?.referralReceivedAt, at: booking?.referralReceivedAt ?? null },
  };

  const stages = STAGE_ORDER.map((key) => ({ key, label: STAGE_LABELS[key], done: stageDone[key].done, at: stageDone[key].at }));
  const completedCount = stages.filter((s) => s.done).length;

  let currentIndex = -1;
  for (let i = stages.length - 1; i >= 0; i--) { if (stages[i].done) { currentIndex = i; break; } }

  return { stages, completedCount, totalCount: stages.length, currentStage: currentIndex >= 0 ? stages[currentIndex].key : null };
}

export const getLeadJourney = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null, ...orgFilter(req) },
      include: {
        activityLogs: { select: { action: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
        booking: {
          include: {
            payments: { select: { status: true, verifiedAt: true } },
            travelers: { select: { verificationStatus: true, submittedAt: true, verifiedAt: true } },
            departure: {
              select: {
                status: true, tripCaptainStatus: true, updatedAt: true,
                hotels: { select: { status: true, roomAllocation: true } },
                vehicles: { select: { status: true } },
              },
            },
          },
        },
      },
    });
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return; }
    if (req.user?.role === 'EMPLOYEE' && lead.assignedToId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Access denied' }); return;
    }

    res.json({ success: true, data: computeJourney(lead) });
  } catch (e) {
    console.error('[journey] getLeadJourney error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
