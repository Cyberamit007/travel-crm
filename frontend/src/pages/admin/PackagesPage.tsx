import { useState } from 'react';
import {
  Package as PackageIcon, Plus, Edit, Trash2, Search, Star, MapPin, Tag, Clock,
  IndianRupee, ChevronDown, Layers, Calendar, Users, ChevronRight, GripVertical,
  AlertCircle, Settings, BookOpen,
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '../../hooks/usePackages';
import { useItinerary, useCreateItineraryItem, useUpdateItineraryItem, useDeleteItineraryItem } from '../../hooks/useItinerary';
import { useDestinations, useTourCategories } from '../../hooks/useMasters';
import { Package, PackageItinerary } from '../../types/index';
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

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'text-emerald-600 bg-emerald-50',
  MODERATE: 'text-amber-600 bg-amber-50',
  DIFFICULT: 'text-orange-600 bg-orange-50',
  EXTREME: 'text-red-600 bg-red-50',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  COLLECT_DOCS: 'Collect Docs',
  COLLECT_PAYMENT: 'Collect Payment',
  CONFIRM_HOTEL: 'Confirm Hotel',
  CONFIRM_VEHICLE: 'Confirm Vehicle',
  SEND_REMINDER: 'Send Reminder',
  TRIP_DAY: 'Trip Day',
  COLLECT_REVIEW: 'Collect Review',
  REFERRAL: 'Referral',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Dynamic list field ───────────────────────────────────────────────────────

function ListField({ label, fieldName, control, register }: {
  label: string;
  fieldName: string;
  control: any;
  register: any;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">{label}</label>
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
        {fields.length === 0 && <p className="text-xs text-slate-400 italic">None added</p>}
      </div>
    </div>
  );
}

// ─── Season selector ──────────────────────────────────────────────────────────

function SeasonSelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (m: string) => {
    if (value.includes(m)) onChange(value.filter((x) => x !== m));
    else onChange([...value, m]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {MONTHS.map((m) => (
        <button
          key={m} type="button"
          onClick={() => toggle(m)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
            value.includes(m)
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >{m}</button>
      ))}
    </div>
  );
}

// ─── Package Form ─────────────────────────────────────────────────────────────

interface PackageFormData {
  name: string;
  code: string;
  description: string;
  overview: string;
  destinationId: string;
  tourCategoryId: string;
  nights: number;
  days: number;
  inclusions: { value: string }[];
  exclusions: { value: string }[];
  highlights: { value: string }[];
  thingsToCarry: { value: string }[];
  pricePerPerson: number;
  offerPrice: string;
  priceSingle: string;
  priceDouble: string;
  priceTriple: string;
  priceQuad: string;
  capacityMin: string;
  capacityMax: string;
  difficultyLevel: string;
  pickupLocation: string;
  dropLocation: string;
  cancellationPolicy: string;
  termsAndConditions: string;
  packageNotes: string;
  isPopular: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

function PackageFormModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Package | null }) {
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();
  const createPkg = useCreatePackage();
  const updatePkg = useUpdatePackage();
  const isEdit = !!existing;
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'details' | 'logistics'>('basic');
  const [bestSeason, setBestSeason] = useState<string[]>(
    existing?.bestSeason ? parseList(existing.bestSeason) : []
  );

  const toFields = (raw: string | string[]) => parseList(raw).map((v) => ({ value: v }));

  const { register, handleSubmit, control, formState: { errors } } = useForm<PackageFormData>({
    defaultValues: {
      name: existing?.name ?? '',
      code: existing?.code ?? '',
      description: existing?.description ?? '',
      overview: existing?.overview ?? '',
      destinationId: existing?.destinationId ?? '',
      tourCategoryId: existing?.tourCategoryId ?? '',
      nights: existing?.nights ?? 1,
      days: existing?.days ?? 2,
      inclusions: existing ? toFields(existing.inclusions) : [],
      exclusions: existing ? toFields(existing.exclusions) : [],
      highlights: existing ? toFields(existing.highlights) : [],
      thingsToCarry: existing ? toFields(existing.thingsToCarry) : [],
      pricePerPerson: existing?.pricePerPerson ?? 0,
      offerPrice: existing?.offerPrice?.toString() ?? '',
      priceSingle: existing?.priceSingle?.toString() ?? '',
      priceDouble: existing?.priceDouble?.toString() ?? '',
      priceTriple: existing?.priceTriple?.toString() ?? '',
      priceQuad: existing?.priceQuad?.toString() ?? '',
      capacityMin: existing?.capacityMin?.toString() ?? '',
      capacityMax: existing?.capacityMax?.toString() ?? '',
      difficultyLevel: existing?.difficultyLevel ?? '',
      pickupLocation: existing?.pickupLocation ?? '',
      dropLocation: existing?.dropLocation ?? '',
      cancellationPolicy: existing?.cancellationPolicy ?? '',
      termsAndConditions: existing?.termsAndConditions ?? '',
      packageNotes: existing?.packageNotes ?? '',
      isPopular: existing?.isPopular ?? false,
      status: existing?.status ?? 'ACTIVE',
    },
  });

  const onSubmit = (data: PackageFormData) => {
    const payload: any = {
      name: data.name,
      code: data.code,
      description: data.description || undefined,
      overview: data.overview || undefined,
      destinationId: data.destinationId || undefined,
      tourCategoryId: data.tourCategoryId || undefined,
      nights: Number(data.nights),
      days: Number(data.days),
      inclusions: data.inclusions.map((f) => f.value).filter(Boolean),
      exclusions: data.exclusions.map((f) => f.value).filter(Boolean),
      highlights: data.highlights.map((f) => f.value).filter(Boolean),
      thingsToCarry: data.thingsToCarry.map((f) => f.value).filter(Boolean),
      pricePerPerson: Number(data.pricePerPerson),
      offerPrice: data.offerPrice ? Number(data.offerPrice) : null,
      priceSingle: data.priceSingle ? Number(data.priceSingle) : null,
      priceDouble: data.priceDouble ? Number(data.priceDouble) : null,
      priceTriple: data.priceTriple ? Number(data.priceTriple) : null,
      priceQuad: data.priceQuad ? Number(data.priceQuad) : null,
      capacityMin: data.capacityMin ? Number(data.capacityMin) : null,
      capacityMax: data.capacityMax ? Number(data.capacityMax) : null,
      difficultyLevel: data.difficultyLevel || null,
      bestSeason,
      pickupLocation: data.pickupLocation || undefined,
      dropLocation: data.dropLocation || undefined,
      cancellationPolicy: data.cancellationPolicy || undefined,
      termsAndConditions: data.termsAndConditions || undefined,
      packageNotes: data.packageNotes || undefined,
      isPopular: data.isPopular,
      status: data.status,
    };

    if (isEdit && existing) {
      updatePkg.mutate({ id: existing.id, ...payload }, { onSuccess: onClose });
    } else {
      createPkg.mutate(payload, { onSuccess: onClose });
    }
  };

  const isPending = createPkg.isPending || updatePkg.isPending;
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  const TABS = [
    { key: 'basic', label: 'Basic Info' },
    { key: 'pricing', label: 'Pricing' },
    { key: 'details', label: 'Highlights' },
    { key: 'logistics', label: 'Logistics' },
  ] as const;

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? `Edit Package — ${existing?.code}` : 'New Package'}
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
      {/* Tab nav */}
      <div className="flex gap-1 border-b border-slate-200 mb-5 -mx-1">
        {TABS.map((t) => (
          <button
            key={t.key} type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >{t.label}</button>
        ))}
      </div>

      <form id="pkg-form" onSubmit={handleSubmit(onSubmit)}>

        {/* ── Basic Info ── */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
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
                  {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tour Category</label>
                <select {...register('tourCategoryId')} className="input">
                  <option value="">-- Select category --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
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
              <div>
                <label className="label">Difficulty Level</label>
                <select {...register('difficultyLevel')} className="input">
                  <option value="">-- Not specified --</option>
                  <option value="EASY">Easy</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="DIFFICULT">Difficult</option>
                  <option value="EXTREME">Extreme</option>
                </select>
              </div>
              <div>
                <label className="label">Group Capacity</label>
                <div className="flex gap-2">
                  <input type="number" min={1} {...register('capacityMin')} className="input" placeholder="Min" />
                  <input type="number" min={1} {...register('capacityMax')} className="input" placeholder="Max" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Short Description</label>
                <textarea {...register('description')} className="input resize-none" rows={2} placeholder="Brief summary shown on cards…" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Full Overview / USP</label>
                <textarea {...register('overview')} className="input resize-none" rows={3} placeholder="Detailed overview, unique selling points…" />
              </div>
              <div>
                <label className="label">Best Season</label>
                <SeasonSelector value={bestSeason} onChange={setBestSeason} />
              </div>
              <div className="flex items-center gap-2 self-end">
                <input type="checkbox" {...register('isPopular')} id="isPopular" className="w-4 h-4 accent-primary-600" />
                <label htmlFor="isPopular" className="text-sm font-medium text-slate-700 cursor-pointer">Mark as Popular</label>
              </div>
            </div>
          </div>
        )}

        {/* ── Pricing ── */}
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Base Price (₹) *</label>
                <input type="number" min={0} step="0.01" {...register('pricePerPerson', { required: 'Price is required', min: 0, valueAsNumber: true })} className="input" placeholder="0" />
                {errors.pricePerPerson && <p className="text-red-500 text-xs mt-1">{errors.pricePerPerson.message}</p>}
              </div>
              <div>
                <label className="label">Offer Price (₹)</label>
                <input type="number" min={0} step="0.01" {...register('offerPrice')} className="input" placeholder="Optional" />
              </div>
              <div />
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
        )}

        {/* ── Highlights / Inclusions / Exclusions / Things to Carry ── */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListField label="Highlights" fieldName="highlights" control={control} register={register} />
            <ListField label="Inclusions" fieldName="inclusions" control={control} register={register} />
            <ListField label="Exclusions" fieldName="exclusions" control={control} register={register} />
            <ListField label="Things to Carry" fieldName="thingsToCarry" control={control} register={register} />
          </div>
        )}

        {/* ── Logistics / Policies ── */}
        {activeTab === 'logistics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Pickup Location</label>
                <input {...register('pickupLocation')} className="input" placeholder="e.g. Delhi Airport / Haridwar ISBT" />
              </div>
              <div>
                <label className="label">Drop Location</label>
                <input {...register('dropLocation')} className="input" placeholder="e.g. Same as pickup" />
              </div>
            </div>
            <div>
              <label className="label">Cancellation Policy</label>
              <textarea {...register('cancellationPolicy')} className="input resize-none" rows={3} placeholder="Cancellation and refund policy details…" />
            </div>
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea {...register('termsAndConditions')} className="input resize-none" rows={3} placeholder="Terms and conditions…" />
            </div>
            <div>
              <label className="label">Package Notes (Internal)</label>
              <textarea {...register('packageNotes')} className="input resize-none" rows={2} placeholder="Internal notes for your team…" />
            </div>
          </div>
        )}

      </form>
    </Modal>
  );
}

// ─── Itinerary Builder ────────────────────────────────────────────────────────

function dayLabel(offset: number): string {
  if (offset < 0) return `D-${Math.abs(offset)}`;
  if (offset === 0) return 'D-Day';
  return `D+${offset}`;
}

const DEPT_COLORS: Record<string, string> = {
  SALES: 'bg-blue-100 text-blue-700',
  OPERATIONS: 'bg-purple-100 text-purple-700',
  CUSTOMER_CARE: 'bg-emerald-100 text-emerald-700',
  ALL: 'bg-slate-100 text-slate-600',
};

function ItineraryItemForm({ packageId, existing, onClose }: {
  packageId: string;
  existing?: PackageItinerary | null;
  onClose: () => void;
}) {
  const create = useCreateItineraryItem(packageId);
  const update = useUpdateItineraryItem(packageId);
  const [form, setForm] = useState({
    dayOffset: existing?.dayOffset?.toString() ?? '-7',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    notes: existing?.notes ?? '',
    taskType: existing?.taskType ?? 'GENERAL',
    department: existing?.department ?? 'SALES',
    sortOrder: existing?.sortOrder?.toString() ?? '0',
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    const payload = {
      dayOffset: Number(form.dayOffset),
      title: form.title.trim(),
      description: form.description || undefined,
      notes: form.notes || undefined,
      taskType: form.taskType,
      department: form.department,
      sortOrder: Number(form.sortOrder),
    };
    if (existing) {
      update.mutate({ id: existing.id, ...payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label text-xs">Day Offset</label>
          <input
            type="number"
            value={form.dayOffset}
            onChange={(e) => setForm((f) => ({ ...f, dayOffset: e.target.value }))}
            className="input text-sm"
            placeholder="-7"
          />
          <p className="text-[10px] text-slate-400 mt-0.5">Negative = before trip</p>
        </div>
        <div className="sm:col-span-3">
          <label className="label text-xs">Task Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="input text-sm"
            placeholder="e.g. Collect passport copies"
          />
        </div>
        <div>
          <label className="label text-xs">Task Type</label>
          <select value={form.taskType} onChange={(e) => setForm((f) => ({ ...f, taskType: e.target.value }))} className="input text-sm">
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Department</label>
          <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className="input text-sm">
            <option value="SALES">Sales</option>
            <option value="OPERATIONS">Operations</option>
            <option value="CUSTOMER_CARE">Customer Care</option>
            <option value="ALL">All</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label text-xs">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input text-sm"
            placeholder="Optional details…"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
        <button type="button" onClick={handleSave} disabled={isPending || !form.title.trim()} className="btn-primary text-xs">
          {isPending ? 'Saving…' : existing ? 'Update Step' : 'Add Step'}
        </button>
      </div>
    </div>
  );
}

function ItineraryBuilder({ packageId }: { packageId: string }) {
  const { data, isLoading } = useItinerary(packageId);
  const deleteItem = useDeleteItineraryItem(packageId);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PackageItinerary | null>(null);

  const items = data?.data ?? [];

  const grouped = items.reduce<Record<number, PackageItinerary[]>>((acc, item) => {
    if (!acc[item.dayOffset]) acc[item.dayOffset] = [];
    acc[item.dayOffset].push(item);
    return acc;
  }, {});

  const offsets = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  if (isLoading) return <div className="py-8 text-center text-slate-400 text-sm">Loading itinerary…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} steps in workflow</p>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Step
        </button>
      </div>

      {showForm && !editing && (
        <ItineraryItemForm packageId={packageId} onClose={() => setShowForm(false)} />
      )}

      {items.length === 0 && !showForm && (
        <div className="text-center py-10 text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No workflow steps yet</p>
          <p className="text-xs mt-1">Add steps like "D-15: Collect Documents", "D-7: Confirm Hotel"</p>
        </div>
      )}

      {offsets.map((offset) => (
        <div key={offset}>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              offset < 0 ? 'bg-blue-100 text-blue-700' : offset === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            )}>
              {dayLabel(offset)}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400">
              {offset < 0 ? `${Math.abs(offset)} days before departure` : offset === 0 ? 'Departure day' : `${offset} days after departure`}
            </span>
          </div>
          <div className="space-y-2 ml-2">
            {grouped[offset].map((item) => (
              <div key={item.id}>
                {editing?.id === item.id ? (
                  <ItineraryItemForm packageId={packageId} existing={item} onClose={() => setEditing(null)} />
                ) : (
                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors">
                    <GripVertical className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-slate-800">{item.title}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', DEPT_COLORS[item.department] ?? 'bg-slate-100 text-slate-600')}>
                          {item.department}
                        </span>
                        <span className="text-[10px] text-slate-400">{TASK_TYPE_LABELS[item.taskType] ?? item.taskType}</span>
                      </div>
                      {item.description && <p className="text-xs text-slate-500 truncate">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(item)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteItem.mutate(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Package Detail Modal ─────────────────────────────────────────────────────

function PackageDetailModal({ pkg, onClose, onEdit }: { pkg: Package; onClose: () => void; onEdit: () => void }) {
  const [tab, setTab] = useState<'overview' | 'itinerary'>('overview');
  const highlights = parseList(pkg.highlights);
  const inclusions = parseList(pkg.inclusions);
  const exclusions = parseList(pkg.exclusions);
  const thingsToCarry = parseList(pkg.thingsToCarry);
  const bestSeason = parseList(pkg.bestSeason);

  return (
    <Modal open onClose={onClose} title={pkg.name} size="2xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={onEdit} className="btn-primary gap-1.5"><Edit className="w-3.5 h-3.5" /> Edit Package</button>
        </>
      }
    >
      {/* Header strip */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{pkg.code}</span>
            <span className={cn('badge text-[10px]', STATUS_COLORS[pkg.status])}>{pkg.status}</span>
            {pkg.difficultyLevel && (
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', DIFFICULTY_COLORS[pkg.difficultyLevel])}>
                {pkg.difficultyLevel}
              </span>
            )}
            {pkg.isPopular && <span className="flex items-center gap-0.5 text-[10px] text-amber-600"><Star className="w-3 h-3 fill-amber-500" /> Popular</span>}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
            {pkg.destination && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pkg.destination.name}, {pkg.destination.country}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pkg.nights}N/{pkg.days}D</span>
            {(pkg.capacityMin || pkg.capacityMax) && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />
                {pkg.capacityMin ?? 1}–{pkg.capacityMax ?? '∞'} pax
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-primary-600">{formatCurrency(pkg.offerPrice ?? pkg.pricePerPerson)}</p>
          {pkg.offerPrice && <p className="text-xs text-slate-400 line-through">{formatCurrency(pkg.pricePerPerson)}</p>}
          <p className="text-[10px] text-slate-400">per person</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-200 mb-4 -mx-1">
        {[{ key: 'overview', label: 'Overview' }, { key: 'itinerary', label: 'Itinerary Builder' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          {pkg.overview && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Overview</p>
              <p className="text-sm text-slate-700 leading-relaxed">{pkg.overview}</p>
            </div>
          )}

          {bestSeason.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Best Season</p>
              <div className="flex flex-wrap gap-1.5">
                {bestSeason.map((m) => (
                  <span key={m} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-lg font-medium">{m}</span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highlights.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Highlights</p>
                <ul className="space-y-1">
                  {highlights.map((h, i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-primary-500 flex-shrink-0">✦</span>{h}</li>)}
                </ul>
              </div>
            )}
            {inclusions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2">Inclusions</p>
                <ul className="space-y-1">
                  {inclusions.map((h, i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-500 flex-shrink-0">✓</span>{h}</li>)}
                </ul>
              </div>
            )}
            {exclusions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2">Exclusions</p>
                <ul className="space-y-1">
                  {exclusions.map((h, i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-red-400 flex-shrink-0">✗</span>{h}</li>)}
                </ul>
              </div>
            )}
          </div>

          {thingsToCarry.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Things to Carry</p>
              <ul className="grid grid-cols-2 gap-1">
                {thingsToCarry.map((t, i) => <li key={i} className="text-xs text-slate-600 flex gap-1.5"><span className="text-slate-400">•</span>{t}</li>)}
              </ul>
            </div>
          )}

          {(pkg.pickupLocation || pkg.dropLocation) && (
            <div className="grid grid-cols-2 gap-4">
              {pkg.pickupLocation && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Pickup</p>
                  <p className="text-sm text-slate-700">{pkg.pickupLocation}</p>
                </div>
              )}
              {pkg.dropLocation && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Drop</p>
                  <p className="text-sm text-slate-700">{pkg.dropLocation}</p>
                </div>
              )}
            </div>
          )}

          {pkg.cancellationPolicy && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cancellation Policy</p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{pkg.cancellationPolicy}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'itinerary' && <ItineraryBuilder packageId={pkg.id} />}
    </Modal>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, onView, onEdit, onDelete }: { pkg: Package; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const highlights = parseList(pkg.highlights);

  return (
    <div className="card p-5 hover:shadow-lg transition-all group flex flex-col">
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
            {pkg.difficultyLevel && (
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', DIFFICULTY_COLORS[pkg.difficultyLevel])}>
                {pkg.difficultyLevel}
              </span>
            )}
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
          {(pkg.capacityMin || pkg.capacityMax) && (
            <span className="text-slate-400">• {pkg.capacityMin ?? 1}–{pkg.capacityMax ?? '∞'} pax</span>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-slate-50 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1 mb-0.5">
          <IndianRupee className="w-3 h-3 text-primary-600" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Starting From</span>
        </div>
        {pkg.offerPrice ? (
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-primary-600">{formatCurrency(pkg.offerPrice)}</p>
            <p className="text-xs text-slate-400 line-through">{formatCurrency(pkg.pricePerPerson)}</p>
          </div>
        ) : (
          <p className="text-lg font-bold text-primary-600">{formatCurrency(pkg.pricePerPerson)}<span className="text-xs text-slate-400 font-normal"> /person</span></p>
        )}
      </div>

      {/* Highlights preview */}
      {highlights.length > 0 && (
        <div className="mb-3 flex-1">
          <ul className="space-y-0.5">
            {highlights.slice(0, 3).map((h, i) => (
              <li key={i} className="text-xs text-slate-600 flex gap-1"><span className="text-primary-500 flex-shrink-0">✦</span><span className="truncate">{h}</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer counts + view button */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          {pkg._count?.itineraryItems !== undefined && (
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{pkg._count.itineraryItems} steps</span>
          )}
          {pkg._count?.bookings !== undefined && (
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{pkg._count.bookings} bookings</span>
          )}
        </div>
        <button onClick={onView} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5">
          View <ChevronRight className="w-3 h-3" />
        </button>
      </div>
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
  const [viewing, setViewing] = useState<Package | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  const { data, isLoading } = usePackages({ search, status: filterStatus, destinationId: filterDest, tourCategoryId: filterCat });
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();
  const deletePkg = useDeletePackage();

  const packages = data?.data ?? [];
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (pkg: Package) => { setEditing(pkg); setViewing(null); setModalOpen(true); };
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
          <p className="text-sm text-slate-500 mt-0.5">Manage tour packages with itinerary workflows</p>
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
          <div key={s.label} className="card text-center px-4 py-3">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search packages…" />
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
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
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
              onView={() => setViewing(pkg)}
              onEdit={() => openEdit(pkg)}
              onDelete={() => setDeleteTarget(pkg)}
            />
          ))}
        </div>
      )}

      {/* Package Detail Modal */}
      {viewing && (
        <PackageDetailModal
          pkg={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
        />
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
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete all itinerary steps. This action cannot be undone.
        </p>
      </Modal>

    </div>
  );
}
