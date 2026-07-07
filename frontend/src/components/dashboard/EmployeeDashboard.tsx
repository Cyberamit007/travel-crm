import { Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useLeads, useOverdueFollowUps } from '../../hooks/useLeads';
import { useAuthStore } from '../../store/authStore';
import StatsCard from '../ui/StatsCard';
import LeadCard from '../leads/LeadCard';
import { formatDate, isOverdue, leadStatusConfig, cn } from '../../utils/helpers';
import { PageLoader } from '../ui/LoadingSpinner';
import { LeadStatus } from '../../types/index';
import { useState } from 'react';
import LeadDetail from '../leads/LeadDetail';

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: '#0ea5e9',
  CONTACTED: '#eab308',
  INTERESTED: '#8b5cf6',
  FOLLOW_UP_SCHEDULED: '#f97316',
  CONFIRMED: '#22c55e',
  LOST: '#ef4444',
};

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const { data: myLeads, isLoading } = useLeads({ assignedToId: user?.id, limit: 100 });
  const { data: overdueData } = useOverdueFollowUps();

  const leads = myLeads?.data ?? [];
  const overdue = overdueData?.data ?? [];

  const todayFollowUps = leads.filter(
    (l) =>
      l.followUpDate &&
      l.followUpDate.startsWith(today) &&
      !l.followUpDone &&
      !isOverdue(l.followUpDate)
  );

  const recentLeads = [...leads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const confirmedCount = leads.filter((l) => l.status === 'CONFIRMED').length;
  const overdueCount = overdue.filter((l) => l.assignedToId === user?.id).length;

  const pieData = Object.entries(
    leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>)
  )
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: leadStatusConfig[key as LeadStatus]?.label ?? key,
      value,
      color: STATUS_COLORS[key as LeadStatus],
    }));

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label="My Leads"
          value={leads.length}
          icon={Users}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          onClick={() => navigate('/employee/leads')}
        />
        <StatsCard
          label="Follow-ups Today"
          value={todayFollowUps.length}
          icon={Calendar}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          onClick={() => navigate('/employee/follow-ups')}
        />
        <StatsCard
          label="Confirmed"
          value={confirmedCount}
          icon={CheckCircle}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          onClick={() => navigate('/employee/leads?status=CONFIRMED')}
        />
        <StatsCard
          label="Overdue"
          value={overdueCount}
          icon={AlertCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          onClick={() => navigate('/employee/follow-ups')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Today's follow-ups */}
        <div className="card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Today's Follow-ups</h3>
          {todayFollowUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Calendar className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No follow-ups today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayFollowUps.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="p-3 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{lead.name}</p>
                    <span className="text-xs text-orange-600 font-medium">{formatDate(lead.followUpDate)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{lead.phone}</p>
                  {lead.followUpNotes && (
                    <p className="text-xs text-slate-600 mt-1 italic truncate">"{lead.followUpNotes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent leads */}
        <div className="card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Leads</h3>
          {recentLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No leads yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={(l) => setSelectedLeadId(l.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Donut chart */}
        <div className="card p-5 xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
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
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No leads yet</div>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdueCount > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Overdue Follow-ups ({overdueCount})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdue
              .filter((l) => l.assignedToId === user?.id)
              .slice(0, 6)
              .map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={(l) => setSelectedLeadId(l.id)}
                />
              ))}
          </div>
        </div>
      )}

      <LeadDetail
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}
