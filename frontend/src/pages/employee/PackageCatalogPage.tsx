import { useState } from 'react';
import {
  Package, Search, Star, MapPin, Tag, Clock, IndianRupee, ChevronDown,
} from 'lucide-react';
import { usePackages } from '../../hooks/usePackages';
import { useDestinations, useTourCategories } from '../../hooks/useMasters';
import { Package as PkgType } from '../../types/index';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, cn } from '../../utils/helpers';

const parseList = (raw: string | string[]): string[] => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
};

function PackageCard({ pkg }: { pkg: PkgType }) {
  const [showDetails, setShowDetails] = useState(false);
  const highlights = parseList(pkg.highlights);
  const inclusions = parseList(pkg.inclusions);
  const exclusions = parseList(pkg.exclusions);

  return (
    <div className="card p-5 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {pkg.isPopular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{pkg.name}</h3>
          </div>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{pkg.code}</span>
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
        {pkg.description && <p className="text-xs text-slate-500 leading-relaxed">{pkg.description}</p>}
      </div>

      <div className="bg-primary-50 rounded-xl p-3 mb-3">
        <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mb-1">Starting From</p>
        <p className="text-lg font-bold text-primary-600">
          {formatCurrency(pkg.pricePerPerson)}<span className="text-xs text-slate-400 font-normal"> /person</span>
        </p>
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

export default function PackageCatalogPage() {
  const [search, setSearch] = useState('');
  const [filterDest, setFilterDest] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const { data, isLoading } = usePackages({ search, status: 'ACTIVE', destinationId: filterDest, tourCategoryId: filterCat });
  const { data: destData } = useDestinations({ status: 'ACTIVE' });
  const { data: catData } = useTourCategories();

  const packages = data?.data ?? [];
  const destinations = destData?.data ?? [];
  const categories = catData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Package Catalog</h2>
        <p className="text-sm text-slate-500 mt-0.5">Browse available tour packages to share with leads</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search packages…" />
        </div>
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
          <p className="text-sm text-slate-400 mt-1">{search || filterDest || filterCat ? 'Try adjusting filters' : 'No active packages yet — ask admin to add packages'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
        </div>
      )}
    </div>
  );
}
