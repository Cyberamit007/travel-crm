import { useState } from 'react';
import { CalendarOff, Plus, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useLeaves, useCreateLeave, useDeleteLeave } from '../../hooks/useLeaves';
import { useAuthStore } from '../../store/authStore';
import { LeaveRequest, LeaveStatus } from '../../types/index';
import Modal from '../../components/ui/Modal';
import { formatDate, cn } from '../../utils/helpers';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<LeaveStatus, { label: string; icon: any; bg: string; text: string }> = {
  PENDING:  { label: 'Pending',  icon: Clock,         bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700' },
  APPROVED: { label: 'Approved', icon: CheckCircle,   bg: 'bg-green-50 border-green-200',  text: 'text-green-700' },
  REJECTED: { label: 'Rejected', icon: XCircle,       bg: 'bg-red-50 border-red-200',      text: 'text-red-700' },
};

interface FormData {
  startDate: string;
  endDate: string;
  reason: string;
}

function LeaveCard({ leave, onDelete }: { leave: LeaveRequest; onDelete: (id: string) => void }) {
  const sc = STATUS_CONFIG[leave.status];
  const Icon = sc.icon;
  const canDelete = leave.status === 'PENDING';

  return (
    <div className={cn('rounded-xl border p-4', sc.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className={cn('text-xs font-semibold', sc.text)}>{sc.label}</span>
        </div>
        {canDelete && (
          <button onClick={() => onDelete(leave.id)} className="p-1 rounded-lg hover:bg-white/60 text-red-400 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
          {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
        </div>
        <p className="text-sm text-slate-600">{leave.reason}</p>
        {leave.adminNote && (
          <p className="text-xs text-slate-500 italic mt-1">Admin: {leave.adminNote}</p>
        )}
        {leave.approvedBy && (
          <p className="text-xs text-slate-400 mt-1">by {leave.approvedBy.name}</p>
        )}
      </div>
    </div>
  );
}

export default function EmployeeLeavePage() {
  const { user } = useAuthStore();
  const { data: leaves = [], isLoading } = useLeaves();
  const createLeave = useCreateLeave();
  const deleteLeave = useDeleteLeave();
  const [createOpen, setCreateOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (formData: FormData) => {
    try {
      await createLeave.mutateAsync(formData);
      reset();
      setCreateOpen(false);
      toast.success('Leave request submitted');
    } catch { toast.error('Failed to submit request'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeave.mutateAsync(id);
      toast.success('Request cancelled');
    } catch { toast.error('Failed to cancel request'); }
  };

  const pending  = leaves.filter((l) => l.status === 'PENDING');
  const approved = leaves.filter((l) => l.status === 'APPROVED');
  const rejected = leaves.filter((l) => l.status === 'REJECTED');

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Leave Requests</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pending.length} pending · {approved.length} approved</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Request Leave
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
      ) : leaves.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarOff className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No leave requests yet</p>
          <p className="text-sm text-slate-400 mt-1">Submit a request to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-3">Pending ({pending.length})</h3>
              <div className="space-y-3">
                {pending.map((l) => <LeaveCard key={l.id} leave={l} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {approved.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3">Approved ({approved.length})</h3>
              <div className="space-y-3">
                {approved.map((l) => <LeaveCard key={l.id} leave={l} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-3">Rejected ({rejected.length})</h3>
              <div className="space-y-3">
                {rejected.map((l) => <LeaveCard key={l.id} leave={l} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); }} title="Request Leave" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date <span className="text-red-500">*</span></label>
              <input
                {...register('startDate', { required: 'Required' })}
                type="date"
                min={today}
                className="input"
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="label">End Date <span className="text-red-500">*</span></label>
              <input
                {...register('endDate', { required: 'Required' })}
                type="date"
                min={today}
                className="input"
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Reason <span className="text-red-500">*</span></label>
            <textarea
              {...register('reason', { required: 'Reason is required', minLength: { value: 5, message: 'Too short' } })}
              rows={3}
              className="input resize-none"
              placeholder="Brief reason for leave..."
            />
            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setCreateOpen(false); reset(); }} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createLeave.isPending} className="btn-primary flex-1">
              {createLeave.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
