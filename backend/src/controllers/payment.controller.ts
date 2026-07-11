import { Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

const orgId = (req: AuthenticatedRequest) => req.user?.organizationId ?? null;

// ─── List payments for a booking ─────────────────────────────────────────────

export const getBookingPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const payments = await (prisma as any).payment.findMany({
      where: { bookingId },
      include: { recordedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
  } catch (e) {
    console.error('[payment] getBookingPayments error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Record a payment ─────────────────────────────────────────────────────────

export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, ...(orgId(req) ? { organizationId: orgId(req) } : {}) },
    });
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return; }

    const { amount, type, method, reference, notes, receiptNo } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: 'Valid amount is required' }); return;
    }

    const paymentAmount = Number(amount);
    const isRefund = type === 'REFUND';

    // Update booking amountPaid and balanceAmount
    const newAmountPaid = isRefund
      ? Math.max(0, booking.amountPaid - paymentAmount)
      : booking.amountPaid + paymentAmount;
    const newBalance = Math.max(0, booking.finalPrice - newAmountPaid);

    const [payment] = await prisma.$transaction([
      (prisma as any).payment.create({
        data: {
          bookingId,
          amount: paymentAmount,
          type: type || 'ADVANCE',
          method: method || 'CASH',
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
          receiptNo: receiptNo?.trim() || null,
          recordedById: req.user!.id,
        },
        include: { recordedBy: { select: { id: true, name: true } } },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { amountPaid: newAmountPaid, balanceAmount: newBalance },
      }),
    ]);

    // Activity log
    await prisma.activityLog.create({
      data: {
        action: isRefund ? 'Refund Recorded' : 'Payment Recorded',
        details: `${type || 'ADVANCE'} payment of ₹${paymentAmount.toLocaleString()} via ${method || 'CASH'}${reference ? ` (${reference})` : ''}`,
        userId: req.user!.id,
        leadId: booking.leadId,
      },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] recordPayment error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Delete a payment ─────────────────────────────────────────────────────────

export const deletePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bookingId, id } = req.params;
    const payment = await (prisma as any).payment.findFirst({
      where: { id, bookingId },
      include: { booking: true },
    });
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }

    const booking = payment.booking;
    const isRefund = payment.type === 'REFUND';

    // Reverse the payment effect on booking
    const newAmountPaid = isRefund
      ? booking.amountPaid + payment.amount
      : Math.max(0, booking.amountPaid - payment.amount);
    const newBalance = Math.max(0, booking.finalPrice - newAmountPaid);

    await prisma.$transaction([
      (prisma as any).payment.delete({ where: { id } }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { amountPaid: newAmountPaid, balanceAmount: newBalance },
      }),
    ]);

    res.json({ success: true, message: 'Payment deleted and booking balance updated' });
  } catch (e) {
    console.error('[payment] deletePayment error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── Get all payments summary for dashboard ───────────────────────────────────

export const getPaymentsSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const oid = orgId(req);

    const bookings = await prisma.booking.findMany({
      where: { organizationId: oid, status: 'ACTIVE' },
      select: {
        id: true, finalPrice: true, amountPaid: true, balanceAmount: true,
        balanceDueDate: true, travelerName: true, departureDate: true,
        lead: { select: { name: true, phone: true, destination: true } },
      },
      orderBy: { balanceDueDate: 'asc' },
    });

    const pendingPayments = bookings.filter((b) => b.balanceAmount > 0);
    const overduePayments = pendingPayments.filter(
      (b) => b.balanceDueDate && new Date(b.balanceDueDate) < new Date()
    );

    const summary = {
      totalRevenue: bookings.reduce((s, b) => s + b.finalPrice, 0),
      totalCollected: bookings.reduce((s, b) => s + b.amountPaid, 0),
      totalBalance: bookings.reduce((s, b) => s + b.balanceAmount, 0),
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      overdueAmount: overduePayments.reduce((s, b) => s + b.balanceAmount, 0),
    };

    res.json({ success: true, data: { summary, pendingPayments: pendingPayments.slice(0, 20), overduePayments: overduePayments.slice(0, 10) } });
  } catch (e) {
    console.error('[payment] getPaymentsSummary error:', e);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
