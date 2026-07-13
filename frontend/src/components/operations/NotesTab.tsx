import { useState } from 'react';
import { StickyNote, Trash2, Lock } from 'lucide-react';
import { useCreateNote, useDeleteNote } from '../../hooks/useOperations';
import { OperationsNote } from '../../types/index';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '../../utils/helpers';

export default function NotesTab({ departureId, notes }: { departureId: string; notes: OperationsNote[] }) {
  const [content, setContent] = useState('');
  const { user } = useAuthStore();
  const createNote = useCreateNote(departureId);
  const deleteNote = useDeleteNote(departureId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createNote.mutate(content.trim(), { onSuccess: () => setContent('') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg">
        <Lock className="w-3.5 h-3.5" />
        Internal notes — only visible to Admin and Operations, e.g. "customer shifted room", "vehicle changed", "medical issue".
      </div>

      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note..."
          rows={2}
          className="input flex-1"
        />
        <button type="submit" disabled={createNote.isPending || !content.trim()} className="btn-primary">
          {createNote.isPending ? 'Adding…' : 'Add'}
        </button>
      </form>

      {notes.length === 0 ? (
        <div className="empty-state">
          <StickyNote className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No internal notes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{n.content}</p>
                <p className="text-xs text-slate-400 mt-1">{n.author.name} · {formatRelativeTime(n.createdAt)}</p>
              </div>
              {(user?.role === 'ADMIN' || user?.id === n.authorId) && (
                <button onClick={() => deleteNote.mutate(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
