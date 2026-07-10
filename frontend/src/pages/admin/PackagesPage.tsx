import { useState } from 'react';
import {
  Package as PackageIcon, Plus, Edit, Trash2, Search, Star,
  MapPin, Tag, Clock, IndianRupee, ChevronDown,
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '../../hooks/usePackages';
import { useDestinations, useTourCategories } from '../../hooks/useMasters';
import { Package } from '../../types/index';
import Modal from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, cn } from '../../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseList = (raw: string | string[]): string[] => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-muted',
  DRAFT: 'bg-amber-100 text-amber-700',
};

// ─── Dynamic list field ───────────────────────────────────────────────────────

function ListField({ label, fieldName, control, register }: {
  label: string;
  fieldName: 'inclusions' | 'exclusions' | 'highlights';
  control: any;
  register: any;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label">{label}</label>
        <button type="button" onClick={() => append({ value: '' })} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {fields.map((field, idx) => (
          <div key={field.id} className="flex gap-2">
            <input {...register(`${fieldName}.${idx}.value`)} className="input flex-1 text-sm" placeholder={`${label} item…`} />
            <button type="button" onClick={() => remove(idx)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="text-xs text-slate-400 italic">None added yet</p>
        )}
      </div>
    </div>
  );
}

// ─── Package Form ─────────────────────────────────────────────────────────────

interface PackageFormData {
  name: string;
  code: string;
  description: string;
  destinationId: string;
  tourCategoryId: string;
  nights: number;
  days: number;
  inclusions: { value: string }[];
  exclusions: { value: string }[];
  highlights: { value: string }[];
  pricePerPerson: number;
  priceSingle: string;
  priceDouble: string;
  priceTriple: string;
  priceQuad: string;
  isPopular: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

function PackageFormModal({
  open, onClose, existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Package | null;
}) {
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();
  const createPkg = useCreatePackage();
  const updatePkg = useUpdatePackage();
  const isEdit = !!existing;

  const toFields = (raw: string | string[]) => parseList(raw).map((v) => ({ value: v }));

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<PackageFormData>({
    defaultValues: {
      name: existing?.name ?? '',
      code: existing?.code ?? '',
      description: existing?.description ?? '',
      destinationId: existing?.destinationId ?? '',
      tourCategoryId: existing?.tourCategoryId ?? '',
      nights: existing?.nights ?? 1,
      days: existing?.days ?? 2,
      inclusions: existing ? toFields(existing.inclusions) : [],
      exclusions: existing ? toFields(existing.exclusions) : [],
      highlights: existing ? toFields(existing.highlights) : [],
      pricePerPerson: existing?.pricePerPerson ?? 0,
      priceSingle: existing?.priceSingle?.toString() ?? '',
      priceDouble: existing?.priceDouble?.toString() ?? '',
      priceTriple: existing?.priceTriple?.toString() ?? '',
      priceQuad: existing?.priceQuad?.toString() ?? '',
      isPopular: existing?.isPopular ?? false,
      status: existing?.status ?? 'ACTIVE',
    },
  });

  const nights = watch('nights');

  const onSubmit = (data: PackageFormData) => {
    const payload = {
      name: data.name,
      code: data.code,
      description: data.description || undefined,
      destinationId: data.destinationId || undefined,
      tourCategoryId: data.tourCategoryId || undefined,
      nights: Number(data.nights),
      days: Number(data.days),
      inclusions: JSON.stringify(data.inclusions.map((f) => f.value).filter(Boolean)),
      exclusions: JSON.stringify(data.exclusions.map((f) => f.value).filter(Boolean)),
      highlights: JSON.stringify(data.highlights.map((f) => f.value).filter(Boolean)),
      pricePerPerson: Number(data.pricePerPerson),
      priceSingle: data.priceSingle ? Number(data.priceSingle) : null,
      priceDouble: data.priceDouble ? Number(data.priceDouble) : null,
      priceTriple: data.priceTriple ? Number(data.priceTriple) : null,
      priceQuad: data.priceQuad ? Number(data.priceQuad) : null,
      isPopular: data.isPopular,
      status: data.status,
    };

    if (isEdit && existing) {
      updatePkg.mutate({ id: existing.id, ...payload } as any, { onSuccess: onClose });
    } else {
      createPkg.mutate(payload as any, { onSuccess: onClose });
    }
  };

  const isPending = createPkg.isPending || updatePkg.isPending;
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Package' : 'New Package'}
      size="2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button form="pkg-form" type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Saving…' : isEdit ? 'Update Package' : 'Create Package'}
          </button>
        </>
      }
    >
      <form id="pkg-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Basic Info */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Package Name *</label>
              <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Kedarnath Spiritual Journey" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Package Code *</label>
              <input {...register('code', { required: 'Code is required' })} className="input uppercase" placeholder="e.g. KED-6N7D-DEL" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="label">Destination</label>
              <select {...register('destinationId')} className="input">
                <option value="">-- Select destination --</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}, {d.country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tour Category</label>
              <select {...register('tourCategoryId')} className="input">
                <option value="">-- Select category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nights *</label>
              <input type="number" min={0} {...register('nights', { required: true, min: 0, valueAsNumber: true })} className="input" />
            </div>
            <div>
              <label className="label">Days *</label>
              <input type="number" min={1} {...register('days', { required: true, min: 1, valueAsNumber: true })} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea {...register('description')} className="input resize-none" rows={2} placeholder="Brief overview of the package…" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('isPopular')} id="isPopular" className="w-4 h-4 accent-primary-600" />
              <label htmlFor="isPopular" className="text-sm font-medium text-slate-700 cursor-pointer">Mark as Popular</label>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Pricing (per person ₹)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Base Price *</label>
              <input type="number" min={0} step="0.01" {...register('pricePerPerson', { required: 'Price is required', min: 0, valueAsNumber: true })} className="input" placeholder="0" />
              {errors.pricePerPerson && <p className="text-red-500 text-xs mt-1">{errors.pricePerPerson.message}</p>}
            </div>
            <div>
              <label className="label">Single Occupancy</label>
              <input type="number" min={0} step="0.01" {...register('priceSingle')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Double Sharing</label>
              <input type="number" min={0} step="0.01" {...register('priceDouble')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Triple Sharing</label>
              <input type="number" min={0} step="0.01" {...register('priceTriple')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Quad Sharing</label>
              <input type="number" min={0} step="0.01" {...register('priceQuad')} className="input" placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Highlights / Inclusions / Exclusions */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Highlights & Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ListField label="Highlights" fieldName="highlights" control={control} register={register} />
            <ListField label="Inclusions" fieldName="inclusions" control={control} register={register} />
            <ListField label="Exclusions" fieldName="exclusions" control={control} register={register} />
          </div>
        </div>

      </form>
    </Modal>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit, onDelete }: { pkg: Package; onEdit: () => void; onDelete: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const highlights = parseList(pkg.highlights);
  const inclusions = parseList(pkg.inclusions);
  const exclusions = parseList(pkg.exclusions);

  return (
    <div className="card hover:shadow-lg transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pkg.isPopular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{pkg.name}</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{pkg.code}</span>
            <span className={cn('badge text-[10px]', STATUS_COLORS[pkg.status] ?? 'badge-muted')}>{pkg.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 mb-3">
        {pkg.destination && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="truncate">{pkg.destination.name}, {pkg.destination.country}</span>
          </div>
        )}
        {pkg.tourCategory && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span>{pkg.tourCategory.icon && `${pkg.tourCategory.icon} `}{pkg.tourCategory.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span>{pkg.nights}N / {pkg.days}D</span>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-slate-50 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1 mb-1">
          <IndianRupee className="w-3 h-3 text-primary-600" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Starting From</span>
        </div>
        <p className="text-lg font-bold text-primary-600">{formatCurrency(pkg.pricePerPerson)}<span className="text-xs text-slate-400 font-normal"> /person</span></p>
        {(pkg.priceSingle || pkg.priceDouble || pkg.priceTriple || pkg.priceQuad) && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pkg.priceSingle && <span className="text-[10px] text-slate-500">1 pax: {formatCurrency(pkg.priceSingle)}</span>}
            {pkg.priceDouble && <span className="text-[10px] text-slate-500">• 2 pax: {formatCurrency(pkg.priceDouble)}</span>}
            {pkg.priceTriple && <span className="text-[10px] text-slate-500">• 3 pax: {formatCurrency(pkg.priceTriple)}</span>}
            {pkg.priceQuad && <span className="text-[10px] text-slate-500">• 4 pax: {formatCurrency(pkg.priceQuad)}</span>}
          </div>
        )}
      </div>

      {/* Toggle details */}
      {(highlights.length > 0 || inclusions.length > 0) && (
        <>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors w-full mb-2"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showDetails && 'rotate-180')} />
            {showDetails ? 'Hide details' : 'Show highlights & inclusions'}
          </button>
          {showDetails && (
            <div className="space-y-3 text-xs">
              {highlights.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-500 mb-1">Highlights</p>
                  <ul className="space-y-0.5">
                    {highlights.map((h, i) => <li key={i} className="text-slate-600 flex gap-1"><span className="text-primary-500">✦</span>{h}</li>)}
                  </ul>
                </div>
              )}
              {inclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-600 mb-1">Inclusions</p>
                  <ul className="space-y-0.5">
                    {inclusions.map((h, i) => <li key={i} className="text-slate-600 flex gap-1"><span className="text-emerald-500">✓</span>{h}</li>)}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-red-500 mb-1">Exclusions</p>
                  <ul className="space-y-0.5">
                    {exclusions.map((h, i) => <li key={i} className="text-slate-600 flex gap-1"><span className="text-red-400">✗</span>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PackagesPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  const { data, isLoading } = usePackages({ search, status: filterStatus, destinationId: filterDest, tourCategoryId: filterCat });
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();
  const deletePkg = useDeletePackage();

  const packages = data?.data ?? [];
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (pkg: Package) => { setEditing(pkg); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePkg.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const stats = {
    total: packages.length,
    active: packages.filter((p) => p.status === 'ACTIVE').length,
    popular: packages.filter((p) => p.isPopular).length,
    draft: packages.filter((p) => p.status === 'DRAFT').length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Packages</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage tour packages linked to destinations and categories</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Package
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600' },
          { label: 'Popular', value: stats.popular, color: 'text-amber-600' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-400' },
        ].map((s) => (
          <div key={s.label} className="card text-center py-3">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Search packages…"
          />
        </div>
        <select value={filterDest} onChange={(e) => setFilterDest(e.target.value)} className="input sm:w-48">
          <option value="">All Destinations</option>
          {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input sm:w-44">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input sm:w-36">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="empty-state">
          <PackageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">No packages yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first tour package to get started</p>
          <button onClick={openCreate} className="btn-primary gap-2 mt-4">
            <Plus className="w-4 h-4" /> New Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onEdit={() => openEdit(pkg)}
              onDelete={() => setDeleteTarget(pkg)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <PackageFormModal open={modalOpen} onClose={closeModal} existing={editing} />
      )}

      {/* Delete Confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Package"
        size="sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={deletePkg.isPending} className="btn-danger">
              {deletePkg.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-slate-600 text-sm">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
        </p>
      </Modal>

    </div>
  );
}
