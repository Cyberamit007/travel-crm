import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Plus, Pencil, Trash2, Phone, Star } from 'lucide-react';
import { useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from '../../hooks/useOperations';
import { Vendor, VendorType } from '../../types/index';
import Modal from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { cn } from '../../utils/helpers';

const TYPE_LABELS: Record<VendorType, string> = {
  HOTEL: 'Hotel Vendor',
  VEHICLE: 'Vehicle Vendor',
  LOCAL_GUIDE: 'Local Guide',
  LOCAL_VENDOR: 'Local Vendor',
  OTHER: 'Other',
};

interface VendorForm { name: string; type: VendorType; contact?: string; notes?: string; status: 'ACTIVE' | 'INACTIVE'; }

function VendorFormModal({ open, onClose, defaultValues, onSubmit, isLoading }: {
  open: boolean; onClose: () => void; defaultValues?: Partial<Vendor>;
  onSubmit: (data: VendorForm) => void; isLoading: boolean;
}) {
  const { register, handleSubmit } = useForm<VendorForm>({
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: defaultValues?.type ?? 'HOTEL',
      contact: defaultValues?.contact ?? '',
      notes: defaultValues?.notes ?? '',
      status: defaultValues?.status ?? 'ACTIVE',
    },
  });

  return (
    <Modal
      open={open} onClose={onClose} title={defaultValues ? 'Edit Vendor' : 'Add Vendor'} size="md"
      footer={<>
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button form="vendor-form" type="submit" disabled={isLoading} className="btn-primary">{isLoading ? 'Saving…' : defaultValues ? 'Update' : 'Add Vendor'}</button>
      </>}
    >
      <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Vendor Name *</label>
          <input {...register('name', { required: true })} className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select {...register('type')} className="input">
              <option value="HOTEL">Hotel Vendor</option>
              <option value="VEHICLE">Vehicle Vendor</option>
              <option value="LOCAL_GUIDE">Local Guide</option>
              <option value="LOCAL_VENDOR">Local Vendor</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Contact Number</label>
          <input {...register('contact')} className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea {...register('notes')} className="input" rows={2} />
        </div>
      </form>
    </Modal>
  );
}

export default function VendorsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin') ? '/admin/operations' : '/operations';
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useVendors({ search: search || undefined, type: typeFilter || undefined });
  const vendors = data?.data ?? [];

  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendors</h2>
          <p className="text-sm text-slate-500 mt-0.5">Hotel, vehicle, and local vendor directory</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" />Add Vendor
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="input py-1.5 text-sm max-w-xs" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input py-1.5 text-sm w-auto">
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="empty-state">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No vendors added yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vendors.map((v) => (
            <div
              key={v.id}
              onClick={() => navigate(`${base}/vendors/${v.id}`)}
              className="card p-4 space-y-2 cursor-pointer hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{v.name}</p>
                  <p className="text-xs text-slate-400">{TYPE_LABELS[v.type]}</p>
                </div>
                <span className={cn('badge', v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{v.status}</span>
              </div>
              {v.contact && <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{v.contact}</p>}
              {v.rating != null && (
                <p className="text-xs text-slate-500 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{v.rating.toFixed(1)} ({v.ratingCount})</p>
              )}
              {v.notes && <p className="text-xs text-slate-500">{v.notes}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={(e) => { e.stopPropagation(); setEditVendor(v); }} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Pencil className="w-3 h-3" />Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteId(v.id); }} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VendorFormModal
        open={addOpen} onClose={() => setAddOpen(false)} isLoading={createVendor.isPending}
        onSubmit={(data) => createVendor.mutate(data, { onSuccess: () => setAddOpen(false) })}
      />
      <VendorFormModal
        open={!!editVendor} onClose={() => setEditVendor(null)} defaultValues={editVendor ?? undefined} isLoading={updateVendor.isPending}
        onSubmit={(data) => editVendor && updateVendor.mutate({ id: editVendor.id, ...data }, { onSuccess: () => setEditVendor(null) })}
      />
      <Modal
        open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Vendor" size="sm"
        footer={<>
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => deleteId && deleteVendor.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} disabled={deleteVendor.isPending} className="btn-danger">
            {deleteVendor.isPending ? 'Removing…' : 'Remove'}
          </button>
        </>}
      >
        <p className="text-sm text-slate-600">Remove this vendor from the directory?</p>
      </Modal>
    </div>
  );
}
