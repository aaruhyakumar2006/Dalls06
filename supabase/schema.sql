-- Supabase Schema for Daily Planner (Student Productivity PWA)
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  display_name text default 'Student',
  timezone text not null default 'Asia/Kolkata',
  wake_target text not null default '05:45',
  sleep_target text not null default '22:45',
  quiet_hours_start text not null default '23:00',
  quiet_hours_end text not null default '05:30',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. BLOCK TEMPLATES
create table if not exists public.block_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_type text not null check (day_type in ('weekday', 'weekend')),
  start_time text not null, -- 'HH:mm'
  label text not null,
  kind text not null check (kind in ('core', 'heavy', 'soft', 'fixed')),
  note text default '',
  minimum_text text default '',
  sort int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. DAY LOGS
create table if not exists public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null, -- 'YYYY-MM-DD' in Asia/Kolkata
  low_energy boolean default false not null,
  match_day boolean default false not null,
  core_done int default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- 4. BLOCK COMPLETIONS
create table if not exists public.block_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null, -- 'YYYY-MM-DD'
  block_key text not null, -- usually start_time or uuid
  done_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date, block_key)
);

-- 5. TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null, -- 'YYYY-MM-DD'
  title text not null,
  at_time text, -- 'HH:mm' optional
  duration_min int,
  description text, -- optional task notes, max 5000 chars
  recurrence_pattern text default 'none' check (recurrence_pattern in ('none', 'daily', 'weekly')),
  recurrence_end_date date, -- optional end date for recurring tasks
  tags jsonb default '[]'::jsonb, -- array of tag strings, e.g., ["urgent", "project-alpha"]
  done boolean default false not null,
  position int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. REVIEW ITEMS (Spaced Repetition)
create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic_kind text not null check (topic_kind in ('dsa', 'aptitude', 'other')),
  topic text default '',
  note text default '',
  stage int not null default 0, -- 0=1d, 1=3d, 2=7d, 3=14d, 4=30d
  next_review_at date not null default current_date,
  last_result text check (last_result in ('got_it', 'struggled', null)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. REVIEW EVENTS
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  review_item_id uuid not null references public.review_items(id) on delete cascade,
  result text not null check (result in ('got_it', 'struggled')),
  at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. FOCUS SESSIONS
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_key text,
  started_at timestamp with time zone not null,
  planned_min int not null,
  actual_min int not null default 0,
  completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. SLEEP LOGS
create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null, -- 'YYYY-MM-DD'
  bedtime text not null default '22:45',
  wake_time text not null default '05:45',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- 10. DSA TOPICS
create table if not exists public.dsa_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  status text not null default 'not_started' check (status in ('not_started', 'learning', 'solid')),
  last_practiced_at date,
  from_blank_successes int not null default 0,
  due boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, topic)
);

-- 11. APTITUDE LOGS
create table if not exists public.aptitude_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  topic text not null,
  questions int not null default 0,
  correct int not null default 0,
  minutes int not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. SPORT LOGS
create table if not exists public.sport_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  kind text not null check (kind in ('match', 'training')),
  event_or_opponent text not null,
  result text, -- 'win', 'loss', 'draw', etc.
  score text,
  duration_min int default 0,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. CHECKLIST ITEMS
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list text not null check (list in ('placement', 'startup', 'projects', 'hackathons')),
  "group" text not null default 'general',
  title text not null,
  done boolean not null default false,
  due_date date,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. STARTUPS
create table if not exists public.startups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  owned_last_30_days text default '',
  users_or_customers text default '',
  key_metric text default '',
  next_milestone text default '',
  milestone_date date,
  hours_per_week numeric(4,1) default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'leave')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. PUSH SUBSCRIPTIONS
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. NOTIFICATION PREFS
create table if not exists public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, -- 'block_start', 'task_reminder', 'wind_down', 'sleep', 'wake_up', 'review_due', 'weekly_review', 'checklist_due'
  enabled boolean not null default true,
  lead_minutes int not null default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, type)
);

-- 17. WEEKLY REVIEWS
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  counting_days int not null default 0,
  core_done int not null default 0,
  possible_core int not null default 0,
  avg_bedtime text default '',
  avg_waketime text default '',
  best_day text default '',
  worst_day text default '',
  focus_minutes int default 0,
  review_items_cleared int default 0,
  aptitude_accuracy numeric(5,2) default 0,
  sport_sessions int default 0,
  one_change text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 19. TAGS
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default 'blue',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, name)
);

-- 18. AI MESSAGES
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.block_templates enable row level security;
alter table public.day_logs enable row level security;
alter table public.block_completions enable row level security;
alter table public.tasks enable row level security;
alter table public.review_items enable row level security;
alter table public.review_events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.dsa_topics enable row level security;
alter table public.aptitude_logs enable row level security;
alter table public.sport_logs enable row level security;
alter table public.checklist_items enable row level security;
alter table public.startups enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.tags enable row level security;
alter table public.ai_messages enable row level security;

-- CREATE RLS POLICIES FOR AUTHENTICATED USERS
create policy "Users can manage own profile" on public.profiles for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own block_templates" on public.block_templates for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own day_logs" on public.day_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own block_completions" on public.block_completions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own tasks" on public.tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own review_items" on public.review_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own review_events" on public.review_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own focus_sessions" on public.focus_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own sleep_logs" on public.sleep_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own dsa_topics" on public.dsa_topics for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own aptitude_logs" on public.aptitude_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own sport_logs" on public.sport_logs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own checklist_items" on public.checklist_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own startups" on public.startups for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own push_subscriptions" on public.push_subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own notification_prefs" on public.notification_prefs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own weekly_reviews" on public.weekly_reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own tags" on public.tags for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own ai_messages" on public.ai_messages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- REALTIME REPLICATION (for cross-device instant sync)
-- Add tables to supabase_realtime publication
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.block_templates;
alter publication supabase_realtime add table public.day_logs;
alter publication supabase_realtime add table public.block_completions;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.review_items;
alter publication supabase_realtime add table public.focus_sessions;
alter publication supabase_realtime add table public.sleep_logs;
alter publication supabase_realtime add table public.dsa_topics;
alter publication supabase_realtime add table public.aptitude_logs;
alter publication supabase_realtime add table public.sport_logs;
alter publication supabase_realtime add table public.checklist_items;
alter publication supabase_realtime add table public.startups;
alter publication supabase_realtime add table public.tags;
