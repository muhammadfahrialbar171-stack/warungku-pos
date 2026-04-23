import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = 'mailto:admin@warungku.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { storeId, title, message, url } = body;

    if (!storeId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get all subscriptions for this store owner
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', storeId);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/dashboard',
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Subscription expired or deleted, removing from DB...');
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sentCount: subscriptions.length });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
