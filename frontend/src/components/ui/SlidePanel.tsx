import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function SlidePanel({ open, onClose, children, noPadding = false }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'slide-panel-backdrop',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn('slide-panel', open ? 'panel-open' : 'panel-closed')}
      >
        <div className={cn('flex-1 overflow-y-auto scrollbar-thin', !noPadding && 'p-0')}>
          {children}
        </div>
      </div>
    </>
  );
}
