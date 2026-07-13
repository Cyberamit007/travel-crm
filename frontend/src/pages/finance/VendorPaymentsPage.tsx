import { useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Truck, FileUp, Receipt, ExternalLink } from 'lucide-react';
import {
  useVendorPayments, useCreateVendorPayment, useUpdateVendorPayment, useDeleteVendorPayment, useUploadVendorPaymentFile,
} from '../../hooks/useFinance';
import VendorPaymentFormModal from '../../components/finance/VendorPaymentFormModal';
import Modal from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { VendorPayment } from '../../types/index';
import { formatCurrency, formatDate, cn } from '../../utils/helpers';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PARTIAL: 'bg-primary-50 text-primary-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-600',
};

function VendorPaymentCard({ vp }: { vp: VendorPayment }) {
  const updateVp = useUpdateVendorPayment();
  const deleteVp = useDeleteVendorPayment();
  const uploadFile = useUploadVendorPaymentFile();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-800 text-sm">{vp.vendor.name}</p>
          <p className="text-xs text-slate-400">{vp.serviceType.replace('_', ' ')}{vp.departure ? ` · ${vp.departure.destination}` : ''}</p>
        </div>
        <span className={cn('badge', STATUS_BADGE[vp.status])}>{vp.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><p className="text-slate-400">Total</p><p className="font-semibold text-slate-700">{formatCurrency(vp.totalAmount)}</p></div>
        <div><p className="text-slate-400">Advance Paid</p><p className="font-semibold text-slate-700">{formatCurrency(vp.advancePaid)}</p></div>
        <div><p className="text-slate-400">Balance</p><p className="font-semibold text-orange-500">{formatCurrency(vp.balanceAmount)}</p></div>
        <div><p className="text-slate-400">Due Date</p><p className="font-semibold text-slate-700">{vp.dueDate ? formatDate(vp.dueDate) : '—'}</p></div>
      </div>
      {vp.notes && <p className="text-xs text-slate-500">{vp.notes}</p>}

      <div className="flex items-center gap-1 flex-wrap pt-1">
        <button onClick={() => setEditOpen(true)} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
        <button onClick={() => setDeleteOpen(true)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>
        <input ref={invoiceRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile.mutate({ id: vp.id, file: f, fileType: 'invoice' }); }} />
        {vp.invoiceUrl ? (
          <a href={vp.invoiceUrl.startsWith('/') ? `${window.location.origin}${vp.invoiceUrl}` : vp.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Invoice</a>
        ) : (
          <button onClick={() => invoiceRef.current?.click()} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"><FileUp className="w-3 h-3" />Upload Invoice</button>
        )}
        <input ref={proofRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile.mutate({ id: vp.id, file: f, fileType: 'proof' }); }} />
        {vp.paymentProofUrl ? (
          <a href={vp.paymentProofUrl.startsWith('/') ? `${window.location.origin}${vp.paymentProofUrl}` : vp.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"><Receipt className="w-3 h-3" />Proof</a>
        ) : (
          <button onClick={() => proofRef.current?.click()} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"><FileUp className="w-3 h-3" />Upload Proof</button>
        )}
      </div>

      <VendorPaymentFormModal
        open={editOpen} onClose={() => setEditOpen(false)} defaultValues={vp} isLoading={updateVp.isPending}
        onSubmit={(data) => updateVp.mutate({ id: vp.id, ...data } as any, { onSuccess: () => setEditOpen(false) })}
      />
      <Modal
        open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Remove Vendor Bill" size="sm"
        footer={<>
          <button onClick={() => setDeleteOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => deleteVp.mutate(vp.id, { onSuccess: () => setDeleteOpen(false) })} disabled={deleteVp.isPending} className="btn-danger">{deleteVp.isPending ? 'Removing…' : 'Remove'}</button>
        </>}
      >
        <p className="text-sm text-slate-600">Remove this vendor bill?</p>
      </Modal>
    </div>
  );
}

export default function VendorPaymentsPage() {
  const [status, setStatus] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const { data, isLoading } = useVendorPayments({ status: status || undefined });
  const payments = data?.data ?? [];
  const createVp = useCreateVendorPayment();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendor Payments</h2>
          <p className="text-sm text-slate-500 mt-0.5">Hotels, vehicles, trip captains, guides & local vendors</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" />Add Vendor Bill</button>
      </div>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className="input py-1.5 text-sm w-auto">
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PARTIAL">Partial</option>
        <option value="PAID">Paid</option>
        <option value="OVERDUE">Overdue</option>
      </select>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No vendor bills yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {payments.map((vp) => <VendorPaymentCard key={vp.id} vp={vp} />)}
        </div>
      )}

      <VendorPaymentFormModal
        open={addOpen} onClose={() => setAddOpen(false)} isLoading={createVp.isPending}
        onSubmit={(data) => createVp.mutate(data as any, { onSuccess: () => setAddOpen(false) })}
      />
    </div>
  );
}
