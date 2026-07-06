import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Send, Lock, Globe, Smartphone, Instagram } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface WebhookSimForm {
  source: 'WHATSAPP' | 'INSTAGRAM';
  name: string;
  phone: string;
  email?: string;
  message?: string;
  campaignId?: string;
}

function ChangePasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>();

  const newPw = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      reset();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-mountain-100 rounded-xl flex items-center justify-center">
          <Lock className="w-5 h-5 text-mountain-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Change Password</h3>
          <p className="text-xs text-slate-500">Update your account password</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <input
              {...register('currentPassword', { required: 'Required' })}
              type={showCurrent ? 'text' : 'password'}
              className="input pr-10"
              placeholder="••••••••"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input
              {...register('newPassword', { required: 'Required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
              type={showNew ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Minimum 6 characters"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            {...register('confirmPassword', {
              required: 'Required',
              validate: (v) => v === newPw || 'Passwords do not match',
            })}
            type="password"
            className="input"
            placeholder="Repeat new password"
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

function WebhookSimulator() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<WebhookSimForm>({ defaultValues: { source: 'WHATSAPP' } });

  const source = watch('source');

  const onSubmit = async (data: WebhookSimForm) => {
    try {
      const endpoint = data.source === 'WHATSAPP' ? '/webhooks/whatsapp' : '/webhooks/instagram';
      const payload =
        data.source === 'WHATSAPP'
          ? {
              entry: [{
                changes: [{
                  value: {
                    messages: [{
                      from: data.phone,
                      text: { body: data.message || 'Test inquiry' },
                      id: `test_${Date.now()}`,
                    }],
                    contacts: [{ profile: { name: data.name } }],
                    metadata: { phone_number_id: 'test' },
                  },
                }],
              }],
            }
          : {
              leadgen_id: `ig_test_${Date.now()}`,
              form_id: 'test_form',
              field_data: [
                { name: 'full_name', values: [data.name] },
                { name: 'phone_number', values: [data.phone] },
                { name: 'email', values: [data.email || ''] },
                { name: 'message', values: [data.message || 'Test Instagram inquiry'] },
              ],
              campaign_id: data.campaignId || undefined,
            };

      await api.post(endpoint, payload);
      toast.success(`${data.source === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'} webhook simulated successfully! Check Leads.`);
      reset({ source: data.source });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Webhook simulation failed');
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
          <Send className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Webhook Simulator</h3>
          <p className="text-xs text-slate-500">Simulate incoming leads from WhatsApp or Instagram</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div>
          <label className="label">Source</label>
          <div className="flex gap-3">
            {(['WHATSAPP', 'INSTAGRAM'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('source')}
                  type="radio"
                  value={s}
                  className="text-primary-600"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  {s === 'WHATSAPP' ? <Smartphone className="w-4 h-4 text-green-600" /> : <Instagram className="w-4 h-4 text-pink-600" />}
                  {s === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Name *</label>
          <input {...register('name', { required: true })} className="input" placeholder="Test Customer" />
        </div>

        <div>
          <label className="label">Phone *</label>
          <input {...register('phone', { required: true })} className="input" placeholder="+919876543210" />
        </div>

        <div>
          <label className="label">Email</label>
          <input {...register('email')} type="email" className="input" placeholder="test@example.com" />
        </div>

        <div>
          <label className="label">Message</label>
          <textarea {...register('message')} rows={2} className="input resize-none" placeholder="Hi, I'm interested in Kedarnath trek..." />
        </div>

        {source === 'INSTAGRAM' && (
          <div>
            <label className="label">Campaign ID (optional)</label>
            <input {...register('campaignId')} className="input" placeholder="campaign-id" />
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Sending...' : 'Simulate Webhook'}
        </button>
      </form>
    </div>
  );
}

function ApiConfigSection() {
  const configs = [
    { label: 'WhatsApp Webhook URL', value: `${window.location.origin}/api/webhooks/whatsapp`, icon: Smartphone },
    { label: 'Instagram Webhook URL', value: `${window.location.origin}/api/webhooks/instagram`, icon: Instagram },
    { label: 'API Base URL', value: `${window.location.origin}/api`, icon: Globe },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
          <Globe className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">API Configuration</h3>
          <p className="text-xs text-slate-500">Webhook URLs for WhatsApp and Instagram integrations</p>
        </div>
      </div>

      <div className="space-y-3">
        {configs.map((cfg) => (
          <div key={cfg.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <cfg.icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500">{cfg.label}</p>
              <p className="text-sm text-slate-800 font-mono truncate">{cfg.value}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cfg.value);
                toast.success('Copied to clipboard');
              }}
              className="text-xs btn-secondary py-1 px-2 flex-shrink-0"
            >
              Copy
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-700 font-medium">Instructions</p>
        <p className="text-xs text-blue-600 mt-1">
          Configure these webhook URLs in your WhatsApp Business API settings and Meta for Developers Instagram Ad account to start receiving leads automatically.
        </p>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and integration settings</p>
      </div>

      {/* Profile info */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input value={user?.name ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Role</label>
            <input value={user?.role ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">Status</label>
            <input value={user?.isActive ? 'Active' : 'Inactive'} readOnly className="input bg-slate-50 cursor-not-allowed" />
          </div>
        </div>
      </div>

      <ChangePasswordSection />
      <WebhookSimulator />
      <ApiConfigSection />
    </div>
  );
}
