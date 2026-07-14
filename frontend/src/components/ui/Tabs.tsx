import { useSearchParams } from 'react-router-dom';

export interface TabDef<T extends string> {
  key: T;
  label: string;
}

// URL-synced tab state (?tab=...) so tabs are deep-linkable and survive a
// refresh — replaces the local useState pattern every ops page hand-rolled.
export function useUrlTab<T extends string>(tabs: readonly TabDef<T>[], defaultTab: T): [T, (key: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromUrl = searchParams.get('tab') as T | null;
  const active = fromUrl && tabs.some((t) => t.key === fromUrl) ? fromUrl : defaultTab;

  const setTab = (key: T) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    }, { replace: true });
  };

  return [active, setTab];
}

export default function Tabs<T extends string>({ tabs, active, onChange }: {
  tabs: readonly TabDef<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="tabs overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={active === t.key ? 'tab-item-active' : 'tab-item'}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
