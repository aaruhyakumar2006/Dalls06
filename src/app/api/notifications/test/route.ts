import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/notifications/webpush';

export const dynamic = 'force-dynamic';

export async function POST() {
  const admin = getSupabaseAdminClient();
  let delivered = 0;

  if (admin) {
    const { data: subs } = await admin.from('push_subscriptions').select('*');
    if (subs && subs.length > 0) {
      for (const sub of subs) {
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: 'Daily Planner: Focus Block Ready',
            body: 'Put your phone in another room! High retention comes from writing from blank.',
            url: '/',
            tag: 'test-notification',
          }
        );
        if (ok) delivered++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    delivered,
    message: delivered > 0 ? `Sent to ${delivered} device(s)` : 'Sent local test signal',
  });
}
