import webpush from 'web-push';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

let isConfigured = false;

export function configureWebPush(): boolean {
  if (isConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@dailyplanner.app';

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isConfigured = true;
    return true;
  } catch (err) {
    console.warn('Failed to configure web-push VAPID details:', err);
    return false;
  }
}

export async function sendPushNotification(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  if (!configureWebPush()) {
    return false;
  }

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // If subscription is expired or unsubscribed, remove from database
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log('Push subscription expired, cleaning up:', sub.endpoint);
      const admin = getSupabaseAdminClient();
      if (admin) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    } else {
      console.warn('Web push send error:', err.message);
    }
    return false;
  }
}
