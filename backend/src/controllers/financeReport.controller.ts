import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;
const orgFilter = (req: AuthenticatedRequest) => (orgId(req) ? { organizationId: orgId(req) } : {});

function parseRange(req: AuthenticatedRequest) {
  const { startDate, endDate } = req.query as Record<string, string>;
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(new Date(endDate).setHours(23, 59, 59, 999)) : new Date();
  return { start, end };
}

// ─── Daily / Weekly / Monthly Collection Report ──────────────────────────────
// Same underlying data (VERIFIED payments in range) grouped by the requested bucket.

export const getCollectionReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { start, end } = parseRange(req);
    const period = (req.query.period as string) || 'daily'; // daily | weekly | monthly

    const payments = await prisma.payment.findMany({
      where: { status: 'VERIFIED', verifiedAt: { gte: start, lte: end }, booking: { ...orgFilter(req) } },
      select: { amount: true, method: true, verifiedAt: true },
    });

    const bucketKey = (d: Date) => {
      if (period === 'monthly') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (period === 'weekly') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };

    const buckets: Record<string, { total: number; count: number }> = {};
    for (const p of payments) {
      const key = bucketKey(p.verifiedAt!);
      if (!buckets[key]) buckets[key] = { total: 0, count: 0 };
      buckets[key].total += p.amount;
      buckets[key].count += 1;
    }

    const rows = Object.entries(buckets).map(([period, v]) => ({ period, ...v })).sort((a, b) => a.period.localeCompare(b.period));
    res.json({ success: true, data: { rows, totalCollected: payments.reduce((s, p) => s + p.amount, 0), totalTransactions: payments.length } });
  } catch (e) {
    console.error('[finance] getCollectionReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Sales employee-wise collection ──────────────────────────────────────────

export const getEmployeeCollectionReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { start, end } = parseRange(req);
    const payments = await prisma.payment.findMany({
      where: { status: 'VERIFIED', verifiedAt: { gte: start, lte: end }, booking: { ...orgFilter(req) } },
      select: { amount: true, recordedBy: { select: { id: true, name: true } } },
    });

    const byEmployee: Record<string, { name: string; total: number; count: number }> = {};
    for (const p of payments) {
      const key = p.recordedBy.id;
      if (!byEmployee[key]) byEmployee[key] = { name: p.recordedBy.name, total: 0, count: 0 };
      byEmployee[key].total += p.amount;
      byEmployee[key].count += 1;
    }

    const rows = Object.values(byEmployee).sort((a, b) => b.total - a.total);
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getEmployeeCollectionReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Destination / Departure revenue ─────────────────────────────────────────

export const getDestinationRevenueReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'ACTIVE', ...orgFilter(req) },
      select: { finalPrice: true, amountPaid: true, departure: { select: { destination: true } }, lead: { select: { destination: true } } },
    });
    const byDest: Record<string, { revenue: number; collected: number; count: number }> = {};
    for (const b of bookings) {
      const dest = b.departure?.destination || b.lead?.destination || 'Unspecified';
      if (!byDest[dest]) byDest[dest] = { revenue: 0, collected: 0, count: 0 };
      byDest[dest].revenue += b.finalPrice;
      byDest[dest].collected += b.amountPaid;
      byDest[dest].count += 1;
    }
    const rows = Object.entries(byDest).map(([destination, v]) => ({ destination, ...v })).sort((a, b) => b.revenue - a.revenue);
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getDestinationRevenueReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getDepartureRevenueReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const departures = await prisma.departure.findMany({
      where: { ...orgFilter(req) },
      select: {
        id: true, destination: true, departureDate: true,
        bookings: { where: { status: 'ACTIVE' }, select: { finalPrice: true, amountPaid: true } },
      },
      orderBy: { departureDate: 'desc' },
    });
    const rows = departures
      .map((d) => ({
        destination: d.destination,
        departureDate: d.departureDate.toISOString().slice(0, 10),
        revenue: d.bookings.reduce((s, b) => s + b.finalPrice, 0),
        collected: d.bookings.reduce((s, b) => s + b.amountPaid, 0),
        travelers: d.bookings.length,
      }))
      .filter((d) => d.revenue > 0);
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getDepartureRevenueReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Outstanding payments ─────────────────────────────────────────────────────

export const getOutstandingReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'ACTIVE', balanceAmount: { gt: 0 }, ...orgFilter(req) },
      include: { lead: { select: { name: true, phone: true, assignedTo: { select: { name: true } } } } },
      orderBy: { balanceDueDate: 'asc' },
    });
    const rows = bookings.map((b) => ({
      customer: b.lead.name, phone: b.lead.phone, salesEmployee: b.lead.assignedTo?.name ?? '—',
      totalPrice: b.finalPrice, collected: b.amountPaid, pending: b.balanceAmount,
      dueDate: b.balanceDueDate?.toISOString().slice(0, 10) ?? '—',
      overdue: !!(b.balanceDueDate && b.balanceDueDate < new Date()),
    }));
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getOutstandingReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Vendor payment report ────────────────────────────────────────────────────

export const getVendorPaymentReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.vendorPayment.findMany({
      where: { ...orgFilter(req) },
      include: { vendor: { select: { name: true, type: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const rows = payments.map((p) => ({
      vendor: p.vendor.name, serviceType: p.serviceType, totalAmount: p.totalAmount,
      advancePaid: p.advancePaid, balance: p.balanceAmount, status: p.status,
      dueDate: p.dueDate?.toISOString().slice(0, 10) ?? '—',
    }));
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getVendorPaymentReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Refund report ─────────────────────────────────────────────────────────

export const getRefundReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const refunds = await prisma.refund.findMany({
      where: { ...orgFilter(req) },
      include: { booking: { include: { lead: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const rows = refunds.map((r) => ({
      customer: r.booking.lead.name, amount: r.amount, reason: r.reason, status: r.status,
      refundDate: r.refundDate?.toISOString().slice(0, 10) ?? '—', transactionId: r.transactionId ?? '—',
    }));
    res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('[finance] getRefundReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Profit & Loss summary ────────────────────────────────────────────────────

export const getProfitLossReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { start, end } = parseRange(req);
    const bookingOrgFilter = orgId(req) ? { organizationId: orgId(req) } : {};

    const [bookings, vendorPayments, refunds] = await Promise.all([
      prisma.booking.findMany({ where: { status: 'ACTIVE', createdAt: { gte: start, lte: end }, ...bookingOrgFilter }, select: { finalPrice: true, amountPaid: true } }),
      prisma.vendorPayment.findMany({ where: { createdAt: { gte: start, lte: end }, ...orgFilter(req) }, select: { totalAmount: true } }),
      prisma.refund.findMany({ where: { status: 'PAID', refundDate: { gte: start, lte: end }, ...orgFilter(req) }, select: { amount: true } }),
    ]);

    const totalRevenue = bookings.reduce((s, b) => s + b.finalPrice, 0);
    const totalCollected = bookings.reduce((s, b) => s + b.amountPaid, 0);
    const totalVendorCosts = vendorPayments.reduce((s, v) => s + v.totalAmount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);
    const netProfit = totalCollected - totalVendorCosts - totalRefunds;

    res.json({
      success: true,
      data: { totalRevenue, totalCollected, totalVendorCosts, totalRefunds, netProfit, bookingCount: bookings.length },
    });
  } catch (e) {
    console.error('[finance] getProfitLossReport error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
