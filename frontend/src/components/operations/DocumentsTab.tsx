import { useRef, useState } from 'react';
import { Paperclip, Upload, Download, Trash2, FileText, Image, FileSpreadsheet, Archive } from 'lucide-react';
import { useUploadDocument, useDeleteDocument } from '../../hooks/useOperations';
import { OperationsDocument, OpsDocumentType } from '../../types/index';
import { formatDate } from '../../utils/helpers';

const DOC_TYPES: { value: OpsDocumentType; label: string }[] = [
  { value: 'HOTEL_VOUCHER', label: 'Hotel Voucher' },
  { value: 'VEHICLE_VOUCHER', label: 'Vehicle Voucher' },
  { value: 'CUSTOMER_LIST', label: 'Customer List' },
  { value: 'ROOMING_LIST', label: 'Rooming List' },
  { value: 'TRIP_CAPTAIN_SHEET', label: 'Trip Captain Sheet' },
  { value: 'EMERGENCY_CONTACT_LIST', label: 'Emergency Contact List' },
  { value: 'VENDOR_BILL', label: 'Vendor Bill' },
  { value: 'OTHER', label: 'Other' },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return FileSpreadsheet;
  if (mimeType.includes('zip')) return Archive;
  return FileText;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsTab({ departureId, documents }: { departureId: string; documents: OperationsDocument[] }) {
  const [docType, setDocType] = useState<OpsDocumentType>('OTHER');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument(departureId);
  const del = useDeleteDocument(departureId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ file, type: docType });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={docType} onChange={(e) => setDocType(e.target.value as OpsDocumentType)} className="input py-1.5 text-sm w-auto">
          {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
          className="btn-primary text-sm"
        >
          <Upload className="w-4 h-4" />
          {upload.isPending ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">
          <Paperclip className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((d) => {
            const Icon = getFileIcon(d.mimeType);
            const fullUrl = d.fileUrl.startsWith('/') ? `${window.location.origin}${d.fileUrl}` : d.fileUrl;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
                  <p className="text-xs text-slate-400">
                    {DOC_TYPES.find((t) => t.value === d.type)?.label ?? d.type} · {formatBytes(d.fileSize)} · {d.uploadedBy.name} · {formatDate(d.createdAt)}
                  </p>
                </div>
                <a href={fullUrl} download={d.name} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => del.mutate(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
