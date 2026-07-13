import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;
const orgFilter = (req: AuthenticatedRequest) => (orgId(req) ? { organizationId: orgId(req) } : {});

// ─── Customer Ledger — full financial picture for one booking ───────────────

export const getCustomerLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, ...orgFilter(req) },
      include: {
        lead: { select: { id: true, name: true, phone: true, email: true, assignedTo: { select: { id: true, name: true } } } },
        package: { select: { id: true, name: true, code: true } },
        departure: { select: { id: true, destination: true, departureDate: true } },
        payments: { include: { recordedBy: { select: { id: true, name: true } }, verifiedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        refunds: { include: { requestedBy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const verifiedPayments = booking.payments.filter((p) => p.status === 'VERIFIED');
    const totalRefunded = booking.refunds.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.amount, 0);

    res.json({
      success: true,
      data: {
        ...booking,
        ledger: {
          packagePrice: booking.finalPrice,
          totalPayable: booking.finalPrice,
          advanceReceived: verifiedPayments.filter((p) => p.type === 'ADVANCE').reduce((s, p) => s + p.amount, 0),
          verifiedPayments: verifiedPayments.reduce((s, p) => s + (p.type === 'REFUND' ? -p.amount : p.amount), 0),
          pendingAmount: booking.balanceAmount,
          balanceDueDate: booking.balanceDueDate,
          refunds: totalRefunded,
        },
      },
    });
  } catch (e) {
    console.error('[finance] getCustomerLedger error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Pending Payment Tracker ──────────────────────────────────────────────────

export const getPendingTracker = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { destination, salesEmployeeId, status, search, departureFrom, departureTo, page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Record<string, unknown> = { status: 'ACTIVE', ...orgFilter(req) };
    if (salesEmployeeId) where.lead = { assignedToId: salesEmployeeId };
    if (destination) {
      where.OR = [
        { departure: { destination: { contains: String(destination), mode: 'insensitive' } } },
        { lead: { destination: { contains: String(destination), mode: 'insensitive' } } },
      ];
    }
    if (departureFrom || departureTo) {
      const range: Record<string, Date> = {};
      if (departureFrom) range.gte = new Date(String(departureFrom));
      if (departureTo) range.lte = new Date(String(departureTo));
      where.departureDate = range;
    }
    if (search) {
      where.lead = { ...(where.lead as object ?? {}), name: { contains: String(search), mode: 'insensitive' } };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true, destination: true, assignedTo: { select: { id: true, name: true } } } },
        departure: { select: { destination: true, departureDate: true } },
      },
      orderBy: { balanceDueDate: 'asc' },
    });

    const now = new Date();
    const rows = bookings.map((b) => {
      const daysRemaining = b.balanceDueDate ? Math.ceil((b.balanceDueDate.getTime() - now.getTime()) / 86400000) : null;
      let indicator: 'PAID' | 'DUE_SOON' | 'OVERDUE' = 'PAID';
      if (b.balanceAmount > 0) {
        if (daysRemaining !== null && daysRemaining < 0) indicator = 'OVERDUE';
        else if (daysRemaining !== null && daysRemaining <= 7) indicator = 'DUE_SOON';
        else indicator = 'DUE_SOON';
      }
      return {
        id: b.id,
        bookingId: b.id,
        customerName: b.lead.name,
        phone: b.lead.phone,
        destination: b.departure?.destination || b.lead.destination || 'Unspecified',
        departureDate: b.departure?.departureDate ?? b.departureDate,
        pendingAmount: b.balanceAmount,
        dueDate: b.balanceDueDate,
        daysRemaining,
        salesEmployee: b.lead.assignedTo?.name ?? '—',
        indicator: b.balanceAmount === 0 ? 'PAID' : indicator,
      };
    }).filter((r) => (status ? r.indicator === status : true));

    const total = rows.length;
    const paged = rows.slice(skip, skip + Number(limit));

    res.json({ success: true, data: paged, meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } });
  } catch (e) {
    console.error('[finance] getPendingTracker error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
