import { useEffect } from 'react';

type Shortcut = {
  key: string;
  ctrl?: boolean;
  handler: () => void;
  description: string;
};

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      // Skip if user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        if (keyMatch && ctrlMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [shortcuts]);
}
