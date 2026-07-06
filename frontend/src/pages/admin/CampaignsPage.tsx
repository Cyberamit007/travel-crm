import { useState } from 'react';
import { Plus, Target, CheckCircle, Megaphone, FileText } from 'lucide-react';
import { useCampaigns, useCampaignStats, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from '../../hooks/useCampaigns';
import { Campaign, CampaignStatus } from '../../types/index';
import CampaignCard from '../../components/campaigns/CampaignCard';
import CampaignForm from '../../components/campaigns/CampaignForm';
import Modal from '../../components/ui/Modal';
import StatsCard from '../../components/ui/StatsCard';
import { cn } from '../../utils/helpers';

const STATUS_TABS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DRAFT', label: 'Draft' },
];

export default function AdminCampaignsPage() {
  const [activeTab, setActiveTab] = useState<CampaignStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);

  const filters = activeTab === 'ALL' ? {} : { status: activeTab };
  const { data, isLoading } = useCampaigns({ ...filters, limit: 50 });
  const { data: statsData } = useCampaignStats();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaignMutation = useDeleteCampaign();

  const campaigns = data?.data ?? [];
  const stats = statsData?.data ?? [];

  const totalLeads = stats.reduce((a, c) => a + c.total, 0);
  const totalConfirmed = stats.reduce((a, c) => a + c.confirmed, 0);
  const activeCampaigns = stats.filter((c) => c.status === 'ACTIVE').length;
  const avgConversion =
    stats.length > 0
      ? (stats.reduce((a, c) => a + parseFloat(c.conversionRate), 0) / stats.length).toFixed(1)
      : '0';

  const handleCreate = (formData: any) => {
    createCampaign.mutate(formData, { onSuccess: () => setCreateOpen(false) });
  };

  const handleEdit = (formData: any) => {
    if (!editCampaign) return;
    updateCampaign.mutate({ id: editCampaign.id, ...formData }, { onSuccess: () => setEditCampaign(null) });
  };

  const handleDelete = () => {
    if (!deleteCampaign) return;
    deleteCampaignMutation.mutate(deleteCampaign.id, { onSuccess: () => setDeleteCampaign(null) });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-sm text-slate-500 mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Campaign</span>
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="Active Campaigns" value={activeCampaigns} icon={Megaphone} iconBg="bg-mountain-100" iconColor="text-mountain-600" />
        <StatsCard label="Total Leads" value={totalLeads} icon={Target} iconBg="bg-primary-100" iconColor="text-primary-600" />
        <StatsCard label="Confirmed" value={totalConfirmed} icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600" />
        <StatsCard label="Avg. Conversion" value={`${avgConversion}%`} icon={FileText} iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 h-56 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No campaigns found</p>
          <p className="text-slate-400 text-sm mt-1">Create your first campaign to get started</p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4 inline mr-2" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={setEditCampaign}
              onDelete={setDeleteCampaign}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Campaign" size="2xl">
        <CampaignForm
          onSubmit={handleCreate}
          isLoading={createCampaign.isPending}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editCampaign} onClose={() => setEditCampaign(null)} title="Edit Campaign" size="2xl">
        {editCampaign && (
          <CampaignForm
            defaultValues={editCampaign}
            onSubmit={handleEdit}
            isLoading={updateCampaign.isPending}
            onCancel={() => setEditCampaign(null)}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteCampaign} onClose={() => setDeleteCampaign(null)} title="Delete Campaign" size="sm">
        <p className="text-slate-600">
          Are you sure you want to delete <strong>{deleteCampaign?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => setDeleteCampaign(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleteCampaignMutation.isPending} className="btn-danger">
            {deleteCampaignMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
