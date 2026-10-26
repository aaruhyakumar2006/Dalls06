import { BlockTemplate, BlockKind, DayType } from '@/types/database';

export interface SchedulePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: Omit<BlockTemplate, 'id'>[];
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: 'cse-placement',
    name: 'CSE Placement & High Performance',
    description: 'Balanced for college, morning Python, evening Aptitude, deep DSA & badminton.',
    icon: '🎯',
    templates: [
      // Weekdays
      { day_type: 'weekday', start_time: '05:45', label: 'Wake up', kind: 'soft', note: 'Alarm across room, phone off bed', minimum_text: '', sort: 1 },
      { day_type: 'weekday', start_time: '06:00', label: 'Language practice (Python)', kind: 'core', note: 'Write from blank, no notes first', minimum_text: 'Just 20 minutes', sort: 2 },
      { day_type: 'weekday', start_time: '06:45', label: 'Get ready & breakfast', kind: 'fixed', note: '', minimum_text: '', sort: 3 },
      { day_type: 'weekday', start_time: '07:00', label: 'Bus: light recall', kind: 'soft', note: 'Formulas, flashcards, error log', minimum_text: '', sort: 4 },
      { day_type: 'weekday', start_time: '08:30', label: 'College', kind: 'fixed', note: 'Use free periods for coding practice', minimum_text: '', sort: 5 },
      { day_type: 'weekday', start_time: '15:30', label: 'Bus home', kind: 'fixed', note: 'Rest or recall a concept from memory', minimum_text: '', sort: 6 },
      { day_type: 'weekday', start_time: '17:00', label: 'Badminton / Coaching', kind: 'fixed', note: 'Cardio & court drills', minimum_text: '', sort: 7 },
      { day_type: 'weekday', start_time: '19:00', label: 'Dinner & rest', kind: 'fixed', note: 'Nutritious meal & hydrate', minimum_text: '', sort: 8 },
      { day_type: 'weekday', start_time: '19:30', label: 'Aptitude timed practice', kind: 'core', note: '15-20 timed questions, log mistakes', minimum_text: 'Just 20 minutes', sort: 9 },
      { day_type: 'weekday', start_time: '20:30', label: 'Deep block (DSA / Project)', kind: 'heavy', note: 'Mon/Wed/Fri: DSA from blank. Tue/Thu: hackathons/startup', minimum_text: 'Just 30 minutes', sort: 10 },
      { day_type: 'weekday', start_time: '22:00', label: "Wind down & tomorrow's plan", kind: 'soft', note: 'Set priorities for tomorrow morning', minimum_text: '', sort: 11 },
      { day_type: 'weekday', start_time: '22:45', label: 'Lights out sleep', kind: 'fixed', note: '7 hours recovery target', minimum_text: '', sort: 12 },

      // Weekends
      { day_type: 'weekend', start_time: '07:00', label: 'Wake up & hydrate', kind: 'soft', note: '', minimum_text: '', sort: 1 },
      { day_type: 'weekend', start_time: '07:30', label: 'Long DSA deep work', kind: 'heavy', note: 'Hard LeetCode problems & algorithms', minimum_text: 'Just 45 minutes', sort: 2 },
      { day_type: 'weekend', start_time: '10:30', label: 'Breakfast & rest', kind: 'fixed', note: '', minimum_text: '', sort: 3 },
      { day_type: 'weekend', start_time: '11:30', label: 'Hackathon / Startup work', kind: 'core', note: 'Feature build or prototype testing', minimum_text: 'Just 30 minutes', sort: 4 },
      { day_type: 'weekend', start_time: '14:00', label: 'Lunch & recharge', kind: 'fixed', note: 'Short 20 min power nap', minimum_text: '', sort: 5 },
      { day_type: 'weekend', start_time: '15:30', label: 'Aptitude & mock test', kind: 'core', note: 'Full section test under time pressure', minimum_text: 'Just 25 minutes', sort: 6 },
      { day_type: 'weekend', start_time: '17:00', label: 'Badminton match / training', kind: 'fixed', note: 'Competition match play', minimum_text: '', sort: 7 },
      { day_type: 'weekend', start_time: '19:30', label: 'Dinner & family time', kind: 'fixed', note: '', minimum_text: '', sort: 8 },
      { day_type: 'weekend', start_time: '20:30', label: 'Sunday review & weekly planning', kind: 'core', note: 'Audit counting days & commitment', minimum_text: '', sort: 9 },
      { day_type: 'weekend', start_time: '22:00', label: 'Wind down', kind: 'soft', note: 'No screens in bed', minimum_text: '', sort: 10 },
      { day_type: 'weekend', start_time: '22:45', label: 'Sleep', kind: 'fixed', note: 'Rest before Monday dawn', minimum_text: '', sort: 11 },
    ],
  },
  {
    id: 'exam-sprint',
    name: 'Exam / Placement Sprint Mode',
    description: 'High-intensity revision sprint: 4 core study blocks per day with spaced reviews.',
    icon: '⚡',
    templates: [
      { day_type: 'weekday', start_time: '06:00', label: 'Formula & Theory Recall', kind: 'core', note: 'Active recall from blank sheets', minimum_text: '20 min formulas', sort: 1 },
      { day_type: 'weekday', start_time: '08:00', label: 'Breakfast & coffee', kind: 'fixed', note: '', minimum_text: '', sort: 2 },
      { day_type: 'weekday', start_time: '09:00', label: 'Deep Study Block 1', kind: 'heavy', note: 'Core subjects or system design', minimum_text: '45 min minimum', sort: 3 },
      { day_type: 'weekday', start_time: '12:30', label: 'Lunch & walk', kind: 'fixed', note: 'Get sunlight, give eyes a break', minimum_text: '', sort: 4 },
      { day_type: 'weekday', start_time: '14:00', label: 'Problem Solving Block 2', kind: 'heavy', note: 'Past papers & timed coding problems', minimum_text: '30 min minimum', sort: 5 },
      { day_type: 'weekday', start_time: '17:00', label: 'Workout or outdoor jog', kind: 'soft', note: 'Cardio to reset mental fatigue', minimum_text: '', sort: 6 },
      { day_type: 'weekday', start_time: '18:30', label: 'Dinner', kind: 'fixed', note: '', minimum_text: '', sort: 7 },
      { day_type: 'weekday', start_time: '19:30', label: 'Timed Mock Test Block 3', kind: 'core', note: 'Simulate real placement exam', minimum_text: '20 min quiz', sort: 8 },
      { day_type: 'weekday', start_time: '21:30', label: 'Error Log & Spaced Review', kind: 'core', note: 'Review today mistakes in review tab', minimum_text: '', sort: 9 },
      { day_type: 'weekday', start_time: '22:30', label: 'Wind down & sleep', kind: 'fixed', note: 'Sleep consolidates learned memories', minimum_text: '', sort: 10 },

      { day_type: 'weekend', start_time: '07:00', label: 'Morning review', kind: 'core', note: '', minimum_text: '', sort: 1 },
      { day_type: 'weekend', start_time: '09:30', label: 'Comprehensive Mock Exam', kind: 'heavy', note: 'Full length test', minimum_text: '60 min', sort: 2 },
      { day_type: 'weekend', start_time: '13:00', label: 'Lunch & rest', kind: 'fixed', note: '', minimum_text: '', sort: 3 },
      { day_type: 'weekend', start_time: '15:00', label: 'Mistake Analysis', kind: 'core', note: 'Deep dive on wrong questions', minimum_text: '30 min', sort: 4 },
      { day_type: 'weekend', start_time: '18:00', label: 'Rest & physical exercise', kind: 'soft', note: '', minimum_text: '', sort: 5 },
      { day_type: 'weekend', start_time: '20:00', label: 'Weekly retrospective', kind: 'core', note: '', minimum_text: '', sort: 6 },
      { day_type: 'weekend', start_time: '22:30', label: 'Sleep', kind: 'fixed', note: '', minimum_text: '', sort: 7 },
    ],
  },
  {
    id: 'internship-work',
    name: 'Internship / Full-Time Work + Prep',
    description: 'For students balancing a 9-5 job or internship with morning & evening study.',
    icon: '💼',
    templates: [
      { day_type: 'weekday', start_time: '06:00', label: 'Morning DSA / Study Block', kind: 'core', note: 'Get the most important rep done first', minimum_text: 'Just 25 min', sort: 1 },
      { day_type: 'weekday', start_time: '07:30', label: 'Breakfast & commute', kind: 'fixed', note: '', minimum_text: '', sort: 2 },
      { day_type: 'weekday', start_time: '09:00', label: 'Work / Internship Core Hours', kind: 'fixed', note: 'Focus on office responsibilities', minimum_text: '', sort: 3 },
      { day_type: 'weekday', start_time: '17:30', label: 'Commute home & relax', kind: 'fixed', note: '', minimum_text: '', sort: 4 },
      { day_type: 'weekday', start_time: '18:30', label: 'Gym or Badminton drill', kind: 'soft', note: 'Keep physical stamina high', minimum_text: '', sort: 5 },
      { day_type: 'weekday', start_time: '20:00', label: 'Dinner', kind: 'fixed', note: '', minimum_text: '', sort: 6 },
      { day_type: 'weekday', start_time: '20:45', label: 'Evening Deep Upskilling Block', kind: 'heavy', note: 'Projects, architecture, or interview prep', minimum_text: 'Just 30 min', sort: 7 },
      { day_type: 'weekday', start_time: '22:30', label: 'Wind down & sleep', kind: 'fixed', note: '', minimum_text: '', sort: 8 },

      { day_type: 'weekend', start_time: '08:00', label: 'Morning workout & wake up', kind: 'soft', note: '', minimum_text: '', sort: 1 },
      { day_type: 'weekend', start_time: '09:30', label: 'Weekend Project Deep Work', kind: 'heavy', note: 'Build side projects and portfolio', minimum_text: '45 min', sort: 2 },
      { day_type: 'weekend', start_time: '13:00', label: 'Lunch & free time', kind: 'fixed', note: '', minimum_text: '', sort: 3 },
      { day_type: 'weekend', start_time: '16:00', label: 'DSA & Contest Practice', kind: 'core', note: 'Weekly coding contest', minimum_text: '30 min', sort: 4 },
      { day_type: 'weekend', start_time: '19:00', label: 'Dinner & social time', kind: 'fixed', note: '', minimum_text: '', sort: 5 },
      { day_type: 'weekend', start_time: '21:00', label: 'Weekly review & schedule setup', kind: 'core', note: '', minimum_text: '', sort: 6 },
      { day_type: 'weekend', start_time: '22:45', label: 'Sleep', kind: 'fixed', note: '', minimum_text: '', sort: 7 },
    ],
  },
  {
    id: 'clean-slate',
    name: 'Clean Slate (Empty)',
    description: 'Wipes all baseline blocks completely so you can design your own schedule from zero.',
    icon: '🧹',
    templates: [],
  },
];

/**
 * Converts a string formatted as natural text into BlockTemplate items
 * Example input line:
 * "06:00 - Morning DSA practice (core) // no notes first"
 */
export function parseScheduleText(text: string, dayType: DayType = 'weekday'): BlockTemplate[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const result: BlockTemplate[] = [];

  // Regex to extract time (24h or 12h)
  const timeRegex = /(?:^|\s)(\d{1,2}:\d{2}(?:\s?[ap]m)?|\d{1,2}(?:\s?[ap]m))/i;

  lines.forEach((line, idx) => {
    // Check if line contains a time
    const timeMatch = line.match(timeRegex);
    if (!timeMatch) return;

    let timeRaw = timeMatch[1].trim().toLowerCase();
    let startTime = '09:00';

    // Parse 12-hour or 24-hour time to HH:mm
    if (timeRaw.includes('am') || timeRaw.includes('pm')) {
      const isPm = timeRaw.includes('pm');
      const cleanTime = timeRaw.replace(/[ap]m/g, '').trim();
      let [h, m] = cleanTime.split(':');
      let hour = parseInt(h, 10);
      let minute = m ? parseInt(m, 10) : 0;
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } else {
      let [h, m] = timeRaw.split(':');
      let hour = parseInt(h, 10);
      let minute = parseInt(m, 10);
      startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    // Remove the time from the line to extract label & notes
    let remainder = line.replace(timeMatch[0], '').replace(/^[\s\-–—:]+/, '').trim();

    // Check for kind in parentheses or brackets: (core), (heavy), (soft), (fixed)
    let kind: BlockKind = 'soft';
    const kindMatch = remainder.match(/\((core|heavy|soft|fixed)\)/i) || remainder.match(/\[(core|heavy|soft|fixed)\]/i);
    if (kindMatch) {
      kind = kindMatch[1].toLowerCase() as BlockKind;
      remainder = remainder.replace(kindMatch[0], '').trim();
    } else {
      // Heuristic detection
      const lower = remainder.toLowerCase();
      if (lower.includes('dsa') || lower.includes('hackathon') || lower.includes('deep') || lower.includes('project')) {
        kind = 'heavy';
      } else if (lower.includes('aptitude') || lower.includes('study') || lower.includes('practice') || lower.includes('review') || lower.includes('python')) {
        kind = 'core';
      } else if (lower.includes('college') || lower.includes('bus') || lower.includes('commute') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('sleep') || lower.includes('class')) {
        kind = 'fixed';
      }
    }

    // Check for notes separated by // or ; or -
    let label = remainder;
    let note = '';
    if (remainder.includes('//')) {
      const parts = remainder.split('//');
      label = parts[0].trim();
      note = parts.slice(1).join('//').trim();
    } else if (remainder.includes(';')) {
      const parts = remainder.split(';');
      label = parts[0].trim();
      note = parts.slice(1).join(';').trim();
    }

    if (!label) {
      label = `Focus slot ${idx + 1}`;
    }

    result.push({
      id: `custom-${dayType}-${Date.now()}-${idx}`,
      day_type: dayType,
      start_time: startTime,
      label,
      kind,
      note,
      minimum_text: kind === 'core' ? 'Just 20 minutes' : kind === 'heavy' ? 'Just 30 minutes' : '',
      sort: idx + 1,
    });
  });

  return result.sort((a, b) => a.start_time.localeCompare(b.start_time));
}

/**
 * Converts a list of BlockTemplate items back to readable plaintext format
 */
export function templatesToScheduleText(templates: BlockTemplate[], dayType: DayType): string {
  const filtered = templates
    .filter((t) => t.day_type === dayType)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (filtered.length === 0) return '';

  return filtered
    .map((t) => {
      let line = `${t.start_time} - ${t.label} (${t.kind})`;
      if (t.note) {
        line += ` // ${t.note}`;
      }
      return line;
    })
    .join('\n');
}
