import { useState, useMemo } from 'react';
import {
  Package, Search, Star, MapPin, Tag, Clock, IndianRupee, ChevronDown,
  Plus, Minus, Info, Calendar, UserCircle, ChevronRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { usePackages, useCreatePackage } from '../../hooks/usePackages';
import { useDestinations, useTourCategories } from '../../hooks/useMasters';
import { Package as PkgType } from '../../types/index';
import { Skeleton } from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { formatCurrency, cn } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';

const parseList = (raw: string | string[]): string[] => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
};

// ─── FIT Create Form ──────────────────────────────────────────────────────────

const QUICK_NIGHTS = [1, 2, 3, 4, 5, 6, 7, 10, 14];

function NewFITModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPkg = useCreatePackage();
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const destinations = destData?.data ?? [];

  const [nights, setNights] = useState(3);
  const [stayLocations, setStayLocations] = useState<string[]>(['', '', '']);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<{ name: string; code: string }>({
    defaultValues: { name: '', code: '' },
  });

  const changeNights = (n: number) => {
    const clamped = Math.max(1, Math.min(30, n));
    setNights(clamped);
    setStayLocations((prev) => Array.from({ length: clamped }, (_, i) => prev[i] ?? ''));
  };

  const setLocation = (idx: number, val: string) =>
    setStayLocations((prev) => prev.map((v, i) => (i === idx ? val : v)));

  const handleClose = () => {
    onClose();
    reset();
    setNights(3);
    setStayLocations(['', '', '']);
  };

  const onSubmit = (data: { name: string; code: string }) => {
    const locationNames = stayLocations.map((id) => {
      const d = destinations.find((dest) => dest.id === id);
      return d ? `${d.name}${d.country ? `, ${d.country}` : ''}` : '';
    });
    createPkg.mutate(
      { name: data.name, code: data.code, nights, packageType: 'FIT', stayLocations: locationNames } as any,
      { onSuccess: handleClose },
    );
  };

  const totalDays = nights + 2;
  const returnOffset = nights + 1;

  const dayRows = useMemo(() => [
    { offset: 0, label: 'Departure Journey', type: 'departure' as const },
    ...Array.from({ length: nights }, (_, i) => ({
      offset: i + 1, label: `Stay Night ${i + 1}`, type: 'stay' as const,
    })),
    { offset: returnOffset, label: 'Return Journey', type: 'return' as const },
  ], [nights, returnOffset]);

  return (
    <Modal
      open={open} onClose={handleClose}
      title="New FIT Package"
      size="xl"
      footer={
        <>
          <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
          <button form="fit-form" type="submit" disabled={createPkg.isPending} className="btn-primary">
            {createPkg.isPending ? 'Creating…' : 'Create FIT Package'}
          </button>
        </>
      }
    >
      <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-700">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>FIT packages are Individual / Independent tours you create for specific customers. Add pricing and full details after creation.</span>
      </div>
      <form id="fit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Package Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Goa Private Trip — Sharma Family" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Package Code *</label>
            <input {...register('code', { required: 'Code is required' })} className="input uppercase" placeholder="e.g. FIT-GOA-3N" />
            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl self-end">
            <UserCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-violet-700">FIT Package</p>
              <p className="text-[10px] text-violet-500">Individual tour</p>
            </div>
          </div>
        </div>

        {/* Stay Nights stepper */}
        <div>
          <label className="label">Stay Nights</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => changeNights(nights - 1)}
              disabled={nights <= 1}
              className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-3xl font-bold text-slate-800 tabular-nums">{nights}</span>
              <span className="text-sm text-slate-500 ml-2">Nights</span>
            </div>
            <button
              type="button"
              onClick={() => changeNights(nights + 1)}
              disabled={nights >= 30}
              className="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {QUICK_NIGHTS.map((n) => (
              <button
                key={n} type="button"
                onClick={() => changeNights(n)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                  nights === n ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >{n}N</button>
            ))}
          </div>
        </div>

        {/* Total Days */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div>
            <span className="text-sm font-semibold text-slate-800">{totalDays} Total Days</span>
            <span className="text-xs text-slate-400 ml-2">Departure day + {nights} stay nights + return day</span>
          </div>
        </div>

        {/* Day Plan with location selectors */}
        <div>
          <label className="label mb-2">Day Plan</label>
          <div className="space-y-2">
            {dayRows.map((row) => {
              const isDepart = row.type === 'departure';
              const isReturn = row.type === 'return';
              const isStay = row.type === 'stay';
              return (
                <div
                  key={row.offset}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                    isDepart ? 'bg-amber-50 border-amber-200' :
                    isReturn ? 'bg-emerald-50 border-emerald-200' :
                    'bg-white border-slate-200',
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums flex-shrink-0 w-8 text-center',
                    isDepart ? 'bg-amber-100 text-amber-700' :
                    isReturn ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700',
                  )}>D{row.offset}</span>
                  <span className={cn(
                    'text-sm font-medium flex-shrink-0',
                    isDepart ? 'text-amber-800' : isReturn ? 'text-emerald-800' : 'text-slate-700',
                  )}>{row.label}</span>
                  {isStay && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <select
                        value={stayLocations[row.offset - 1]}
                        onChange={(e) => setLocation(row.offset - 1, e.target.value)}
                        className="input flex-1 text-sm py-1"
                      >
                        <option value="">— Select location —</option>
                        {destinations.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}, {d.country}</option>
                        ))}
                      </select>
                    </>
                  )}
                  {(isDepart || isReturn) && (
                    <span className="text-[10px] text-slate-400 ml-auto">Travel day</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </form>
    </Modal>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg, currentUserId }: { pkg: PkgType; currentUserId: string }) {
  const [showDetails, setShowDetails] = useState(false);
  const highlights = parseList(pkg.highlights);
  const inclusions = parseList(pkg.inclusions);
  const exclusions = parseList(pkg.exclusions);

  const isMyFIT = pkg.packageType === 'FIT' && pkg.createdById === currentUserId;

  return (
    <div className="card p-5 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pkg.isPopular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{pkg.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{pkg.code}</span>
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded',
              pkg.packageType === 'GIT' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
            )}>{pkg.packageType ?? 'GIT'}</span>
            {isMyFIT && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">My Package</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {pkg.destination && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{pkg.destination.name}, {pkg.destination.country}</span>
          </div>
        )}
        {pkg.tourCategory && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Tag className="w-3 h-3 text-slate-400" />
            <span>{pkg.tourCategory.icon && `${pkg.tourCategory.icon} `}{pkg.tourCategory.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{pkg.nights}N / {pkg.days}D</span>
        </div>
        {pkg.createdBy && pkg.packageType === 'FIT' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <UserCircle className="w-3 h-3" />
            <span>Created by {pkg.createdBy.name}{pkg.createdBy.employeeId ? ` (${pkg.createdBy.employeeId})` : ''}</span>
          </div>
        )}
        {pkg.description && <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>}
      </div>

      <div className="bg-primary-50 rounded-xl p-3 mb-3">
        <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-1">Starting From</p>
        {pkg.offerPrice ? (
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-primary-600">{formatCurrency(pkg.offerPrice)}</p>
            <p className="text-xs text-slate-400 line-through">{formatCurrency(pkg.pricePerPerson)}</p>
          </div>
        ) : (
          <p className="text-lg font-bold text-primary-600">
            {formatCurrency(pkg.pricePerPerson)}<span className="text-xs text-slate-400 font-normal"> /person</span>
          </p>
        )}
        {(pkg.priceSingle || pkg.priceDouble || pkg.priceTriple || pkg.priceQuad) && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {pkg.priceSingle && <span className="text-[10px] text-slate-500">1 pax: {formatCurrency(pkg.priceSingle)}</span>}
            {pkg.priceDouble && <span className="text-[10px] text-slate-500">2 pax: {formatCurrency(pkg.priceDouble)}</span>}
            {pkg.priceTriple && <span className="text-[10px] text-slate-500">3 pax: {formatCurrency(pkg.priceTriple)}</span>}
            {pkg.priceQuad && <span className="text-[10px] text-slate-500">4 pax: {formatCurrency(pkg.priceQuad)}</span>}
          </div>
        )}
      </div>

      {(highlights.length > 0 || inclusions.length > 0) && (
        <>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showDetails && 'rotate-180')} />
            {showDetails ? 'Hide details' : 'View inclusions & highlights'}
          </button>
          {showDetails && (
            <div className="space-y-3 text-xs border-t border-slate-100 pt-3">
              {highlights.length > 0 && (
                <div>
                  <p className="font-semibold text-slate-500 mb-1">Highlights</p>
                  <ul className="space-y-0.5">
                    {highlights.map((h, i) => <li key={i} className="text-slate-600 flex gap-1"><span className="text-primary-400">✦</span>{h}</li>)}
                  </ul>
                </div>
              )}
              {inclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-emerald-600 mb-1">What's Included</p>
                  <ul className="space-y-0.5">
                    {inclusions.map((h, i) => <li key={i} className="text-slate-600 flex gap-1"><span className="text-emerald-500">✓</span>{h}</li>)}
                  </ul>
                </div>
              )}
              {exclusions.length > 0 && (
                <div>
                  <p className="font-semibold text-red-500 mb-1">Not Included</p>
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

export default function PackageCatalogPage() {
  const [search, setSearch] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showNewFIT, setShowNewFIT] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = usePackages({ search, status: 'ACTIVE', destinationId: filterDest, tourCategoryId: filterCat, packageType: filterType });
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();

  const packages = data?.data ?? [];
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Package Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5">Browse GIT group packages or create your own FIT packages</p>
        </div>
        <button onClick={() => setShowNewFIT(true)} className="btn-primary gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New FIT Package
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search packages…" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input sm:w-32">
          <option value="">All Types</option>
          <option value="GIT">GIT</option>
          <option value="FIT">FIT</option>
        </select>
        <select value={filterDest} onChange={(e) => setFilterDest(e.target.value)} className="input sm:w-44">
          <option value="">All Destinations</option>
          {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input sm:w-40">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="empty-state">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">No packages found</p>
          <p className="text-sm text-slate-400 mt-1">
            {search || filterDest || filterCat || filterType
              ? 'Try adjusting filters'
              : 'No active packages yet — ask admin to add GIT packages, or create a FIT package'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} currentUserId={currentUser?.id ?? ''} />
          ))}
        </div>
      )}

      {showNewFIT && <NewFITModal open={showNewFIT} onClose={() => setShowNewFIT(false)} />}
    </div>
  );
}
