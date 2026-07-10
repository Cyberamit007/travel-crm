import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map, Calendar, Users, IndianRupee, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Phone, MapPin, ExternalLink, Clock,
  Plane, TrendingUp,
} from 'lucide-react';
import { useUpcomingTrips } from '../../hooks/useErp';
import { TripGroup } from '../../types/index';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency, cn } from '../../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysDiff(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return `In ${diff}d`;
}

function formatDatePretty(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Traveler Row ─────────────────────────────────────────────────────────────

function TravelerRow({ lead, onView }: { lead: any; onView: () => void }) {
  const booking = lead.booking;
  const isOverdue = booking?.balanceAmount > 0 && booking?.balanceDueDate && new Date(booking.balanceDueDate) < new Date();

  return (
    <tr className="hover:bg-slate-50 transition-colors text-sm">
      <td className="px-4 py-2.5">
        <p className="font-medium text-slate-800">{lead.name}</p>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Phone className="w-3 h-3" />{lead.phone}
        </div>
      </td>
      <td className="px-4 py-2.5 hidden sm:table-cell">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Users className="w-3 h-3 text-slate-400" />
          {booking?.numberOfTravelers ?? lead.groupSize ?? 1} pax
        </div>
        {lead.destination && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
            <MapPin className="w-3 h-3" />{lead.destination}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 hidden md:table-cell">
        {booking?.foodPreference && booking.foodPreference !== 'NO_PREFERENCE' && (
          <span className="badge badge-muted text-[10px]">{booking.foodPreference}</span>
        )}
        {booking?.roomSharing && <span className="badge badge-muted text-[10px] ml-1">{booking.roomSharing}</span>}
        {booking?.specialRequest && (
          <p className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{booking.specialRequest}
          </p>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {booking ? (
          <>
            <p className="font-semibold text-slate-800 tabular text-xs">{formatCurrency(booking.finalPrice)}</p>
            {booking.balanceAmount > 0 ? (
              <p className={cn('text-[10px] mt-0.5', isOverdue ? 'text-red-500' : 'text-orange-500')}>
                Bal: {formatCurrency(booking.balanceAmount)}
              </p>
            ) : (
              <p className="text-[10px] text-emerald-500 mt-0.5 flex items-center justify-end gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" />Paid
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        <button onClick={onView} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
          <ExternalLink className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip, isPast }: { trip: TripGroup; isPast?: boolean }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(!isPast);
  const diff = daysDiff(trip.departureDate);
  const balancePending = trip.totalRevenue - trip.totalCollected;

  return (
    <div className={cn('border rounded-2xl overflow-hidden', isPast ? 'border-slate-200 opacity-75' : 'border-primary-200')}>
      {/* Trip header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 text-left transition-colors',
          isPast ? 'bg-slate-50 hover:bg-slate-100' : 'bg-primary-50 hover:bg-primary-100'
        )}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', isPast ? 'bg-slate-200' : 'bg-primary-100')}>
            <Plane className={cn('w-5 h-5', isPast ? 'text-slate-500' : 'text-primary-600')} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800">{formatDatePretty(trip.departureDate)}</p>
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                isPast ? 'bg-slate-200 text-slate-500' : diff === 'Today' ? 'bg-red-100 text-red-600' : diff === 'Tomorrow' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'
              )}>
                {diff}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.totalPax} pax</span>
              <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatCurrency(trip.totalRevenue)}</span>
              {balancePending > 0 && (
                <span className="flex items-center gap-1 text-orange-500"><AlertCircle className="w-3 h-3" />{formatCurrency(balancePending)} pending</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:block">{trip.bookings.length} booking{trip.bookings.length !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Manifest */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Traveler</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden sm:table-cell">Pax / Destination</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider hidden md:table-cell">Preferences</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Payment</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trip.bookings.map((lead: any) => (
                <TravelerRow
                  key={lead.id}
                  lead={lead}
                  onView={() => navigate(`/admin/leads?id=${lead.id}`)}
                />
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-600">
                  Total: {trip.totalPax} travelers · {trip.bookings.length} bookings
                </td>
                <td className="px-4 py-2 text-right text-xs font-bold text-slate-700">
                  {formatCurrency(trip.totalRevenue)}
                  {balancePending > 0 && (
                    <p className="text-orange-500 font-normal">{formatCurrency(balancePending)} pending</p>
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { data, isLoading } = useUpcomingTrips();
  const [showPast, setShowPast] = useState(false);

  const upcoming = data?.data?.upcoming ?? [];
  const past = data?.data?.past ?? [];

  const totalPax = upcoming.reduce((s, t) => s + t.totalPax, 0);
  const totalRevenue = upcoming.reduce((s, t) => s + t.totalRevenue, 0);
  const totalCollected = upcoming.reduce((s, t) => s + t.totalCollected, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Operations</h2>
        <p className="text-sm text-slate-500 mt-0.5">Upcoming departures and traveler manifests</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          {upcoming.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Upcoming Trips', value: String(upcoming.length), icon: Calendar, color: 'text-primary-600' },
                { label: 'Total Pax', value: String(totalPax), icon: Users, color: 'text-slate-700' },
                { label: 'Expected Revenue', value: formatCurrency(totalRevenue), icon: IndianRupee, color: 'text-primary-600' },
                { label: 'Collected', value: formatCurrency(totalCollected), icon: TrendingUp, color: 'text-emerald-600' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="card flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className={cn('w-4 h-4', s.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-base font-bold truncate', s.color)}>{s.value}</p>
                      <p className="text-[11px] text-slate-400">{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming trips */}
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No upcoming trips</p>
              <p className="text-sm text-slate-400 mt-1">Confirmed leads with a preferred date will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-500" />Upcoming Departures
              </h3>
              {upcoming.map((trip) => (
                <TripCard key={trip.departureDate} trip={trip} />
              ))}
            </div>
          )}

          {/* Past trips */}
          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showPast ? 'Hide' : 'Show'} past trips ({past.length})
              </button>
              {showPast && (
                <div className="space-y-3 mt-3">
                  {past.map((trip) => (
                    <TripCard key={trip.departureDate} trip={trip} isPast />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
