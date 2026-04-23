'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function PushNotificationManager() {
  const { user } = useAuthStore();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const toast = useToast();

  // Check current notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Load unread notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('store_notifications')
      .select('*')
      .eq('store_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.length);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to Realtime for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('owner-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'store_notifications',
        filter: `store_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show browser notification if permission granted
        if (permissionGranted && 'Notification' in window) {
          const notif = new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [100, 50, 100],
            tag: `notif-${newNotif.id}`,
          });
          notif.onclick = () => {
            window.focus();
            if (newNotif.url) window.location.href = newNotif.url;
            notif.close();
          };
        }

        // Also show in-app toast
        if (newNotif.type === 'warning') {
          toast.warning(newNotif.message);
        } else {
          toast.info(newNotif.message);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permissionGranted, toast]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser tidak mendukung notifikasi');
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionGranted(permission === 'granted');
    if (permission === 'granted') {
      toast.success('Notifikasi browser diaktifkan!');
    } else {
      toast.warning('Izin notifikasi ditolak oleh browser.');
    }
  };

  const markAllRead = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase
      .from('store_notifications')
      .update({ is_read: true })
      .in('id', ids);
    setNotifications([]);
    setUnreadCount(0);
    setShowPanel(false);
  };

  // Only show for owner
  if (!user || user.role === 'cashier') return null;

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          if (!permissionGranted) {
            requestPermission();
          } else {
            setShowPanel(!showPanel);
          }
        }}
        className={`relative flex items-center justify-center p-2 rounded-xl border transition-all ${
          permissionGranted
            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
            : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--surface-border)] hover:bg-[var(--surface-3)]'
        }`}
        title={permissionGranted ? 'Lihat Notifikasi' : 'Aktifkan Notifikasi Browser'}
      >
        {unreadCount > 0 ? (
          <BellRing size={18} className="animate-bounce" />
        ) : permissionGranted ? (
          <Bell size={18} />
        ) : (
          <BellOff size={18} />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-[10px] font-black text-white rounded-full flex items-center justify-center px-1 shadow-lg border-2 border-[var(--surface-1)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-12 w-80 sm:w-96 max-h-96 bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifikasi</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Tandai semua dibaca
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-72 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell size={24} className="mx-auto text-[var(--text-muted)]/30 mb-2" />
                  <p className="text-[12px] text-[var(--text-muted)]">Tidak ada notifikasi baru</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-3 border-b border-[var(--surface-border)]/50 hover:bg-[var(--surface-2)]/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (n.url) window.location.href = n.url;
                      setShowPanel(false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'warning' ? 'bg-amber-500' :
                        n.type === 'error' ? 'bg-red-500' :
                        n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-[var(--text-primary)] leading-tight">{n.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-[var(--text-muted)]/60 mt-1">
                          {new Date(n.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
