import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';
import { computeChecklist } from './departure.controller.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;
const orgFilter = (req: AuthenticatedRequest) => (orgId(req) ? { organizationId: orgId(req) } : {});

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// ─── Executive Dashboard — the cross-module control-center view for Admin ──
// Every widget here is computed live from existing tables (Booking/Payment/
// Refund/Departure/Hotel/Vehicle/Traveler/Lead) — nothing is denormalized or
// cached, matching the "compute on read" idiom used by every other dashboard
// in this codebase (Finance/Operations). Two things worth knowing before
// reading the "Top X" / "Customer" section below:
//
// 1. Booking.leadId is @unique — there is no multi-trip-per-customer concept
//    in this schema. "Returning customers"/"Customer Retention" are therefore
//    approximated by matching Lead.phone across multiple CONFIRMED leads
//    (a repeat customer typically gets a new Lead record for their next trip).
// 2. Campaign.budget is used as the cost basis wherever "campaign spend" is
//    implied — there is no separate ad-spend ledger in this schema.
export const getExecutiveDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const in7 = addDays(today, 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const bookingOrgFilter = orgId(req) ? { organizationId: orgId(req) } : {};

    const [
      todaysBookings,
      monthlyBookings,
      activeBookingsAgg,
      todaysCollections,
      refundsPending,
      upcomingDepartures,
      tripsInProgress,
      activeBookingsCount,
      pendingPayments,
      pendingTravelerVerification,
      pendingHotelConfirmation,
      pendingVehicleConfirmation,
      totalLeads,
      confirmedLeads,
      newCustomersThisMonth,
      confirmedLeadPhones,
      checklistDepartures,
      bookingsWithRelations,
    ] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'ACTIVE', createdAt: { gte: today, lte: todayEnd }, ...bookingOrgFilter }, select: { finalPrice: true } }),
      prisma.booking.findMany({ where: { status: 'ACTIVE', createdAt: { gte: monthStart }, ...bookingOrgFilter }, select: { finalPrice: true } }),
      prisma.booking.aggregate({ where: { status: 'ACTIVE', ...bookingOrgFilter }, _sum: { finalPrice: true, amountPaid: true, balanceAmount: true } }),
      prisma.payment.aggregate({ where: { status: 'VERIFIED', verifiedAt: { gte: today, lte: todayEnd }, booking: bookingOrgFilter }, _sum: { amount: true } }),
      prisma.refund.count({ where: { status: 'REQUESTED', ...orgFilter(req) } }),
      prisma.departure.count({ where: { ...orgFilter(req), status: 'UPCOMING', departureDate: { gte: today, lte: in7 } } }),
      prisma.departure.count({ where: { ...orgFilter(req), status: 'ACTIVE' } }),
      prisma.booking.count({ where: { status: 'ACTIVE', ...bookingOrgFilter } }),
      prisma.payment.count({ where: { status: 'PENDING', booking: bookingOrgFilter } }),
      prisma.traveler.count({ where: { verificationStatus: { in: ['SUBMITTED', 'CORRECTION_REQUESTED'] }, booking: { ...bookingOrgFilter } } }),
      prisma.hotel.count({ where: { status: 'PENDING', departure: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } } } }),
      prisma.vehicle.count({ where: { status: 'PENDING', departure: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } } } }),
      prisma.lead.count({ where: { ...orgFilter(req), deletedAt: null } }),
      prisma.lead.count({ where: { ...orgFilter(req), deletedAt: null, status: 'CONFIRMED' } }),
      prisma.lead.count({ where: { ...orgFilter(req), deletedAt: null, status: 'CONFIRMED', booking: { createdAt: { gte: monthStart } } } }),
      prisma.lead.findMany({ where: { ...orgFilter(req), deletedAt: null, status: 'CONFIRMED' }, select: { phone: true } }),
      prisma.departure.findMany({
        where: { ...orgFilter(req), status: { in: ['UPCOMING', 'ACTIVE'] } },
        select: {
          hotels: { select: { status: true, roomAllocation: true } },
          vehicles: { select: { status: true, driverName: true } },
          tripCaptainStatus: true,
          manualChecklist: true,
          bookings: { select: { travelers: { select: { verificationStatus: true } } } },
          departureDate: true,
        },
      }),
      prisma.booking.findMany({
        where: { status: 'ACTIVE', ...bookingOrgFilter },
        select: {
          finalPrice: true,
          packageId: true, package: { select: { name: true } },
          departure: { select: { destination: true } },
          lead: { select: { destination: true, campaignId: true, campaign: { select: { name: true } }, assignedToId: true, assignedTo: { select: { name: true } } } },
        },
      }),
    ]);

    // Top Selling Package / Top Destination / Top Campaign / Top Employee —
    // reduced in JS over ACTIVE bookings, same "compute on read" idiom as
    // groupSummary/revenue-by-destination elsewhere in this codebase.
    const byPackage: Record<string, { name: string; bookings: number; revenue: number }> = {};
    const byDestination: Record<string, { revenue: number }> = {};
    const byCampaign: Record<string, { name: string; revenue: number }> = {};
    const byEmployee: Record<string, { name: string; revenue: number }> = {};
    for (const b of bookingsWithRelations) {
      if (b.packageId && b.package) {
        if (!byPackage[b.packageId]) byPackage[b.packageId] = { name: b.package.name, bookings: 0, revenue: 0 };
        byPackage[b.packageId].bookings += 1;
        byPackage[b.packageId].revenue += b.finalPrice;
      }
      const dest = b.departure?.destination || b.lead.destination || 'Unspecified';
      if (!byDestination[dest]) byDestination[dest] = { revenue: 0 };
      byDestination[dest].revenue += b.finalPrice;
      if (b.lead.campaignId && b.lead.campaign) {
        if (!byCampaign[b.lead.campaignId]) byCampaign[b.lead.campaignId] = { name: b.lead.campaign.name, revenue: 0 };
        byCampaign[b.lead.campaignId].revenue += b.finalPrice;
      }
      if (b.lead.assignedToId && b.lead.assignedTo) {
        if (!byEmployee[b.lead.assignedToId]) byEmployee[b.lead.assignedToId] = { name: b.lead.assignedTo.name, revenue: 0 };
        byEmployee[b.lead.assignedToId].revenue += b.finalPrice;
      }
    }
    const topSellingPackage = Object.values(byPackage).sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const topDestination = Object.entries(byDestination).map(([destination, v]) => ({ destination, ...v })).sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const topCampaign = Object.values(byCampaign).sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const topEmployee = Object.values(byEmployee).sort((a, b) => b.revenue - a.revenue)[0] ?? null;

    // Customer Retention — approximated by phone-number repeats across
    // CONFIRMED leads (see module comment above for why).
    const phoneCounts: Record<string, number> = {};
    for (const l of confirmedLeadPhones) phoneCounts[l.phone] = (phoneCounts[l.phone] ?? 0) + 1;
    const totalCustomers = Object.keys(phoneCounts).length;
    const returningCustomers = Object.values(phoneCounts).filter((c) => c > 1).length;
    const customerRetentionPct = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 1000) / 10 : 0;
    const conversionRatePct = totalLeads > 0 ? Math.round((confirmedLeads / totalLeads) * 1000) / 10 : 0;

    // Business Health Score — a transparent, documented average of four
    // signals already computed above: how much of booked revenue has
    // actually been collected, how ready upcoming/active trips are
    // (checklist completion), whether trips departing within 7 days are
    // fully ready, and lead-to-booking conversion. Not a black box — every
    // component is also returned individually in businessHealthBreakdown.
    const totalRevenueAllTime = activeBookingsAgg._sum.finalPrice ?? 0;
    const totalCollectedAllTime = activeBookingsAgg._sum.amountPaid ?? 0;
    const collectionRatePct = totalRevenueAllTime > 0 ? Math.round((totalCollectedAllTime / totalRevenueAllTime) * 1000) / 10 : 0;

    const checklistProgressAvg = checklistDepartures.length
      ? Math.round(checklistDepartures.reduce((s, d) => s + computeChecklist(d as any).progress, 0) / checklistDepartures.length)
      : 0;

    const departingSoon = checklistDepartures.filter((d) => d.departureDate >= today && d.departureDate <= in7);
    const onTimeReadinessPct = departingSoon.length
      ? Math.round((departingSoon.filter((d) => computeChecklist(d as any).progress === 100).length / departingSoon.length) * 100)
      : 100;

    const businessHealthScore = Math.round((collectionRatePct + checklistProgressAvg + onTimeReadinessPct + conversionRatePct) / 4);

    res.json({
      success: true,
      data: {
        todaysRevenue: todaysBookings.reduce((s, b) => s + b.finalPrice, 0),
        monthlyRevenue: monthlyBookings.reduce((s, b) => s + b.finalPrice, 0),
        outstandingAmount: activeBookingsAgg._sum.balanceAmount ?? 0,
        collectionsToday: todaysCollections._sum.amount ?? 0,
        refundsPending,
        upcomingDepartures,
        tripsInProgress,
        activeBookings: activeBookingsCount,
        pendingPayments,
        pendingTravelerVerification,
        pendingHotelConfirmation,
        pendingVehicleConfirmation,
        topSellingPackage,
        topDestination,
        topCampaign,
        topEmployee,
        totalCustomers,
        newCustomersThisMonth,
        customerRetentionPct,
        conversionRatePct,
        businessHealthScore,
        businessHealthBreakdown: { collectionRatePct, checklistProgressAvg, onTimeReadinessPct, conversionRatePct },
      },
    });
  } catch (e) {
    console.error('[executive] getExecutiveDashboardStats error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
