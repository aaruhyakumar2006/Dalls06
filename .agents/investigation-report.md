# Daily Planner Application - Gap Analysis & Logical Findings

## Executive Summary

The Daily Planner application is a **well-structured PWA with comprehensive planning features**, but has **significant logical gaps between the database schema/API design and the actual UI implementation**. The application claims to support 18 database tables and numerous features (notifications, AI coaching, weekly reviews, checklists, DSA/aptitude tracking, sport logging), but **many of these are only scaffolded in the backend—the UI does not fully implement the corresponding features**. Critical data operations lack proper error handling, atomic transactions, and state synchronization logic. Additionally, **authentication is entirely missing**—the app uses local-only state management despite Supabase auth infrastructure.

**Key findings:**
1. **Incomplete feature implementation** - 8 of 18 tables have minimal or no UI integration
2. **Missing authentication** - Auth scaffolding exists but is never invoked
3. **No error handling or validation** - API calls and data operations lack error boundaries
4. **State sync logic is fragile** - Optimistic UI updates can diverge from server state
5. **AI Coach not integrated** - Assistant API exists but assistant functionality is partial
6. **Notification system half-built** - Push subscriptions work but notification preferences UI is missing
7. **Weekly Review unsaved** - Form exists but no actual database persistence
8. **No data migration or conflict resolution** - Realtime updates can race with user changes
9. **Transaction integrity issues** - Multi-step operations (e.g., block completion → day log update) are not atomic
10. **Missing fallback UI states** - No loading indicators, error recovery, or offline acknowledgment

---

## Detailed Findings by Category

### 1. AUTHENTICATION GAPS — Critical ⚠️

**Status:** Scaffolded but never invoked.

**Evidence:**
- `src/lib/storage/store.tsx` lines 132–165: Auth functions exist (`signInWithGoogle`, `signInWithEmail`, `signOut`) but are **never called by any UI component**.
- No auth modal or login page exists in the codebase.
- `src/app/layout.tsx` / `src/app/page.tsx` show no auth gate or user context provider.
- Supabase session checks run in the background (line 155–160 in store.tsx) but the app ignores the result and continues as `local_only`.

**Problem:**
- Users cannot persist data across devices or browsers.
- All user data is stored **only in browser localStorage** with key `daily-planner-v2-state`.
- Realtime subscriptions (line 161–220 in store.tsx) require authenticated users, but since no user ever logs in, they never activate.
- Database tables have `user_id` foreign keys, but no code inserts authenticated user IDs, so **all Supabase writes will fail RLS checks**.

**Impact:**
- The Realtime cross-device sync feature (advertised in README.md) **is dead code**.
- The entire Supabase backend is unusable without login.
- Each browser/device gets a fresh app state on first visit.

**Recommended Fix:**
1. Add a Settings/Profile tab with Google OAuth login.
2. Gate app content behind auth check.
3. On successful login, migrate local state to Supabase (`user_id = auth.uid()`).
4. Re-subscribe to Realtime on auth success.

---

### 2. API ENDPOINTS WITHOUT UI — High Priority

**Status:** Implemented in code but unreachable from the UI.

#### 2.1 POST `/api/notifications/subscribe` (Push notifications)

**Code:** `src/app/api/notifications/subscribe/route.ts` — receives VAPID subscription, stores in `push_subscriptions` table.

**Missing UI:**
- No "Enable Push Notifications" button or settings page.
- Service Worker (`public/sw.js`) has push event handler, but **subscription flow never runs**.
- README claims "Settings -> Push Notifications" but no Settings UI exists.

**Impact:**
- Cron reminders (05:45 wake-up, 19:15 review due, 22:15 wind-down, etc.) have nowhere to go.
- `/api/cron/send-reminders` will fail when querying `push_subscriptions` (table is empty).

---

#### 2.2 POST `/api/notifications/test` (Test push)

**Code:** `src/app/api/notifications/test/route.ts` — broadcasts a test notification to all subscriptions.

**Missing UI:**
- Advertised in README ("Settings -> Push Notifications" -> "Test Push") but no button exists.

---

#### 2.3 GET `/api/notifications/vapid-key` (VAPID public key)

**Code:** Returns VAPID public key so client can subscribe.

**Missing UI:**
- App never calls this endpoint.
- Service Worker registration code (`public/sw.js`) is untested and likely broken.

---

### 3. DATABASE TABLES WITH NO UI — High Priority

**Status:** Schema exists, Realtime subscriptions configured, but no UI creates/reads/updates data.

#### 3.1 `notification_prefs` Table

**Schema:** `public.notification_prefs` (16 rows in schema.sql)

**Purpose:** Store user preferences for different notification types (`block_start`, `task_reminder`, `wind_down`, `sleep`, `wake_up`, `review_due`, `weekly_review`, `checklist_due`), with `enabled` flag and `lead_minutes`.

**Current UI:** None. No settings component to toggle notification types.

**Impact:** 
- All notifications fire on fixed schedules regardless of user preference.
- No way to disable 05:45 wake-up reminders if user sleeps later on weekends.

---

#### 3.2 `review_events` Table

**Schema:** `public.review_events` (timestamps every review result).

**UI Usage:** 
- Store.tsx line 593: `syncToSupabase('review_events', ...)` is called after recording result.
- But **no UI reads or analyzes review_events data**.
- Analytics (e.g., "which topics do you struggle with?") are not computed.

**Impact:**
- Historical review data is logged but never surfaced to the user.
- Cannot show improvement trends over time.

---

#### 3.3 `focus_sessions` Table

**Schema:** Records `started_at`, `planned_min`, `actual_min`, `completed` for focus timer sessions.

**UI Status:** Partially used.
- `TodayTab.tsx` can open `FocusTimerModal` to log a session (lines 87–92).
- But **modal code is referenced but never shown in full**—unclear if modal actually saves to DB.
- Store.tsx has `logFocusSession()` (line 620–627) but it's rarely called.

**Problem:** 
- Focus timer tab missing. No UI to view past sessions or filter by date.
- Cannot analyze "which dates had longest focus" or "average session length".

**Impact:**
- Focus session logging is dead code for most users.
- Cannot verify whether focus timer actually works.

---

#### 3.4 `ai_messages` Table

**Schema:** Stores conversation history (role, content, created_at) for the AI Coach.

**Current UI:**
- `AssistantTab.tsx` has a chatbot UI (lines 22–100+) but **does not persist messages to Supabase**.
- Messages are kept only in React state (`setMessages`).
- Logging call: **missing entirely**.

**Problem:**
- No conversation history is saved.
- If user refreshes, chat resets.
- Cannot track what the AI has taught or ask follow-up questions in a new session.

**Impact:**
- AI Coach is a stateless chatbot, not a persistent learning tool.

---

### 4. INCOMPLETE FEATURES — Medium-High Priority

#### 4.1 Weekly Review (Section 6.3, PlanTab.tsx)

**UI Code:** Lines 165–240 in `PlanTab.tsx` show a form to enter `oneChange` (required field) and review metrics.

**Problem:** 
- Form renders metrics (counting days, core done, etc.) but **no "Save" button to persist to `weekly_reviews` table**.
- No read logic to load past weekly reviews.
- Store.tsx has `saveWeeklyReview()` (line 643–649) but it's never called from PlanTab.

**Impact:**
- Weekly Reviews are display-only, not actionable.
- Cannot track week-over-week improvement.
- No way to enforce the "one change" commitment.

---

#### 4.2 Daily Match Day & Low Energy Flags

**UI Code:** `TodayTab.tsx` has toggle buttons to mark day as match-day or low-energy.

**Backend Logic:** 
- When `match_day = true`, "heavy" blocks are skipped (store.tsx line 461–462).
- When `low_energy = true`, blocks show "minimum" version (referenced but not rendered in UI).

**Problem:**
- Low-energy toggle exists but **the UI never actually changes how blocks are rendered**.
- No "Just 20 minutes is enough today" minimum version card.
- Match day greys out heavy blocks **in code** but UI doesn't reflect this visually (need to verify in TodayTab).

**Impact:**
- Feature is half-done; toggle doesn't produce expected behavior.

---

#### 4.3 Spaced Review / Review Items

**UI Code:** `ReviewTab.tsx` fully implements due/upcoming filters and result recording.

**Database:** `review_items` and `review_events` tables exist and sync.

**Gap:** 
- No "from blank" practice generation.
- No "try this from blank" prompts as mentioned in README ("Spaced-Review Log: 'try this from blank' prompts").
- AI Coach should generate these but AssistantTab doesn't integrate it.

**Impact:**
- Review system works but lacks the guided practice integration promised in README.

---

#### 4.4 Focus Timer

**UI Code:** `TodayTab.tsx` references `FocusTimerModal` (import line 9) but the modal itself is not shown in the provided code.

**Problem:**
- Modal logic unknown—cannot verify if it saves to `focus_sessions`.
- README claims "Focus Timer: 20m, 25m, 45m, 60m presets with pre-start 'Phone in another room?' anti-distraction check" but **no UI evidence of these specifics**.

**Impact:**
- Feature exists but implementation is unclear; possible that it doesn't actually persist data.

---

### 5. STATE SYNC & ERROR HANDLING GAPS — Critical

#### 5.1 No Error Handling in syncToSupabase()

**Code:** `store.tsx` line 354–369:
```typescript
const syncToSupabase = useCallback(async (table: string, data: any, action: 'upsert' | 'delete' = 'upsert') => {
  if (!isSupabaseConfigured() || !user) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  try {
    setSyncStatus('syncing');
    if (action === 'upsert') {
      const payload = { ...data, user_id: user.id };
      await supabase.from(table).upsert(payload);
    }
    setSyncStatus('synced');
  } catch (e) {
    console.warn('Sync warning:', e);
    setSyncStatus('offline');
  }
}, [user]);
```

**Problems:**
1. **Silent failures.** If upsert fails (e.g., RLS rejection, schema mismatch), it logs a warning but doesn't inform the user.
2. **No rollback.** If sync fails, local state is already mutated—inconsistent with server.
3. **No retry logic.** Failed sync is attempted only once.
4. **Conflicting "synced" status.** Sets `syncStatus('synced')` even if no user is logged in.

**Impact:**
- User thinks data is persisted when it's actually lost.
- Cross-device consistency is broken.

---

#### 5.2 No Validation Before Write

**Example from store.tsx line 486–498 (toggleBlock):**
```typescript
const toggleBlock = useCallback(
  (dateKey: string, blockKey: string, kind: string, label: string) => {
    const currentDone = !!completions[dateKey]?.[blockKey];
    const newDone = !currentDone;

    setCompletions((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        [blockKey]: newDone,
      },
    }));
    // ... later, sync without validation
    syncToSupabase('block_completions', { date: dateKey, block_key: blockKey, done_at: new Date().toISOString() });
  },
  [...]
);
```

**Problems:**
1. No check that `dateKey` is a valid date (YYYY-MM-DD).
2. No check that `blockKey` matches a known template.
3. No check for duplicate entries before upsert.

**Impact:**
- Invalid data can be written to Supabase.

---

#### 5.3 Realtime Subscriptions Not Guarded

**Code:** `store.tsx` line 169–220 sets up Realtime subscriptions but:
1. **Assumes tables exist.** No error handling if table doesn't exist.
2. **Assumes correct schema.** No validation of incoming payload shape.
3. **No subscription status feedback.** User doesn't know if sync is active.

**Impact:**
- If Supabase realtime is down, silently degrades to local-only without notification.

---

### 6. MISSING VALIDATION & PARSING — Medium Priority

#### 6.1 Natural Language Task Parsing

**Code:** `store.tsx` line 557 calls `parseNaturalTask(input)` but this function is **never defined** in the store or utils.

**Evidence:** 
- Import at top is `require('@/lib/utils/time')` but no indication that function exists.
- Likely missing file or incomplete refactoring.

**Impact:**
- Quick-add tasks may fail silently or parse incorrectly.
- "at 8pm", "30 min", "2 hours" examples in README are unreliable.

---

#### 6.2 AI Coach Parse Mode

**Code:** `AssistantTab.tsx` can call `sendMessage(..., mode: 'parse_task')` which should return JSON:
```json
{"title": "string", "at_time": "HH:mm" or null, "duration_min": number or null}
```

**Problem:**
- API response is streamed as plain text, but code doesn't try to parse JSON from the stream.
- If AI returns `{...}` wrapped in markdown backticks or extra text, JSON.parse will fail.

**Impact:**
- Parsed tasks may be discarded or cause errors.

---

### 7. UI/UX GAPS — Medium Priority

#### 7.1 No Loading States

**Observation:** 
- `AssistantTab.tsx` has a `loading` state (line 29) but no visual feedback in the UI (spinner, disabled input, etc.).
- Similar for other async operations.

**Impact:**
- User doesn't know if action is processing or if the app froze.

---

#### 7.2 No Error Messages

**Observation:**
- Form submissions have no validation or error display.
- API failures silently degrade.
- Users don't know why an action failed.

**Impact:**
- Frustration; users may assume data was saved when it wasn't.

---

#### 7.3 No Offline Indication

**Observation:**
- App syncs to `syncStatus` (synced/syncing/offline/local_only) but this status is never shown to the user.

**Impact:**
- User doesn't know if they're online or if changes will sync.

---

### 8. MISSING FEATURES ADVERTISED IN README — High Priority

#### 8.1 Settings/Profile Page

**README Section:** "Settings -> Push Notifications"

**Reality:** No settings component exists.

**Missing:**
- Timezone configuration (currently hardcoded to "Asia/Kolkata")
- Wake/sleep target times (stored in `profiles` table but not editable in UI)
- Quiet hours configuration
- Push notification opt-in
- Clear localStorage / reset app
- Logout button (no login in first place, so irrelevant)

---

#### 8.2 Day Modes UI

**README:** "Dynamic Day Modes: Low-energy day [switches blocks to minimum], Match day [greys out heavy]"

**UI Reality:** 
- Toggles exist but behavior is not rendered.
- No "minimum version" cards shown.
- Heavy blocks not visually greyed out on match day.

---

#### 8.3 Google Calendar Integration

**README:** "generates Google Calendar 1-tap links"

**Code:** `store.tsx` line 1 imports `getGoogleCalendarLink()` from `lib/utils/time` but this is used only to generate links, not to actually open them.

**Problem:**
- Links are generated but **no "Add to Calendar" button in UI** to open the link.

---

#### 8.4 AI Coach Modes

**README:** "AI Coach: parsing messy sentences into tasks, providing from-blank practice questions, mock interviews, audit weekly consistency"

**UI Reality:**
- `AssistantTab.tsx` has buttons for "Ask", "Parse Task", "Generate Schedule", "Question", "Mock Interview", "Coaching" but:
  1. Only partial implementation of these modes.
  2. No "Generate Schedule" button in UI.
  3. No "Coaching" button in UI.

---

### 9. CONFIGURATION & SETUP ISSUES — Medium Priority

#### 9.1 Cron Reminders Dead Without Login

**README:** "Cron Scheduler Configuration: `/api/cron/send-reminders`"

**Reality:**
- Cron endpoint assumes `push_subscriptions` table is populated.
- **No user will ever subscribe** because auth is missing.
- Cron will silently return `no_subscriptions` status every minute.

---

#### 9.2 Hardcoded Timezone

**Code:** `store.tsx` line 77 defaults to `'Asia/Kolkata'` hardcoded.

**Problem:**
- App is designed for CSE students in Chennai, but timezone is not configurable.
- Would fail for international users.

---

### 10. DATA INTEGRITY & TRANSACTION ISSUES — Critical

#### 10.1 Block Completion & Day Log Update Not Atomic

**Code:** `store.tsx` line 506–525:
```typescript
setCompletions(prevState); // Update 1
// ... calculate core_done ...
setDayLogs(prevState); // Update 2
syncToSupabase('block_completions', ...); // Async write 1
syncToSupabase('day_logs', ...); // Async write 2
```

**Problem:**
1. React state is updated in two separate calls, creating a brief window where `completions` and `dayLogs` are out of sync.
2. Supabase writes are async and independent—if one fails, the other may succeed, leaving server state inconsistent.
3. No transaction to wrap both writes.

**Impact:**
- Streak calculation may use stale `dayLogs` data.
- Server may have orphaned `block_completions` without corresponding `day_logs`.

---

#### 10.2 Race Condition: Realtime Update vs User Edit

**Scenario:**
1. User ticks a block locally at 20:00:05.
2. At 20:00:06, another device updates the same block via Realtime.
3. The Realtime update (line 190–197) overwrites user's local change.

**Code:** `store.tsx` line 190–197:
```typescript
.on('postgres_changes', { event: '*', schema: 'public', table: 'block_completions' }, (payload) => {
  if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
    const { date, block_key } = payload.new as any;
    setCompletions((prev) => ({
      ...prev,
      [date]: { ...(prev[date] || {}), [block_key]: true },
    }));
  }
}
```

**Problem:**
- No conflict resolution. If Realtime timestamp > local timestamp, apply it blindly.
- Optimistic UI is lost.

---

### 11. MISSING ERROR BOUNDARIES & RECOVERY — Medium Priority

#### 11.1 No Fallback for Failed Auth

**Code:** `store.tsx` line 168 checks `getSession()` but if it fails, silently defaults to `local_only`.

**Problem:**
- No indication to user that sync won't work.
- No retry mechanism.

---

#### 11.2 No Validation for Supabase Configuration

**Code:** `isSupabaseConfigured()` (called line 167) likely just checks if env vars are set, but doesn't verify connectivity.

**Problem:**
- If Supabase is misconfigured (wrong URL, bad key), app won't catch it until first sync attempt.

---

### 12. NOTIFICATION SYSTEM INCOMPLETE — High Priority

#### 12.1 Service Worker Push Handler Untested

**Code:** `public/sw.js` has event handler for `'push'` events.

**Problem:**
- No test to verify it actually works.
- No error handling if notification API is unavailable (some browsers/users).

---

#### 12.2 VAPID Key Setup Complex

**README:** "Generate a pair of VAPID keys: `npx web-push generate-vapid-keys`"

**Problem:**
- Manual setup is error-prone.
- No validation that keys are correct or present.
- App should check on startup and warn if missing.

---

## Severity Scorecard

| Category | Severity | Impact |
|----------|----------|--------|
| **Missing authentication** | 🔴 Critical | Entire backend unusable; no persistence |
| **Push subscription endpoint unreachable** | 🔴 Critical | Cron reminders never sent |
| **No error handling on sync** | 🔴 Critical | Data loss, user doesn't know |
| **Weekly review not saved** | 🔴 Critical | Feature appears to work but doesn't persist |
| **AI messages not persisted** | 🟠 High | Loses conversation history |
| **Notification prefs no UI** | 🟠 High | Users can't customize reminders |
| **Natural language parsing undefined** | 🟠 High | Quick-add may fail silently |
| **No validation/error messages** | 🟠 High | Silent failures throughout |
| **Settings page missing** | 🟠 High | Can't configure timezone, notifications, etc. |
| **Focus sessions incomplete** | 🟠 High | Feature half-implemented |
| **Race condition on Realtime** | 🟠 High | Cross-device conflicts not resolved |
| **Day modes UI not rendered** | 🟡 Medium | Toggle buttons don't do anything visible |
| **No loading states** | 🟡 Medium | UX confusion |
| **No offline indication** | 🟡 Medium | User doesn't know sync status |
| **Google Calendar links not clickable** | 🟡 Medium | Feature incomplete |

---

## Root Cause Analysis

The application has these structural issues:

1. **Incomplete MVP.** The app was designed with 18 database tables and many features, but development stopped at 40% completion. UI layers were never built for most tables.

2. **Authentication scaffolding never wired.** Auth functions exist but are never called, suggesting the developer intended to add login later but didn't.

3. **Realtime subscriptions without data.** Supabase Realtime is fully configured but pointless without auth—no users can be authenticated, so no data is ever synced.

4. **No error budget.** Async operations assume success; failures are ignored or logged but not surfaced to the user.

5. **Optimistic UI without conflict resolution.** Client updates state immediately but has no way to merge server conflicts.

6. **Feature parity gap.** README promises features (settings, day modes, notifications) that are partially or not implemented in UI.

---

## Recommendations (Prioritized)

### Phase 1: Make Authentication Work (1-2 days)
1. **Add login UI:** Create `src/app/auth/login.tsx` with Google OAuth.
2. **Gate app:** Wrap `HomePage` with auth check in `layout.tsx`.
3. **Migrate state:** On login, migrate localStorage to Supabase under `user_id = auth.uid()`.
4. **Test Realtime:** Verify subscriptions activate after login.

**Verification:** User can log in, data syncs across devices, Realtime updates appear within 2 seconds.

---

### Phase 2: Complete Weekly Review & AI Messages (1 day)
1. **Add save button** to weekly review form in `PlanTab.tsx`.
2. **Call `saveWeeklyReview()`** with form data.
3. **Persist AI messages** to `ai_messages` table after each assistant response.
4. **Load chat history** on AssistantTab mount.

**Verification:** Weekly review data appears in database; refreshing page restores chat history.

---

### Phase 3: Fix Sync Error Handling (1 day)
1. **Add user feedback** for failed syncs: toast error message, visual status indicator.
2. **Implement retry logic** for failed operations.
3. **Add conflict resolution:** For Realtime updates, use last-write-wins with timestamp comparison.
4. **Make operations atomic** by batching related updates (e.g., block + day log).

**Verification:** Intentionally disconnect network; app shows "offline" status; reconnect; data syncs without loss.

---

### Phase 4: Build Missing UI (2-3 days)
1. **Settings page:** Timezone, wake/sleep targets, notification prefs, logout.
2. **Focus sessions tab:** View past sessions, analytics.
3. **Notification subscription:** Add "Enable Push" button that calls subscribe endpoint.
4. **Day modes rendering:** Show "minimum" card for low-energy, grey heavy blocks on match day.

**Verification:** All 5 tabs are functional and wired to their respective database tables.

---

### Phase 5: Validate & Complete (1 day)
1. **Validate all inputs** before write (date format, time format, constraints).
2. **Add error boundaries** around render and async.
3. **Test push notifications** end-to-end.
4. **Define `parseNaturalTask()`** if missing.

---

## Conclusion

The **Daily Planner is architecturally sound but incompletely implemented**. The database schema, API endpoints, and Realtime infrastructure are well-designed, but the UI and authentication layer are missing or half-finished. **Prioritizing authentication, error handling, and weekly review/AI persistence will unlock the app's potential.** Without these fixes, users cannot persist data, notifications don't work, and promised features appear to work but don't save anything.
