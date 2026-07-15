import { useState } from 'react';
import { Search, Truck, IndianRupee } from 'lucide-react';
import { useFinanceVendors, useVendorLedger } from '../../hooks/useFinance';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PARTIAL: 'bg-primary-50 text-primary-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-600',
};

export default function VendorLedgerPage() {
  const [search, setSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { data: vendorsData, isLoading: loadingVendors } = useFinanceVendors();
  const { data: ledgerData, isLoading: loadingLedger } = useVendorLedger(selectedVendorId ?? undefined);
  const vendors = (vendorsData?.data ?? []).filter((v) => v.name.toLowerCase().includes(search.toLowerCase()));
  const ledger = ledgerData?.data;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Vendor Ledger</h2>
        <p className="text-sm text-slate-500 mt-0.5">Running statement per vendor across every bill</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedVendorId(null); }}
          placeholder="Search vendor by name..."
          className="input pl-9"
        />
      </div>

      {search && !selectedVendorId && (
        <div className="card divide-y divide-slate-100">
          {loadingVendors ? (
            <div className="p-4 text-sm text-slate-400">Loading…</div>
          ) : vendors.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No vendors found</div>
          ) : vendors.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVendorId(v.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800 text-sm">{v.name}</p>
                <p className="text-xs text-slate-400">{v.type.replace('_', ' ')}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedVendorId && (
        <div className="space-y-4">
          <button onClick={() => { setSelectedVendorId(null); setSearch(''); }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            ← Back to search
          </button>

          {loadingLedger || !ledger ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="card p-5">
                <h3 className="font-bold text-slate-900">{ledger.name}</h3>
                <p className="text-sm text-slate-500">{ledger.type.replace('_', ' ')} · {ledger.contact ?? 'No contact on file'}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div>
                    <p className="text-xs text-slate-400">Total Billed</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(ledger.ledger.totalBilled)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(ledger.ledger.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Outstanding</p>
                    <p className="text-lg font-bold text-orange-500">{formatCurrency(ledger.ledger.totalOutstanding)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Bills</p>
                    <p className="text-lg font-bold text-slate-800">{ledger.ledger.billCount}{ledger.ledger.overdueCount > 0 ? ` (${ledger.ledger.overdueCount} overdue)` : ''}</p>
                  </div>
                </div>
              </div>

              <div className="card overflow-x-auto">
                {ledger.payments.length === 0 ? (
                  <div className="empty-state">
                    <IndianRupee className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No bills for this vendor yet</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Trip</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Service</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Total</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Paid</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">{p.departure ? `${p.departure.destination} — ${formatDate(p.departure.departureDate)}` : '—'}</td>
                          <td className="px-4 py-2.5">{p.serviceType.replace('_', ' ')}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(p.totalAmount)}</td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(p.advancePaid)}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(p.balanceAmount)}</td>
                          <td className="px-4 py-2.5"><span className={cn('badge', STATUS_BADGE[p.status])}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!search && !selectedVendorId && (
        <div className="empty-state">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Search for a vendor to view their ledger</p>
        </div>
      )}
    </div>
  );
}
