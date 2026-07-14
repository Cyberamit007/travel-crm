import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarRange, MapPin, Users, ChevronRight } from 'lucide-react';
import { useTravelCalendar } from '../../hooks/useOperations';
import { TravelCalendarItem } from '../../types/index';
import { formatDate, cn } from '../../utils/helpers';
import { Skeleton } from '../ui/Skeleton';

const BUCKET_ORDER: TravelCalendarItem['bucket'][] = ['IN_PROGRESS', 'TODAY', 'TOMORROW', 'THIS_WEEK', 'THIS_MONTH', 'LATER'];
const BUCKET_LABELS: Record<TravelCalendarItem['bucket'], string> = {
  IN_PROGRESS: 'In Progress', TODAY: 'Today', TOMORROW: 'Tomorrow', THIS_WEEK: 'This Week', THIS_MONTH: 'This Month', LATER: 'Later',
};

function countdownLabel(item: TravelCalendarItem): string {
  if (item.bucket === 'IN_PROGRESS') return item.daysUntilReturn != null ? `Returns in ${item.daysUntilReturn}d` : 'On trip';
  if (item.daysUntilDeparture === 0) return 'Leaves Today';
  if (item.daysUntilDeparture === 1) return 'Leaves Tomorrow';
  return `Leaves In ${item.daysUntilDeparture} Days`;
}

export default function TravelCalendarWidget() {
  const navigate = useNavigate();
  const location = useLocation();
  const base = location.pathname.startsWith('/admin') ? '/admin/operations' : '/operations';
  const { data, isLoading } = useTravelCalendar();
  const items = data?.data.items ?? [];

  const grouped = BUCKET_ORDER
    .map((bucket) => ({ bucket, items: items.filter((i) => i.bucket === bucket) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarRange className="w-4 h-4 text-primary-500" />
        <h3 className="font-semibold text-slate-800 text-sm">Travel Calendar</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-sm text-slate-400">No departures in the next 30 days</div>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {grouped.map((g) => (
            <div key={g.bucket}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{BUCKET_LABELS[g.bucket]}</p>
              <div className="space-y-1.5">
                {g.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`${base}/departures/${item.id}`)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary-300 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />{item.destination}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{formatDate(item.departureDate)}</span>
                        <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{item.totalTravelers}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn(
                        'badge text-[10px]',
                        item.bucket === 'IN_PROGRESS' ? 'bg-emerald-50 text-emerald-700' : item.bucket === 'TODAY' ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-700'
                      )}>
                        {countdownLabel(item)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
