import { CustomerLedger } from '../../types/index';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  CORRECTION_REQUESTED: 'bg-orange-50 text-orange-700',
};

export default function LedgerTable({ ledger }: { ledger: CustomerLedger }) {
  const l = ledger.ledger;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Package Price', value: formatCurrency(l.packagePrice) },
          { label: 'Discount', value: formatCurrency(0) },
          { label: 'Total Payable', value: formatCurrency(l.totalPayable) },
          { label: 'Advance Received', value: formatCurrency(l.advanceReceived) },
          { label: 'Verified Payments', value: formatCurrency(l.verifiedPayments) },
          { label: 'Pending Amount', value: formatCurrency(l.pendingAmount), highlight: l.pendingAmount > 0 },
          { label: 'Balance Due Date', value: l.balanceDueDate ? formatDate(l.balanceDueDate) : '—' },
          { label: 'Refunds', value: formatCurrency(l.refunds) },
        ].map((s) => (
          <div key={s.label} className="card p-3">
            <p className="text-[11px] text-slate-400">{s.label}</p>
            <p className={cn('text-base font-bold mt-0.5', s.highlight ? 'text-orange-500' : 'text-slate-800')}>{s.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Payment History</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Mode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Reference</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledger.payments.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">No payments recorded</td></tr>
              ) : ledger.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-2.5">{p.method}</td>
                  <td className="px-4 py-2.5">{p.reference ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-2.5"><span className={cn('badge', STATUS_BADGE[p.status])}>{p.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ledger.refunds.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">Refunds</p>
          <div className="space-y-2">
            {ledger.refunds.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-sm">
                <div>
                  <p className="font-medium text-slate-700">{formatCurrency(r.amount)} — {r.reason}</p>
                  <p className="text-xs text-slate-400">{r.status} {r.refundDate ? `· ${formatDate(r.refundDate)}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
