import { useState } from 'react';
import { XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { cn } from '../../utils/helpers';

const DEFAULT_REASONS = [
  'Budget Issue',
  'No Response',
  'Booked Elsewhere',
  'Date Not Suitable',
  'Cancelled Trip',
  'Not Interested',
  'Other',
];

interface Props {
  open: boolean;
  onConfirm: (reason: string, otherText?: string) => void;
  onCancel: () => void;
  reasons?: string[];
}

export default function LostReasonModal({ open, onConfirm, onCancel, reasons = DEFAULT_REASONS }: Props) {
  const [selected, setSelected] = useState('');
  const [other, setOther] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!selected) { setError('Please select a reason'); return; }
    if (selected === 'Other' && !other.trim()) { setError('Please describe the reason'); return; }
    onConfirm(selected, selected === 'Other' ? other.trim() : undefined);
    setSelected('');
    setOther('');
    setError('');
  };

  const handleCancel = () => {
    setSelected('');
    setOther('');
    setError('');
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} title="Mark as Lost" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3.5 bg-red-50 rounded-xl border border-red-100">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Please select a reason for marking this lead as lost. This helps track patterns.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></p>
          <div className="grid grid-cols-1 gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setSelected(r); setError(''); }}
                className={cn(
                  'text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
                  selected === r
                    ? 'bg-red-50 border-red-400 text-red-700 ring-1 ring-red-300'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {selected === 'Other' && (
          <div>
            <label className="label">Describe the reason <span className="text-red-500">*</span></label>
            <textarea
              value={other}
              onChange={(e) => { setOther(e.target.value); setError(''); }}
              rows={2}
              className="input resize-none"
              placeholder="Briefly describe why the lead was lost..."
            />
          </div>
        )}

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={handleCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors"
          >
            Mark as Lost
          </button>
        </div>
      </div>
    </Modal>
  );
}
