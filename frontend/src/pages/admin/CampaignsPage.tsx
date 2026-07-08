import { useState } from 'react';
import { Plus, Target, CheckCircle, Megaphone, FileText, Users, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { useCampaigns, useCampaign, useCampaignStats, useCreateCampaign, useUpdateCampaign, useDeleteCampaign } from '../../hooks/useCampaigns';
import { Campaign, CampaignStatus, Lead } from '../../types/index';
import CampaignCard from '../../components/campaigns/CampaignCard';
import CampaignForm from '../../components/campaigns/CampaignForm';
import Modal from '../../components/ui/Modal';
import StatsCard from '../../components/ui/StatsCard';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { cn, formatDate, formatCurrency, formatDateTime } from '../../utils/helpers';

const STATUS_TABS: { value: CampaignStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DRAFT', label: 'Draft' },
];

// ─── Campaign Detail Modal ────────────────────────────────────────────────────

function CampaignDetailModal({
  campaignId,
  onClose,
  onEdit,
}: {
  campaignId: string | null;
  onClose: () => void;
  onEdit: (c: Campaign) => void;
}) {
  const { data, isLoading } = useCampaign(campaignId);
  const campaign = data?.data as any; // includes .leads and .employees from getCampaignById

  if (!campaignId) return null;

  return (
    <Modal open={!!campaignId} onClose={onClose} title="Campaign Detail" size="2xl">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : campaign ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge campaignStatus={campaign.status} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{campaign.name}</h2>
              <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{campaign.destination}</span>
              </div>
              {campaign.description && (
                <p className="text-sm text-slate-500 mt-2">{campaign.description}</p>
              )}
            </div>
            <button
              onClick={() => { onClose(); onEdit(campaign); }}
              className="btn-secondary text-sm flex-shrink-0"
            >
              Edit Campaign
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
              <p className="text-2xl font-bold text-slate-800">{campaign._count?.leads ?? 0}</p>
              <p className="text-xs text-slate-500 mt-0.5">Total Leads</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-2xl font-bold text-green-700">
                {(campaign.leads as Lead[] ?? []).filter((l: Lead) => l.status === 'CONFIRMED').length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Confirmed</p>
            </div>
            {campaign.targetLeads && (
              <div className="bg-primary-50 rounded-xl p-3 text-center border border-primary-100">
                <p className="text-2xl font-bold text-primary-700">{campaign.targetLeads}</p>
                <p className="text-xs text-slate-500 mt-0.5">Target</p>
              </div>
            )}
            {campaign.budget && (
              <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                <p className="text-lg font-bold text-orange-700">{formatCurrency(campaign.budget)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Budget</p>
              </div>
            )}
          </div>

          {/* Dates */}
          {(campaign.startDate || campaign.endDate) && (
            <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {campaign.startDate && <span>Start: <strong>{formatDate(campaign.startDate)}</strong></span>}
              {campaign.endDate && <span>End: <strong>{formatDate(campaign.endDate)}</strong></span>}
            </div>
          )}

          {/* Assigned employees */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Employees ({campaign.employees?.length ?? 0})
            </h3>
            {campaign.employees?.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No employees assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {campaign.employees?.map((ce: any) => (
                  <div key={ce.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Avatar name={ce.user.name} size="xs" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{ce.user.name}</p>
                      <p className="text-xs text-slate-400">{ce.user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Leads ({campaign._count?.leads ?? 0}){campaign.leads?.length < (campaign._count?.leads ?? 0) && ` — showing last ${campaign.leads.length}`}
            </h3>
            {campaign.leads?.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No leads tagged to this campaign yet</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Phone</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Assigned To</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.leads?.map((lead: any) => (
                      <tr key={lead.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800">{lead.name}</p>
                          {lead.email && <p className="text-xs text-slate-400">{lead.email}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{lead.phone}</td>
                        <td className="px-3 py-2.5">
                          <Badge status={lead.status} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {lead.assignedTo?.name ?? <span className="text-slate-400 italic">Unassigned</span>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-xs">
                          {lead.followUpDate ? formatDateTime(lead.followUpDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">Campaign not found</p>
      )}
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCampaignsPage() {
  const [activeTab, setActiveTab] = useState<CampaignStatus | 'ALL'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleteCampaign, setDeleteCampaign] = useState<Campaign | null>(null);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);

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
              onView={(c) => setDetailCampaignId(c.id)}
              onEdit={setEditCampaign}
              onDelete={setDeleteCampaign}
            />
          ))}
        </div>
      )}

      {/* Campaign detail */}
      <CampaignDetailModal
        campaignId={detailCampaignId}
        onClose={() => setDetailCampaignId(null)}
        onEdit={(c) => { setDetailCampaignId(null); setEditCampaign(c); }}
      />

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
            key={editCampaign.id}
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
