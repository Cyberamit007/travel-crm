import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

function getKey(userId: string) {
  return `starred_leads_${userId}`;
}

function load(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getKey(userId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function save(userId: string, set: Set<string>) {
  localStorage.setItem(getKey(userId), JSON.stringify([...set]));
}

export function useStarredLeads() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const [starred, setStarred] = useState<Set<string>>(() => load(userId));

  const toggle = useCallback((leadId: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      save(userId, next);
      return next;
    });
  }, [userId]);

  const isStarred = useCallback((leadId: string) => starred.has(leadId), [starred]);

  return { starred: [...starred], isStarred, toggle };
}
