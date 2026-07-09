import { useState } from 'react';
import { StickyNote, Send, Edit2, Trash2 } from 'lucide-react';
import { useCampaignNotes, useCreateCampaignNote, useUpdateCampaignNote, useDeleteCampaignNote } from '../../hooks/useCampaignNotes';
import { useAuthStore } from '../../store/authStore';
import { CampaignNote } from '../../types/index';
import Avatar from '../ui/Avatar';
import { formatRelativeTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface NoteCardProps {
  note: CampaignNote;
  campaignId: string;
}

function NoteCard({ note, campaignId }: NoteCardProps) {
  const { user } = useAuthStore();
  const update = useUpdateCampaignNote(campaignId);
  const del = useDeleteCampaignNote(campaignId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);

  const canEdit = user?.id === note.authorId;
  const canDelete = user?.id === note.authorId || user?.role === 'ADMIN';

  const handleSave = async () => {
    if (!text.trim()) return;
    try {
      await update.mutateAsync({ noteId: note.id, content: text.trim() });
      setEditing(false);
      toast.success('Note updated');
    } catch { toast.error('Failed to update note'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this note?')) return;
    try {
      await del.mutateAsync(note.id);
      toast.success('Note deleted');
    } catch { toast.error('Failed to delete note'); }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={note.author.name} size="xs" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-slate-800">{note.author.name}</span>
              <span className="text-xs text-slate-400 ml-2">{formatRelativeTime(note.createdAt)}</span>
              {note.isEdited && <span className="text-xs text-slate-400 italic ml-1">(edited)</span>}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="input text-sm resize-none w-full"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={update.isPending} className="btn-primary py-1.5 text-xs">Save</button>
            <button onClick={() => { setEditing(false); setText(note.content); }} className="btn-secondary py-1.5 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed ml-9">{note.content}</p>
      )}
    </div>
  );
}

export default function CampaignNotesSection({ campaignId }: { campaignId: string }) {
  const { user } = useAuthStore();
  const { data: notes = [], isLoading } = useCampaignNotes(campaignId);
  const create = useCreateCampaignNote(campaignId);
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      await create.mutateAsync(text.trim());
      setText('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="flex gap-2.5">
        <Avatar name={user?.name ?? 'You'} size="xs" />
        <div className="flex-1 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Add a campaign note..."
            className="input text-sm resize-none w-full"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={create.isPending || !text.trim()}
              className="flex items-center gap-1.5 btn-primary py-1.5 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <StickyNote className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} campaignId={campaignId} />
          ))}
        </div>
      )}
    </div>
  );
}
