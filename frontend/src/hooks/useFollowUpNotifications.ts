import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLeads } from './useLeads';

export function useFollowUpNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const notifiedIds = useRef<Set<string>>(new Set());

  // Request browser notification permission once
  useEffect(() => {
    if (!isAuthenticated) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  const { data } = useLeads(
    user?.role === 'EMPLOYEE'
      ? { assignedToId: user.id, limit: 200 }
      : { limit: 200 },
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const leads = (data?.data ?? []).filter(
      (l) => l.followUpDate && !l.followUpDone,
    );

    const check = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = Date.now();
      const ADVANCE_MS = 10 * 60_000; // notify up to 10 min before due
      const GRACE_MS   =  2 * 60_000; // also catch overdue within last 2 min

      leads.forEach((lead) => {
        if (!lead.followUpDate || notifiedIds.current.has(lead.id)) return;
        const due = new Date(lead.followUpDate).getTime();

        if (due >= now - GRACE_MS && due <= now + ADVANCE_MS) {
          notifiedIds.current.add(lead.id);
          const minsLeft = Math.round((due - now) / 60_000);
          const timeLabel = minsLeft > 1 ? `in ${minsLeft} min` : minsLeft === 1 ? 'in 1 min' : 'now';
          try {
            const n = new Notification(`Follow-up: ${lead.name}`, {
              body: lead.followUpNotes
                ? `${timeLabel} — ${lead.followUpNotes} · ${lead.phone}`
                : `Follow up with ${lead.name} ${timeLabel} — ${lead.phone}`,
              icon: '/favicon.ico',
              tag: `followup-${lead.id}`,
              requireInteraction: true,
            });
            n.onclick = () => {
              window.focus();
              n.close();
            };
          } catch {
            // Notification API not available in this context
          }
        }
      });
    };

    check(); // check immediately when data loads
    const intervalId = setInterval(check, 60_000);
    return () => clearInterval(intervalId);
  }, [data, isAuthenticated]);
}
