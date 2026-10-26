# Implementation Plan: Offline-First Enhancements for Daily Planner PWA

## Overview
Implement comprehensive offline-first capabilities for a Next.js 14 + TypeScript + Tailwind PWA, enabling robust sync of mutations to Supabase with conflict resolution, UI status indicators, and improved service worker caching strategies.

## Exploration Findings

### Project Structure
- **Framework:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Storage:** Supabase (PostgreSQL with RLS) + localStorage (client-side state)
- **Build/Test:** npm scripts (dev, build, start, lint); no test framework currently in use
- **Service Worker:** Custom `public/sw.js` with basic offline shell caching
- **State Management:** React Context (`store.tsx`) with manual localStorage persistence
- **Key Dependencies:** @supabase/ssr, @supabase/supabase-js, lucide-react, date-fns, @dnd-kit

### Existing Store Architecture
The `PlannerContextType` interface already has:
- `isOnline` (boolean)
- `syncInProgress` (boolean)
- `syncStatus` ('synced' | 'syncing' | 'offline' | 'local_only')
- `lastSyncTime` (number | null)
- `manualSync` (function)
- `pendingChanges` (array of table/data/action/retries)

The store uses `syncToSupabase()` to push mutations and retries pending changes on reconnect. No conflict resolution or exponential backoff currently implemented. Toast notifications exist for feedback.

### UI Components
- **AppShell.tsx:** Main layout with header, tabs, and modals. Currently shows no offline status.
- **SettingsModal.tsx:** Multi-tab modal (templates, notifications, targets, account, export). No sync status section yet.
- **Icons available:** lucide-react icons (CloudOff, AlertTriangle, CheckCircle2, RefreshCw, etc.)

### Database Types
All entities have proper TypeScript interfaces: `TaskItem`, `BlockTemplate`, `DayLog`, `ReviewItem`, `FocusSession`, `DsaTopic`, `AptitudeLog`, `SportLog`, `ChecklistItem`, `Startup`, `WeeklyReview`, `AIMessage`, etc.

### Build & Verification
- **Dev command:** `npm run dev` (starts Next.js dev server on localhost:3000)
- **Build command:** `npm run build`
- **Lint command:** `npm run lint`
- **No tests currently:** Jest/Vitest not configured
- **Verification approach:** Manual testing in dev mode, TypeScript compilation check, lint validation

---

# Implementation Plan

## 1. Create offline.ts utility module
**What:** Create `/src/lib/utils/offline.ts` with PendingMutation interface, storage helpers, batch upload logic, and conflict resolution.

**Files:**
- `src/lib/utils/offline.ts` (new)

**Changes:**
- Export `PendingMutation` interface: `{ id, type ('create'|'update'|'delete'), entity ('task'|'block'|'review'|'checklist'), entityId, payload, timestamp, status ('pending'|'retrying'|'failed'), errorMessage? }`
- Export `loadPendingMutations()`: reads from localStorage key `pending_mutations`, returns empty array if none
- Export `savePendingMutations(mutations)`: writes to localStorage
- Export `batchUploadMutations(mutations, supabaseClient)`: groups mutations by entity type, batches upserts/deletes, returns `{ succeeded: string[], failed: string[] }`
- Export `applyConflictResolution(clientTimestamp, serverTimestamp)`: returns true if client mutation should be applied (last-write-wins with >1 hour threshold)
- Export `getRetryBackoff(retryCount)`: returns delay in ms (30s, 60s, 120s for retries 0, 1, 2)
- Export `createMutationId(type, entity, entityId)`: generates consistent ID for tracking

**Verify:** `npm run lint` passes on new file (TypeScript compilation, no unused imports)

---

## 2. Extend store.tsx with offline mutation tracking
**What:** Add new fields to `PlannerContextType` interface and implement mutation recording logic in `PlannerProvider`.

**Files:**
- `src/lib/storage/store.tsx` (modify)

**Changes:**
- Add to `PlannerContextType` interface:
  - `pendingMutationsCount: number`
  - `failedMutationsCount: number`
  - `syncError: string | null`
  - `retryFailedMutations: () => Promise<void>`
  - `getPendingMutations: () => PendingMutation[]`
  - `clearFailedMutations: () => void`
  
- **Do NOT redefine:** `isOnline`, `syncInProgress`, `lastSyncTime`, `syncStatus`, `manualSync` (already exist)

- In `PlannerProvider` state:
  - Add `const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>([])`
  - Add `const [syncError, setSyncError] = useState<string | null>(null)`

- In localStorage load effect (after line ~290):
  - Load `pending_mutations` from localStorage if it exists, set initial `pendingMutations` state

- In localStorage save effect (after line ~350):
  - Add `pendingMutations` to persisted state

- Modify `toggleBlock()`, `toggleTask()`, `updateTask()`, `deleteTask()`, `recordReviewResult()`, `saveSleepLog()`, `logFocusSession()`, `updateDsaTopic()`, `addChecklistItem()`, `toggleChecklistItem()`, `updateChecklistItem()`, `addAptitudeLog()`, `addSportLog()`, `saveStartup()`, `saveWeeklyReview()`:
  - Before calling `syncToSupabase()`, create a `PendingMutation` entry and push to `pendingMutations`
  - Set status to 'pending'
  - Calculate timestamp

- Implement `retryFailedMutations()`:
  - Filter `pendingMutations` where status is 'failed'
  - Call `batchUploadMutations()` with those mutations
  - On success, remove succeeded mutations from state
  - On partial failure, update retryCount and increment retry count (max 3)
  - If retry count exceeds 3, keep in failed state with error message
  - Call `savePendingMutations()` to persist

- Implement `getPendingMutations()`:
  - Return shallow copy of `pendingMutations` array

- Implement `clearFailedMutations()`:
  - Filter out mutations with status 'failed'
  - Update state and call `savePendingMutations()`
  - Show toast: "Cleared failed mutations"

- Update `syncToSupabase()` (existing function):
  - Wrap try/catch to mark mutation status as 'retrying' on error
  - If retry count reaches 3, mark as 'failed' and set `syncError`
  - Call `savePendingMutations()` after state changes

- Add window 'online' event listener:
  - On reconnect, automatically call `retryFailedMutations()` after 1-second delay
  - Clear `syncError` on reconnect

- Add effect to retry failed mutations every 30s:
  - If `pendingMutations.some(m => m.status === 'failed')` and `isOnline`, schedule `retryFailedMutations()`
  - Use `setInterval()` with 30s delay, clean up on unmount

- Implement `pendingMutationsCount` computed value:
  - Count mutations where status is 'pending' or 'retrying'

- Implement `failedMutationsCount` computed value:
  - Count mutations where status is 'failed'

- Export context value with all new fields included in return object

**Verify:** `npm run lint` passes, no TypeScript errors on store.tsx

---

## 3. Add offline status indicator badge to AppShell.tsx header
**What:** Add a visual badge in the header (top-right area near settings) showing offline status with three states and click-to-retry functionality.

**Files:**
- `src/components/layout/AppShell.tsx` (modify)

**Changes:**
- Import from store: `pendingMutationsCount`, `failedMutationsCount`, `syncError`, `retryFailedMutations`, `isLoaded` (already imported)
- Import icons: `CloudOff`, `AlertTriangle`, `CheckCircle2` (add to existing imports from lucide-react)

- In component state:
  - Add `const [showOfflineToast, setShowOfflineToast] = useState(false)` to avoid duplicate toasts

- Destructure from `usePlanner()`:
  - Add `pendingMutationsCount`, `failedMutationsCount`, `syncError`, `retryFailedMutations`

- Add effect to monitor sync status and show toast on error (only once):
  - If `syncError` is set and `!showOfflineToast`, show toast with error message
  - Set `setShowOfflineToast(true)`
  - Clear when `syncError` becomes null

- Create `OfflineStatusBadge` sub-component or inline JSX after the existing header controls:
  - Only render when `isLoaded === true` (avoid hydration flash)
  - Three states:
    1. **Synced** (green): Show `✓ Synced` with CheckCircle2 icon, green text/bg
    2. **Offline** (yellow): Show `⚠ Offline – N pending` with CloudOff icon, yellow text/bg (where N = `pendingMutationsCount`)
    3. **Error** (red): Show `✗ Sync failed` with AlertTriangle icon, red text/bg
  - Badge CSS: `py-1 px-3 rounded-md text-sm font-medium transition-colors duration-200`
  - On click in error state: call `retryFailedMutations()`
  - Add subtle pulse animation when `syncInProgress === true` (use Tailwind animate-pulse)

- Position badge in header near existing Settings/User buttons

**Verify:** 
- `npm run dev` starts without errors
- Badge appears in top-right when page loads
- Badge shows correct state based on `syncStatus`
- Clicking badge in error state calls retry (console log or observe store state change)
- No TypeScript errors: `npm run lint`

---

## 4. Add Sync Status section to SettingsModal.tsx
**What:** Add a new 'Sync Status' tab or section in settings showing network status, pending actions list, and sync controls.

**Files:**
- `src/components/modals/SettingsModal.tsx` (modify)

**Changes:**
- Add 'sync' to `activeTab` state options: `'templates' | 'notifications' | 'targets' | 'account' | 'export' | 'sync'`
- Add tab button in tab bar for 'Sync Status' (between 'export' and 'account' or as last tab)

- Destructure from `usePlanner()`:
  - Add `isOnline`, `lastSyncTime`, `pendingMutations`, `failedMutationsCount`, `getPendingMutations`, `retryFailedMutations`, `clearFailedMutations`, `syncError`

- Create `SyncStatusTab` section (when `activeTab === 'sync'`):
  - **Network Status row:** Show "🟢 Online" (green) or "🔴 Offline" (red) badge
  - **Last Sync row:** Show relative time (e.g., "2 min ago", "just now", "never") using date-fns `formatDistanceToNow()` if `lastSyncTime` exists, else "—"
  - **Pending Actions count:** Display `pendingMutations.length` (all statuses)
  - **Sync Now button:** Call `manualSync()` when clicked, show loading spinner while `syncInProgress === true`
  - **Clear Failed button:** Call `clearFailedMutations()`, disabled if `failedMutationsCount === 0`
  
  - **Pending Mutations List:**
    - Only show when `pendingMutations.length > 0`
    - Format: 3-column table or cards layout
      - Column 1: Action Type (Create, Update, Delete) with colored badge (blue for pending, orange for retrying, red for failed)
      - Column 2: Entity info (e.g., "Task: Buy milk", "Block: 06:00", "Review: Python")
      - Column 3: Status (pending=yellow, retrying=blue, failed=red with error message truncated)
    - Each row clickable/copyable for debugging
    - Show timestamp for each mutation (relative time or "HH:mm:ss" format)

  - **Error Message (if present):**
    - Show `syncError` in red alert box with "Dismiss" button that clears `syncError`

- Styling:
  - Use consistent color scheme from rest of app (Tailwind classes)
  - Responsive: stack on mobile, table layout on desktop
  - Status badges: use existing color tokens or Tailwind bg-green-100, text-green-700, etc.

**Verify:**
- `npm run dev` starts without errors
- Settings modal opens, 'Sync' tab appears
- Tab shows correct network status
- Pending mutations list displays correctly (add a mutation, navigate to settings to see it)
- Buttons are clickable
- No TypeScript errors: `npm run lint`

---

## 5. Improve service worker caching strategy in public/sw.js
**What:** Update cache strategy to use different approaches per asset type, with proper error handling and cache cleanup.

**Files:**
- `public/sw.js` (modify)

**Changes:**
- Update cache strategy constants:
  - Add `STATIC_CACHE_NAME = 'daily-planner-static-v1'` (for CSS, JS, fonts, icons)
  - Add `DYNAMIC_CACHE_NAME = 'daily-planner-dynamic-v1'` (for HTML pages, API responses)
  - Keep `CACHE_NAME` for backward compatibility, or replace with version management

- Update `install` event:
  - Precache only essential static files (HTML shell, manifest.json, critical CSS)
  - Use separate cache store for static vs dynamic

- Update `activate` event:
  - Delete old cache versions by name pattern
  - Add cache cleanup: delete entries older than 24 hours (check creation timestamp in metadata or use simple TTL)
  - Call `self.clients.claim()` to activate immediately

- Update `fetch` event:
  - **Static assets** (CSS, JS, fonts, icons, images):
    - Use **Cache-first** strategy: return cached version if exists, fallback to network, then cache response
    - Store in `STATIC_CACHE_NAME`
    - No expiry (indefinite)
  
  - **HTML pages** (navigate requests):
    - Use **Network-first** with stale-while-revalidate fallback
    - Try network first, cache successful response, fallback to cached version if offline
    - Store in `DYNAMIC_CACHE_NAME`
  
  - **API calls** (GET /api/*):
    - Use **Network-first** with 5-minute cache fallback
    - Try network first, cache successful response, fallback to cached version if offline
    - Add response timestamp metadata to track age
    - Return proper 503 error if no cache available (don't silently serve old data)
    - Store in `DYNAMIC_CACHE_NAME`
  
  - **Supabase/external requests:**
    - Bypass caching (network-only or skip entirely as currently done)

- Add cache cleanup on reconnect:
  - Listen for `sync` event (if using background sync) or add manual cleanup via postMessage from client
  - Iterate over all cache entries, delete those with timestamp > 24 hours old
  - Log cache cleanup results

- Add proper error handling:
  - Return 503 Service Unavailable response if no network and no cache available (don't fall back to stale data)
  - Include error message in response: "Service unavailable offline"
  - For API endpoints, return JSON error: `{ error: "offline", message: "service unavailable" }`

**Verify:**
- `npm run build` completes without errors
- `npm run dev` runs without service worker errors (check browser DevTools Network/Application tabs)
- Test offline mode: DevTools -> Network -> Offline
  - Static assets load from cache
  - HTML pages show cached version or 503 error
  - App shell remains functional
- No JavaScript errors in DevTools Console

---

## 6. Verify integration and test full offline flow
**What:** Manually test the complete offline-first workflow end-to-end.

**Files:** None (testing only)

**Steps:**
- Start dev server: `npm run dev`
- Open app in browser, logged in
- Create a new task
- Verify it appears in store and a PendingMutation is created (check store context or localStorage `pending_mutations`)
- Open DevTools Network tab, set to Offline mode
- Try to modify the task (mark done, edit, etc.)
- Verify mutation is still tracked locally
- Check AppShell status badge shows "⚠ Offline – 1 pending"
- Open Settings -> Sync tab, verify pending mutation appears in list
- Set network back to Online
- Verify badge changes to "✓ Synced"
- Wait 1-2 seconds, verify pending mutation is uploaded to Supabase
- Clear browser cache (DevTools -> Application -> Clear Storage)
- Reload page
- Verify pending mutations persist from localStorage and retry on load
- Check `npm run lint` passes with no errors

**Verify:**
- All steps above complete successfully
- No console errors in DevTools
- TypeScript compilation clean: `npm run lint`
- Build succeeds: `npm run build`

---

## Implementation Order

1. **offline.ts** (new utility, no dependencies on store changes)
2. **store.tsx** (adds new fields, depends on offline.ts)
3. **AppShell.tsx** (UI badge, depends on store.tsx)
4. **SettingsModal.tsx** (UI section, depends on store.tsx)
5. **public/sw.js** (service worker, independent)
6. **Integration testing** (end-to-end verification)

Each step leaves the codebase in a buildable, working state. Steps 1-2 are TypeScript/logic; steps 3-5 are UI/integration; step 6 is validation.

---

## Key Design Decisions

1. **Conflict Resolution:** Last-write-wins with >1 hour threshold ensures data consistency without manual merge dialogs. If a mutation is > 1 hour old compared to server state, it's discarded as stale (rare edge case, user-visible only if they edit on multiple devices with massive time gaps).

2. **Retry Strategy:** 3 retries with 30s/60s/120s exponential backoff keeps mutations recoverable without overwhelming server or user. After 3 retries (~3 minutes), users can manually retry via UI button.

3. **Storage:** localStorage for pending mutations and state ensures data survives page reload and browser restart. Supabase is the source of truth once synced.

4. **UI Feedback:** Badge in header + Sync Status tab in settings provides two levels of visibility: quick glance (badge) and detailed view (settings). Toast notifications provide immediate feedback on success/failure.

5. **Service Worker:** Separate cache stores for static vs dynamic assets optimize hit rates and avoid serving stale user data for API responses. 24-hour cleanup prevents unbounded cache growth.

6. **Backward Compatibility:** Existing `syncToSupabase()`, `manualSync()`, `isOnline`, `syncStatus` remain unchanged. New fields are additive, not breaking.

---

## Files to Create/Modify Summary

| File | Type | Changes |
|------|------|---------|
| `src/lib/utils/offline.ts` | Create | PendingMutation interface, storage, batch upload, conflict resolution |
| `src/lib/storage/store.tsx` | Modify | Add pending mutation tracking, state fields, retry logic |
| `src/components/layout/AppShell.tsx` | Modify | Add offline status badge in header |
| `src/components/modals/SettingsModal.tsx` | Modify | Add Sync Status tab with list and controls |
| `public/sw.js` | Modify | Improve cache strategies, error handling, cleanup |

---

## Testing Checklist

- [ ] TypeScript compilation clean (npm run lint)
- [ ] Dev server starts (npm run dev)
- [ ] App loads without hydration errors
- [ ] Badge appears in header when logged in
- [ ] Offline mode simulation works (DevTools)
- [ ] Mutations tracked locally while offline
- [ ] Settings Sync tab shows pending mutations
- [ ] Retry button works
- [ ] Auto-sync triggers on reconnect
- [ ] Service worker caches correctly
- [ ] Build succeeds (npm run build)
