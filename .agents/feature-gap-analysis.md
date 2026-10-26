# Daily Planner — Feature Gap & Enhancement Analysis

## Executive Summary

The **Daily Planner** is an ambitious Next.js PWA for CSE student productivity—40% feature-complete with a solid Supabase backend, strong UI/UX patterns, and strategic product vision. The database schema is comprehensive (18 tables), and authentication infrastructure exists but is **never invoked in the UI**. The core blocker: **auth is scaffolded but dead**. This breaks all downstream features: no persistence, no cloud sync, no real-time updates, no push notifications reaching users. The UI and state management (`store.tsx`) are well-architected for local-first use, but the bridge to Supabase is incomplete. Development stopped at ~40% after routing, templates, and analytics were defined—most daily and block-tracking features work locally, but weekly reviews, AI chat, task reminders, and all multi-device features are inaccessible.

**Current State:** Fully functional as a single-device local planner with intelligent scheduling, spaced review, focus blocks, and gamification.

**Biggest Blockers (in order):**
1. Authentication UI is dead—sign-in buttons exist but users cannot log in (gate always skipped)
2. Data never syncs to Supabase (Realtime subscriptions configured but never triggered)
3. Weekly review has no "Save" button—form displays but changes vanish on refresh
4. Chat history not persisted—all AI Coach conversations lost on page reload
5. Push notifications unreachable—subscribe endpoint has no UI button to enable them
6. Task reminders rely on local browser time, not server cron scheduler

---

## Current State Assessment

### What Works End-to-End

1. **Local-Only Timetable Scheduling**
   - Default weekday/weekend block templates (12 weekday + 9 weekend blocks)
   - Custom block CRUD (add/edit/delete core/heavy/soft/fixed blocks)
   - Block completion tracking with localStorage persistence
   - Streak calculation (consecutive counting days: 2+ core blocks done = day counts)
   - Live 7-day performance strip (Mon–Sun completion chart)

2. **Daily Task Management**
   - Quick-add interface ("Python write from blank 20 min at 06:00")
   - Natural language parsing of time/duration (partial: "at 8pm" may fail if not formatted as "HH:mm")
   - Drag-to-reorder tasks
   - Task completion toggle with affirmation toasts
   - Tasks filtered by date

3. **Spaced Review (SRS)**
   - Add concepts to spaced repetition queue
   - Five review stages (1d, 3d, 7d, 14d, 30d intervals)
   - "Got it" → promote stage; "Struggled" → reset to 1d
   - Due-today filtering
   - Confetti celebration on stage advance
   - All data stored locally

4. **Block Completion & Gamification**
   - Toggle individual blocks ✓/✗
   - Dynamic streak calculation with milestone toasts ("7 days straight!")
   - Affirmation messages randomized per block type
   - Confetti on full-day completion

5. **Local Settings Management**
   - Wake/sleep targets configurable
   - Timezone defaulted to Asia/Kolkata
   - Notification toggles stored in localStorage
   - Account tab with "Delete All Local Data" button

6. **Modals & Navigation**
   - Tab-based navigation (Today / Review / Track / Plan / Assistant)
   - Auth gate (displays sign-in option but can be skipped)
   - Onboarding modal
   - Settings modal (templates, notifications, targets, account)
   - Weekly schedule modal (bulk upload via textarea)
   - Focus timer modal (exists but data never saved)
   - Profile modal

7. **AI Coach Tab (Read-Only State)**
   - Chat interface with message history
   - Streaming responses from Groq/NVIDIA API
   - Rate limiting (25 req/min per IP)
   - Task parsing mode (returns JSON draft)
   - Hardcoded fallback responses when AI_API_KEY is missing
   - **Does NOT persist chat history** (disappears on refresh)

8. **Service Worker & PWA**
   - Service worker registration in AppShell
   - Manifest.json with app icons and shortcuts
   - Install-to-home-screen support
   - Local notifications possible (via browser Notification API)

### What Is Partially Implemented (Stubs, TODOs, Placeholders)

1. **Authentication (Critical Gap)**
   - `signInWithGoogle()` in store.tsx (calls supabase.auth.signInWithOAuth) — **never called from UI**
   - `signInWithEmail()` magic link flow — **never called from UI**
   - `signOut()` exists but unreachable
   - AuthModal component exists with full UI but gate always allows skip
   - User state initialized to `null` and never set to a real user
   - **Issue:** `page.tsx` shows auth gate, but `setShowAuthPrompt(false)` button skips it; no mandatory flow

2. **Supabase Sync (Broken Pipeline)**
   - `syncToSupabase()` helper in store.tsx queues changes to `pendingChanges` array
   - Realtime subscriptions set up on mount (block_completions, tasks, day_logs)
   - Retry logic exists for offline scenarios
   - **But:** User must be authenticated for sync to work (`if (!user) { queue change }`)
   - Since no one ever logs in, nothing syncs
   - Sync status shows "local_only" or "offline" but never "synced"

3. **Push Notifications (Endpoint Exists, No UI)**
   - `/api/notifications/subscribe` route POST handler (saves to push_subscriptions table)
   - VAPID key endpoint (`/api/notifications/vapid-key`)
   - Test push endpoint (`/api/notifications/test`)
   - WebPush configuration in `webpush.ts` with retry + cleanup on 404/410
   - SettingsModal has "Enable Push Notifications" button that calls `handleSubscribePush()`
   - **But:** `handleSubscribePush()` silently falls back to local notifications if VAPID keys missing
   - User is never told whether subscriptions succeeded or failed
   - Cron scheduler at `/api/cron/send-reminders` exists but has no UI to trigger it or verify it's running

4. **Task Reminders (Local Only)**
   - Reminder check runs every 60 seconds in store.tsx
   - Finds tasks 10 minutes before start time
   - Shows localStorage-based toast + browser Notification if permission granted
   - **But:** Uses local browser time, not server time (no timezone guarantee)
   - Relies on browser staying open and app tab active
   - Cron-based server reminders would be more reliable but never invoked

5. **AI Coach Chat Persistence**
   - Messages state in AssistantTab component
   - API streaming to Groq/NVIDIA works
   - **But:** No database table write (ai_messages table exists in schema but never used)
   - Chat history in-memory only—lost on page refresh
   - No historical context loaded on mount

6. **Weekly Review Form**
   - PlanTab "Sunday Review" tab shows live metrics
   - Form displays all 7 fields (counting days, core done, sleep times, best/worst day, focus minutes, aptitude accuracy, sport sessions)
   - User fills "My One Change Next Week" textarea
   - `handleWeeklyReviewSubmit()` calls `saveWeeklyReview()`
   - Confetti fires on submit
   - **But:** Form submits to store state, NOT to Supabase (offline-first)
   - Past reviews display correctly from localStorage
   - **Missing:** No "Save to Database" button or cloud sync indicator
   - Data persists locally but never reaches backend

7. **Focus Session Timer**
   - FocusTimerModal component exists with start/pause/stop controls
   - `logFocusSession()` in store.tsx to record session
   - Timer UI shows planned vs. actual minutes
   - **But:** Component not clearly integrated into main flow
   - Data stored locally in focusSessions array
   - No way to view historical focus logs (no Focus tab UI)

8. **DSA Topic Tracking**
   - DSA topics seeded with 9 default topics (Arrays, Hashing, Recursion, etc.)
   - `updateDsaTopic()` and `recordDsaPractice()` handlers in store
   - "From blank successes" counter increments
   - `due` flag exists
   - **Issue #3 (Known Critical):** After marking "Practiced from blank ✓", the `due` flag never resets—topic stays "DUE FOR RECALL" forever
   - No UI in TrackTab to clearly show DSA due status or mark as practiced

9. **Day Modes (Low-Energy & Match-Day)**
   - `toggleLowEnergy()` and `toggleMatchDay()` exist in store
   - UI toggle buttons exist in TodayTab
   - Match-day skips heavy blocks from streak calculation
   - Low-energy sets minimum_text guidance
   - **But:** UI doesn't visually adapt to these modes (no stylesheet changes, same block display)
   - User can toggle but sees no immediate visual feedback beyond state change

10. **Hydration Flash**
    - On first page load, localStorage is read in useEffect with delay
    - Before data loads, store state is empty (dayLogs={}, completions={}, etc.)
    - Component tree renders briefly with empty data, then populates
    - **Visible flicker:** ~100–200ms blank state before hydration

11. **Block Completion Sync Reliability**
    - When block is marked done, `toggleBlock()` calls `syncToSupabase('block_completions', ...)`
    - If offline, change is queued in pendingChanges
    - On reconnect, retry logic fires
    - **But:** Retry queue has no UI indicator of sync status
    - User thinks data saved when offline, but UI gives no feedback on whether sync succeeded
    - Next login on another device may show data as not synced if sync failed

12. **Checklist Items (Placement, Startup, Projects, Hackathons)**
    - 30 pre-seeded checklist items in 4 categories
    - Toggle completion locally
    - Add new items via form
    - Due-date picker on new items
    - **But:** No UI dashboard for overdue items
    - No notifications when due dates pass
    - No database persistence (local only)

13. **Startup Audit**
    - Component has full form fields (name, role, hours/week, owned_last_30_days, users_or_customers, key_metric, next_milestone, milestone_date, status)
    - megsyra.in pre-populated as default startup
    - `handleStartupSaveSubmit()` calls `saveStartup()`
    - **But:** Saves to local state only, never to Supabase
    - No historical audit trail UI
    - Cannot manage multiple startups simultaneously (only one editable form)

### What Is Referenced But Never Implemented (Dead Imports, Undefined Functions)

1. **Authentication Functions Called But Never Invoked**
   - `signInWithGoogle()` in AuthModal exists but button handler onClick never fires (gate skipped)
   - `signInWithEmail()` email form exists but not integrated
   - `signOut()` button exists but unreachable (user always null)
   - **Root cause:** `page.tsx` shows auth gate with "Continue Without Signing In" button that bypasses auth

2. **Supabase RLS Policies**
   - All 18 tables have RLS enabled with `auth.uid() = user_id` checks
   - Policies defined for all CRUD operations
   - **But:** Never tested (no authenticated users ever created)

3. **Notification Preference Table**
   - `notification_prefs` table in schema with type, enabled, lead_minutes columns
   - Settings modal shows toggles (blockStart, taskReminders, wakeUp, sleep, reviewDue, weeklyReview, quietHours)
   - Stored in localStorage only
   - **Should be:** Persisted to notification_prefs table per user

4. **Review Events Table**
   - `review_events` table to log spaced review attempts (result: 'got_it'/'struggled', timestamp)
   - `recordReviewResult()` calls `syncToSupabase('review_events', ...)`
   - **But:** Since no user is authenticated, events queue but never post to Supabase

5. **Weekly Reviews Table**
   - `weekly_reviews` table with full schema (week_start_date, counting_days, core_done, possible_core, avg_bedtime, avg_waketime, best_day, worst_day, focus_minutes, review_items_cleared, aptitude_accuracy, sport_sessions, one_change)
   - Form collects all fields
   - `saveWeeklyReview()` queues change to pendingChanges
   - **But:** Never reaches Supabase

6. **AI Messages Table**
   - `ai_messages` table defined (role: user/assistant/system, content, created_at)
   - AssistantTab maintains message history in component state
   - **Never written to database**

7. **Aptitude Logs Table**
   - `aptitude_logs` table: date, topic, questions, correct, minutes
   - `addAptitudeLog()` in store exists
   - **But:** No UI in app to log aptitude sessions (no "Log Aptitude Result" form visible)
   - TrackTab shows aggregated accuracy % but no way to record new sessions

8. **Sport Logs Table**
   - `sport_logs` table: date, kind (match/training), event_or_opponent, result, score, duration_min, notes
   - `addSportLog()` in store exists
   - **But:** No UI to add sport logs (no "Log Match" or "Log Training" form in TrackTab)

9. **Sleep Logs Table**
   - `sleepLogs` state in store
   - `saveSleepLog()` in store
   - **But:** No UI to input sleep data (no form in settings or today tab)
   - Code references sleepLogs for weekly metrics, but user cannot record them

10. **Cron Scheduler (`/api/cron/send-reminders`)**
    - Comprehensive scheduler with fixed daily times (5:45 wake-up, 19:15 spaced review, 20:30 Sunday weekly review, 22:15 wind-down, 22:45 sleep)
    - Timed task reminder logic (10 min before task start)
    - Deduplication via in-memory Set
    - **But:** No UI to invoke it; developer must manually call endpoint or set up external cron job (e.g., EasyCron, GitHub Actions)
    - No status dashboard to confirm scheduler ran or sent reminders

11. **Natural Language Task Parsing**
    - `parseNaturalTask()` import in AssistantTab
    - Code references it: `const parsed = parseNaturalTask(input)`
    - **But:** Function not found in `src/lib/utils/time.ts`
    - Likely incomplete or deleted mid-refactor

12. **Command Palette / Search**
    - `CommandPalette` component imported in AppShell
    - No visible UI integration
    - Likely incomplete

13. **Settings Page Missing**
    - SettingsModal exists and is feature-rich
    - But no permanent "Settings" page view (modal only)
    - Mobile UX assumes modal access, no persistent sidebar

---

## Critical Issues (Must Fix First)

### 🔴 1. Authentication Never Invoked — No Users Can Sign In

**Priority:** CRITICAL  
**Effort:** 2–4 hrs  
**Impact:** 10/10 (blocks everything else)  
**Category:** Core/Auth  
**Root Cause:**

- `page.tsx` line 24–35: Auth gate shows modal but "Continue Without Signing In" button always clicked
- `setShowAuthPrompt(false)` bypasses entire auth flow
- No mandatory sign-in; users always remain in local-only mode

**Files Involved:**
- `src/app/page.tsx` (auth gate logic)
- `src/components/modals/AuthModal.tsx` (sign-in UI)
- `src/lib/storage/store.tsx` (signInWithGoogle/signInWithEmail functions defined but never called)

**Fix:**

1. **Remove the bypass button** or make it secondary and buried
2. **Make auth mandatory** for first-time users; gate page until email or Google sign-in succeeds
3. **Show clear benefits** of signing in above the fold (multi-device sync, offline-first, cloud backup)
4. **Add email verification flow** — send magic link, verify before accessing app (see store.tsx `signInWithEmail()`)
5. **Set up auth callback handler** at `src/app/auth/callback/route.ts` to catch OAuth redirect from Supabase

**Verification:**
- User can log in via Google or email magic link
- Session persists across page reloads
- `usePlanner().user` is set to actual user object (not null)

---

### 🔴 2. Weekly Review Form Has No Save Button — Changes Vanish

**Priority:** CRITICAL  
**Effort:** 1–2 hrs  
**Impact:** 8/10  
**Category:** Data/Core  
**Root Cause:**

- `PlanTab.tsx` line 129–165: `handleWeeklyReviewSubmit()` saves to local state only (`saveWeeklyReview()`)
- No indication whether data synced to Supabase
- No manual "Save to Cloud" button
- Form is hidden until auth + sync implemented

**Files Involved:**
- `src/components/tabs/PlanTab.tsx` (form and submit handler)
- `src/lib/storage/store.tsx` (saveWeeklyReview implementation)

**Fix:**

1. **Add explicit "Save & Sync" button** below the textarea
2. **Show sync status** (spinner, checkmark, offline indicator) after submit
3. **Prevent submit if user not authenticated** with clear message: "Sign in to save your weekly review to the cloud"
4. **Queue locally if offline**, sync on reconnect
5. **Once issue #1 is fixed** (auth working), this inherits Supabase sync automatically

**Verification:**
- Form submission shows saving state
- Weekly review appears in Supabase `weekly_reviews` table
- Data persists across sessions and devices

---

### 🔴 3. DSA Topics Never Reset After Practice — Due Flag Stuck

**Priority:** CRITICAL  
**Effort:** 2–3 hrs  
**Impact:** 7/10  
**Category:** Core/Logic  
**Root Cause:**

- `store.tsx` `recordDsaPractice()` increments `from_blank_successes` but **never sets `due: false`**
- TrackTab or other UI never shows DSA topic due status or provides a way to clear the flag
- Topic stays `due: true` forever once set

**Files Involved:**
- `src/lib/storage/store.tsx` (recordDsaPractice function line ~540)
- `src/components/tabs/TrackTab.tsx` (no UI to show/manage DSA due flag)

**Fix:**

1. **Modify `recordDsaPractice()`** to set `due: false` after successful practice
2. **Add DSA due status column** to TrackTab showing:
   - Topic name
   - Status (not_started / learning / solid)
   - "From Blank" success count
   - Due flag (show red badge if due)
3. **Add "Mark as Practiced" button** to explicitly clear due flag
4. **Reset due flag** after 3 consecutive successes from blank (auto-lock-in behavior)

**Verification:**
- Mark DSA topic as practiced → due flag becomes false
- Due flag disappears from UI
- On next practice, flag can be set again if user struggles

---

### 🔴 4. AI Chat History Not Persisted — Conversations Lost on Refresh

**Priority:** CRITICAL  
**Effort:** 3–4 hrs  
**Impact:** 7/10  
**Category:** Data/Integration  
**Root Cause:**

- `AssistantTab.tsx`: Messages held in component state only
- No database writes to `ai_messages` table
- Every page refresh starts fresh conversation

**Files Involved:**
- `src/components/tabs/AssistantTab.tsx` (message state and send handler)
- `src/lib/storage/store.tsx` (add `saveAiMessage()` function)
- Database: `ai_messages` table (exists but never used)

**Fix:**

1. **Add `saveAiMessage()` function** in store.tsx to queue message to `ai_messages` table
2. **Write both user and assistant messages** to database on send (after streaming completes)
3. **Load historical messages** on AssistantTab mount if user authenticated
4. **Implement pagination** if conversation gets long (>100 messages)
5. **Show loading indicator** while fetching history on mount

**Verification:**
- Send chat message → appears in Supabase `ai_messages` table with user_id, role, content, created_at
- Reload page → chat history loads and displays
- Can see message timestamps and distinguish user/assistant

---

### 🔴 5. Push Notification Subscribe Button Has No UI — Reminders Unreachable

**Priority:** CRITICAL  
**Effort:** 2–3 hrs  
**Impact:** 6/10  
**Category:** Integration/Notifications  
**Root Cause:**

- SettingsModal has "Enable Push Notifications" button but no feedback on success/failure
- Endpoint `/api/notifications/subscribe` exists but silently fails if VAPID keys missing
- Cron scheduler at `/api/cron/send-reminders` exists but no way for user to verify it's running
- No dashboard showing subscribed devices

**Files Involved:**
- `src/components/modals/SettingsModal.tsx` (push subscribe button, lines ~110–135)
- `src/app/api/notifications/subscribe/route.ts` (endpoint)
- `src/app/api/cron/send-reminders/route.ts` (scheduler)
- `src/lib/notifications/webpush.ts` (VAPID config)

**Fix:**

1. **Check VAPID keys on app load** — show banner if missing: "Push notifications not configured. Contact admin."
2. **Show subscription status** in settings (e.g., "✓ Subscribed on 2 devices" or "Not subscribed yet")
3. **After subscribe click**:
   - Show spinner
   - Send test notification immediately
   - Display success/failure toast
   - Log timestamp to localStorage
4. **Add "Unsubscribe from this device" button**
5. **Provide admin dashboard** (developer-only) to:
   - Verify VAPID keys loaded
   - See subscriber count
   - Manually trigger test cron run
   - View scheduler logs (last 10 runs)

**Verification:**
- Click "Enable Push Notifications" → browser asks for permission
- After granting → toast shows "Subscribed!"
- Check Supabase `push_subscriptions` table → new record with user_id, endpoint, keys
- Manual cron trigger sends test notification

---

### 🔴 6. Block Completions Sync Silently Fails Offline — No User Feedback

**Priority:** CRITICAL  
**Effort:** 2–3 hrs  
**Impact:** 6/10  
**Category:** Data/Sync  
**Root Cause:**

- When block marked done offline, `syncToSupabase()` queues change to `pendingChanges` array
- Change resyncs on reconnect
- **But:** No UI indicator of sync status
- User thinks data saved when it's actually queued
- If retry fails 3 times, change silently dropped

**Files Involved:**
- `src/lib/storage/store.tsx` (syncToSupabase function, retry logic lines ~210–260)
- `src/components/layout/AppShell.tsx` (sync status indicator)
- `src/components/ui/` (need sync status badge UI)

**Fix:**

1. **Add sync status badge** to top nav showing:
   - 🟢 Synced (all changes synced)
   - 🟡 Syncing (pending changes being sent)
   - 🔴 Offline (queued, waiting for connection)
   - ⚠️ Failed (retry exhausted, data may be lost)
2. **Show toast** when sync status changes
3. **Persist `pendingChanges`** to localStorage (already done) but also show queue size in badge
4. **Implement manual retry button** if sync failed
5. **After 3 failed retries, show warning modal:**
   - "Block completion did not sync. Retry? Or continue locally?"
   - Option to retry or discard
6. **Keep all pending changes visible** in a "Sync Queue" settings page

**Verification:**
- Turn off WiFi → toggle block → "Offline" badge appears
- Turn on WiFi → "Syncing..." then "Synced" + green checkmark
- Check Supabase `block_completions` table → new record appears
- View sync queue in settings

---

### 🟠 7. Task Reminders Don't Reliably Fire — Local Time, No Server Guarantee

**Priority:** HIGH  
**Effort:** 3–4 hrs  
**Impact:** 7/10  
**Category:** Notifications  
**Root Cause:**

- Current reminder check runs every 60s in `store.tsx` (lines ~400–435)
- Relies on local browser time (not server timezone-aware)
- Only fires if app tab is open
- Doesn't persist if browser closes
- Timezone may not match Asia/Kolkata if user's device is misconfigured

**Files Involved:**
- `src/lib/storage/store.tsx` (checkTaskReminders interval)
- `src/app/api/cron/send-reminders/route.ts` (server-side scheduler exists but is for fixed times only, not tasks)

**Fix:**

1. **Extend server cron** at `/api/cron/send-reminders` to also query tasks with `at_time` matching current time + 10 mins
2. **Remove browser-based reminder loop** or keep it as fallback only
3. **Verify server timezone** is Asia/Kolkata (hardcoded in cron, lines ~20–35)
4. **Send push notification** from cron instead of relying on browser Notification API
5. **Add cron status page** showing last run timestamp and tasks queried

**Verification:**
- Create task "05:55" (10 mins before 6am)
- At 5:45 UTC+5:30 server time, cron fires and sends notification
- User receives push notification even if app closed
- Cron logs show task was found and notification sent

---

## Missing Core Features

### 📊 Issue #8: 8 Database Tables Have No UI — Inaccessible Data

**Priority:** HIGH  
**Effort:** 6–8 hrs  
**Impact:** 5/10  
**Category:** Core/UX  

**Affected Tables & Missing UX:**

1. **Aptitude Logs** — No form to log quiz sessions
   - **Should be:** Button in TrackTab or daily flow to "Log Aptitude Session" (topic, questions, correct, minutes)
   - **Currently:** Computed from empty array in weekly metrics

2. **Sport Logs** — No form to log matches/training
   - **Should be:** "Add Match" / "Add Training Session" form showing opponent, result, score, duration
   - **Currently:** Computed from empty array for weekly summary

3. **Sleep Logs** — No UI to input sleep data
   - **Should be:** Form in daily view or settings to enter bedtime/wake time
   - **Currently:** Computed but never populated; defaults to profile targets

4. **Focus Sessions** — Form exists but hidden; no historical view
   - **Should be:** Dashboard tab showing focus session history, total focus hours, best time of day for deep work
   - **Currently:** FocusTimerModal exists but not integrated

5. **Notification Preferences** — Toggles in localStorage, not database
   - **Should be:** Each notification type (block_start, task_reminder, wind_down, sleep, review_due, weekly_review, checklist_due) have database records per user
   - **Currently:** Only local storage, lost if user switches devices

6. **Review Events** — Logged but no analytics view
   - **Should be:** Dashboard showing "% of reviews mastered on first attempt", struggles per topic, best time to review
   - **Currently:** Events queue to database but no UI to analyze

7. **Push Subscriptions** — Endpoint subscribes but no device management
   - **Should be:** Settings page showing "Active on 3 devices: iPhone (Safari), MacBook (Chrome), Windows (Edge)", unsubscribe button per device
   - **Currently:** Silently stored; user doesn't know if subscribed

8. **Notification Types (Inferred)** — No admin UI to customize
   - **Should be:** Per-user lead times (e.g., "Alert me 15 mins before block, not 10")
   - **Currently:** Hardcoded in cron (10 mins before tasks, fixed times for daily reminders)

**Fix Approach:**
- Create new "Logs" tab or merge into TrackTab
- Add forms for sport, sleep, aptitude logging
- Show focus session history
- Implement analytics dashboard (struggle %, best review time)
- Create device management view in settings
- Allow per-notification customization

**Verification:**
- Log sport session → appears in TrackTab sport list
- Log sleep → updates next day's sleep data in weekly metrics
- Log aptitude → updates accuracy % immediately
- View focus history → shows last 10 sessions, total hours this week

---

### 📝 Issue #9: Natural Language Task Parsing May Fail

**Priority:** HIGH  
**Effort:** 2–3 hrs  
**Impact:** 4/10  
**Category:** Integration  

**Root Cause:**
- `parseNaturalTask()` imported in AssistantTab but **function not found** in `src/lib/utils/time.ts`
- Commands like "Python write from blank 20 min at 06:00" work because regex is inline in addTask()
- But free-form input like "at 8pm" or "tonight" fails parsing

**Files Involved:**
- `src/components/tabs/AssistantTab.tsx` (line 9, import parseNaturalTask)
- `src/lib/utils/time.ts` (function stub or missing)

**Fix:**
1. **Implement parseNaturalTask()** that accepts any text and returns `{ title, at_time, duration_min }`
2. **Support formats:**
   - "Python at 06:00" → at_time: "06:00", duration_min: null
   - "Aptitude 20 min" → at_time: null, duration_min: 20
   - "DSA at 8pm for 45 min" → at_time: "20:00", duration_min: 45
   - "tonight" → today's time + duration from context
3. **Use AI Coach to parse** if manual regex fails (mode: 'parse_task')
4. **Show parsed preview** before confirming

**Verification:**
- "Python write from blank tonight 30 min" → correctly parsed to 20:00–21:00 (or current evening slot)
- "Aptitude timed 15 questions" → duration auto-set to 20 min

---

### 🔔 Issue #10: Push Notification Setup Instructions Unclear

**Priority:** MEDIUM  
**Effort:** 1–2 hrs  
**Impact:** 3/10  
**Category:** UX/Documentation  

**Root Cause:**
- SettingsModal mentions iOS requirement but buried in small text
- No clear step-by-step guide
- VAPID key requirement not explained

**Fix:**
1. **Add onboarding card** the first time user opens Settings explaining:
   - "Push notifications require VAPID keys (configured by admin)"
   - "iOS (Safari) requires adding to Home Screen first"
   - "Timed task reminders fire even if app closed"
2. **Link to VAPID key setup docs**
3. **Show VAPID status** (✓ Configured / ✗ Missing)

**Verification:**
- New user sees clear setup flow
- Can click through to docs if needed

---

## UI/UX Improvements

### 🎨 Issue #11: Hydration Flash on Page Load

**Priority:** MEDIUM  
**Effort:** 2 hrs  
**Impact:** 3/10  
**Category:** UX  

**Current Behavior:**
- App loads, localStorage read happens, brief blank state (~100–200ms) before data renders
- User sees blocks disappear and reappear

**Fix:**
1. **Pre-render cached UI** from sessionStorage on mount (fast path)
2. **Show skeleton loaders** instead of blank space
3. **Use Suspense** to defer data-heavy sections
4. **Mark app as "hydrating"** state and hide transitions

**Verification:**
- Page load has no visible flicker
- User always sees content (skeleton or real)

---

### 🎨 Issue #12: Day Modes (Low-Energy, Match-Day) Don't Change UI

**Priority:** LOW  
**Effort:** 2–3 hrs  
**Impact:** 2/10  
**Category:** UX/Polish  

**Current Behavior:**
- Toggles exist but UI doesn't adapt
- Low-energy should show shorter minimum-text guidance
- Match-day should gray out heavy blocks

**Fix:**
1. **Low-energy mode:** Filter blocks to only show minimum_text blocks; hide full block cards
2. **Match-day mode:** Show heavy blocks grayed out (not required for streak)
3. **Add visual badge** to show mode is active

**Verification:**
- Toggle low-energy → blocks show 20-min minimums only
- Toggle match-day → heavy blocks show as optional

---

### 🎨 Issue #13: Command Palette Not Integrated

**Priority:** LOW  
**Effort:** 3–4 hrs  
**Impact:** 2/10  
**Category:** UX/Polish  

**Current Behavior:**
- Component exists but not used; never opens
- No keyboard shortcut registered

**Fix:**
1. **Register Cmd+K / Ctrl+K** to open palette
2. **Implement quick commands:**
   - "Add task"
   - "Log aptitude"
   - "Start focus timer"
   - "Go to settings"
   - "Sign out"
3. **Fuzzy search** for quick navigation between tabs

**Verification:**
- Press Cmd+K → palette opens
- Type "add task" → navigates to quick-add and focuses input

---

## Integration Opportunities

### 🔗 Issue #14: Google Calendar Sync (Optional, High-Value)

**Priority:** MEDIUM  
**Effort:** 5–6 hrs  
**Impact:** 6/10  
**Category:** Integration/Advanced  

**Opportunity:**
- Sync block templates and task schedule to Google Calendar
- Import calendar events and surface as fixed blocks
- Show calendar view of the week

**Implementation:**
1. Add Google Calendar OAuth scope in auth setup
2. On save of template, POST to Google Calendar API
3. Fetch calendar events on mount and highlight in view

**Verification:**
- Create block → appears in Google Calendar
- Calendar event → shows as fixed block in planner

---

### 🔗 Issue #15: Email Digest (Optional, Medium-Value)

**Priority:** LOW  
**Effort:** 4–5 hrs  
**Impact:** 4/10  
**Category:** Integration/Advanced  

**Opportunity:**
- Weekly digest email with summary, metrics, recommendations
- Triggered every Sunday (configurable)

**Implementation:**
1. Add email template
2. Cron job to generate digest and send via email provider (SendGrid, Resend)
3. User can toggle digest in settings

---

### 🔗 Issue #16: Discord / Slack Bot Notifications (Optional, Low-Value)

**Priority:** LOW  
**Effort:** 3–4 hrs  
**Impact:** 2/10  
**Category:** Integration/Nice-to-Have  

**Opportunity:**
- Sync daily summary to Discord/Slack channel
- Get reminders via Slack

---

## Data & Analytics

### 📈 Issue #17: Analytics Dashboard Missing

**Priority:** MEDIUM  
**Effort:** 4–5 hrs  
**Impact:** 5/10  
**Category:** Analytics  

**Missing Metrics:**
- Struggle rate by DSA topic
- Best time of day for focus sessions
- Correlation between sleep and next-day performance
- Accuracy trend over time (aptitude)
- Win rate by block type

**Implementation:**
1. Create new "Analytics" tab or page
2. Query review_events, aptitude_logs, sleep_logs, focus_sessions
3. Render charts (Chart.js or Recharts)
4. Show insights (e.g., "You struggle most with Graphs; 2/5 attempts failed")

**Verification:**
- Analytics tab loads and displays charts
- Filters by date range work

---

### 📈 Issue #18: Insights & Recommendations

**Priority:** LOW  
**Effort:** 3–4 hrs  
**Impact:** 3/10  
**Category:** Analytics/AI  

**Opportunity:**
- AI Coach analyzes performance and suggests focus areas
- E.g., "You haven't practiced Graphs in 10 days. DSA topics due: 3. Recommend starting with Graphs today."
- Suggest best block time based on historical focus data

---

## Collaboration Features (Out of Scope for Solo Student, but Noted)

### 👥 Issue #19: Study Group Sync

**Priority:** NONE  
**Effort:** 8–10 hrs  
**Impact:** 1/10  
**Category:** Collaboration  

**Not applicable** to single-user student tool, but could be extended for:
- Sharing weekly review templates with classmates
- Collaborative study session scheduling
- Public profile (achievements, top DSA topics)

---

## Prioritized Roadmap

| Priority | Feature | Effort | Impact | Dependencies | Estimated Hours |
|----------|---------|--------|--------|--------------|-----------------|
| **CRITICAL** | Fix Authentication (Issue #1) | 2–4 hrs | 10/10 | None | 3 |
| **CRITICAL** | Fix Weekly Review Save (Issue #2) | 1–2 hrs | 8/10 | Issue #1 | 1.5 |
| **CRITICAL** | Fix DSA Due Flag Reset (Issue #3) | 2–3 hrs | 7/10 | None | 2.5 |
| **CRITICAL** | Persist AI Chat History (Issue #4) | 3–4 hrs | 7/10 | Issue #1 | 3 |
| **CRITICAL** | Enable Push Notifications UI (Issue #5) | 2–3 hrs | 6/10 | Issue #1 | 2.5 |
| **CRITICAL** | Sync Status Indicator (Issue #6) | 2–3 hrs | 6/10 | Issue #1 | 2.5 |
| **HIGH** | Task Reminders Server-Side (Issue #7) | 3–4 hrs | 7/10 | Issue #1 | 3.5 |
| **HIGH** | Add UI for 8 Hidden Tables (Issue #8) | 6–8 hrs | 5/10 | Issue #1 | 7 |
| **HIGH** | Fix Task Parsing (Issue #9) | 2–3 hrs | 4/10 | None | 2.5 |
| **HIGH** | Improve Notification Docs (Issue #10) | 1–2 hrs | 3/10 | None | 1.5 |
| **MEDIUM** | Fix Hydration Flash (Issue #11) | 2 hrs | 3/10 | None | 2 |
| **MEDIUM** | Visual Day Mode Changes (Issue #12) | 2–3 hrs | 2/10 | None | 2.5 |
| **MEDIUM** | Integrate Command Palette (Issue #13) | 3–4 hrs | 2/10 | None | 3.5 |
| **MEDIUM** | Google Calendar Sync (Issue #14) | 5–6 hrs | 6/10 | Issue #1 | 5.5 |
| **MEDIUM** | Analytics Dashboard (Issue #17) | 4–5 hrs | 5/10 | Issue #1 | 4.5 |
| **LOW** | Email Digest (Issue #15) | 4–5 hrs | 4/10 | Issue #1 | 4.5 |
| **LOW** | Insights & Recommendations (Issue #18) | 3–4 hrs | 3/10 | Issue #1 | 3.5 |
| **LOW** | Command Palette (Issue #13) | 3–4 hrs | 2/10 | None | 3.5 |
| **LOW** | Discord/Slack Integration (Issue #16) | 3–4 hrs | 2/10 | Issue #1 | 3.5 |

---

## Phase-Based Implementation Strategy

### Phase 1: Core Fixes (Days 1–2, ~18 hrs)
**Goal:** Enable cloud sync and make the app multi-device capable.
1. Issue #1: Authentication (3 hrs)
2. Issue #6: Sync Status Indicator (2.5 hrs)
3. Issue #2: Weekly Review Save (1.5 hrs)
4. Issue #5: Push Notifications UI (2.5 hrs)
5. Issue #4: AI Chat Persistence (3 hrs)
6. Issue #3: DSA Due Reset (2.5 hrs)
7. Issue #7: Server-Side Task Reminders (3.5 hrs)

**Outcome:** App is fully functional with cloud persistence, multi-device sync, and working notifications.

### Phase 2: Feature Completion (Days 3–4, ~16 hrs)
**Goal:** Add missing data entry UIs and make all tables accessible.
8. Issue #8: Hidden Table UIs (7 hrs)
9. Issue #9: Task Parsing (2.5 hrs)
10. Issue #11: Hydration Flash (2 hrs)
11. Issue #10: Notification Docs (1.5 hrs)
12. Issue #12: Day Mode Visuals (2.5 hrs)

**Outcome:** Users can log all data types; app feels polished.

### Phase 3: Polish & Analytics (Days 5+, optional, ~15+ hrs)
13. Issue #13: Command Palette (3.5 hrs)
14. Issue #17: Analytics Dashboard (4.5 hrs)
15. Issue #14: Google Calendar Sync (5.5 hrs)
16. Advanced: Email digest, Discord bot, insights

**Outcome:** Professional-grade productivity app with insights and integrations.

---

## Summary of Gaps

**Blocker Status:**
- ✅ Database schema is solid (18 tables, correct RLS policies)
- ✅ API routes exist (auth, notifications, cron, assistant)
- ✅ State management is clean (store.tsx with offline-first queue)
- ❌ **Auth UI is dead** (most critical)
- ❌ **Cloud sync never triggered** (user always local-only)
- ❌ **Data entry UIs missing** for 8 tables (aptitude, sleep, sport, etc.)
- ❌ **Chat & weekly review don't persist** (lost on refresh)
- ❌ **Notifications unreachable** (button has no feedback)
- ❌ **DSA logic broken** (due flag never resets)
- ⚠️ **Hydration flickers** (UX issue, not critical)
- ⚠️ **Day modes don't change UI** (feature incomplete)

**Once Issues #1–#6 are fixed, the app becomes a functional cloud-synced productivity platform with multi-device support, persistent data, and real-time notifications. Remaining work is feature completion and polish.**

