import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Clock, BarChart3, ExternalLink, Users, Filter,
} from 'lucide-react';
import { useFinanceSummary } from '../../hooks/useErp';
import { BookingWithLead, MonthlyFinanceData } from '../../types/index';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: MonthlyFinanceData[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const currentMonth = new Date().getMonth();

  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => {
        const heightPct = (d.revenue / maxRev) * 100;
        const collPct = d.revenue > 0 ? (d.collected / d.revenue) * 100 : 0;
        const isCurrent = i === currentMonth;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${MONTHS[i]}: ${formatCurrency(d.revenue)}`}>
            <div className="w-full relative rounded-t overflow-hidden" style={{ height: `${Math.max(heightPct, 4)}%` }}>
              <div className="absolute inset-0 bg-slate-200" />
              <div
                className={cn('absolute bottom-0 left-0 right-0 transition-all', isCurrent ? 'bg-primary-500' : 'bg-primary-300')}
                style={{ height: `${collPct}%` }}
              />
            </div>
            <span className={cn('text-[8px] font-medium', isCurrent ? 'text-primary-600' : 'text-slate-400')}>{MONTHS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={cn('text-xl font-bold', color)}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function BookingRow({ b, onView }: { b: BookingWithLead; onView: () => void }) {
  const isOverdue = b.balanceAmount > 0 && b.balanceDueDate && new Date(b.balanceDueDate) < new Date();
  const pct = b.finalPrice > 0 ? (b.amountPaid / b.finalPrice) * 100 : 0;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800 text-sm">{b.travelerName}</p>
        <p className="text-xs text-slate-400">{b.lead?.phone}</p>
        {b.lead?.destination && <p className="text-xs text-slate-400">{b.lead.destination}</p>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3 h-3" />{b.numberOfTravelers}
        </div>
        {b.lead?.preferredDate && <p className="text-xs text-slate-400 mt-0.5">{b.lead.preferredDate}</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="font-semibold text-slate-800 tabular text-sm">{formatCurrency(b.finalPrice)}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="min-w-[80px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-emerald-600 font-medium">{formatCurrency(b.amountPaid)}</span>
            <span className="text-[10px] text-slate-400">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {b.balanceAmount > 0 ? (
          <>
            <p className={cn('font-semibold tabular text-sm', isOverdue ? 'text-red-500' : 'text-orange-500')}>
              {formatCurrency(b.balanceAmount)}
            </p>
            {b.balanceDueDate && (
              <p className={cn('text-[10px] mt-0.5', isOverdue ? 'text-red-400' : 'text-slate-400')}>
                {isOverdue ? 'Overdue' : 'Due'} {formatDate(b.balanceDueDate)}
              </p>
            )}
          </>
        ) : (
          <span className="text-emerald-500 text-xs font-medium flex items-center gap-1 justify-end">
            <CheckCircle className="w-3 h-3" />Cleared
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={onView} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterMode, setFilterMode] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');

  const { data, isLoading } = useFinanceSummary(year);
  const summary = data?.data?.summary;
  const bookings = data?.data?.bookings ?? [];
  const monthlyData = data?.data?.monthlyData ?? [];

  const filtered = bookings.filter((b) => {
    if (filterMode === 'paid') return b.balanceAmount === 0;
    if (filterMode === 'unpaid') return b.amountPaid === 0;
    if (filterMode === 'overdue') return b.balanceAmount > 0 && b.balanceDueDate && new Date(b.balanceDueDate) < new Date();
    return true;
  });

  const collectionRate = summary && summary.totalRevenue > 0
    ? ((summary.totalCollected / summary.totalRevenue) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Finance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Revenue overview and payment tracking</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input sm:w-28">
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              sub={`${summary?.total ?? 0} bookings`}
              icon={IndianRupee} color="text-primary-600" bg="bg-primary-50"
            />
            <StatCard
              label="Amount Collected"
              value={formatCurrency(summary?.totalCollected ?? 0)}
              sub={`${collectionRate}% collection rate`}
              icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50"
            />
            <StatCard
              label="Balance Pending"
              value={formatCurrency(summary?.totalBalance ?? 0)}
              sub={`${summary?.partiallyPaid ?? 0} partially paid`}
              icon={Clock} color="text-orange-500" bg="bg-orange-50"
            />
            <StatCard
              label="Overdue Balance"
              value={formatCurrency(summary?.overdueBalance ?? 0)}
              sub="Past due date"
              icon={AlertCircle} color="text-red-500" bg="bg-red-50"
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Fully Paid', value: summary?.fullyPaid ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Partially Paid', value: summary?.partiallyPaid ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Unpaid', value: summary?.unpaid ?? 0, color: 'text-red-500', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-2xl p-4 text-center', s.bg)}>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Monthly Chart */}
          {monthlyData.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-primary-500" />
                <h3 className="font-semibold text-slate-800 text-sm">Monthly Revenue vs Collections — {year}</h3>
              </div>
              <MiniBarChart data={monthlyData} />
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-slate-200 inline-block" />Revenue</span>
                <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary-400 inline-block" />Collected</span>
              </div>
            </div>
          )}

          {/* Bookings table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">All Bookings</h3>
              <div className="flex items-center gap-1">
                {(['all', 'paid', 'unpaid', 'overdue'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMode(m)}
                    className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize', filterMode === m ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100')}
                  >
                    {m === 'all' ? `All (${bookings.length})` : m === 'paid' ? `Paid (${summary?.fullyPaid})` : m === 'unpaid' ? `Unpaid (${summary?.unpaid})` : `Overdue`}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state py-10">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No bookings in this filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden sm:table-cell">Pax / Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Total</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Collection</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((b) => (
                      <BookingRow
                        key={b.id}
                        b={b}
                        onView={() => navigate(`/admin/leads?id=${b.leadId}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
