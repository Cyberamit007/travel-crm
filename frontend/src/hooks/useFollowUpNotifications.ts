import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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
      const now = Date.now();
      const ADVANCE_MS = 10 * 60_000; // notify up to 10 min before due
      const GRACE_MS   =  2 * 60_000; // also catch overdue within last 2 min
      const canBrowserNotif = 'Notification' in window && Notification.permission === 'granted';

      leads.forEach((lead) => {
        if (!lead.followUpDate || notifiedIds.current.has(lead.id)) return;
        const due = new Date(lead.followUpDate).getTime();

        if (due >= now - GRACE_MS && due <= now + ADVANCE_MS) {
          notifiedIds.current.add(lead.id);
          const minsLeft = Math.round((due - now) / 60_000);
          const timeLabel = minsLeft > 1 ? `in ${minsLeft} min` : minsLeft === 1 ? 'in 1 min' : 'now';
          const body = lead.followUpNotes
            ? `${timeLabel} — ${lead.followUpNotes} · ${lead.phone}`
            : `Follow up with ${lead.name} ${timeLabel} — ${lead.phone}`;

          if (canBrowserNotif) {
            try {
              const n = new Notification(`Follow-up: ${lead.name}`, {
                body,
                icon: '/favicon.ico',
                tag: `followup-${lead.id}`,
                requireInteraction: true,
              });
              n.onclick = () => { window.focus(); n.close(); };
            } catch {
              // fall through to toast
            }
          }

          // In-app toast fallback — works on all devices including iOS
          if (!canBrowserNotif) {
            toast(`⏰ Follow-up ${timeLabel}: ${lead.name}\n${lead.phone}${lead.followUpNotes ? `\n${lead.followUpNotes}` : ''}`, {
              duration: 15000,
              style: {
                background: '#fff7ed',
                border: '1px solid #fb923c',
                color: '#9a3412',
                maxWidth: '340px',
                whiteSpace: 'pre-line',
              },
            });
          }
        }
      });
    };

    check(); // check immediately when data loads
    const intervalId = setInterval(check, 60_000);
    return () => clearInterval(intervalId);
  }, [data, isAuthenticated]);
}
