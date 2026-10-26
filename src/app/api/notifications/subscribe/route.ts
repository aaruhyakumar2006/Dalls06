import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
      // Store in supabase push_subscriptions
      const { error } = await admin.from('push_subscriptions').upsert(
        {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: req.headers.get('user-agent') || '',
        },
        { onConflict: 'endpoint' }
      );
      if (error) {
        console.warn('Supabase subscription insert error:', error.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
