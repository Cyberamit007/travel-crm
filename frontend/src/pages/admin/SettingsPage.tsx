import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Send, Lock, Globe, Smartphone, Instagram,
  Tag, MapPin, AlertCircle, Plus, Trash2, Edit2, Building2,
  Check, Palette,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../../hooks/useTags';
import { cn } from '../../utils/helpers';

const TABS = [
  { key: 'account', label: 'Account', icon: Lock },
  { key: 'org', label: 'Organization', icon: Building2 },
  { key: 'tags', label: 'Lead Tags', icon: Tag },
  { key: 'webhooks', label: 'Webhooks', icon: Globe },
];

// ─── Change Password ──────────────────────────────────────────────────────────

function ChangePasswordSection() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<{
    currentPassword: string; newPassword: string; confirmPassword: string;
  }>();
  const newPw = watch('newPassword');

  const onSubmit = async (data: any) => {
    try {
      await api.put('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed. Please log in again.');
      reset();
      await logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to change password');
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
            <input {...register('currentPassword', { required: 'Required' })} type={showCurrent ? 'text' : 'password'} className="input pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <input {...register('newPassword', { required: 'Required', minLength: { value: 8, message: 'Minimum 8 characters' } })} type={showNew ? 'text' : 'password'} className="input pr-10" placeholder="Minimum 8 characters" />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="label">Confirm New Password</label>
          <input {...register('confirmPassword', { required: 'Required', validate: (v) => v === newPw || 'Passwords do not match' })} type="password" className="input" placeholder="Repeat new password" />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Updating...' : 'Update Password'}</button>
      </form>
    </div>
  );
}

// ─── Organization Settings ────────────────────────────────────────────────────

function ListEditor({
  title, icon: Icon, items, onSave, description,
}: {
  title: string; icon: any; items: string[]; onSave: (items: string[]) => void; description?: string;
}) {
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [dirty, setDirty] = useState(false);

  // Sync with prop when parent updates
  if (JSON.stringify(list) !== JSON.stringify(items) && !dirty) setList(items);

  const add = () => {
    const t = newItem.trim();
    if (!t || list.includes(t)) return;
    const next = [...list, t];
    setList(next);
    setNewItem('');
    setDirty(true);
  };

  const remove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    setList(next);
    setDirty(true);
  };

  const startEdit = (idx: number) => { setEditingIdx(idx); setEditText(list[idx]); };
  const saveEdit = () => {
    if (editingIdx === null || !editText.trim()) { setEditingIdx(null); return; }
    const next = list.map((item, i) => (i === editingIdx ? editText.trim() : item));
    setList(next);
    setEditingIdx(null);
    setDirty(true);
  };

  const handleSave = () => { onSave(list); setDirty(false); };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-1">
        <Icon className="w-4 h-4 text-slate-500" />
        <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
      </div>
      {description && <p className="text-xs text-slate-400 mb-4 ml-7">{description}</p>}

      <div className="space-y-1.5 mb-3">
        {list.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            {editingIdx === idx ? (
              <>
                <input value={editText} onChange={(e) => setEditText(e.target.value)} className="input py-1.5 text-sm flex-1" autoFocus onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                <button onClick={saveEdit} className="p-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100"><Check className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-700 py-1.5 px-2 rounded-lg group-hover:bg-slate-50">{item}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(idx)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} className="input py-1.5 text-sm flex-1" placeholder={`Add ${title.toLowerCase()}...`} />
        <button onClick={add} className="btn-secondary py-1.5 px-3"><Plus className="w-4 h-4" /></button>
      </div>

      {dirty && (
        <div className="flex justify-end mt-3">
          <button onClick={handleSave} className="btn-primary py-1.5 text-sm">Save Changes</button>
        </div>
      )}
    </div>
  );
}

function CompanyInfoCard({ settings, onSave, isSaving }: { settings: any; onSave: (data: any) => void; isSaving: boolean }) {
  const [company, setCompany] = useState({
    companyName: settings.companyName ?? '',
    companyPhone: settings.companyPhone ?? '',
    companyEmail: settings.companyEmail ?? '',
    companyAddress: settings.companyAddress ?? '',
    companyWebsite: settings.companyWebsite ?? '',
  });

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-4 h-4 text-slate-500" />
        <h4 className="font-semibold text-slate-800 text-sm">Company Information</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {[
          { key: 'companyName', label: 'Company Name', placeholder: 'Your Travel Company' },
          { key: 'companyPhone', label: 'Phone', placeholder: '+91 98765 43210' },
          { key: 'companyEmail', label: 'Email', placeholder: 'info@company.com' },
          { key: 'companyWebsite', label: 'Website', placeholder: 'https://company.com' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              value={(company as any)[key]}
              onChange={(e) => setCompany((prev) => ({ ...prev, [key]: e.target.value }))}
              className="input"
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
      <div className="mb-4">
        <label className="label">Address</label>
        <textarea
          value={company.companyAddress}
          onChange={(e) => setCompany((prev) => ({ ...prev, companyAddress: e.target.value }))}
          rows={2}
          className="input resize-none"
          placeholder="Company address..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave(company)}
          disabled={isSaving}
          className="btn-primary text-sm py-1.5"
        >
          {isSaving ? 'Saving...' : 'Save Company Info'}
        </button>
      </div>
    </div>
  );
}

function OrgSettingsSection() {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();

  if (isLoading) return <div className="card p-6 animate-pulse h-32" />;
  if (!settings) return null;

  const save = (key: string) => (value: any) => {
    update.mutateAsync({ [key]: value })
      .then(() => toast.success('Saved'))
      .catch(() => toast.error('Failed to save'));
  };

  return (
    <div className="space-y-5">
      <CompanyInfoCard
        settings={settings}
        onSave={(data) => update.mutateAsync(data).then(() => toast.success('Company info saved')).catch(() => toast.error('Save failed'))}
        isSaving={update.isPending}
      />
      <ListEditor
        title="Lead Sources"
        icon={Smartphone}
        items={settings.sources}
        onSave={save('sources')}
        description="Available sources for incoming leads"
      />
      <ListEditor
        title="Destinations"
        icon={MapPin}
        items={settings.destinations}
        onSave={save('destinations')}
        description="Common travel destinations"
      />
      <ListEditor
        title="Lost Reasons"
        icon={AlertCircle}
        items={settings.lostReasons}
        onSave={save('lostReasons')}
        description="Reasons shown when marking a lead as lost"
      />
    </div>
  );
}

// ─── Tag Management ───────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b',
];

function TagsSection() {
  const { data: tags = [], isLoading } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTag.mutateAsync({ name: newName.trim(), color: newColor });
      setNewName('');
      toast.success('Tag created');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create tag');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateTag.mutateAsync({ id, name: editName.trim(), color: editColor });
      setEditingId(null);
      toast.success('Tag updated');
    } catch { toast.error('Failed to update tag'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"? It will be removed from all leads.`)) return;
    try {
      await deleteTag.mutateAsync(id);
      toast.success('Tag deleted');
    } catch { toast.error('Failed to delete tag'); }
  };

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Tag className="w-4 h-4 text-slate-500" />
        <h4 className="font-semibold text-slate-800 text-sm">Lead Tags</h4>
      </div>

      {/* Create new tag */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-xs font-medium text-slate-600 mb-3">Create New Tag</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Tag Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="e.g. VIP, Family, Corporate..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn('w-6 h-6 rounded-full transition-all', newColor === c && 'ring-2 ring-offset-1 ring-slate-400 scale-110')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={createTag.isPending || !newName.trim()} className="btn-primary py-2 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Existing tags */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}
        </div>
      ) : tags.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No tags created yet</p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 group p-2 rounded-xl hover:bg-slate-50">
              {editingId === tag.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input py-1.5 text-sm flex-1"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={cn('w-5 h-5 rounded-full', editColor === c && 'ring-2 ring-offset-1 ring-slate-400')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleUpdate(tag.id)} className="btn-primary py-1.5 text-xs px-3">Save</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary py-1.5 text-xs px-3">Cancel</button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-sm font-medium text-slate-700">{tag.name}</span>
                  <span className="text-xs text-slate-400">{tag._count?.leads ?? 0} leads</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(tag.id, tag.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

function WebhookSimulator() {
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<any>({ defaultValues: { source: 'WHATSAPP' } });
  const source = watch('source');

  const onSubmit = async (data: any) => {
    try {
      const endpoint = data.source === 'WHATSAPP' ? '/webhooks/whatsapp' : '/webhooks/instagram';
      const payload = data.source === 'WHATSAPP'
        ? { entry: [{ changes: [{ value: { messages: [{ from: data.phone, text: { body: data.message || 'Test inquiry' }, id: `test_${Date.now()}` }], contacts: [{ profile: { name: data.name } }], metadata: { phone_number_id: 'test' } } }] }] }
        : { leadgen_id: `ig_test_${Date.now()}`, form_id: 'test_form', field_data: [{ name: 'full_name', values: [data.name] }, { name: 'phone_number', values: [data.phone] }, { name: 'email', values: [data.email || ''] }, { name: 'message', values: [data.message || 'Test Instagram inquiry'] }], campaign_id: data.campaignId || undefined };
      await api.post(endpoint, payload);
      toast.success(`${data.source === 'WHATSAPP' ? 'WhatsApp' : 'Instagram'} webhook simulated! Check Leads.`);
      reset({ source: data.source });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Webhook simulation failed');
    }
  };

  const apiConfigs = [
    { label: 'WhatsApp Webhook URL', value: `${window.location.origin}/api/webhooks/whatsapp`, icon: Smartphone },
    { label: 'Instagram Webhook URL', value: `${window.location.origin}/api/webhooks/instagram`, icon: Instagram },
    { label: 'API Base URL', value: `${window.location.origin}/api`, icon: Globe },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Send className="w-4 h-4 text-slate-500" />
          <h4 className="font-semibold text-slate-800 text-sm">Webhook Simulator</h4>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="flex gap-3">
            {(['WHATSAPP', 'INSTAGRAM'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input {...register('source')} type="radio" value={s} className="text-primary-600" />
                <span className="text-sm font-medium text-slate-700">{s === 'WHATSAPP' ? '💬 WhatsApp' : '📷 Instagram'}</span>
              </label>
            ))}
          </div>
          <div><label className="label">Name *</label><input {...register('name', { required: true })} className="input" placeholder="Test Customer" /></div>
          <div><label className="label">Phone *</label><input {...register('phone', { required: true })} className="input" placeholder="+919876543210" /></div>
          <div><label className="label">Email</label><input {...register('email')} type="email" className="input" placeholder="test@example.com" /></div>
          <div><label className="label">Message</label><textarea {...register('message')} rows={2} className="input resize-none" placeholder="Hi, I'm interested..." /></div>
          {source === 'INSTAGRAM' && <div><label className="label">Campaign ID</label><input {...register('campaignId')} className="input" placeholder="campaign-id" /></div>}
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2"><Send className="w-4 h-4" />{isSubmitting ? 'Sending...' : 'Simulate Webhook'}</button>
        </form>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-4 h-4 text-slate-500" />
          <h4 className="font-semibold text-slate-800 text-sm">API Configuration</h4>
        </div>
        <div className="space-y-2">
          {apiConfigs.map((cfg) => (
            <div key={cfg.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <cfg.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">{cfg.label}</p>
                <p className="text-sm font-mono text-slate-700 truncate">{cfg.value}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(cfg.value); toast.success('Copied'); }} className="text-xs btn-secondary py-1 px-2 flex-shrink-0">Copy</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage account, organization, and integration settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Name</label><input value={user?.name ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" /></div>
              <div><label className="label">Email</label><input value={user?.email ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" /></div>
              <div><label className="label">Role</label><input value={user?.role ?? ''} readOnly className="input bg-slate-50 cursor-not-allowed" /></div>
              <div><label className="label">Status</label><input value={user?.isActive ? 'Active' : 'Inactive'} readOnly className="input bg-slate-50 cursor-not-allowed" /></div>
            </div>
          </div>
          <ChangePasswordSection />
        </div>
      )}

      {activeTab === 'org' && <OrgSettingsSection />}
      {activeTab === 'tags' && <TagsSection />}
      {activeTab === 'webhooks' && <WebhookSimulator />}
    </div>
  );
}
