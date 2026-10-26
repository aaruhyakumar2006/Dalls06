# DALLS PWA - Phase 1 Critical Fixes Implementation Plan

## Overview

This plan addresses 4 critical blockers preventing the DALLS PWA from being production-ready. All fixes are ordered by dependency, with authentication first (gates everything else), followed by push notifications UI, weekly review persistence, and AI chat history persistence.

**Context from Investigation:**
- Authentication functions exist in `store.tsx` but are never called from UI
- Push notification backend (`/api/notifications/*`) is fully implemented but has no subscribe UI
- Weekly review form renders but has no save button
- AI chat messages are React-only state, not persisted to `ai_messages` table

---

## Project Context

**Build System:** Next.js 14 (App Router) + TypeScript
- Build command: `npm run build`
- Dev command: `npm run dev`
- Lint command: `npm run lint`

**Test Strategy:** Manual testing on mobile PWA (no automated tests configured)
- Test on iOS Safari (iOS 16.4+) after adding to Home Screen
- Test on Android Chrome
- Verify cross-device sync with two browser tabs

**Key Files:**
- `src/lib/storage/store.tsx` - Core state management with Supabase sync
- `src/app/page.tsx` - Main entry point with auth gate logic
- `src/components/modals/AuthModal.tsx` - Auth UI (never opened properly)
- `src/components/modals/SettingsModal.tsx` - Settings with push notification section
- `src/components/tabs/ReviewTab.tsx` - Spaced review (no weekly review form here)
- `src/components/tabs/PlanTab.tsx` - Contains weekly review form
- `src/components/tabs/AssistantTab.tsx` - AI coach chat interface

**Database:** Supabase with Realtime
- Schema: `supabase/schema.sql`
- Tables: `profiles`, `push_subscriptions`, `notification_prefs`, `weekly_reviews`, `ai_messages`

---

## Fix Order & Dependencies

```
1. Authentication (blocks everything)
   ↓
2. Push Notifications UI (requires auth for subscription)
   ↓
3. Weekly Review Save (requires auth for DB writes)
   ↓
4. AI Chat Persistence (requires auth for DB writes)
```

---

## Fix 1: Wire Up Authentication

### Problem
- `src/app/page.tsx` lines 24-64: Shows auth gate UI with skip button
- `src/components/modals/AuthModal.tsx`: Full Google OAuth and magic link UI exists
- `src/lib/storage/store.tsx` lines 1053-1089: `signInWithGoogle`, `signInWithEmail`, `signOut` functions exist
- **BUT**: Auth buttons in AuthModal never call these functions - buttons are display-only

### Root Cause
AuthModal component buttons don't have onClick handlers wired to store functions.

### Implementation Steps

#### Step 1.1: Fix AuthModal Button Wiring
**File:** `src/components/modals/AuthModal.tsx`

**Changes:**
1. Line 72: "Continue with Google" button currently has `onClick={signInWithGoogle}` - verify this is the store function
2. Line 102: "Send Magic Link" button is in a form with `onSubmit={handleEmailSubmit}` which calls `signInWithEmail(email)` on line 30
3. Line 63: Sign Out button calls `signOut()` correctly

**Issue Found:** The buttons ARE wired correctly. The problem is the auth modal in `page.tsx` is opened but the functions don't work.

**Actual Fix Needed:**
- Check if Supabase is configured: `isSupabaseConfigured()` line 23
- If not configured, the buttons show but do nothing
- Need to add error handling and user feedback when auth fails

Add after line 30 in `handleEmailSubmit`:
```typescript
if (!configured) {
  setMsg({ text: 'Supabase not configured. Add credentials to .env.local', type: 'error' });
  return;
}
```

Add to `signInWithGoogle` button (line 72) wrapper:
```typescript
const handleGoogleSignIn = async () => {
  if (!configured) {
    setMsg({ text: 'Supabase not configured. Add credentials to .env.local', type: 'error' });
    return;
  }
  await signInWithGoogle();
};
```

**Verify:** 
- Run `npm run dev`
- Open http://localhost:3000
- Click "Continue with Google" - should open Google OAuth popup (if Supabase configured)
- If not configured, should show error message
- Click "Continue Without Signing In" - app should work in local-only mode

---

#### Step 1.2: Add Auth Status Indicator
**File:** `src/components/layout/AppShell.tsx` or create new `src/components/ui/AuthStatus.tsx`

**Purpose:** Show user if they're signed in, syncing, or local-only

**Code:**
```typescript
// In AppShell.tsx header, add near line 40-50:
import { usePlanner } from '@/lib/storage/store';

// Inside component:
const { user, syncStatus } = usePlanner();

// Add to header:
<div className="flex items-center gap-2">
  {user ? (
    <span className="text-xs font-mono text-mint">
      ✓ Synced ({user.email?.split('@')[0]})
    </span>
  ) : (
    <span className="text-xs font-mono text-mute">
      Local Only
    </span>
  )}
  <span className={`w-2 h-2 rounded-full ${
    syncStatus === 'synced' ? 'bg-mint' :
    syncStatus === 'syncing' ? 'bg-shuttle animate-pulse' :
    syncStatus === 'offline' ? 'bg-smash' : 'bg-mute'
  }`} />
</div>
```

**Verify:**
- Sign in - should show green dot + email prefix
- Go offline (DevTools Network → Offline) - should show red dot

---

#### Step 1.3: Test Cross-Device Sync
**Prerequisites:** Supabase configured, user signed in

**Test Steps:**
1. Open app in Chrome tab 1, sign in
2. Open app in Chrome tab 2 (same user)
3. In tab 1: Tick a focus block
4. In tab 2: Block should update within 2 seconds (Realtime subscription)

**Verify:**
- Check browser console for Realtime subscription status: "SUBSCRIBED"
- Check Network tab for WebSocket connection to Supabase
- If fails: Check Supabase dashboard → API settings → Realtime is enabled

---

## Fix 2: Add Push Notifications Subscribe UI

### Problem
- Backend routes exist: `/api/notifications/subscribe`, `/api/notifications/vapid-key`, `/api/notifications/test`
- `src/components/modals/SettingsModal.tsx` lines 134-183: Has "Enable Push Notifications" and "Test Push" buttons
- Buttons call `handleSubscribePush()` (line 134) and `handleSendTestPush()` (line 171)
- **BUT**: These functions are already implemented! Need to verify they work.

### Root Cause
Functions ARE implemented. Need to:
1. Verify VAPID keys are set in env
2. Add iOS-specific instructions
3. Add subscription status display

### Implementation Steps

#### Step 2.1: Add Subscription Status Display
**File:** `src/components/modals/SettingsModal.tsx`

**Add before line 240 (notification toggles section):**
```typescript
// Check if user is subscribed
const [isPushSubscribed, setIsPushSubscribed] = useState(false);

useEffect(() => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsPushSubscribed(!!sub);
      });
    });
  }
}, []);

// Add UI before the toggles:
<div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
  <div className="flex items-center justify-between">
    <span className="font-display font-bold text-xs uppercase text-mute">
      Push Status
    </span>
    {isPushSubscribed ? (
      <span className="px-2 py-1 bg-mint text-ink text-xs font-bold rounded-full">
        ✓ Subscribed
      </span>
    ) : (
      <span className="px-2 py-1 bg-mute text-white text-xs font-bold rounded-full">
        Not Subscribed
      </span>
    )}
  </div>
</div>
```

**Verify:**
- Open Settings → Push tab
- Should show "Not Subscribed" initially
- Click "Enable Push Notifications"
- Grant permission when prompted
- Status should change to "✓ Subscribed"

---

#### Step 2.2: Add iOS Setup Instructions Banner
**File:** `src/components/modals/SettingsModal.tsx`

**Already exists at line 213-220!** Just verify it shows on iOS.

**Test on iOS:**
1. Open Safari on iPhone
2. Go to app URL
3. Tap Share → Add to Home Screen
4. Open from Home Screen (must be standalone mode)
5. Go to Settings → Push
6. Should see iOS banner with setup instructions

---

#### Step 2.3: Add Error Handling for VAPID Missing
**File:** `src/components/modals/SettingsModal.tsx`

**Modify `handleSubscribePush` function (around line 134-165):**

Add after line 142 (after permission check):
```typescript
if (perm !== 'granted') {
  alert('Notification permission denied. Enable in browser settings.');
  return;
}

const res = await fetch('/api/notifications/vapid-key');
if (!res.ok) {
  showToast('VAPID key not configured. Add to .env.local', 'error');
  return;
}

const data = await res.json();
if (!data.publicKey) {
  showToast('Push notifications not configured on server', 'error');
  return;
}
```

**Verify:**
- Without VAPID_PUBLIC_KEY in .env.local: Should show error toast
- With valid VAPID keys: Should subscribe successfully

---

#### Step 2.4: Test Push Notification End-to-End
**Prerequisites:** 
- VAPID keys in .env.local
- User signed in
- Push permission granted
- Service worker registered

**Test Steps:**
1. Open app
2. Go to Settings → Push
3. Click "Enable Push Notifications"
4. Grant permission
5. Click "Test Push"
6. Should receive notification with "Match Point Coach" title

**Verify on Mobile:**
1. Add to Home Screen
2. Enable notifications
3. Lock phone
4. Trigger test push
5. Should see notification on lock screen

---

## Fix 3: Add Save Button to Weekly Review Form

### Problem
- `src/components/tabs/PlanTab.tsx` lines 165-240: Weekly review form exists with metrics display
- Form shows "oneChange" input field (required)
- `src/lib/storage/store.tsx` line 1034-1045: `saveWeeklyReview()` function exists
- **BUT**: No submit button to call the function

### Root Cause
Form has no onSubmit handler and no save button.

### Implementation Steps

#### Step 3.1: Add Weekly Review Form State and Handler
**File:** `src/components/tabs/PlanTab.tsx`

**Find the weekly review section (around line 165-240) and modify:**

1. Add state for form input:
```typescript
// Add near other useState declarations (around line 15-20):
const [weeklyReviewText, setWeeklyReviewText] = useState('');
const [isSavingReview, setIsSavingReview] = useState(false);
```

2. Add submit handler:
```typescript
// Add before the return statement:
const handleSaveWeeklyReview = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!weeklyReviewText.trim()) {
    showToast('Please enter your one change for next week', 'info');
    return;
  }
  
  setIsSavingReview(true);
  
  // Get current week's metrics from the display
  const currentStreak = streak;
  const countingDays = weekDayCounts.filter(w => w.counts).length;
  const totalFocusMin = focusSessions
    .filter(s => s.date >= weekDayCounts[0].date)
    .reduce((sum, s) => sum + s.actual_min, 0);
  
  const reviewData = {
    week_start: weekDayCounts[0].date,
    week_end: todayDateKey,
    one_change: weeklyReviewText.trim(),
    counting_days: countingDays,
    focus_minutes: totalFocusMin,
    streak_end: currentStreak,
    notes: '', // Optional: add notes field if needed
  };
  
  saveWeeklyReview(reviewData);
  showToast('Weekly review saved! Commitment locked in.', 'success');
  setWeeklyReviewText('');
  setIsSavingReview(false);
};
```

3. Wrap form in `<form onSubmit={handleSaveWeeklyReview}>` tag

4. Add input field and button:
```typescript
<form onSubmit={handleSaveWeeklyReview} className="space-y-3">
  <div>
    <label className="block text-xs font-bold text-mute uppercase mb-2">
      My One Change Next Week (Required)
    </label>
    <textarea
      value={weeklyReviewText}
      onChange={(e) => setWeeklyReviewText(e.target.value)}
      placeholder="e.g., 'Write every problem from blank before looking at hints' or 'Sleep by 22:45 on weeknights'"
      rows={3}
      className="w-full px-3 py-2 bg-card border-2 border-ink rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-court"
      required
    />
  </div>
  
  <button
    type="submit"
    disabled={isSavingReview || !weeklyReviewText.trim()}
    className="w-full py-2.5 bg-court text-white font-bold uppercase tracking-wider rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] disabled:opacity-40 active:translate-y-[1px] flex items-center justify-center gap-2"
  >
    {isSavingReview ? (
      <>
        <RefreshCw className="w-4 h-4 animate-spin" />
        Saving Review...
      </>
    ) : (
      <>
        <Check className="w-4 h-4" />
        Save Weekly Review
      </>
    )}
  </button>
</form>
```

**Import needed icons:**
```typescript
import { Check, RefreshCw } from 'lucide-react';
```

**Verify:**
- Go to Plan tab
- Scroll to weekly review section
- Fill in "one change" field
- Click "Save Weekly Review"
- Should see success toast
- Check Supabase dashboard → `weekly_reviews` table → new row should appear
- Refresh page → form should clear (no pre-fill yet - that's a future enhancement)

---

#### Step 3.2: Add Past Weekly Reviews Display
**File:** `src/components/tabs/PlanTab.tsx`

**Add below the form (optional enhancement):**

```typescript
// After the form, add:
{weeklyReviews.length > 0 && (
  <div className="pt-4 mt-4 border-t border-rail space-y-2">
    <h4 className="font-display text-xs font-bold uppercase text-mute">
      Past Reviews ({weeklyReviews.length})
    </h4>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {weeklyReviews
        .sort((a, b) => b.week_end.localeCompare(a.week_end))
        .slice(0, 5)
        .map((review, idx) => (
          <div key={idx} className="p-3 bg-card rounded-xl border border-rail text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-mute">{review.week_start} → {review.week_end}</span>
              <span className="font-bold text-court">{review.counting_days}/7 days</span>
            </div>
            <p className="text-ink font-medium">"{review.one_change}"</p>
            <div className="mt-1 text-[10px] text-mute font-mono">
              {review.focus_minutes}min focus • {review.streak_end}d streak
            </div>
          </div>
        ))}
    </div>
  </div>
)}
```

**Verify:**
- Save multiple weekly reviews
- Should see list of past 5 reviews below form
- Shows week date range, commitment, and metrics

---

## Fix 4: Persist AI Chat History

### Problem
- `src/components/tabs/AssistantTab.tsx` line 22-27: Messages stored in React state only
- `src/lib/storage/store.tsx`: No `ai_messages` related functions exist
- Database table `ai_messages` exists but unused
- Chat history lost on page refresh

### Root Cause
No persistence layer implemented for AI messages.

### Implementation Steps

#### Step 4.1: Add AI Messages Functions to Store
**File:** `src/lib/storage/store.tsx`

**Add near other state declarations (around line 120-130):**
```typescript
const [aiMessages, setAiMessages] = useState<Array<{ id: string; role: string; content: string; created_at: string }>>([]);
```

**Add to context interface (around line 60-80):**
```typescript
// AI Messages
aiMessages: Array<{ id: string; role: string; content: string; created_at: string }>;
saveAiMessage: (role: 'user' | 'assistant', content: string) => void;
clearAiMessages: () => void;
```

**Add functions before return statement (around line 1100):**
```typescript
// AI Message Persistence
const saveAiMessage = useCallback((role: 'user' | 'assistant', content: string) => {
  const newMessage = {
    id: generateUUID(),
    role,
    content,
    created_at: new Date().toISOString(),
  };
  
  setAiMessages(prev => [...prev, newMessage]);
  
  if (user) {
    syncToSupabase('ai_messages', {
      ...newMessage,
      user_id: user.id,
    });
  }
}, [user, syncToSupabase]);

const clearAiMessages = useCallback(() => {
  setAiMessages([]);
  showToast('Chat history cleared', 'info');
}, [showToast]);
```

**Add to localStorage persistence (around line 175-200):**
```typescript
// In the effect that loads from localStorage:
if (parsed.aiMessages) setAiMessages(parsed.aiMessages);

// In the effect that saves to localStorage (around line 240):
aiMessages,  // Add to the state object
```

**Add to Realtime subscriptions (around line 220-240):**
```typescript
.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'ai_messages' },
  (payload) => {
    const msg = payload.new as any;
    setAiMessages(prev => {
      // Don't duplicate if already exists
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }
)
```

**Add to context provider value (around line 1200):**
```typescript
aiMessages,
saveAiMessage,
clearAiMessages,
```

**Verify store changes:**
- Run `npm run build` - should compile without errors
- Check TypeScript errors: `npm run lint`

---

#### Step 4.2: Update AssistantTab to Use Persistence
**File:** `src/components/tabs/AssistantTab.tsx`

**Replace message state management:**

1. Remove line 22-27 (local state):
```typescript
// DELETE:
const [messages, setMessages] = useState<ChatMsg[]>([...]);
```

2. Import from store (add to line 13):
```typescript
const { 
  ..., // existing imports
  aiMessages,
  saveAiMessage,
  clearAiMessages,
} = usePlanner();
```

3. Transform store messages to component format (add around line 30):
```typescript
// Map store messages to component format
const messages = useMemo(() => {
  if (aiMessages.length === 0) {
    // Default welcome message
    return [{
      role: 'assistant' as const,
      content: 'Ready. I am your placement & focus coach. I can turn messy thoughts into scheduled tasks, quiz you on due concepts from blank memory, run short mock interviews, or audit your consistency. What are we working on?',
    }];
  }
  return aiMessages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));
}, [aiMessages]);
```

4. Update `sendMessage` function (around line 65-95):

Replace `setMessages` calls with `saveAiMessage`:
```typescript
// Before:
// const newMsgs: ChatMsg[] = [...messages, { role: 'user', content: userText }];
// setMessages(newMsgs);

// After:
saveAiMessage('user', userText);
const newMsgs = [...aiMessages, { role: 'user', content: userText }];
```

And:
```typescript
// Before:
// setMessages((prev) => [...prev, { role: 'assistant', content: text }]);

// After:
saveAiMessage('assistant', text);
```

5. Add clear history button in header (around line 110-130):
```typescript
<div className="flex items-center gap-2">
  <span className="px-2.5 py-1 rounded-full bg-mint text-ink font-mono font-bold text-[10px] border border-ink">
    {streak}d STREAK
  </span>
  <button
    onClick={() => {
      if (confirm('Clear all chat history?')) {
        clearAiMessages();
      }
    }}
    className="p-1.5 rounded-lg border border-ink text-mute hover:text-smash hover:bg-rail"
    title="Clear history"
  >
    <Trash2 className="w-4 h-4" />
  </button>
</div>
```

Import Trash2:
```typescript
import { ..., Trash2 } from 'lucide-react';
```

**Verify:**
1. Go to Assistant tab
2. Send a message
3. Refresh page
4. Messages should still be there
5. Sign in on another device
6. Should see same conversation (Realtime sync)
7. Click clear history button
8. Messages should clear

---

## Testing Checklist

### Authentication
- [ ] Click "Continue with Google" → Opens OAuth popup (if configured)
- [ ] Click "Send Magic Link" → Sends email (if configured)
- [ ] Click "Continue Without Signing In" → App works in local mode
- [ ] Auth status indicator shows "Local Only" when not signed in
- [ ] Auth status indicator shows "✓ Synced" when signed in
- [ ] Sign out → Returns to auth gate

### Push Notifications
- [ ] Settings → Push tab shows "Not Subscribed" initially
- [ ] Click "Enable Push" → Browser requests permission
- [ ] Grant permission → Status changes to "✓ Subscribed"
- [ ] Click "Test Push" → Receive notification
- [ ] iOS: Add to Home Screen first → Then enable push
- [ ] Lock phone → Send test push → Shows on lock screen

### Weekly Review
- [ ] Plan tab → Weekly review section shows current week metrics
- [ ] Enter "one change" text → Click Save
- [ ] Shows success toast
- [ ] Check Supabase dashboard → New row in `weekly_reviews` table
- [ ] Refresh page → Past reviews show below form
- [ ] Save multiple reviews → Shows last 5

### AI Chat History
- [ ] Assistant tab → Send messages
- [ ] Refresh page → Messages persist
- [ ] Sign in on second device → Same conversation appears
- [ ] Click clear history → Confirms and clears
- [ ] Send new message → Starts fresh conversation
- [ ] Check Supabase dashboard → Rows in `ai_messages` table

### Cross-Device Sync (Requires Auth)
- [ ] Sign in on device A
- [ ] Sign in on device B with same account
- [ ] Device A: Tick a focus block
- [ ] Device B: Block updates within 2 seconds
- [ ] Device B: Send AI message
- [ ] Device A: Message appears in chat

---

## Mobile PWA Testing

### iOS Safari (16.4+)
1. Open Safari → Navigate to app URL
2. Tap Share icon → "Add to Home Screen"
3. Open from Home Screen (standalone mode)
4. Test all 4 fixes:
   - Sign in with Google/Email
   - Enable push notifications (Settings → Push)
   - Save weekly review (Plan tab)
   - Send AI messages (Assistant tab)
5. Lock phone → Trigger test push → Should appear
6. Force quit app → Reopen → Data should persist

### Android Chrome
1. Navigate to app URL
2. Chrome prompts "Add to Home Screen" or menu → "Install app"
3. Open from Home Screen
4. Test all 4 fixes (same as iOS)
5. Background app → Receive push notification
6. Clear app from recent apps → Reopen → Data should persist

---

## Rollback Plan

If any fix breaks the app:

1. **Authentication:** 
   - Revert `src/components/modals/AuthModal.tsx`
   - Users can still skip login and use local-only mode

2. **Push Notifications:**
   - Revert `src/components/modals/SettingsModal.tsx` push section
   - Backend routes remain functional for future use

3. **Weekly Review:**
   - Revert `src/components/tabs/PlanTab.tsx` form changes
   - Metrics display remains functional, just no save

4. **AI Chat:**
   - Revert `src/components/tabs/AssistantTab.tsx` and store changes
   - Chat still works, just loses history on refresh

---

## Success Criteria

### Authentication
✅ Users can sign in with Google or email magic link
✅ Signed-in users see sync status indicator
✅ Local-only mode still works (skip button)
✅ Cross-device sync works within 2 seconds

### Push Notifications
✅ Users can subscribe to push notifications from Settings
✅ Subscription status visible (Subscribed / Not Subscribed)
✅ Test push button sends notification
✅ Works on iOS (after Add to Home Screen) and Android

### Weekly Review
✅ Form has input field and save button
✅ Clicking save persists to `weekly_reviews` table
✅ Success toast shows confirmation
✅ Past reviews display below form

### AI Chat History
✅ Messages persist to `ai_messages` table
✅ Chat history survives page refresh
✅ Clear history button works
✅ Cross-device sync shows same conversation

---

## Notes

- All fixes require Supabase to be configured in `.env.local`
- Without Supabase: Authentication and persistence won't work, but app runs in local-only mode
- VAPID keys required for push notifications: `npx web-push generate-vapid-keys`
- iOS push requires PWA to be added to Home Screen (iOS 16.4+ only)
- Test on real mobile devices, not just browser DevTools mobile emulation
- Check browser console for errors during testing
- Monitor Supabase dashboard → Logs for RLS or permission errors

---

## Post-Implementation

After all fixes are verified:
1. Update README.md with correct feature status
2. Test full user journey: Sign up → Enable push → Use app for 1 week → Save weekly review
3. Load test: Simulate 10+ conversations in AI chat, verify no lag
4. Consider adding analytics to track feature adoption
5. Plan Phase 2: Error handling, loading states, offline indicators
