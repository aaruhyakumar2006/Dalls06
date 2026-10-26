export type BlockKind = 'core' | 'heavy' | 'soft' | 'fixed';
export type DayType = 'weekday' | 'weekend';
export type ReviewTopicKind = 'dsa' | 'aptitude' | 'other';
export type ReviewResult = 'got_it' | 'struggled';
export type DsaStatus = 'not_started' | 'learning' | 'solid';
export type SportKind = 'match' | 'training';
export type StartupStatus = 'active' | 'paused' | 'leave';
export type ChecklistList = 'placement' | 'startup' | 'projects' | 'hackathons';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  timezone: string;
  wake_target: string;
  sleep_target: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at?: string;
}

export interface BlockTemplate {
  id: string;
  user_id?: string;
  day_type: DayType;
  start_time: string; // 'HH:mm'
  label: string;
  kind: BlockKind;
  note?: string;
  minimum_text?: string;
  sort: number;
  days?: number[]; // optional: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
}

export interface DayLog {
  id?: string;
  user_id?: string;
  date: string; // 'YYYY-MM-DD'
  low_energy: boolean;
  match_day: boolean;
  core_done: number;
}

export interface BlockCompletion {
  id?: string;
  user_id?: string;
  date: string;
  block_key: string;
  done_at?: string;
}

export interface TaskItem {
  id: string;
  user_id?: string;
  date: string;
  title: string;
  at_time?: string | null;
  duration_min?: number | null;
  description?: string | null;
  recurrence_pattern?: 'none' | 'daily' | 'weekly' | null;
  recurrence_end_date?: string | null;
  tags?: string[] | null;
  done: boolean;
  position: number;
}

export interface ReviewItem {
  id: string;
  user_id?: string;
  title: string;
  topic_kind: ReviewTopicKind;
  topic?: string;
  note?: string;
  stage: number; // 0: 1d, 1: 3d, 2: 7d, 3: 14d, 4: 30d
  next_review_at: string; // 'YYYY-MM-DD'
  last_result?: ReviewResult | null;
  created_at?: string;
}

export interface ReviewEvent {
  id?: string;
  user_id?: string;
  review_item_id: string;
  result: ReviewResult;
  at: string;
}

export interface FocusSession {
  id?: string;
  user_id?: string;
  block_key?: string | null;
  started_at: string;
  planned_min: number;
  actual_min: number;
  completed: boolean;
}

export interface SleepLog {
  id?: string;
  user_id?: string;
  date: string;
  bedtime: string; // 'HH:mm'
  wake_time: string; // 'HH:mm'
}

export interface DsaTopic {
  id: string;
  user_id?: string;
  topic: string;
  status: DsaStatus;
  last_practiced_at?: string | null; // 'YYYY-MM-DD'
  from_blank_successes: number;
  due: boolean;
}

export interface AptitudeLog {
  id?: string;
  user_id?: string;
  date: string;
  topic: string;
  questions: number;
  correct: number;
  minutes: number;
}

export interface SportLog {
  id?: string;
  user_id?: string;
  date: string;
  kind: SportKind;
  event_or_opponent: string;
  result?: string; // 'win' | 'loss' | 'draw'
  score?: string;
  duration_min?: number;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  user_id?: string;
  list: ChecklistList;
  group?: string;
  title: string;
  done: boolean;
  due_date?: string | null;
  notes?: string;
}

export interface Startup {
  id: string;
  user_id?: string;
  name: string;
  role: string;
  owned_last_30_days: string;
  users_or_customers: string;
  key_metric: string;
  next_milestone: string;
  milestone_date?: string | null;
  hours_per_week: number;
  status: StartupStatus;
}

export interface PushSubscriptionRecord {
  id?: string;
  user_id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}

export interface NotificationPref {
  id?: string;
  user_id?: string;
  type: string;
  enabled: boolean;
  lead_minutes: number;
}

export interface WeeklyReview {
  id?: string;
  user_id?: string;
  week_start_date: string;
  counting_days: number;
  core_done: number;
  possible_core: number;
  avg_bedtime: string;
  avg_waketime: string;
  best_day: string;
  worst_day: string;
  focus_minutes: number;
  review_items_cleared: number;
  aptitude_accuracy: number;
  sport_sessions: number;
  one_change: string;
  created_at?: string;
}

export interface AIMessage {
  id?: string;
  user_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}
