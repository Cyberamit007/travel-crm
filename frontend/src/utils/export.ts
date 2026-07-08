import * as XLSX from 'xlsx';
import api from '../services/api';

async function downloadSheet(endpoint: string, filename: string) {
  const { data } = await api.get(endpoint);
  const rows: Record<string, unknown>[] = data.data;
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

export const exportLeadsToExcel = (query = '') =>
  downloadSheet(`/leads/export${query}`, `leads_${today()}.xlsx`);

export const exportUsersToExcel = () =>
  downloadSheet('/users/export', `employees_${today()}.xlsx`);

export const exportCampaignsToExcel = () =>
  downloadSheet('/campaigns/export', `campaigns_${today()}.xlsx`);

function today() {
  return new Date().toISOString().slice(0, 10);
}
