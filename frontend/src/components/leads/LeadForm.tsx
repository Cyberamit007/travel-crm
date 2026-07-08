import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Lead, LeadStatus, LeadSource } from '../../types/index';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/helpers';

interface LeadFormData {
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
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

// Convert ISO datetime to local datetime-input value (YYYY-MM-DDTHH:mm)
function toLocalDatetimeInput(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LeadForm({ defaultValues, onSubmit, isLoading, onCancel }: LeadFormProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: campaignsData } = useCampaigns({ limit: 100 });
  const { data: usersData } = useUsers({ role: 'EMPLOYEE', limit: 100, isActive: true });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    defaultValues: {
      name: '',
      phone: extractDigits(defaultValues?.phone),
      source: 'MANUAL',
      status: 'NEW',
      ...defaultValues,
      campaignId: defaultValues?.campaignId ?? '',
      assignedToId: defaultValues?.assignedToId ?? '',
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
        message: defaultValues.message ?? '',
        destination: defaultValues.destination ?? '',
        campaignId: defaultValues.campaignId ?? '',
        assignedToId: defaultValues.assignedToId ?? '',
        notes: defaultValues.notes ?? '',
        groupSize: defaultValues.groupSize,
        budget: defaultValues.budget,
        preferredDate: defaultValues.preferredDate?.slice(0, 10) ?? '',
        // Convert stored ISO (UTC) back to local time for display in the input
        followUpDate: toLocalDatetimeInput(defaultValues.followUpDate),
        followUpNotes: defaultValues.followUpNotes ?? '',
      });
    }
  }, [defaultValues, reset]);

  const campaigns = campaignsData?.data ?? [];
  const employees = usersData?.data ?? [];

  const messageText = watch('message') ?? '';
  const wordCount = messageText.trim() ? messageText.trim().split(/\s+/).length : 0;

  const nowLocal = toLocalDatetimeInput(new Date().toISOString());
  const minDatetime = defaultValues?.createdAt
    ? toLocalDatetimeInput(defaultValues.createdAt)
    : nowLocal;

  // Wrapper: convert followUpDate from local datetime-input to ISO before submitting
  const handleFormSubmit = (data: LeadFormData) => {
    onSubmit({
      ...data,
      phone: `+91${data.phone.replace(/\D/g, '')}`,
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
    });
  };

  const inputClass = (hasError: boolean) =>
    cn('input', hasError && 'border-red-500 focus:ring-red-500 focus:border-red-500');

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
            className={inputClass(!!errors.name)}
            placeholder="Customer name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">
            Phone <span className="text-red-500">*</span>
          </label>
          <div className="flex">
            <span className="flex items-center px-3 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-sm text-slate-600 font-medium select-none">
              +91
            </span>
            <input
              {...register('phone', {
                required: 'Phone is required',
                pattern: { value: /^[0-9]{10}$/, message: 'Enter exactly 10 digits' },
              })}
              className={cn(inputClass(!!errors.phone), 'rounded-l-none')}
              placeholder="98765 43210"
              inputMode="numeric"
              maxLength={10}
              onInput={(e) => {
                const t = e.currentTarget;
                t.value = t.value.replace(/\D/g, '').slice(0, 10);
              }}
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
          })}
          type="email"
          className={inputClass(!!errors.email)}
          placeholder="customer@example.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Source <span className="text-red-500">*</span>
          </label>
          <select {...register('source', { required: true })} className="input">
            <option value="MANUAL">Manual</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WEBSITE">Website</option>
          </select>
        </div>
        <div>
          <label className="label">
            Status <span className="text-red-500">*</span>
          </label>
          <select {...register('status', { required: true })} className="input">
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERESTED">Interested</option>
            <option value="FOLLOW_UP_SCHEDULED">Follow-up Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Destination</label>
          <input
            {...register('destination')}
            className="input"
            placeholder="e.g. Kedarnath, Manaslu"
          />
        </div>
        <div>
          <label className="label">Campaign</label>
          <select {...register('campaignId')} className="input">
            <option value="">No Campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isAdmin && (
        <div>
          <label className="label">Assign To</label>
          <select {...register('assignedToId')} className="input">
            <option value="">Unassigned</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Group Size</label>
          <input
            {...register('groupSize', {
              valueAsNumber: true,
              min: { value: 1, message: 'At least 1 person' },
              max: { value: 100, message: 'Max 100 people' },
            })}
            type="number"
            className={inputClass(!!errors.groupSize)}
            placeholder="Number of people"
            min={1}
            max={100}
          />
          {errors.groupSize && <p className="text-red-500 text-xs mt-1">{errors.groupSize.message}</p>}
        </div>
        <div>
          <label className="label">Budget (INR)</label>
          <input
            {...register('budget', { valueAsNumber: true, min: 0 })}
            type="number"
            className="input"
            placeholder="e.g. 25000"
            min={0}
          />
        </div>
      </div>

      <div>
        <label className="label">Preferred Date</label>
        <input {...register('preferredDate')} type="date" className="input" />
      </div>

      <div>
        <label className="label">Message / Inquiry</label>
        <textarea
          {...register('message')}
          rows={4}
          className="input resize-none"
          placeholder="Customer's original inquiry message..."
        />
        <div className="flex justify-end mt-1">
          <span className={cn('text-xs', wordCount > 200 ? 'text-amber-500' : 'text-slate-400')}>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div>
        <label className="label">Internal Notes</label>
        <textarea
          {...register('notes')}
          rows={2}
          className="input resize-none"
          placeholder="Private notes for team..."
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700 mb-3">Follow-up</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Follow-up Date & Time</label>
            <input
              {...register('followUpDate', {
                validate: (val) => {
                  if (!val) return true;
                  const selected = new Date(val);
                  const minDate = defaultValues?.createdAt ? new Date(defaultValues.createdAt) : new Date();
                  return selected >= minDate || 'Follow-up date cannot be before the lead was created';
                },
              })}
              type="datetime-local"
              className={inputClass(!!errors.followUpDate)}
              min={minDatetime}
            />
            {errors.followUpDate && (
              <p className="text-red-500 text-xs mt-1">{errors.followUpDate.message}</p>
            )}
          </div>
          <div>
            <label className="label">Follow-up Notes</label>
            <input
              {...register('followUpNotes')}
              className="input"
              placeholder="Reminder note..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Saving...' : defaultValues?.id ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
}
