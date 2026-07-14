import { useNavigate, useLocation } from 'react-router-dom';
import {
  Clock, Users, IndianRupee, ListChecks, Activity as ActivityIcon,
  TrendingUp, Building2, Truck, FileText, Wand2, Bell,
} from 'lucide-react';
import { useDepartureActivity } from '../../hooks/useOperations';
import { Departure } from '../../types/index';
import { JOURNEY_STAGE_LABELS } from '../leads/JourneyTracker';
import { formatCurrency, formatRelativeTime, cn } from '../../utils/helpers';
import { Skeleton } from '../ui/Skeleton';

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function TripOverviewTab({ departure, onChangeTab }: { departure: Departure; onChangeTab: (tab: string) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin') ? '/admin/operations' : '/operations';
  const { data: activityData, isLoading: activityLoading } = useDepartureActivity(departure.id);
  const activities = activityData?.data ?? [];

  const dUntil = daysUntil(departure.departureDate);
  const countdownLabel = departure.status === 'ACTIVE'
    ? 'Trip in progress'
    : departure.status === 'COMPLETED'
      ? 'Trip completed'
      : dUntil === 0 ? 'Leaves today' : dUntil > 0 ? `Leaves in ${dUntil} day(s)` : `Departed ${Math.abs(dUntil)} day(s) ago`;

  const totalRevenue = departure.bookings.reduce((s, b) => s + b.finalPrice, 0);
  const totalPending = departure.bookings.reduce((s, b) => s + b.balanceAmount, 0);

  const quickActions = [
    { label: 'Passengers', icon: Users, tab: 'passengers' },
    { label: 'Hotels', icon: Building2, tab: 'hotels' },
    { label: 'Vehicles', icon: Truck, tab: 'vehicles' },
    { label: 'Checklist', icon: ListChecks, tab: 'checklist' },
    { label: 'Documents', icon: FileText, tab: 'documents' },
  ];

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <Clock className="w-4 h-4 text-primary-500 mb-1.5" />
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Departure</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{countdownLabel}</p>
        </div>
        <div className="card p-4">
          <Users className="w-4 h-4 text-primary-500 mb-1.5" />
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Travelers</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{departure.groupSummary?.totalTravelers ?? 0}</p>
        </div>
        <div className="card p-4">
          <IndianRupee className="w-4 h-4 text-primary-500 mb-1.5" />
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Collected / Pending</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(totalRevenue - totalPending)} <span className="text-orange-500 font-normal">/ {formatCurrency(totalPending)}</span></p>
        </div>
        <div className="card p-4">
          <ListChecks className="w-4 h-4 text-primary-500 mb-1.5" />
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Checklist</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{departure.checklist?.progress ?? 0}% ready</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-primary-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <button key={a.tab} onClick={() => onChangeTab(a.tab)} className="btn-secondary text-xs py-1.5 px-3">
              <a.icon className="w-3.5 h-3.5" />{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Journey progress */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Journey Progress</h3>
          </div>
          {!departure.journeySummaries || departure.journeySummaries.length === 0 ? (
            <p className="text-sm text-slate-400">No bookings on this departure yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {departure.journeySummaries.map((j) => {
                const pct = j.totalCount ? Math.round((j.completedCount / j.totalCount) * 100) : 0;
                return (
                  <div key={j.bookingId} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate">{j.leadName}</p>
                      <span className="text-xs text-slate-400 flex-shrink-0">{j.completedCount}/{j.totalCount}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {j.currentStage && (
                      <p className="text-[11px] text-slate-400 mt-1">{JOURNEY_STAGE_LABELS[j.currentStage] ?? j.currentStage}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ActivityIcon className="w-4 h-4 text-primary-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Recent Activity</h3>
          </div>
          {activityLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Bell className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50">
                  <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-primary-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{a.action}</span>
                      {a.details && <span className="text-slate-500"> — {a.details}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{a.user.name} · {formatRelativeTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
