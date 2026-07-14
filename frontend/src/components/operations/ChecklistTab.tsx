import { CheckSquare, Square, Lock } from 'lucide-react';
import { useUpdateChecklist } from '../../hooks/useOperations';
import { Checklist } from '../../types/index';
import { cn } from '../../utils/helpers';

// Only these keys are backed by Departure.manualChecklist and can be toggled —
// everything else is computed live from hotels/vehicles/travelers/trip captain
// and shown read-only here (mirrors MANUAL_CHECKLIST_KEYS in departure.controller.ts).
const MANUAL_KEYS = new Set(['welcomeKitReady', 'passengerListPrinted', 'emergencyContactsReady', 'medicalKitReady']);

export default function ChecklistTab({ departureId, checklist }: { departureId: string; checklist?: Checklist }) {
  const updateChecklist = useUpdateChecklist(departureId);

  if (!checklist) return null;

  const toggle = (key: string, done: boolean) => updateChecklist.mutate({ [key]: !done });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Departure Readiness</p>
          <p className="text-sm font-bold text-primary-600">{checklist.completedCount}/{checklist.totalCount}</p>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${checklist.progress}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {checklist.items.map((item) => {
          const manual = MANUAL_KEYS.has(item.key);
          const Icon = item.done ? CheckSquare : Square;
          return (
            <button
              key={item.key}
              type="button"
              disabled={!manual || updateChecklist.isPending}
              onClick={() => manual && toggle(item.key, item.done)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-colors',
                item.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white',
                manual && !item.done && 'hover:bg-slate-50',
                !manual && 'cursor-default'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', item.done ? 'text-emerald-600' : 'text-slate-300')} />
              <span className={cn('flex-1 text-sm font-medium', item.done ? 'text-emerald-800' : 'text-slate-700')}>
                {item.label}
              </span>
              {!manual && (
                <span title="Auto-tracked" className="flex-shrink-0">
                  <Lock className="w-3 h-3 text-slate-300" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">
        Items with a lock icon are tracked automatically from hotels, vehicles, trip captain and traveler verification — everything else is a manual pre-departure checklist.
      </p>
    </div>
  );
}
