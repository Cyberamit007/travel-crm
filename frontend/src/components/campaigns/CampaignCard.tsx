import { Calendar, Target, Users, Edit, Trash2, MapPin, Link2 } from 'lucide-react';
import { Campaign } from '../../types/index';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { formatDate, formatCurrency, cn } from '../../utils/helpers';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onView?: (campaign: Campaign) => void;
}

export default function CampaignCard({ campaign, onEdit, onDelete, onView }: CampaignCardProps) {
  const leadCount = campaign._count?.leads ?? 0;
  const target = campaign.targetLeads ?? 0;
  const progress = target > 0 ? Math.min((leadCount / target) * 100, 100) : 0;

  const progressColor =
    progress >= 80
      ? 'bg-green-500'
      : progress >= 50
      ? 'bg-primary-500'
      : 'bg-mountain-500';

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge campaignStatus={campaign.status} />
            {campaign.isFromMeta && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 tracking-wide">
                <Link2 className="w-2.5 h-2.5" />
                META
              </span>
            )}
          </div>
          <button
            onClick={() => onView?.(campaign)}
            className="text-left font-bold text-slate-900 text-base truncate hover:text-primary-600 transition-colors w-full"
          >
            {campaign.name}
          </button>
          <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
            <MapPin className="w-3 h-3" />
            <span>{campaign.destination}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(campaign)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(campaign)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {campaign.description && (
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{campaign.description}</p>
      )}

      {/* Lead Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            <span>Leads</span>
          </div>
          <span className="font-semibold">
            {leadCount}
            {target > 0 && ` / ${target}`}
          </span>
        </div>
        {target > 0 && (
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={cn('h-2 rounded-full transition-all', progressColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
        {campaign.startDate && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(campaign.startDate)}</span>
          </div>
        )}
        {campaign.endDate && (
          <>
            <span>→</span>
            <span>{formatDate(campaign.endDate)}</span>
          </>
        )}
      </div>

      {campaign.budget && (
        <div className="text-xs text-slate-500 mb-4">
          Budget: <span className="font-semibold text-slate-700">{formatCurrency(campaign.budget)}</span>
        </div>
      )}

      {/* Assigned employees */}
      {campaign.employees.length > 0 && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex -space-x-2">
            {campaign.employees.slice(0, 4).map((ce) => (
              <Avatar
                key={ce.id}
                name={ce.user.name}
                size="xs"
                className="ring-2 ring-white"
              />
            ))}
            {campaign.employees.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center ring-2 ring-white font-medium">
                +{campaign.employees.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-500">{campaign.employees.length} employee{campaign.employees.length !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
