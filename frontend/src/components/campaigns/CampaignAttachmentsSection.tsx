import { useRef } from 'react';
import { Paperclip, Upload, Download, Trash2, FileText, Image, FileSpreadsheet, Archive, Eye } from 'lucide-react';
import { useCampaignAttachments, useUploadCampaignAttachment, useDeleteCampaignAttachment } from '../../hooks/useCampaignNotes';
import { CampaignAttachment } from '../../types/index';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

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

function canPreview(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf';
}

function AttachmentRow({ attachment, campaignId }: { attachment: CampaignAttachment; campaignId: string }) {
  const del = useDeleteCampaignAttachment(campaignId);
  const Icon = getFileIcon(attachment.mimeType);

  const handleDelete = async () => {
    if (!confirm(`Delete "${attachment.name}"?`)) return;
    try {
      await del.mutateAsync(attachment.id);
      toast.success('Attachment deleted');
    } catch { toast.error('Failed to delete attachment'); }
  };

  const fullUrl = attachment.fileUrl.startsWith('/')
    ? `${window.location.origin}${attachment.fileUrl}`
    : attachment.fileUrl;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white group hover:border-primary-200 transition-all">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{attachment.name}</p>
        <p className="text-xs text-slate-400">
          {formatBytes(attachment.fileSize)} · {attachment.uploadedBy.name} · {formatDate(attachment.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canPreview(attachment.mimeType) && (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </a>
        )}
        <a
          href={fullUrl}
          download={attachment.name}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CampaignAttachmentsSection({ campaignId }: { campaignId: string }) {
  const { data: attachments = [], isLoading } = useCampaignAttachments(campaignId);
  const upload = useUploadCampaignAttachment(campaignId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload.mutateAsync(file);
      toast.success(`"${file.name}" uploaded`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
        >
          <Upload className="w-4 h-4" />
          {upload.isPending ? 'Uploading...' : 'Upload File'}
        </button>
        <p className="text-xs text-slate-400 text-center mt-1">PDF, Excel, Images, ZIP · Max 20 MB</p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl" />)}
        </div>
      ) : attachments.length === 0 ? (
        <div className="text-center py-8">
          <Paperclip className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} attachment={a} campaignId={campaignId} />
          ))}
        </div>
      )}
    </div>
  );
}
