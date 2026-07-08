import { useState, useEffect, useRef } from 'react';
import {
  Phone, Mail, Calendar, User, Megaphone, DollarSign,
  Users, MapPin, MessageSquare, Clock, CheckCircle, Edit, ArrowRightLeft,
  Star, Save, FileText, Activity, ChevronRight,
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/index';
import { useLead, useUpdateLead, useTransferLead } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import LeadForm from './LeadForm';
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

const statusOrder: LeadStatus[] = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED', 'LOST'];

const STATUS_ICONS: Record<LeadStatus, string> = {
  NEW: '🆕',
  CONTACTED: '📞',
  INTERESTED: '💡',
  FOLLOW_UP_SCHEDULED: '📅',
  CONFIRMED: '✅',
  LOST: '❌',
};

// ─── Status Progression Timeline ─────────────────────────────────────────────

function StatusProgressionBar({ current }: { current: LeadStatus }) {
  const mainFlow: LeadStatus[] = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED'];
  const currentIdx = mainFlow.indexOf(current);
  const isLost = current === 'LOST';

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Status Progression</p>
      <div className="relative flex items-center justify-between">
        {/* Connector line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200 z-0" />
        {mainFlow.map((s, idx) => {
          const cfg = leadStatusConfig[s];
          const isPast = !isLost && idx < currentIdx;
          const isCurrent = !isLost && s === current;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center gap-1" style={{ flex: '1' }}>
              <div
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all',
                  isCurrent ? `${cfg.bg} border-current shadow-md scale-110` :
                  isPast ? 'bg-green-100 border-green-400' : 'bg-white border-slate-200'
                )}
              >
                {isPast ? '✓' : STATUS_ICONS[s]}
              </div>
              <span className={cn('text-xs font-medium text-center leading-tight', isCurrent ? cfg.color : 'text-slate-400')}>
                {cfg.label.replace('Follow-up Sched.', 'Follow-up')}
              </span>
            </div>
          );
        })}
      </div>
      {isLost && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-red-500">❌</span>
          <span className="text-sm font-medium text-red-700">Lead marked as Lost</span>
        </div>
      )}
    </div>
  );
}

// ─── Rich Notes Section ───────────────────────────────────────────────────────

function NotesSection({ lead }: { lead: Lead }) {
  const updateLead = useUpdateLead();
  const draftKey = `note_draft_${lead.id}`;
  const [draft, setDraft] = useState(() => localStorage.getItem(draftKey) ?? lead.notes ?? '');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // If lead notes changed externally, reset
    const saved = lead.notes ?? '';
    const stored = localStorage.getItem(draftKey) ?? '';
    if (stored && stored !== saved) {
      setDraft(stored);
      setHasUnsaved(true);
    } else {
      setDraft(saved);
      setHasUnsaved(false);
    }
  }, [lead.id, lead.notes]);

  const handleChange = (val: string) => {
    setDraft(val);
    setHasUnsaved(val !== (lead.notes ?? ''));
    localStorage.setItem(draftKey, val);
    // Auto-save after 3 seconds of no typing
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      if (val !== lead.notes) {
        updateLead.mutate({ id: lead.id, notes: val }, {
          onSuccess: () => {
            localStorage.removeItem(draftKey);
            setHasUnsaved(false);
            setLastSaved(new Date());
          },
        });
      }
    }, 3000);
  };

  const handleSave = () => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    updateLead.mutate({ id: lead.id, notes: draft }, {
      onSuccess: () => {
        localStorage.removeItem(draftKey);
        setHasUnsaved(false);
        setLastSaved(new Date());
      },
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <p className="text-sm font-medium text-slate-700">Internal Notes</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsaved && (
            <span className="text-xs text-amber-600 font-medium animate-pulse">Unsaved changes</span>
          )}
          {lastSaved && !hasUnsaved && (
            <span className="text-xs text-green-600">Saved {formatRelativeTime(lastSaved)}</span>
          )}
          {updateLead.isPending && <span className="text-xs text-slate-400">Saving...</span>}
          {hasUnsaved && (
            <button
              onClick={handleSave}
              disabled={updateLead.isPending}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
        rows={4}
        className="input resize-none text-sm"
        placeholder="Add internal notes about this lead... (auto-saves after 3 seconds)"
      />
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────

function ActivityTimeline({ logs }: { logs: NonNullable<Lead['activityLogs']> }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-slate-500" />
        <p className="text-sm font-semibold text-slate-700">Activity History</p>
      </div>
      <div className="relative space-y-0 max-h-56 overflow-y-auto scrollbar-thin pr-1">
        {logs.map((log, idx) => (
          <div key={log.id} className="relative flex gap-3 pb-4">
            {/* Vertical line */}
            {idx < logs.length - 1 && (
              <div className="absolute left-3.5 top-8 bottom-0 w-px bg-slate-100" />
            )}
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-xs">
              {log.action === 'Lead Created' ? '🆕'
                : log.action === 'Lead Updated' ? '✏️'
                : log.action === 'Lead Transferred' ? '🔄'
                : log.action === 'Lead Deleted' ? '🗑️'
                : '📝'}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-700">{log.action}</span>
                <span className="text-xs text-slate-400">{formatRelativeTime(log.createdAt)}</span>
              </div>
              <span className="text-xs text-slate-500">{log.user.name}</span>
              {log.details && (
                <p className="text-xs text-slate-400 mt-0.5 break-words">{log.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadDetail({ leadId, open, onClose, isStarred, onToggleStar }: LeadDetailProps) {
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferToId, setTransferToId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const { data, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead();
  const transferLead = useTransferLead();
  const { data: usersData } = useUsers({ limit: 100 });
  const employees = (usersData?.data ?? []).filter((e) => e.id !== data?.data?.assignedToId);

  const lead = data?.data;
  const canActOnLead = user?.role === 'ADMIN' || lead?.assignedToId === user?.id;

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead) return;
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

  return (
    <Modal open={open} onClose={onClose} size="2xl" title="Lead Details">
      {isLoading || !lead ? (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={lead.name} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
                  {onToggleStar && (
                    <button
                      onClick={onToggleStar}
                      className="p-1 rounded-lg hover:bg-yellow-50 transition-colors"
                      title={isStarred ? 'Unstar' : 'Star this lead'}
                    >
                      <Star className={cn('w-5 h-5', isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 hover:text-yellow-400')} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge status={lead.status} />
                  <Badge source={lead.source} />
                  {!lead.isRead && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">New</span>
                  )}
                </div>
              </div>
            </div>
            {canActOnLead && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setTransferOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Transfer</span>
                </button>
                <button onClick={() => setEditOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            )}
          </div>

          {/* Status Progression */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <StatusProgressionBar current={lead.status} />
          </div>

          {/* One-click Status Update */}
          {canActOnLead && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Update</p>
              <div className="flex flex-wrap gap-2">
                {statusOrder.map((s) => {
                  const cfg = leadStatusConfig[s];
                  const isCurrent = lead.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={isCurrent || updateLead.isPending}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap flex-shrink-0',
                        isCurrent
                          ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ring-offset-1 ring-current`
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      {isCurrent && '✓ '}{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Mail} label="Email" value={lead.email} />
            <InfoRow icon={MapPin} label="Destination" value={lead.destination} />
            <InfoRow icon={Megaphone} label="Campaign" value={lead.campaign?.name} />
            <InfoRow icon={User} label="Assigned To" value={lead.assignedTo?.name} />
            <InfoRow icon={Users} label="Group Size" value={lead.groupSize ? `${lead.groupSize} people` : undefined} />
            <InfoRow icon={DollarSign} label="Budget" value={formatCurrency(lead.budget)} />
            <InfoRow icon={Calendar} label="Preferred Date" value={formatDate(lead.preferredDate)} />
            <InfoRow icon={Calendar} label="Created" value={formatDateTime(lead.createdAt)} />
            <InfoRow icon={Calendar} label="Last Updated" value={formatDateTime(lead.updatedAt)} />
          </div>

          {/* Follow-up */}
          {lead.followUpDate && (
            <div className={cn('rounded-xl p-4 border', isOverdue(lead.followUpDate) && !lead.followUpDone ? 'bg-red-50 border-red-200' : lead.followUpDone ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200')}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Clock className={cn('w-4 h-4', isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-600' : lead.followUpDone ? 'text-green-600' : 'text-orange-600')} />
                  <p className={cn('text-sm font-semibold', isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-700' : lead.followUpDone ? 'text-green-700' : 'text-orange-700')}>
                    {lead.followUpDone ? 'Follow-up Completed' : isOverdue(lead.followUpDate) ? 'Overdue Follow-up' : 'Scheduled Follow-up'}
                  </p>
                  {lead.followUpDone && <CheckCircle className="w-4 h-4 text-green-600" />}
                </div>
                {!lead.followUpDone && canActOnLead && (
                  <button
                    onClick={() => updateLead.mutate({ id: lead.id, followUpDone: true })}
                    disabled={updateLead.isPending}
                    className="text-xs btn-primary py-1 px-3"
                  >
                    Mark Done
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">{formatDateTime(lead.followUpDate)}</p>
              {lead.followUpNotes && (
                <p className="text-sm text-slate-600 mt-1 italic">"{lead.followUpNotes}"</p>
              )}
            </div>
          )}

          {/* Customer Message */}
          {lead.message && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Customer Message</p>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* Rich Notes Section with auto-save */}
          {canActOnLead ? (
            <NotesSection lead={lead} />
          ) : lead.notes ? (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Internal Notes</p>
              <p className="text-sm text-slate-600 bg-yellow-50 rounded-xl p-3 border border-yellow-100 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          ) : null}

          {/* Activity Timeline */}
          {lead.activityLogs && lead.activityLogs.length > 0 && (
            <ActivityTimeline logs={lead.activityLogs} />
          )}
        </div>
      )}

      {/* Edit Modal */}
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

      {/* Transfer Modal */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer Lead" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Transfer <strong className="text-slate-800">{lead?.name}</strong> to another team member.
          </p>
          <div>
            <label className="label">Assign To <span className="text-red-500">*</span></label>
            <select value={transferToId} onChange={(e) => setTransferToId(e.target.value)} className="input">
              <option value="">Select employee...</option>
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
              placeholder="e.g. Out of office, specialisation match..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setTransferOpen(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleTransfer}
              disabled={!transferToId || transferLead.isPending}
              className="btn-primary"
            >
              {transferLead.isPending ? 'Transferring...' : 'Transfer Lead'}
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-900 font-medium mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
