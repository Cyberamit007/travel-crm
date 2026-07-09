import { useState, useRef, useEffect } from 'react';
import { Tag } from '../../types/index';
import { useTags } from '../../hooks/useTags';
import TagChip from './TagChip';
import { cn } from '../../utils/helpers';

interface TagInputProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder = 'Add tags...' }: TagInputProps) {
  const { data: allTags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTags = allTags.filter((t) => value.includes(t.id));
  const filtered = allTags.filter(
    (t) => !value.includes(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'input min-h-[38px] flex flex-wrap gap-1 items-center cursor-text',
          open && 'ring-2 ring-primary-500 border-primary-500'
        )}
        onClick={() => setOpen(true)}
      >
        {selectedTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} onRemove={() => toggle(tag.id)} />
        ))}
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] outline-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400 text-center">
                {search ? 'No tags match your search' : 'No more tags available'}
              </p>
            ) : (
              filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => { toggle(tag.id); setSearch(''); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
