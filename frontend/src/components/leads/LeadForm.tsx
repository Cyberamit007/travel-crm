import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Lead, LeadStatus, LeadSource } from '../../types/index';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useUsers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';

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

export default function LeadForm({ defaultValues, onSubmit, isLoading, onCancel }: LeadFormProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data: campaignsData } = useCampaigns({ limit: 100 });
  const { data: usersData } = useUsers({ role: 'EMPLOYEE', limit: 100, isActive: true });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    defaultValues: {
      name: '',
      phone: '',
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
        phone: defaultValues.phone ?? '',
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
        followUpDate: defaultValues.followUpDate?.slice(0, 16) ?? '',
        followUpNotes: defaultValues.followUpNotes ?? '',
      });
    }
  }, [defaultValues, reset]);

  const campaigns = campaignsData?.data ?? [];
  const employees = usersData?.data ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name *</label>
          <input
            {...register('name', { required: 'Name is required' })}
            className="input"
            placeholder="Customer name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Phone *</label>
          <input
            {...register('phone', { required: 'Phone is required' })}
            className="input"
            placeholder="+91 98765 43210"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="label">Email</label>
        <input
          {...register('email')}
          type="email"
          className="input"
          placeholder="customer@example.com"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Source *</label>
          <select {...register('source', { required: true })} className="input">
            <option value="MANUAL">Manual</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="WEBSITE">Website</option>
          </select>
        </div>
        <div>
          <label className="label">Status *</label>
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
            {...register('groupSize', { valueAsNumber: true, min: 1 })}
            type="number"
            className="input"
            placeholder="Number of people"
            min={1}
          />
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
          rows={3}
          className="input resize-none"
          placeholder="Customer's original inquiry message..."
        />
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
              {...register('followUpDate')}
              type="datetime-local"
              className="input"
            />
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
