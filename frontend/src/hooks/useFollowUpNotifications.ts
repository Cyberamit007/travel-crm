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
      const NOTIFY_WINDOW_MS = 60_000; // trigger if due within next 60s
      const GRACE_MS = 5 * 60_000;     // also catch overdue within last 5 min

      leads.forEach((lead) => {
        if (!lead.followUpDate || notifiedIds.current.has(lead.id)) return;
        const due = new Date(lead.followUpDate).getTime();

        if (due >= now - GRACE_MS && due <= now + NOTIFY_WINDOW_MS) {
          notifiedIds.current.add(lead.id);
          try {
            const n = new Notification(`Follow-up: ${lead.name}`, {
              body: lead.followUpNotes
                ? `${lead.followUpNotes}\n${lead.phone}`
                : `Time to follow up with ${lead.name} — ${lead.phone}`,
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
