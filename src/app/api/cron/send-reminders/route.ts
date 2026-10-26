import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/notifications/webpush';
import { padZero } from '@/lib/utils/time';

export const dynamic = 'force-dynamic';

// In-memory deduplication set for idempotency: key = `userId:type:date:time`
const sentReminderKeys = new Set<string>();

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get('secret') ||
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 });
  }

  // 1. Current Time in Asia/Kolkata
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(now);
  const currentHour = parts.find((p) => p.type === 'hour')?.value || '00';
  const currentMin = parts.find((p) => p.type === 'minute')?.value || '00';
  const currentWeekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const currentTime = `${currentHour}:${currentMin}`;

  const dateParts = {
    year: parts.find((p) => p.type === 'year')?.value,
    month: parts.find((p) => p.type === 'month')?.value,
    day: parts.find((p) => p.type === 'day')?.value,
  };
  const currentDateKey = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'Supabase admin client not configured',
      time: currentTime,
      date: currentDateKey,
    });
  }

  // Fetch all subscriptions
  const { data: subs, error: subError } = await admin.from('push_subscriptions').select('*');
  if (subError || !subs || subs.length === 0) {
    return NextResponse.json({
      status: 'no_subscriptions',
      time: currentTime,
      date: currentDateKey,
    });
  }

  let totalSent = 0;

  // 2. Fixed Daily Scheduled Push Reminders
  const scheduleChecks = [
    {
      time: '05:45',
      type: 'wake_up',
      title: 'Wake up - Consistency Chain Starts Here',
      body: 'Alarm across the room, phone off the bed. 06:00 Language practice begins.',
    },
    {
      time: '19:15',
      type: 'review_due',
      title: 'Spaced Review Due (19:15)',
      body: "Test today's due concepts from blank. Recognition without recall is the trap.",
    },
    {
      time: '20:30',
      type: 'weekly_review',
      condition: currentWeekday === 'Sun',
      title: 'Sunday Weekly Review (20:30)',
      body: 'Log your metrics and write your one key change for next week.',
    },
    {
      time: '22:15',
      type: 'wind_down',
      title: 'Wind Down (22:15)',
      body: 'Write tomorrow’s top 3 tasks and protect your 22:45 bedtime.',
    },
    {
      time: '22:45',
      type: 'sleep',
      title: 'Bedtime Target (22:45)',
      body: 'Phone away. Protect tomorrow morning’s streak.',
    },
  ];

  for (const check of scheduleChecks) {
    if (check.time === currentTime && (check.condition === undefined || check.condition)) {
      for (const sub of subs) {
        const dedupeKey = `${sub.user_id}:${check.type}:${currentDateKey}:${currentTime}`;
        if (!sentReminderKeys.has(dedupeKey)) {
          sentReminderKeys.add(dedupeKey);
          const ok = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: check.title,
              body: check.body,
              url: '/',
              tag: check.type,
            }
          );
          if (ok) totalSent++;
        }
      }
    }
  }

  // 3. Timed Task Reminders: 10 minutes before task at_time
  // If task is at 20:00, send at 19:50
  const curMins = parseInt(currentHour, 10) * 60 + parseInt(currentMin, 10);
  const targetTaskMins = curMins + 10;
  const targetTaskH = padZero(Math.floor(targetTaskMins / 60) % 24);
  const targetTaskM = padZero(targetTaskMins % 60);
  const targetTimeStr = `${targetTaskH}:${targetTaskM}`;

  const { data: upcomingTasks } = await admin
    .from('tasks')
    .select('*')
    .eq('date', currentDateKey)
    .eq('at_time', targetTimeStr)
    .eq('done', false);

  if (upcomingTasks && upcomingTasks.length > 0) {
    for (const task of upcomingTasks) {
      for (const sub of subs) {
        if (sub.user_id === task.user_id) {
          const dedupeKey = `${task.user_id}:task:${task.id}:${currentTime}`;
          if (!sentReminderKeys.has(dedupeKey)) {
            sentReminderKeys.add(dedupeKey);
            const ok = await sendPushNotification(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              {
                title: `Task Reminder in 10 min: ${task.title}`,
                body: task.duration_min
                  ? `Scheduled for ${task.at_time} (${task.duration_min} minutes).`
                  : `Scheduled for ${task.at_time}. Time to execute!`,
                url: '/',
                tag: `task-${task.id}`,
              }
            );
            if (ok) totalSent++;
          }
        }
      }
    }
  }

  // Keep dedupe set size bounded
  if (sentReminderKeys.size > 2000) {
    sentReminderKeys.clear();
  }

  return NextResponse.json({
    success: true,
    time: currentTime,
    date: currentDateKey,
    sent: totalSent,
  });
}
