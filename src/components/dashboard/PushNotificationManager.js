'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

// You must replace this with your actual VAPID public key!
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [registration, setRegistration] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // Tunggu Service Worker aktif (via next-pwa)
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    if (!registration) return;
    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      setSubscription(sub);
      setIsSubscribed(true);
      
      const subJSON = sub.toJSON();

      // Simpan ke Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth
      }, { onConflict: 'user_id, endpoint' });

      if (error) throw error;
      
      toast.success('Notifikasi berhasil diaktifkan!');
    } catch (err) {
      console.error('Failed to subscribe to push', err);
      toast.error('Gagal mengaktifkan notifikasi: ' + err.message);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // Hapus dari Supabase
        await supabase.from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint)
          .eq('user_id', user.id);
          
        setSubscription(null);
        setIsSubscribed(false);
        toast.info('Notifikasi dimatikan.');
      }
    } catch (err) {
      console.error('Failed to unsubscribe', err);
    }
  };

  if (!user || user.role === 'cashier') return null; // Hanya owner
  if (!VAPID_PUBLIC_KEY) return null; // Sembunyikan jika VAPID belum dikonfigurasi

  return (
    <button
      onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
      className={`flex items-center justify-center p-2 rounded-xl border transition-all ${
        isSubscribed 
          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20' 
          : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--surface-border)] hover:bg-[var(--surface-3)]'
      }`}
      title={isSubscribed ? "Matikan Notifikasi Web" : "Aktifkan Notifikasi Web"}
    >
      {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
