import { useState, useEffect, useRef } from 'react';
import {
  Phone, Mail, Calendar, User, Megaphone, DollarSign,
  Users, MapPin, MessageSquare, Clock, CheckCircle, Edit, ArrowRightLeft,
  Star, Save, FileText, Activity, X, Utensils, BedDouble, Package,
  IndianRupee, ChevronRight, CreditCard, Trash2, Plus,
} from 'lucide-react';
import { Lead, LeadStatus, Booking, Payment } from '../../types/index';
import { useLead, useUpdateLead, useTransferLead } from '../../hooks/useLeads';
import { useBookingByLead } from '../../hooks/useBookings';
import { useBookingPayments, useRecordPayment, useDeletePayment } from '../../hooks/usePayments';
import { useUsers } from '../../hooks/useUsers';
import BookingConfirmModal from './BookingConfirmModal';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import LeadForm from './LeadForm';
import PriorityBadge from '../ui/PriorityBadge';
import TagChip from '../ui/TagChip';
import CommentsSection from './CommentsSection';
import { Skeleton } from '../ui/Skeleton';
import {
  formatDate, formatDateTime, formatRelativeTime, formatCurrency, isOverdue, cn, leadStatusConfig,
} from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';

interface LeadDetailProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
}

type WorkspaceTab = 'overview' | 'notes' | 'activity' | 'comments' | 'payments';

const statusOrder: LeadStatus[] = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED', 'LOST'];

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="w-6 h-6 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      {/* Body skeleton */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Info Cell ────────────────────────────────────────────────────────────────

function InfoCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-900 font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Status Quick-Update Bar ──────────────────────────────────────────────────

function StatusBar({ current, onUpdate, disabled, isEmployee }: { current: LeadStatus; onUpdate: (s: LeadStatus) => void; disabled: boolean; isEmployee: boolean }) {
  const currentIdx = statusOrder.indexOf(current);
  return (
    <div className="flex flex-wrap gap-1.5">
      {statusOrder.map((s, idx) => {
        const cfg = leadStatusConfig[s];
        const isCurrent = current === s;
        // Once confirmed: only CONFIRMED (current) and LOST are valid
        const isLocked = current === 'CONFIRMED' && s !== 'CONFIRMED' && s !== 'LOST';
        // Employees cannot set CONFIRMED directly (booking flow handles it) or go backward
        const isHiddenForEmployee = isEmployee && (
          s === 'CONFIRMED' && !isCurrent ||   // hide CONFIRMED button (use booking flow)
          (current === 'CONFIRMED' && isLocked)  // hide backward options on confirmed leads
        );
        // For employees: backward statuses are also locked (forward-only workflow)
        const isBackward = isEmployee && idx < currentIdx && s !== 'LOST';

        if (isHiddenForEmployee) return null;

        const inactive = isLocked || isBackward;
        return (
          <button
            key={s}
            onClick={() => !isCurrent && !inactive && onUpdate(s)}
            disabled={isCurrent || disabled || inactive}
            title={isLocked ? 'Cannot revert a confirmed booking' : isBackward ? 'Cannot move status backward' : undefined}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap',
              isCurrent
                ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ring-offset-1 ring-current shadow-sm`
                : inactive
                  ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 disabled:cursor-default'
            )}
          >
            {isCurrent && <span className="mr-1">✓</span>}{cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Notes Section ────────────────────────────────────────────────────────────

function NotesSection({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();
  const draftKey = `note_draft_${lead.id}`;
  const [draft, setDraft] = useState(() => localStorage.getItem(draftKey) ?? lead.notes ?? '');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = lead.notes ?? '';
    const stored = localStorage.getItem(draftKey) ?? '';
    if (stored && stored !== saved) { setDraft(stored); setHasUnsaved(true); }
    else { setDraft(saved); setHasUnsaved(false); }
  }, [lead.id, lead.notes]);

  const handleChange = (val: string) => {
    setDraft(val);
    setHasUnsaved(val !== (lead.notes ?? ''));
    localStorage.setItem(draftKey, val);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      if (val !== lead.notes) {
        updateLead.mutate({ id: lead.id, notes: val }, {
          onSuccess: () => { localStorage.removeItem(draftKey); setHasUnsaved(false); setLastSaved(new Date()); },
        });
      }
    }, 3000);
  };

  const handleSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    updateLead.mutate({ id: lead.id, notes: draft }, {
      onSuccess: () => { localStorage.removeItem(draftKey); setHasUnsaved(false); setLastSaved(new Date()); },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Internal Notes</p>
        </div>
        <div className="flex items-center gap-2">
          {updateLead.isPending && <span className="text-xs text-slate-400">Saving…</span>}
          {hasUnsaved && !updateLead.isPending && (
            <span className="text-xs text-amber-600 font-medium animate-pulse">Unsaved</span>
          )}
          {lastSaved && !hasUnsaved && !updateLead.isPending && (
            <span className="text-xs text-emerald-600">Saved {formatRelativeTime(lastSaved)}</span>
          )}
          {hasUnsaved && (
            <button
              onClick={handleSave}
              disabled={updateLead.isPending}
              className="btn-primary py-1 px-2.5 text-xs gap-1.5"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          )}
        </div>
      </div>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={10}
        className="input resize-none text-sm leading-relaxed"
        placeholder="Add internal notes about this lead… (auto-saves after 3 seconds)"
      />
      <p className="text-xs text-slate-400">Notes are visible only to your team.</p>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline({ logs }: { logs: NonNullable<Lead['activityLogs']> }) {
  if (!logs.length) {
    return (
      <div className="empty-state">
        <Activity className="empty-state-icon" />
        <p className="empty-state-title">No activity yet</p>
        <p className="empty-state-body">Actions on this lead will appear here.</p>
      </div>
    );
  }

  const actionEmoji: Record<string, string> = {
    'Lead Created': '🆕',
    'Lead Updated': '✏️',
    'Lead Transferred': '🔄',
    'Lead Deleted': '🗑️',
  };

  return (
    <div className="space-y-0">
      {logs.map((log, idx) => (
        <div key={log.id} className="relative flex gap-3 pb-5">
          {idx < logs.length - 1 && (
            <div className="absolute left-3.5 top-8 bottom-0 w-px bg-slate-100" />
          )}
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-xs">
            {actionEmoji[log.action] ?? '📝'}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700">{log.action}</span>
              <span className="text-xs text-slate-400">{formatRelativeTime(log.createdAt)}</span>
            </div>
            <p className="text-xs text-slate-500">{log.user.name}</p>
            {log.details && (
              <p className="text-xs text-slate-400 mt-0.5 break-words">{log.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function BookingSummary({ booking, onEdit }: { booking: Booking; onEdit: () => void }) {
  const foodLabel: Record<string, string> = {
    VEG: 'Vegetarian', NON_VEG: 'Non-Vegetarian', JAIN: 'Jain', NO_PREFERENCE: 'No Preference',
  };
  const roomLabel: Record<string, string> = {
    SINGLE: 'Single Occupancy', DOUBLE: 'Double Sharing', TRIPLE: 'Triple Sharing', QUAD: 'Quad Sharing',
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-100 border-b border-emerald-200">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Booking Confirmed</span>
          {booking.bookingNumber && (
            <span className="text-xs font-mono bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">{booking.bookingNumber}</span>
          )}
        </div>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium">
          <Edit className="w-3 h-3" /> Edit
        </button>
      </div>

      {/* Content */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {booking.package && (
          <div className="flex items-start gap-2 col-span-2 sm:col-span-3">
            <Package className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Package</p>
              <p className="text-sm font-medium text-slate-800">{booking.package.name}
                <span className="ml-1.5 text-xs text-slate-400 font-mono">({booking.package.code})</span>
              </p>
            </div>
          </div>
        )}
        {(booking.departureDate || booking.returnDate) && (
          <div className="flex items-start gap-2 col-span-2 sm:col-span-3">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Travel Dates</p>
              <p className="text-sm font-medium text-slate-800">
                {booking.departureDate ? formatDate(booking.departureDate) : '—'}
                {booking.returnDate && ` → ${formatDate(booking.returnDate)}`}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2">
          <Users className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Travelers</p>
            <p className="text-sm font-medium text-slate-800">{booking.numberOfTravelers}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Utensils className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Food</p>
            <p className="text-sm font-medium text-slate-800">{foodLabel[booking.foodPreference] ?? booking.foodPreference}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <BedDouble className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Room</p>
            <p className="text-sm font-medium text-slate-800">{roomLabel[booking.roomSharing] ?? booking.roomSharing}</p>
          </div>
        </div>
        {(booking.departureLocation || booking.departurePackage) && (
          <div className="flex items-start gap-2 col-span-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Departure</p>
              <p className="text-sm font-medium text-slate-800">
                {[booking.departureLocation, booking.departurePackage].filter(Boolean).join(' — ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Payment strip */}
      <div className="flex border-t border-emerald-200">
        <div className="flex-1 px-4 py-2.5 text-center border-r border-emerald-200">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Final Price</p>
          <p className="text-sm font-bold text-slate-800">₹{booking.finalPrice.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex-1 px-4 py-2.5 text-center border-r border-emerald-200">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Paid</p>
          <p className="text-sm font-bold text-emerald-700">₹{booking.amountPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="flex-1 px-4 py-2.5 text-center">
          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Balance</p>
          <p className={`text-sm font-bold ${booking.balanceAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
            ₹{booking.balanceAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {booking.specialRequest && (
        <div className="px-4 py-2.5 border-t border-emerald-200 flex items-start gap-2">
          <ChevronRight className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-600"><span className="font-semibold text-emerald-700">Special Request:</span> {booking.specialRequest}</p>
        </div>
      )}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ booking }: { booking: Booking }) {
  const { data, isLoading } = useBookingPayments(booking.id);
  const recordPayment = useRecordPayment();
  const deletePayment = useDeletePayment();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', type: 'PARTIAL', method: 'CASH', reference: '', notes: '' });

  const payments = data?.data ?? [];

  const methodLabel: Record<string, string> = {
    CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', ONLINE: 'Online',
  };
  const typeColors: Record<string, string> = {
    ADVANCE: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    FINAL: 'bg-emerald-100 text-emerald-700',
    REFUND: 'bg-red-100 text-red-700',
  };

  const handleRecord = () => {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) return;
    recordPayment.mutate({
      bookingId: booking.id,
      amount: Number(form.amount),
      type: form.type,
      method: form.method,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ amount: '', type: 'PARTIAL', method: 'CASH', reference: '', notes: '' });
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-3 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Total</p>
          <p className="text-base font-bold text-slate-800">₹{booking.finalPrice.toLocaleString('en-IN')}</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Collected</p>
          <p className="text-base font-bold text-emerald-600">₹{booking.amountPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Balance</p>
          <p className={cn('text-base font-bold', booking.balanceAmount > 0 ? 'text-orange-600' : 'text-emerald-600')}>
            ₹{booking.balanceAmount.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Record payment button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Payment History</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </button>
        )}
      </div>

      {/* Record form */}
      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label text-xs">Amount (₹) *</label>
              <input type="number" min={1} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="input text-sm" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input text-sm">
                <option value="ADVANCE">Advance</option>
                <option value="PARTIAL">Partial</option>
                <option value="FINAL">Final</option>
                <option value="REFUND">Refund</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Method</label>
              <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className="input text-sm">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div>
              <label className="label text-xs">Reference / UTR</label>
              <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="input text-sm" placeholder="Optional" />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleRecord} disabled={recordPayment.isPending || !form.amount} className="btn-primary text-xs">
              {recordPayment.isPending ? 'Saving…' : 'Record'}
            </button>
          </div>
        </div>
      )}

      {/* Payment list */}
      {isLoading ? (
        <div className="text-center py-6 text-slate-400 text-sm">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No payments recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: Payment) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors">
              <div className={cn('text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0', typeColors[p.type] ?? 'bg-slate-100 text-slate-600')}>
                {p.type}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">₹{p.amount.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-400">{methodLabel[p.method] ?? p.method}</span>
                  {p.reference && <span className="text-xs text-slate-400 font-mono truncate">• {p.reference}</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>By {p.recordedBy?.name}</span>
                  <span>• {formatDateTime(p.createdAt)}</span>
                  {p.notes && <span>• {p.notes}</span>}
                </div>
              </div>
              <button
                onClick={() => deletePayment.mutate({ bookingId: booking.id, id: p.id })}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ lead, canAct, onUpdateLead, booking, onEditBooking }: {
  lead: Lead; canAct: boolean; onUpdateLead: (data: any) => void;
  booking?: Booking | null; onEditBooking: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Booking summary */}
      {lead.status === 'CONFIRMED' && booking && (
        <BookingSummary booking={booking} onEdit={onEditBooking} />
      )}

      {/* Lost reason banner */}
      {lead.status === 'LOST' && (lead as any).lostReason && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
          <span className="text-red-500 mt-0.5">❌</span>
          <div>
            <p className="font-semibold text-red-700">Lost Reason</p>
            <p className="text-red-600 mt-0.5">
              {(lead as any).lostReason === 'Other' ? (lead as any).lostReasonOther : (lead as any).lostReason}
            </p>
          </div>
        </div>
      )}

      {/* Follow-up alert */}
      {lead.followUpDate && (
        <div className={cn(
          'rounded-xl p-4 border',
          isOverdue(lead.followUpDate) && !lead.followUpDone
            ? 'bg-red-50 border-red-200'
            : lead.followUpDone
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-orange-50 border-orange-200'
        )}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className={cn(
                'w-4 h-4',
                isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-600' : lead.followUpDone ? 'text-emerald-600' : 'text-orange-600'
              )} />
              <p className={cn(
                'text-sm font-semibold',
                isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-700' : lead.followUpDone ? 'text-emerald-700' : 'text-orange-700'
              )}>
                {lead.followUpDone ? 'Follow-up Completed' : isOverdue(lead.followUpDate) ? 'Overdue Follow-up' : 'Upcoming Follow-up'}
              </p>
              {lead.followUpDone && <CheckCircle className="w-4 h-4 text-emerald-600" />}
            </div>
            {!lead.followUpDone && canAct && (
              <button
                onClick={() => onUpdateLead({ id: lead.id, followUpDone: true })}
                className="btn-primary py-1 px-3 text-xs"
              >
                Mark Done
              </button>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1.5">{formatDateTime(lead.followUpDate)}</p>
          {lead.followUpNotes && (
            <p className="text-sm text-slate-600 mt-1 italic">"{lead.followUpNotes}"</p>
          )}
        </div>
      )}

      {/* Customer message */}
      {lead.message && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Customer Message</p>
          </div>
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-100 whitespace-pre-wrap leading-relaxed">
            {lead.message}
          </p>
        </div>
      )}

      {/* Info grid */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact & Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <InfoCell icon={Phone} label="Phone" value={lead.phone} />
          <InfoCell icon={Mail} label="Email" value={lead.email} />
          <InfoCell icon={MapPin} label="Destination" value={lead.destination} />
          <InfoCell icon={Megaphone} label="Campaign" value={lead.campaign?.name} />
          <InfoCell icon={User} label="Assigned To" value={lead.assignedTo?.name} />
          <InfoCell icon={Users} label="Group Size" value={lead.groupSize ? `${lead.groupSize} people` : undefined} />
          <InfoCell icon={DollarSign} label="Budget" value={formatCurrency(lead.budget)} />
          <InfoCell icon={Calendar} label="Preferred Date" value={formatDate(lead.preferredDate)} />
          <InfoCell icon={Calendar} label="Created" value={formatDateTime(lead.createdAt)} />
          <InfoCell icon={Calendar} label="Last Updated" value={formatDateTime(lead.updatedAt)} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadDetail({ leadId, open, onClose, isStarred, onToggleStar }: LeadDetailProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferToId, setTransferToId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);

  const { data, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead();
  const transferLead = useTransferLead();
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: bookingData } = useBookingByLead(leadId);

  const lead = data?.data;
  const booking = bookingData?.data ?? null;
  const employees = (usersData?.data ?? []).filter((e) => e.id !== lead?.assignedToId);
  const canAct = user?.role === 'ADMIN' || lead?.assignedToId === user?.id;

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead) return;
    // Guard: once confirmed, can only move to LOST
    if (lead.status === 'CONFIRMED' && status !== 'LOST') return;
    if (status === 'CONFIRMED') {
      setBookingOpen(true);
      return;
    }
    updateLead.mutate({ id: lead.id, status });
  };

  const handleEdit = (formData: any) => {
    if (!lead) return;
    updateLead.mutate({ id: lead.id, ...formData }, { onSuccess: () => setEditOpen(false) });
  };

  const handleTransfer = () => {
    if (!lead || !transferToId) return;
    transferLead.mutate(
      { id: lead.id, assignedToId: transferToId, reason: transferReason || undefined },
      {
        onSuccess: () => {
          setTransferOpen(false);
          setTransferToId('');
          setTransferReason('');
        },
      }
    );
  };

  const hasBooking = !!booking;
  const TABS: { key: WorkspaceTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'notes', label: 'Notes', icon: FileText },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'comments', label: 'Comments', icon: MessageSquare },
    ...(hasBooking ? [{ key: 'payments' as WorkspaceTab, label: 'Payments', icon: CreditCard }] : []),
  ];

  return (
    <>
      <Modal open={open} onClose={onClose} size="3xl" noPadding>
        {isLoading || !lead ? (
          <WorkspaceSkeleton />
        ) : (
          <>
            {/* ── Sticky Header ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
              {/* Top bar: avatar + name + close */}
              <div className="flex items-start gap-4 px-6 pt-5 pb-4">
                <Avatar name={lead.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 truncate">{lead.name}</h2>
                    {onToggleStar && (
                      <button
                        onClick={onToggleStar}
                        className="p-1 rounded-lg hover:bg-yellow-50 transition-colors flex-shrink-0"
                      >
                        <Star className={cn('w-4 h-4', isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 hover:text-yellow-400')} />
                      </button>
                    )}
                  </div>
                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <Badge status={lead.status} />
                    <Badge source={lead.source} />
                    <PriorityBadge priority={(lead as any).priority ?? 'MEDIUM'} />
                    {!lead.isRead && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">New</span>
                    )}
                  </div>
                  {/* Tags */}
                  {((lead as any).tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(lead as any).tags.map((lt: any) => (
                        <TagChip key={lt.tagId ?? lt.id} tag={lt.tag ?? lt} />
                      ))}
                    </div>
                  )}
                  {/* Contact chips */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-600 rounded-lg text-xs font-medium transition-colors truncate max-w-[180px]"
                      >
                        <Mail className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Right actions + close */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {canAct && (
                    <>
                      <button
                        onClick={() => setTransferOpen(true)}
                        className="btn-ghost p-2"
                        title="Transfer lead"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditOpen(true)}
                        className="btn-ghost p-2"
                        title="Edit lead"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="btn-ghost p-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Status quick-update bar */}
              {canAct && (
                <div className="px-6 pb-3">
                  <StatusBar
                    current={lead.status}
                    onUpdate={handleStatusChange}
                    disabled={updateLead.isPending}
                    isEmployee={user?.role === 'EMPLOYEE'}
                  />
                </div>
              )}

              {/* Tab strip */}
              <div className="flex gap-0 px-6 border-t border-slate-100">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px',
                      activeTab === key
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab Body ──────────────────────────────────────────────── */}
            <div className="px-6 py-5">
              {activeTab === 'overview' && (
                <OverviewTab
                  lead={lead} canAct={canAct} onUpdateLead={(data) => updateLead.mutate(data)}
                  booking={booking} onEditBooking={() => setBookingOpen(true)}
                />
              )}
              {activeTab === 'notes' && (
                canAct
                  ? <NotesSection lead={lead} />
                  : lead.notes
                    ? <p className="text-sm text-slate-600 bg-yellow-50 rounded-xl p-4 border border-yellow-100 whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                    : <div className="empty-state"><FileText className="empty-state-icon" /><p className="empty-state-title">No notes</p></div>
              )}
              {activeTab === 'activity' && (
                <ActivityTimeline logs={lead.activityLogs ?? []} />
              )}
              {activeTab === 'comments' && (
                <CommentsSection leadId={lead.id} />
              )}
              {activeTab === 'payments' && booking && (
                <PaymentsTab booking={booking} />
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Lead" size="2xl">
        {lead && (
          <LeadForm
            defaultValues={lead}
            onSubmit={handleEdit}
            isLoading={updateLead.isPending}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      {/* ── Booking Confirm Modal ────────────────────────────────────────── */}
      {lead && (
        <BookingConfirmModal
          open={bookingOpen}
          onClose={() => setBookingOpen(false)}
          lead={lead}
          existingBooking={booking}
        />
      )}

      {/* ── Transfer Modal ───────────────────────────────────────────────── */}
      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer Lead"
        size="sm"
        footer={
          <>
            <button onClick={() => setTransferOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleTransfer}
              disabled={!transferToId || transferLead.isPending}
              className="btn-primary"
            >
              {transferLead.isPending ? 'Transferring…' : 'Transfer Lead'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Transfer <strong className="text-slate-800">{lead?.name}</strong> to another team member.
          </p>
          <div>
            <label className="label">Assign To <span className="text-red-500">*</span></label>
            <select value={transferToId} onChange={(e) => setTransferToId(e.target.value)} className="input">
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reason (optional)</label>
            <input
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="input"
              placeholder="e.g. Out of office, specialisation match…"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
