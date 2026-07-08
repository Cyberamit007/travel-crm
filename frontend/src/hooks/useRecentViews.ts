import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const MAX = 8;

function getKey(userId: string) {
  return `recent_views_${userId}`;
}

function load(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(userId: string, ids: string[]) {
  localStorage.setItem(getKey(userId), JSON.stringify(ids));
}

export function useRecentViews() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const [views, setViews] = useState<string[]>(() => load(userId));

  const trackView = useCallback((leadId: string) => {
    setViews((prev) => {
      const filtered = prev.filter((id) => id !== leadId);
      const next = [leadId, ...filtered].slice(0, MAX);
      save(userId, next);
      return next;
    });
  }, [userId]);

  return { recentViewIds: views, trackView };
}
