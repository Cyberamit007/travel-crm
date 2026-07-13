import { CustomerLedger } from '../../types/index';
import { formatCurrency, formatDate } from '../../utils/helpers';

// Print-friendly receipt/invoice — downloaded via the browser's native
// print-to-PDF (window.print()) rather than a bundled PDF library.
export default function ReceiptView({ ledger, kind }: { ledger: CustomerLedger; kind: 'invoice' | 'receipt' }) {
  return (
    <div className="print-receipt bg-white p-8 text-sm text-slate-800 max-w-2xl mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-bold">Travel CRM</h2>
            <p className="text-xs text-slate-500">Trek & Pilgrimage</p>
          </div>
          <div className="text-right">
            <p className="font-semibold uppercase tracking-wide">{kind === 'invoice' ? 'Invoice' : 'Receipt'}</p>
            <p className="text-xs text-slate-500">{ledger.bookingNumber}</p>
            <p className="text-xs text-slate-500">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400 uppercase">Customer</p>
            <p className="font-medium">{ledger.lead.name}</p>
            <p className="text-xs text-slate-500">{ledger.lead.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase">Departure</p>
            <p className="font-medium">{ledger.departure?.destination ?? '—'}</p>
            <p className="text-xs text-slate-500">{ledger.departure ? formatDate(ledger.departure.departureDate) : ''}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-4">
          <tbody>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Package Price</td><td className="py-2 text-right font-medium">{formatCurrency(ledger.ledger.packagePrice)}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Total Payable</td><td className="py-2 text-right font-medium">{formatCurrency(ledger.ledger.totalPayable)}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Verified Payments</td><td className="py-2 text-right font-medium text-emerald-600">{formatCurrency(ledger.ledger.verifiedPayments)}</td></tr>
            {ledger.ledger.refunds > 0 && (
              <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Refunds</td><td className="py-2 text-right font-medium text-red-500">-{formatCurrency(ledger.ledger.refunds)}</td></tr>
            )}
            <tr><td className="py-2 font-semibold">Pending Amount</td><td className="py-2 text-right font-bold">{formatCurrency(ledger.ledger.pendingAmount)}</td></tr>
          </tbody>
        </table>

        {kind === 'receipt' && (
          <>
            <p className="text-xs text-slate-400 uppercase mb-2">Payment History</p>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200">
                  <th className="text-left py-1.5">Date</th>
                  <th className="text-left py-1.5">Mode</th>
                  <th className="text-left py-1.5">Reference</th>
                  <th className="text-right py-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.payments.filter((p) => p.status === 'VERIFIED').map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-1.5">{formatDate(p.verifiedAt ?? p.createdAt)}</td>
                    <td className="py-1.5">{p.method}</td>
                    <td className="py-1.5">{p.reference ?? '—'}</td>
                    <td className="py-1.5 text-right">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

      <p className="text-xs text-slate-400 text-center mt-8">Thank you for traveling with us.</p>
    </div>
  );
}
