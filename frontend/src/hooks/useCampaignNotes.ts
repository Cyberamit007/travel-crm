import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { CampaignNote, CampaignAttachment } from '../types/index';

export function useCampaignNotes(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-notes', campaignId],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${campaignId}/notes`);
      return data.data as CampaignNote[];
    },
    enabled: !!campaignId,
  });
}

export function useCreateCampaignNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/campaigns/${campaignId}/notes`, { content });
      return data.data as CampaignNote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-notes', campaignId] }),
  });
}

export function useUpdateCampaignNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { data } = await api.put(`/campaigns/${campaignId}/notes/${noteId}`, { content });
      return data.data as CampaignNote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-notes', campaignId] }),
  });
}

export function useDeleteCampaignNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/campaigns/${campaignId}/notes/${noteId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-notes', campaignId] }),
  });
}

// Attachments
export function useCampaignAttachments(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-attachments', campaignId],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${campaignId}/attachments`);
      return data.data as CampaignAttachment[];
    },
    enabled: !!campaignId,
  });
}

export function useUploadCampaignAttachment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/campaigns/${campaignId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as CampaignAttachment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-attachments', campaignId] }),
  });
}

export function useDeleteCampaignAttachment(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      await api.delete(`/campaigns/${campaignId}/attachments/${attachmentId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-attachments', campaignId] }),
  });
}
