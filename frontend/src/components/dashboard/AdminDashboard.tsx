import { Users, Megaphone, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useLeadStats, useRecentActivity } from '../../hooks/useLeads';
import { useCampaignStats } from '../../hooks/useCampaigns';
import { useEmployeePerformance } from '../../hooks/useUsers';
import StatsCard from '../ui/StatsCard';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { formatRelativeTime, leadStatusConfig, cn } from '../../utils/helpers';
import { PageLoader } from '../ui/LoadingSpinner';
import { LeadStatus } from '../../types/index';

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#0ea5e9',
  CONTACTED: '#eab308',
  INTERESTED: '#8b5cf6',
  FOLLOW_UP_SCHEDULED: '#f97316',
  CONFIRMED: '#22c55e',
  LOST: '#ef4444',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: statsData, isLoading: statsLoading } = useLeadStats();
  const { data: campaignStatsData, isLoading: campLoading } = useCampaignStats();
  const { data: perfData, isLoading: perfLoading } = useEmployeePerformance();
  const { data: activityData } = useRecentActivity();

  const stats = statsData?.data;
  const campaignStats = campaignStatsData?.data ?? [];
  const performance = perfData?.data ?? [];
  const activity = activityData?.data ?? [];

  if (statsLoading) return <PageLoader />;

  const pieData = stats
    ? Object.entries(stats.byStatus)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name: leadStatusConfig[key as LeadStatus]?.label ?? key,
          value,
          color: STATUS_COLORS[key as LeadStatus] ?? '#94a3b8',
        }))
    : [];

  const lineData = stats
    ? Object.entries(stats.bySource).map(([source, count]) => ({
        name: source.charAt(0) + source.slice(1).toLowerCase(),
        leads: count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="Total Leads"
          value={stats?.total ?? 0}
          icon={Users}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          onClick={() => navigate('/admin/leads')}
        />
        <StatsCard
          label="Active Campaigns"
          value={campaignStats.filter((c) => c.status === 'ACTIVE').length}
          icon={Megaphone}
          iconBg="bg-mountain-100"
          iconColor="text-mountain-600"
          onClick={() => navigate('/admin/campaigns')}
        />
        <StatsCard
          label="Confirmed Bookings"
          value={stats?.byStatus?.CONFIRMED ?? 0}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          onClick={() => navigate('/admin/leads?status=CONFIRMED')}
        />
        <StatsCard
          label="Overdue Follow-ups"
          value={stats?.overdue ?? 0}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          onClick={() => navigate('/admin/leads?status=FOLLOW_UP_SCHEDULED')}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Source distribution bar */}
        <div className="card p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Leads by Source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: 'none',
                  borderRadius: 8,
                  color: '#f1f5f9',
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="leads" stroke="#0284c7" strokeWidth={2} dot={{ r: 4, fill: '#0284c7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status pie */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Leads by Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: 8,
                    color: '#f1f5f9',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Campaign performance & Employee performance */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Campaign table */}
        <div className="card lg:col-span-3 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700">Campaign Performance</h3>
          </div>
          {campLoading ? (
            <div className="p-6"><div className="h-24 bg-slate-100 animate-pulse rounded-lg" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Leads</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Confirmed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Conv%</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No campaigns yet</td>
                    </tr>
                  ) : (
                    campaignStats.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800 truncate max-w-[150px]">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.destination}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{c.total}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-700">{c.confirmed}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('font-semibold', parseFloat(c.conversionRate) >= 50 ? 'text-green-600' : parseFloat(c.conversionRate) >= 25 ? 'text-yellow-600' : 'text-red-600')}>
                            {c.conversionRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge campaignStatus={c.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No recent activity</p>
            ) : (
              activity.map((log) => (
                <div key={log.id} className="flex gap-3">
                  <Avatar name={log.user.name} size="xs" className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">{log.action}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-slate-400">{log.user.name}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Employee performance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Employee Performance</h3>
        </div>
        {perfLoading ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {performance.length === 0 ? (
              <p className="text-sm text-slate-400 col-span-full text-center py-6">No employees yet</p>
            ) : (
              performance.map((emp) => (
                <div key={emp.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={emp.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800">{emp.total}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-700">{emp.confirmed}</p>
                      <p className="text-xs text-slate-400">Confirmed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{emp.overdue}</p>
                      <p className="text-xs text-slate-400">Overdue</p>
                    </div>
                    <div className="text-center">
                      <p className={cn('text-lg font-bold', parseFloat(emp.conversionRate) >= 50 ? 'text-green-600' : parseFloat(emp.conversionRate) >= 25 ? 'text-yellow-600' : 'text-red-600')}>
                        {emp.conversionRate}%
                      </p>
                      <p className="text-xs text-slate-400">Conv.</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
