import { Check } from 'lucide-react';
import { Journey } from '../../types/index';
import { formatDateTime, cn } from '../../utils/helpers';

// Mirrors STAGE_LABELS in backend/src/controllers/journey.controller.ts — used
// wherever only a stage key (not the full Journey object) is available, e.g.
// the compact per-booking summary on the Trip Workspace.
export const JOURNEY_STAGE_LABELS: Record<string, string> = {
  LEAD_CREATED: 'Lead Created',
  INTERESTED: 'Interested',
  PACKAGE_SHARED: 'Package Shared',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  ADVANCE_PAID: 'Advance Paid',
  TRAVELER_DETAILS_SUBMITTED: 'Traveller Details Submitted',
  TRAVELER_DETAILS_VERIFIED: 'Traveller Details Verified',
  HOTEL_CONFIRMED: 'Hotel Confirmed',
  VEHICLE_ASSIGNED: 'Vehicle Assigned',
  ROOM_ALLOCATED: 'Room Allocated',
  CAPTAIN_ASSIGNED: 'Captain Assigned',
  TRIP_STARTED: 'Trip Started',
  TRIP_COMPLETED: 'Trip Completed',
  REVIEW_COLLECTED: 'Review Collected',
  REFERRAL_RECEIVED: 'Referral Received',
};

interface Props {
  journey: Journey;
  onMarkReviewCollected?: () => void;
  onMarkReferralReceived?: () => void;
  isPending?: boolean;
}

export default function JourneyTracker({ journey, onMarkReviewCollected, onMarkReferralReceived, isPending }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Customer Journey</p>
        <p className="text-xs text-slate-400">{journey.completedCount}/{journey.totalCount} stages</p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex items-start min-w-max">
          {journey.stages.map((stage, i) => {
            const isLast = i === journey.stages.length - 1;
            const isCurrent = stage.key === journey.currentStage;
            const canMarkReview = stage.key === 'REVIEW_COLLECTED' && !stage.done && onMarkReviewCollected;
            const canMarkReferral = stage.key === 'REFERRAL_RECEIVED' && !stage.done && onMarkReferralReceived;

            return (
              <div key={stage.key} className="flex items-start">
                <div className="flex flex-col items-center w-20">
                  <button
                    type="button"
                    disabled={!canMarkReview && !canMarkReferral}
                    onClick={() => (canMarkReview ? onMarkReviewCollected?.() : canMarkReferral ? onMarkReferralReceived?.() : undefined)}
                    title={stage.at ? `${stage.label} — ${formatDateTime(stage.at)}` : stage.label}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                      stage.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                          ? 'border-primary-400 text-primary-500 bg-white'
                          : 'border-slate-200 text-slate-300 bg-white',
                      (canMarkReview || canMarkReferral) && !isPending && 'hover:border-primary-400 hover:text-primary-500 cursor-pointer',
                      isPending && (canMarkReview || canMarkReferral) && 'opacity-50 cursor-wait'
                    )}
                  >
                    {stage.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </button>
                  <p className={cn('text-[10px] text-center mt-1.5 leading-tight px-0.5', stage.done ? 'text-slate-700 font-medium' : 'text-slate-400')}>
                    {stage.label}
                  </p>
                </div>
                {!isLast && <div className={cn('h-0.5 w-6 mt-3.5 flex-shrink-0', stage.done ? 'bg-emerald-400' : 'bg-slate-200')} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
