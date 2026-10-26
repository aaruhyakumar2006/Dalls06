/**
 * Time and Date Utilities for Daily Planner
 * Timezone: Asia/Kolkata by default
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function padZero(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Returns YYYY-MM-DD for a date in Asia/Kolkata timezone
 */
export function getDateKey(date: Date = new Date(), tz: string = DEFAULT_TIMEZONE): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // outputs YYYY-MM-DD in en-CA
  } catch {
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
  }
}

/**
 * Convert 'HH:mm' to minutes from midnight
 */
export function timeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Format 'HH:mm' to 12-hour AM/PM string, e.g. '05:45' -> '5:45 AM'
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  let h = parseInt(hourStr, 10);
  const m = parseInt(minStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${padZero(m)} ${ampm}`;
}

/**
 * Get current time in minutes from midnight for current timezone
 */
export function getCurrentTimeMins(tz: string = DEFAULT_TIMEZONE): number {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Parses natural phrases into structured task fields:
 * - Time: "at 8pm", "8:30 pm", "at 20:00", "at 9:15 am"
 * - Duration: "30 min", "2 hours", "1h", "45 mins"
 * - Description: "| description: text"
 * - Recurrence: "| recurring: daily|weekly|none"
 * - Recurrence End Date: "| until: YYYY-MM-DD"
 * - Tags: "| tags: tag1, tag2, tag3"
 * - Title: remaining cleaned text
 */
export function parseNaturalTask(input: string): {
  title: string;
  at_time: string | null;
  duration_min: number | null;
  description?: string | null;
  recurrence_pattern?: 'none' | 'daily' | 'weekly' | null;
  recurrence_end_date?: string | null;
  tags?: string[] | null;
} {
  let text = input.trim();
  let at_time: string | null = null;
  let duration_min: number | null = null;
  let description: string | null = null;
  let recurrence_pattern: 'none' | 'daily' | 'weekly' | null = null;
  let recurrence_end_date: string | null = null;
  let tags: string[] | null = null;

  // 0. Extract pipe-delimited metadata fields before processing main text
  const pipeRegex = /\|\s*(\w+):\s*([^|]+?)(?=\||\s*(?:at|min|hour)|\s*$)/g;
  let match;
  while ((match = pipeRegex.exec(text)) !== null) {
    const fieldName = match[1].toLowerCase();
    const fieldValue = match[2].trim();

    if (fieldName === 'description') {
      description = fieldValue;
    } else if (fieldName === 'recurring') {
      const val = fieldValue.toLowerCase();
      if (['daily', 'weekly', 'none'].includes(val)) {
        recurrence_pattern = val as 'none' | 'daily' | 'weekly';
      }
    } else if (fieldName === 'until') {
      // Validate date format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(fieldValue)) {
        recurrence_end_date = fieldValue;
      }
    } else if (fieldName === 'tags') {
      tags = fieldValue
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      // Deduplicate tags
      if (tags.length > 0) {
        tags = Array.from(new Set(tags));
      } else {
        tags = null;
      }
    }
  }

  // Remove all pipe-delimited sections from text
  text = text.replace(/\s*\|\s*\w+:\s*[^|]+/g, ' ').trim();

  // 1. Match duration: e.g. "30 min", "45 mins", "1h", "2 hours", "1.5 hours"
  const durationRegex = /\b(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h|mins|min|m)\b/i;
  const durMatch = text.match(durationRegex);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const unitMatch = durMatch[0].toLowerCase();
    if (unitMatch.includes('h')) {
      duration_min = Math.round(val * 60);
    } else {
      duration_min = Math.round(val);
    }
    // Remove duration from text
    text = text.replace(durMatch[0], ' ').trim();
  }

  // 2. Match time: e.g. "at 8:30 pm", "at 8pm", "8:30pm", "at 20:00"
  const timeRegex = /(?:at\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const milTimeRegex = /(?:at\s+)\b([01]?\d|2[0-3]):([0-5]\d)\b/i;

  const tMatch = text.match(timeRegex);
  if (tMatch) {
    let hour = parseInt(tMatch[1], 10);
    const min = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
    const ampm = tMatch[3].toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    at_time = `${padZero(hour)}:${padZero(min)}`;
    text = text.replace(tMatch[0], ' ').trim();
  } else {
    const mMatch = text.match(milTimeRegex);
    if (mMatch) {
      const hour = parseInt(mMatch[1], 10);
      const min = parseInt(mMatch[2], 10);
      at_time = `${padZero(hour)}:${padZero(min)}`;
      text = text.replace(mMatch[0], ' ').trim();
    }
  }

  // Cleanup stray "at" or multiple spaces
  text = text.replace(/\bat\b/gi, ' ').replace(/\s+/g, ' ').trim();

  return {
    title: text || 'Untitled task',
    at_time,
    duration_min,
    description,
    recurrence_pattern,
    recurrence_end_date,
    tags,
  };
}

export const parseQuickTask = parseNaturalTask;

/**
 * Generate Google Calendar template link for a task
 */
export function getGoogleCalendarLink(task: {
  title: string;
  date: string;
  at_time?: string | null;
  duration_min?: number | null;
}): string {
  const title = encodeURIComponent(task.title);
  if (!task.at_time) {
    // All day
    const cleanDate = task.date.replace(/-/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${cleanDate}/${cleanDate}`;
  }

  const [h, m] = task.at_time.split(':').map(Number);
  const dur = task.duration_min || 30;
  const startH = padZero(h);
  const startM = padZero(m);
  
  const endMinutesTotal = h * 60 + m + dur;
  const endH = padZero(Math.floor(endMinutesTotal / 60) % 24);
  const endM = padZero(endMinutesTotal % 60);

  const cleanDate = task.date.replace(/-/g, '');
  const startIso = `${cleanDate}T${startH}${startM}00`;
  const endIso = `${cleanDate}T${endH}${endM}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}`;
}
