# DALLS — Your Daily Assistant

A mobile-first, offline-first productivity progressive web application (PWA) designed for students and professionals. Designed around the principle: **Push the user to do the work, not to plan or fiddle. Fast to open, fast to tick, hard to ignore.**

---

## 🚀 Features Built

- **Mobile-First PWA:** Installable on iOS (Safari) and Android (Chrome), offline shell caching via custom Service Worker (`/sw.js`), full safe-area inset support, and standalone display.
- **Timetable & Focus Blocks:** Ported from `Daily Planner.html` mock with exact design tokens, dark "Right now" card with yellow accent border, solid focus blocks, habit rows, and dashed fixed items.
- **Streak & Counting Days:** Streak increments only when at least 2 non-skipped focus (`core` or `heavy`) blocks are completed. If today has not yet reached 2 blocks, the streak displays yesterday's chain so it never breaks mid-day.
- **Dynamic Day Modes:**
  - *Low-energy day:* Switches blocks to minimum versions (e.g., "Just 20 minutes is enough today").
  - *Match day:* Automatically greys out heavy deep work ("Skipped today because of the match") and adds the evening badminton match block.
- **Natural Language Task Quick-Add:** Parses `at 8pm`, `30 min`, `2 hours`, etc., generates Google Calendar 1-tap links, and supports touch drag-and-drop (`@dnd-kit`) + arrow button fallbacks.
- **Spaced-Review Log:** Spaced repetition stages (1d, 3d, 7d, 14d, 30d) with "Got it from blank" and "Struggled" (reset) actions, and "try this from blank" prompts.
- **Focus Timer:** 20m, 25m, 45m, 60m presets with pre-start "Phone in another room?" anti-distraction check, timestamp delta calculation that survives background mobile browser sleep, and direct session logging.
- **Sleep & Metric Correlations:** 2-tap morning log, 7-day sleep chart against 22:45 / 05:45 targets, and analysis comparing focus completion on short-sleep (<7h) vs adequate-sleep days.
- **DSA & Aptitude Trackers:** 9 seed DSA topics with "Practiced from blank" tracking, 7-day review due flags, and timed aptitude accuracy / seconds-per-question analytics.
- **Sport Log:** Badminton match record (W/L), drill session tracking, and inactivity alert if no own training occurred in 7 days.
- **Placement & Startup Checklists:** Seeded placement roadmaps, startup audit form (with interview story guidance for megsyra.in), flagship project specifications, and hackathon workflow checklists.
- **Sunday Weekly Review:** Live 7-day summary (counting days, focus minutes, aptitude accuracy, sleep hygiene) with required "My one change next week" field.
- **Realtime Cross-Device Sync:** Supabase Realtime subscriptions to sync phone and laptop within 1-2 seconds, with optimistic UI and local fallback storage.
- **Web Push Notifications:** VAPID push notification support with `/api/cron/send-reminders` 1-minute idempotent scheduler (10-min task lead alerts, 05:45 wake-up, 19:15 review due, 22:15 wind-down, 22:45 sleep).
- **AI Coach (Groq / NVIDIA swappable):** Streaming OpenAI-compatible assistant that parses messy sentences into tasks, provides from-blank practice questions, conducts mock interviews, and audits weekly consistency.

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS with exact CSS custom property tokens for Light & Dark modes
- **Typography:** Google Fonts Sora for numbers & headings; system font stack for body
- **Database & Auth:** Supabase (PostgreSQL, Row-Level Security on every table, Realtime)
- **Push Engine:** `web-push` with service worker push event handlers
- **AI Engine:** Groq (default: `llama-3.3-70b-versatile`) or NVIDIA (`meta/llama-3.1-70b-instruct`)

---

## 📦 Setup & Local Development

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd "personal todo"
npm install
```

### 2. Generate PWA Assets (Optional if existing)
```bash
node scripts/generate-icons.js
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in the required keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

VAPID_PUBLIC_KEY=<your-generated-vapid-public-key>
VAPID_PRIVATE_KEY=<your-generated-vapid-private-key>
VAPID_SUBJECT=mailto:student@dailyplanner.app

CRON_SECRET=your-secure-random-token

AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=gsk_your_groq_api_key
AI_MODEL=llama-3.3-70b-versatile
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄 Supabase Setup Instructions

1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Open `supabase/schema.sql` in this repo and execute the entire script. This will:
   - Create all tables (`profiles`, `block_templates`, `day_logs`, `block_completions`, `tasks`, `review_items`, `focus_sessions`, `sleep_logs`, `dsa_topics`, `aptitude_logs`, `sport_logs`, `checklist_items`, `startups`, `push_subscriptions`, `notification_prefs`, `weekly_reviews`, `ai_messages`).
   - Enable Row-Level Security (RLS) on all tables with `auth.uid() = user_id`.
   - Add tables to the `supabase_realtime` publication for instant cross-device updates.
4. In **Authentication -> URL Configuration**, add:
   - Site URL: `https://your-deployment-domain.vercel.app` (or `http://localhost:3000`)
   - Redirect URL: `https://your-deployment-domain.vercel.app/auth/callback`
5. Copy the Project URL and Anon key from **Project Settings -> API** into your environment variables.

---

## 🔔 Web Push & VAPID Setup

1. Generate a pair of VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Put the Public Key in `VAPID_PUBLIC_KEY` and Private Key in `VAPID_PRIVATE_KEY`.
3. In the app, open **Settings -> Push Notifications** and click **Enable Push**.
4. Test the delivery by clicking **Test Push**.

> **Note for iOS Users:** On iPhone, Web Push is available on iOS 16.4+ only after adding the website to the Home Screen. Open Safari -> tap the Share icon -> tap **"Add to Home Screen"**.

---

## ⏰ Cron Scheduler Configuration (`/api/cron/send-reminders`)

The route `/api/cron/send-reminders` runs every minute to deliver timely reminders in `Asia/Kolkata` time. You can set it up using any of the following:

### Option A: cron-job.org (Free & Simplest)
1. Register at [cron-job.org](https://cron-job.org).
2. Create a cron job:
   - URL: `https://your-app.vercel.app/api/cron/send-reminders?secret=YOUR_CRON_SECRET`
   - Schedule: Every 1 minute (`* * * * *`)

### Option B: GitHub Actions Cron
Create `.github/workflows/cron.yml`:
```yaml
name: 1-Minute Planner Cron
on:
  schedule:
    - cron: '* * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s "https://your-app.vercel.app/api/cron/send-reminders?secret=${{ secrets.CRON_SECRET }}"
```

### Option C: Supabase pg_cron + Edge Function
Run in Supabase SQL editor:
```sql
select cron.schedule(
  'send-planner-reminders',
  '* * * * *',
  $$
  select net.http_get(
    url:='https://your-app.vercel.app/api/cron/send-reminders?secret=YOUR_CRON_SECRET'
  );
  $$
);
```

---

## 🚢 Deploying to Vercel

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Environment Variables in Vercel Project Settings matching `.env.example`.
4. Deploy! Your PWA will be live with instant HTTPS, edge caching, and real-time push notification support.
