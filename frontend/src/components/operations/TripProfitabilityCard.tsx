import { IndianRupee, Wallet, Receipt, RotateCcw, TrendingUp, Percent } from 'lucide-react';
import { TripProfitability } from '../../types/index';
import { formatCurrency } from '../../utils/helpers';

export default function TripProfitabilityCard({ profitability }: { profitability: TripProfitability }) {
  const tiles = [
    { label: 'Revenue', value: profitability.revenue, icon: IndianRupee, color: 'text-primary-600 bg-primary-50' },
    { label: 'Collected', value: profitability.collected, icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Vendor Cost', value: profitability.vendorCost, icon: Receipt, color: 'text-slate-600 bg-slate-100' },
    { label: 'Expenses', value: profitability.expenseCost, icon: Receipt, color: 'text-slate-600 bg-slate-100' },
    { label: 'Refunds', value: profitability.refunds, icon: RotateCcw, color: 'text-red-600 bg-red-50' },
    { label: 'Net Profit', value: profitability.netProfit, icon: TrendingUp, color: profitability.netProfit >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Trip Profitability</h3>
        <span className={`badge ${profitability.marginPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          <Percent className="w-3 h-3 mr-1 inline" />{profitability.marginPct}% margin
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{formatCurrency(t.value)}</p>
                <p className="text-[11px] text-slate-400">{t.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
