import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Lead, LeadStatus, LeadSource, LeadPriority } from '../../types/index';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { useSettings } from '../../hooks/useSettings';
import DuplicateWarningDialog from './DuplicateWarningDialog';
import LostReasonModal from './LostReasonModal';
import TagInput from '../ui/TagInput';
import api from '../../services/api';
import { cn } from '../../utils/helpers';

interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  message?: string;
  destination?: string;
  campaignId?: string;
  assignedToId?: string;
  notes?: string;
  groupSize?: number;
  budget?: number;
  preferredDate?: string;
  followUpDate?: string;
  followUpNotes?: string;
  tagIds?: string[];
  lostReason?: string;
  lostReasonOther?: string;
}

interface LeadFormProps {
  defaultValues?: Partial<Lead>;
  onSubmit: (data: LeadFormData) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

function extractDigits(phone: string | undefined | null): string {
  if (!phone) return '';
  return phone.replace(/^\+91\s?/, '').replace(/\D/g, '').slice(0, 10);
}

function toLocalDatetimeInput(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LeadForm({ defaultValues, onSubmit, isLoading, onCancel }: LeadFormProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isEditMode = !!defaultValues?.id;
  const isConfirmedLead = isEditMode && defaultValues?.status === 'CONFIRMED';

  const { data: campaignsData } = useCampaigns({ limit: 100 });
  const { data: usersData } = useUsers({ role: 'EMPLOYEE', limit: 100, isActive: true });
  const { data: settings } = useSettings();

  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<LeadFormData | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [pendingLostData, setPendingLostData] = useState<LeadFormData | null>(null);
  const dupCheckedRef = useRef<{ phone: string; email: string }>({ phone: '', email: '' });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<LeadFormData>({
    defaultValues: {
      name: '',
      phone: extractDigits(defaultValues?.phone),
      source: 'MANUAL',
      status: 'NEW',
      priority: 'MEDIUM',
      ...defaultValues,
      campaignId: defaultValues?.campaignId ?? '',
      assignedToId: defaultValues?.assignedToId ?? '',
      tagIds: (defaultValues as any)?.tags?.map((lt: any) => lt.tagId ?? lt.id) ?? [],
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? '',
        phone: extractDigits(defaultValues.phone),
        email: defaultValues.email ?? '',
        source: defaultValues.source ?? 'MANUAL',
        status: defaultValues.status ?? 'NEW',
        priority: (defaultValues as any).priority ?? 'MEDIUM',
        message: defaultValues.message ?? '',
        destination: defaultValues.destination ?? '',
        campaignId: defaultValues.campaignId ?? '',
        assignedToId: defaultValues.assignedToId ?? '',
        notes: defaultValues.notes ?? '',
        groupSize: defaultValues.groupSize,
        budget: defaultValues.budget,
        preferredDate: defaultValues.preferredDate?.slice(0, 10) ?? '',
        followUpDate: toLocalDatetimeInput(defaultValues.followUpDate),
        followUpNotes: defaultValues.followUpNotes ?? '',
        tagIds: (defaultValues as any)?.tags?.map((lt: any) => lt.tagId ?? lt.id) ?? [],
      });
    }
  }, [defaultValues, reset]);

  const campaigns = campaignsData?.data ?? [];
  const employees = usersData?.data ?? [];

  const messageText = watch('message') ?? '';
  const wordCount = messageText.trim() ? messageText.trim().split(/\s+/).length : 0;

  const nowLocal = toLocalDatetimeInput(new Date().toISOString());
  const todayDate = new Date().toISOString().split('T')[0];

  // ─── Duplicate detection ─────────────────────────────────────────────────────

  const checkDuplicate = async (phone: string, email: string) => {
    if (isEditMode) return;
    const phoneDigits = phone.replace(/\D/g, '');
    const key = `${phoneDigits}|${email}`;
    if (dupCheckedRef.current.phone === phoneDigits && dupCheckedRef.current.email === email) return;
    dupCheckedRef.current = { phone: phoneDigits, email };
    if (!phoneDigits && !email) return;

    try {
      const params: Record<string, string> = {};
      if (phoneDigits.length === 10) params.phone = `+91${phoneDigits}`;
      if (email) params.email = email;
      const { data } = await api.get('/leads/check-duplicate', { params });
      if (data?.data?.length > 0) setDuplicates(data.data);
    } catch {
      // silently ignore
    }
  };

  // ─── Form submit intercept ───────────────────────────────────────────────────

  const handleFormSubmit = (data: LeadFormData) => {
    const payload: LeadFormData = {
      ...data,
      phone: `+91${data.phone.replace(/\D/g, '')}`,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
    };

    // Intercept LOST status — require reason if not already set
    if (payload.status === 'LOST' && !payload.lostReason) {
      setPendingLostData(payload);
      setLostModalOpen(true);
      return;
    }

    // Duplicate check blocks create (not update)
    if (!isEditMode && duplicates.length > 0) {
      setPendingSubmit(payload);
      return;
    }

    onSubmit(payload);
  };

  const handleContinueAnyway = () => {
    setDuplicates([]);
    if (pendingSubmit) {
      onSubmit(pendingSubmit);
      setPendingSubmit(null);
    }
  };

  const handleLostConfirm = (reason: string, otherText?: string) => {
    setLostModalOpen(false);
    if (!pendingLostData) return;
    const payload = { ...pendingLostData, lostReason: reason, lostReasonOther: otherText };
    setPendingLostData(null);

    if (!isEditMode && duplicates.length > 0) {
      setPendingSubmit(payload);
      return;
    }
    onSubmit(payload);
  };

  const inputClass = (hasError: boolean) =>
    cn('input', hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500');

  const sources = settings?.sources ?? ['MANUAL', 'WHATSAPP', 'INSTAGRAM', 'WEBSITE'];

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
              className={inputClass(!!errors.name)}
              placeholder="Customer name"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Phone <span className="text-red-500">*</span></label>
            <div className="flex">
              <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 font-medium select-none">+91</span>
              <input
                {...register('phone', {
                  required: 'Phone is required',
                  pattern: { value: /^[0-9]{10}$/, message: 'Enter exactly 10 digits' },
                  onBlur: (e) => checkDuplicate(e.target.value, watch('email') ?? ''),
                })}
                className={cn(inputClass(!!errors.phone), 'rounded-l-none')}
                placeholder="98765 43210"
                inputMode="numeric"
                maxLength={10}
                onInput={(e) => { const t = e.currentTarget; t.value = t.value.replace(/\D/g, '').slice(0, 10); }}
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            {...register('email', {
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              onBlur: (e) => checkDuplicate(watch('phone') ?? '', e.target.value),
            })}
            type="email"
            className={inputClass(!!errors.email)}
            placeholder="customer@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Source <span className="text-red-500">*</span></label>
            <select {...register('source', { required: true })} className="input">
              {sources.map((s) => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status <span className="text-red-500">*</span></label>
            <select {...register('status', { required: true })} className="input">
              {isConfirmedLead ? (
                // Once confirmed, can only stay confirmed or mark lost
                <>
                  <option value="CONFIRMED">Confirmed ✓</option>
                  <option value="LOST">Lost</option>
                </>
              ) : (
                // CONFIRMED must go through the BookingConfirmModal — not available here
                <>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="FOLLOW_UP_SCHEDULED">Follow-up Scheduled</option>
                  <option value="LOST">Lost</option>
                </>
              )}
            </select>
            {isConfirmedLead && (
              <p className="text-xs text-amber-600 mt-1">Confirmed bookings can only be marked as Lost from here.</p>
            )}
          </div>
          <div>
            <label className="label">Priority</label>
            <select {...register('priority')} className="input">
              <option value="HIGH">🔴 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags</label>
          <Controller
            name="tagIds"
            control={control}
            render={({ field }) => (
              <TagInput value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Destination</label>
            <input {...register('destination')} className="input" placeholder="e.g. Kedarnath, Manaslu" list="destinations-list" />
            <datalist id="destinations-list">
              {(settings?.destinations ?? []).map((d) => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div>
            <label className="label">Campaign</label>
            <select {...register('campaignId')} className="input">
              <option value="">No Campaign</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label className="label">Assign To</label>
            <select {...register('assignedToId')} className="input">
              <option value="">Unassigned</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Group Size</label>
            <input
              {...register('groupSize', { valueAsNumber: true, min: { value: 1, message: 'At least 1 person' }, max: { value: 100, message: 'Max 100' } })}
              type="number"
              className={inputClass(!!errors.groupSize)}
              placeholder="Number of people"
              min={1} max={100}
            />
            {errors.groupSize && <p className="text-red-500 text-xs mt-1">{errors.groupSize.message}</p>}
          </div>
          <div>
            <label className="label">Budget (INR)</label>
            <input {...register('budget', { valueAsNumber: true, min: 0 })} type="number" className="input" placeholder="e.g. 25000" min={0} />
          </div>
        </div>

        <div>
          <label className="label">Preferred Date</label>
          <input {...register('preferredDate')} type="date" className="input" min={todayDate} />
        </div>

        <div>
          <label className="label">Message / Inquiry</label>
          <textarea {...register('message')} rows={4} className="input resize-none" placeholder="Customer's original inquiry message..." />
          <div className="flex justify-end mt-1">
            <span className={cn('text-xs', wordCount > 200 ? 'text-amber-500' : 'text-slate-400')}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div>
          <label className="label">Internal Notes</label>
          <textarea {...register('notes')} rows={2} className="input resize-none" placeholder="Private notes for team..." />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Follow-up</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Follow-up Date & Time</label>
              <input
                {...register('followUpDate', {
                  validate: (val) => !val || new Date(val) > new Date() || 'Follow-up date must be in the future',
                })}
                type="datetime-local"
                className={inputClass(!!errors.followUpDate)}
                min={nowLocal}
              />
              {errors.followUpDate && <p className="text-red-500 text-xs mt-1">{errors.followUpDate.message}</p>}
            </div>
            <div>
              <label className="label">Follow-up Notes</label>
              <input {...register('followUpNotes')} className="input" placeholder="Reminder note..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving...' : isEditMode ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>
      </form>

      {/* Duplicate Warning */}
      {duplicates.length > 0 && (
        <DuplicateWarningDialog
          duplicates={duplicates}
          onViewLead={(id) => { setDuplicates([]); onCancel(); navigate(`/admin/leads?highlight=${id}`); }}
          onContinueAnyway={handleContinueAnyway}
          onCancel={() => { setDuplicates([]); setPendingSubmit(null); }}
        />
      )}

      {/* Lost Reason */}
      <LostReasonModal
        open={lostModalOpen}
        onConfirm={handleLostConfirm}
        onCancel={() => { setLostModalOpen(false); setPendingLostData(null); }}
        reasons={settings?.lostReasons}
      />
    </>
  );
}
