import { useState } from 'react';
import { Activity, Filter } from 'lucide-react';
import { useActivityFeed } from '../../hooks/useActivity';
import { ActivityLog } from '../../types/index';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import { formatDate, formatRelativeTime } from '../../utils/helpers';

const ACTION_EMOJI: Record<string, string> = {
  'Lead Created': '🆕',
  'Lead Updated': '✏️',
  'Lead Deleted': '🗑️',
  'Lead Transferred': '🔄',
  'Lead Confirmed': '✅',
  'Campaign Created': '📣',
  'Campaign Updated': '📝',
  'Employee Created': '👤',
  'Employee Updated': '👥',
  'Leave Approved': '📅',
};

function LogRow({ log }: { log: ActivityLog }) {
  const emoji = Object.entries(ACTION_EMOJI).find(([k]) => log.action.includes(k.split(' ')[1] || k))?.[1]
    ?? (ACTION_EMOJI[log.action] ?? '📋');

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 group hover:bg-slate-50 px-2 rounded-lg transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-base">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={log.user.name} size="xs" />
            <span className="text-sm font-semibold text-slate-800">{log.user.name}</span>
            <span className="text-sm text-slate-500 font-normal">{log.action}</span>
            {log.lead && (
              <span className="text-sm text-primary-600 font-medium truncate">{log.lead.name}</span>
            )}
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0" title={formatDate(log.createdAt)}>
            {formatRelativeTime(log.createdAt)}
          </span>
        </div>
        {log.details && (
          <p className="text-xs text-slate-500 mt-0.5 ml-7 truncate">{log.details}</p>
        )}
      </div>
    </div>
  );
}

export default function ActivityFeedPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const { data, isLoading } = useActivityFeed({ page, limit: 50, entityType: entityType || undefined });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Global Activity Feed</h2>
          <p className="text-sm text-slate-500 mt-0.5">All system-wide actions and events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {['', 'LEAD', 'CAMPAIGN', 'USER', 'LEAVE'].map((t) => (
          <button
            key={t}
            onClick={() => { setEntityType(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              entityType === t ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      <div className="card p-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">No activity yet</p>
          </div>
        ) : (
          <div>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
