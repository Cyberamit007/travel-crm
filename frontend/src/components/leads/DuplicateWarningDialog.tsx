import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Lead } from '../../types/index';
import { formatDate } from '../../utils/helpers';
import Badge from '../ui/Badge';

interface Props {
  duplicates: Pick<Lead, 'id' | 'name' | 'phone' | 'email' | 'status' | 'createdAt' | 'assignedTo' | 'campaign'>[];
  onViewLead: (id: string) => void;
  onContinueAnyway: () => void;
  onCancel: () => void;
}

export default function DuplicateWarningDialog({ duplicates, onViewLead, onContinueAnyway, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border-b border-amber-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base">Possible Duplicate Lead</h3>
            <p className="text-sm text-amber-700 mt-0.5">
              {duplicates.length === 1 ? 'A lead' : `${duplicates.length} leads`} with the same contact info already exist.
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Duplicates list */}
        <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
          {duplicates.map((lead) => (
            <div key={lead.id} className="rounded-xl border border-slate-200 p-3.5 bg-slate-50">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.phone}</p>
                  {lead.email && <p className="text-xs text-slate-400">{lead.email}</p>}
                </div>
                <Badge status={lead.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {lead.assignedTo && (
                  <span>👤 {lead.assignedTo.name}</span>
                )}
                {lead.campaign && (
                  <span>📣 {lead.campaign.name}</span>
                )}
                <span>📅 Created {formatDate(lead.createdAt)}</span>
              </div>
              <button
                onClick={() => onViewLead(lead.id)}
                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Existing Lead
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={onContinueAnyway}
            className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Create Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
