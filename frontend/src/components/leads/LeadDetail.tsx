import { useState } from 'react';
import {
  Phone, Mail, Calendar, User, Megaphone, DollarSign,
  Users, MapPin, MessageSquare, Clock, CheckCircle, Edit
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/index';
import { useLead, useUpdateLead } from '../../hooks/useLeads';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import LeadForm from './LeadForm';
import { formatDate, formatDateTime, formatRelativeTime, formatCurrency, isOverdue, cn, leadStatusConfig } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import { PageLoader } from '../ui/LoadingSpinner';

interface LeadDetailProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

const statusOrder: LeadStatus[] = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'CONFIRMED', 'LOST'];

export default function LeadDetail({ leadId, open, onClose }: LeadDetailProps) {
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const { data, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead();

  const lead = data?.data;

  const handleStatusChange = (status: LeadStatus) => {
    if (!lead) return;
    updateLead.mutate({ id: lead.id, status });
  };

  const handleEdit = (formData: any) => {
    if (!lead) return;
    updateLead.mutate(
      { id: lead.id, ...formData },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  return (
    <Modal open={open} onClose={onClose} size="2xl" title="Lead Details">
      {isLoading || !lead ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={lead.name} size="lg" />
              <div>
                <h3 className="text-xl font-bold text-slate-900">{lead.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={lead.status} />
                  <Badge source={lead.source} />
                </div>
              </div>
            </div>
            {(user?.role === 'ADMIN' || lead.assignedToId === user?.id) && (
              <button
                onClick={() => setEditOpen(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          {/* Status update */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Update Status</p>
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
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      isCurrent
                        ? `${cfg.bg} ${cfg.color} border-transparent ring-2 ring-offset-1 ring-current`
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Mail} label="Email" value={lead.email} />
            <InfoRow icon={MapPin} label="Destination" value={lead.destination} />
            <InfoRow
              icon={Megaphone}
              label="Campaign"
              value={lead.campaign?.name}
            />
            <InfoRow icon={User} label="Assigned To" value={lead.assignedTo?.name} />
            <InfoRow icon={Users} label="Group Size" value={lead.groupSize ? `${lead.groupSize} people` : undefined} />
            <InfoRow icon={DollarSign} label="Budget" value={formatCurrency(lead.budget)} />
            <InfoRow icon={Calendar} label="Preferred Date" value={formatDate(lead.preferredDate)} />
            <InfoRow icon={Calendar} label="Created" value={formatDateTime(lead.createdAt)} />
            <InfoRow icon={Calendar} label="Updated" value={formatDateTime(lead.updatedAt)} />
          </div>

          {/* Follow-up */}
          {lead.followUpDate && (
            <div
              className={cn(
                'rounded-xl p-4 border',
                isOverdue(lead.followUpDate) && !lead.followUpDone
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Clock className={cn('w-4 h-4', isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-600' : 'text-orange-600')} />
                <p className={cn('text-sm font-semibold', isOverdue(lead.followUpDate) && !lead.followUpDone ? 'text-red-700' : 'text-orange-700')}>
                  {lead.followUpDone ? 'Follow-up Done' : isOverdue(lead.followUpDate) ? 'Overdue Follow-up' : 'Scheduled Follow-up'}
                </p>
                {lead.followUpDone && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
              <p className="text-sm text-slate-600">{formatDateTime(lead.followUpDate)}</p>
              {lead.followUpNotes && (
                <p className="text-sm text-slate-600 mt-1 italic">"{lead.followUpNotes}"</p>
              )}
              {!lead.followUpDone && (
                <button
                  onClick={() => updateLead.mutate({ id: lead.id, followUpDone: true })}
                  disabled={updateLead.isPending}
                  className="mt-2 text-xs btn-primary py-1 px-3"
                >
                  Mark Done
                </button>
              )}
            </div>
          )}

          {/* Message & Notes */}
          {lead.message && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">Customer Message</p>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Internal Notes</p>
              <p className="text-sm text-slate-600 bg-yellow-50 rounded-lg p-3 border border-yellow-100 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Activity log */}
          {lead.activityLogs && lead.activityLogs.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Activity Log</p>
              <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
                {lead.activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <Avatar name={log.user.name} size="xs" className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">{log.user.name}</span>
                        <span className="text-xs text-slate-400">{formatRelativeTime(log.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{log.action}</p>
                      {log.details && (
                        <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
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
    </Modal>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value || value === '—') return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-900 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}
