import { useState } from 'react';
import { CalendarOff, Check, X, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { useLeaves, useUpdateLeaveStatus, useUpcomingLeaves } from '../../hooks/useLeaves';
import { LeaveRequest, LeaveStatus } from '../../types/index';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<LeaveStatus, { label: string; bg: string; text: string }> = {
  PENDING:  { label: 'Pending',  bg: 'bg-amber-50 text-amber-700 border border-amber-200',  text: 'text-amber-700' },
  APPROVED: { label: 'Approved', bg: 'bg-green-50 text-green-700 border border-green-200',  text: 'text-green-700' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50 text-red-700 border border-red-200',        text: 'text-red-700' },
};

function ApproveModal({
  leave,
  open,
  onClose,
}: {
  leave: LeaveRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateStatus = useUpdateLeaveStatus();
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    if (!leave) return;
    try {
      await updateStatus.mutateAsync({ id: leave.id, status, adminNote: note });
      toast.success(`Leave ${status === 'APPROVED' ? 'approved' : 'rejected'}`);
      onClose();
      setNote('');
    } catch { toast.error('Failed to update leave status'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Review Leave Request" size="sm">
      {leave && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <Avatar name={leave.employee.name} size="sm" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">{leave.employee.name}</p>
              <p className="text-xs text-slate-500">{formatDate(leave.startDate)} → {formatDate(leave.endDate)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{leave.reason}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Decision</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('APPROVED')}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all', status === 'APPROVED' ? 'bg-green-50 border-green-400 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => setStatus('REJECTED')}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all', status === 'REJECTED' ? 'bg-red-50 border-red-400 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>

          <div>
            <label className="label">Note to Employee (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Optional reason or message..."
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={updateStatus.isPending}
              className={cn(
                'flex-1 px-4 py-2 rounded-xl font-medium text-sm text-white transition-colors',
                status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {updateStatus.isPending ? 'Saving...' : `Confirm ${status === 'APPROVED' ? 'Approval' : 'Rejection'}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AdminLeavePage() {
  const { data: leaves = [], isLoading } = useLeaves();
  const { data: upcoming = [] } = useUpcomingLeaves();
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = filterStatus ? leaves.filter((l) => l.status === filterStatus) : leaves;
  const pending = leaves.filter((l) => l.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Leave Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pending.length} pending · {upcoming.length} upcoming approved</p>
        </div>
      </div>

      {/* Upcoming approved leaves */}
      {upcoming.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-bold text-slate-700">Upcoming Approved Leaves</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcoming.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs">
                <Avatar name={l.employee.name} size="xs" />
                <span className="font-medium text-green-800">{l.employee.name}</span>
                <span className="text-green-600">{formatDate(l.startDate)} → {formatDate(l.endDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              filterStatus === s ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            )}
          >
            {s || 'All'} {s === 'PENDING' && pending.length > 0 && `(${pending.length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CalendarOff className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No leave requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((leave) => {
            const sc = STATUS_CONFIG[leave.status];
            return (
              <div key={leave.id} className="card p-4 flex items-center gap-4">
                <Avatar name={leave.employee.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800 text-sm">{leave.employee.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', sc.bg)}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(leave.startDate)} → {formatDate(leave.endDate)}</p>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{leave.reason}</p>
                  {leave.adminNote && <p className="text-xs text-slate-400 italic mt-0.5">Note: {leave.adminNote}</p>}
                </div>
                {leave.status === 'PENDING' && (
                  <button
                    onClick={() => setReviewLeave(leave)}
                    className="flex-shrink-0 btn-primary py-1.5 text-xs"
                  >
                    Review
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ApproveModal
        leave={reviewLeave}
        open={!!reviewLeave}
        onClose={() => setReviewLeave(null)}
      />
    </div>
  );
}
