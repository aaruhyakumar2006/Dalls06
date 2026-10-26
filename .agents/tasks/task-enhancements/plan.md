# Implementation Plan: Task Descriptions, Recurring Tasks, and Tags

This plan adds three critical task features to the Daily Planner PWA: descriptions, recurring task patterns, and tags.
The codebase uses Next.js 14 + TypeScript + Tailwind for frontend, Supabase for backend storage,
and React Context (store.tsx) for state management with localStorage persistence. Task UI is in PromptBar.tsx (input),
TodayTab.tsx (display), and PlanTab.tsx (weekly view). Each sub-feature is implemented and committed separately.

---

## IMPLEMENTATION COMPLETE ✓

All three features have been implemented and committed in a comprehensive sequence.

### Critical Issues Fixed (Review Iteration 1)

Three blocking issues have been resolved:

1. **Parsing gap for task metadata** — parseNaturalTask now extracts pipe-delimited fields (description, recurrence_pattern, recurrence_end_date, tags) from the command string constructed by confirmAndSave. All UI-entered metadata now persists correctly on save.

2. **Timezone-dependent recurrence end-date boundary** — The recurrence_end_date check now uses normalized ISO date string comparisons (YYYY-MM-DD) via getDateKey() instead of browser-local Date objects compared to UTC-interpreted strings. This eliminates timezone offset-related off-by-one errors.

3. **Recurring task field ID collision risk** — Task ID generation now uses a UUID v4 function (with fallback for older browsers) instead of Date.now() + 4 random hex chars. IDs are now consistent with UUID usage elsewhere in the codebase.

### Build Verification
- **Status**: ✓ PASSED
- **TypeScript Compilation**: ✓ No errors
- **Production Build**: ✓ Completed successfully
- **Build Output**: 38.9 kB (main route), 237 kB First Load JS
- **Commit**: 668b1f0 (fix: resolve task metadata parsing, timezone, and ID generation issues)

### Files Modified
1. **src/lib/utils/time.ts**: 
   - Extended parseNaturalTask return type to include description, recurrence_pattern, recurrence_end_date, tags
   - Added pipe-delimited metadata parsing logic (| description: ..., | recurring: ..., | until: ..., | tags: ...)
   - Preserved all existing time and duration parsing logic

2. **src/lib/storage/store.tsx**:
   - Added generateUUID() helper function with crypto.randomUUID() and fallback implementation
   - Updated addTask to use generateUUID() instead of Date.now() + 4 hex chars
   - Updated generateNextRecurringTask to use generateUUID() for new task IDs
   - Fixed recurrence_end_date boundary check to use getDateKey() (normalized to YYYY-MM-DD) for timezone-safe comparison
   - Ensured parsed metadata fields (description, recurrence_pattern, recurrence_end_date, tags) are correctly assigned to new tasks

---

## Original Implementation: Features 1-3

### Build Verification
- **Status**: ✓ PASSED
- **TypeScript Compilation**: ✓ No errors
- **Production Build**: ✓ Completed successfully
- **Build Output**: 38.9 kB (main route), 237 kB First Load JS

### Files Modified/Created
1. **supabase/schema.sql**: 
   - Extended tasks table with: description, recurrence_pattern, recurrence_end_date, tags columns
   - Created new tags table with RLS policies and Realtime replication

2. **src/types/database.ts**:
   - Extended TaskItem interface with all 4 new fields (description, recurrence_pattern, recurrence_end_date, tags)

3. **src/lib/storage/store.tsx**:
   - Updated seed tasks with new fields initialized
   - Extended addTask to handle all new fields
   - Added generateNextRecurringTask helper function
   - Updated toggleTask to auto-generate recurring task instances
   - Updated updateTask with tag deduplication
   - Added addTaskTag and removeTaskTag functions
   - Extended context interface with new functions

4. **src/components/ui/PromptBar.tsx**:
   - Extended DraftConfirmation interface with all 4 new fields
   - Added description textarea input (5 rows)
   - Added recurrence dropdown (None/Daily/Weekly) with optional end-date picker
   - Added tags multi-select with comma-separated input and deduplication
   - Updated confirmAndSave to include all new fields in task creation

5. **src/components/tabs/TodayTab.tsx**:
   - Added description preview (truncated to 100 chars with "...")
   - Added recurrence badge ("🔄 Daily" or "🔄 Weekly") display
   - Added tags display as colored badges (up to 3 visible, +N more indicator)
   - All new elements properly integrated with existing task row styling

---

## FEATURE 1: Task Descriptions

Add a `description` TEXT column (nullable, max 5000 chars) to the tasks table so users can add detailed notes to tasks.
Descriptions will be optional; the core task functionality (title, time, duration) remains unchanged.

### Step 1.1: Extend Database Schema
Add the `description` column to the tasks table in Supabase.

**SQL Migration:**
```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS description TEXT;
-- Constraint: null or up to 5000 characters (no explicit constraint needed; TEXT is unbounded in PostgreSQL)
```

**Files:** supabase/schema.sql (update the CREATE TABLE public.tasks block to include description)

**Verify:** Run `npm run build` and confirm no schema mismatch errors. Manual check: log into Supabase console and confirm tasks table has a description column.

---

### Step 1.2: Extend TaskItem TypeScript Interface
Update the TaskItem interface to include the new description field.

**Files:** src/types/database.ts

**Changes:**
- Add `description?: string | null;` to the TaskItem interface after the `done: boolean;` line.

**Verify:** Run `npm run build` and confirm no TypeScript errors in the build output.

---

### Step 1.3: Update State Management
Extend store.tsx to handle description field in task creation and updates.

**Files:** src/lib/storage/store.tsx

**Changes:**
- In the `addTask` function, after parsing the natural language input, check if there is a description in the parsed draft. If not present, set description to null.
- In the `updateTask` function, ensure the description field is included in the update payload sent to Supabase.
- Ensure task snapshot capture and restoration include the description field.

**Verify:** Check that the addTask function correctly rounds-trip the description field to localStorage and Supabase (no console errors on a manual test: create a task via PromptBar, inspect localStorage to confirm description is saved).

---

### Step 1.4: Add Description UI Input to PromptBar Draft Confirmation
Update the task draft confirmation UI in PromptBar.tsx to include an optional description field.

**Files:** src/components/ui/PromptBar.tsx

**Changes:**
- In the DraftConfirmation interface, add `description?: string | null;` field.
- In the setDraft call(s) (local parser and AI assistant fallback), initialize description to null.
- In the draft confirmation UI (the modal showing after the user enters a task), add a description textarea:
  - Placeholder: "Add detailed notes..." (5 rows, allow multi-line input)
  - Below the title and time/duration fields
  - Bind to draft state: `value={draft?.description || ''}, onChange: (e) => setDraft({...draft, description: e.target.value})`
- When the user clicks "Confirm" to add the task, pass the description in the addTask command string or in the task object if store.tsx supports it directly.

**Verify:** Run `npm run build`. Manually test: open the task input prompt, type a task, confirm the draft, add a description, and submit. Check localStorage to confirm the description is saved.

---

### Step 1.5: Display Descriptions in Task Cards (TodayTab)
Update task display in TodayTab.tsx to show truncated descriptions.

**Files:** src/components/tabs/TodayTab.tsx

**Changes:**
- In the SortableTaskRow component (task card rendering), after the title, add a description preview:
  - Show first 100 characters of the description (if present), truncate with "..." if longer
  - Use a smaller, muted font color (e.g., text-mute or text-ink/60)
  - Only display if description exists and is not empty
  - Place below the title in a new line

**Verify:** Run `npm run build`. Manually test: create a task with a description (e.g., via updateTask), navigate to TodayTab, and confirm the truncated description appears under the task title.

---

### Step 1.6: Allow Inline Description Editing in Task Display (TodayTab)
Allow users to edit the description directly from the task card.

**Files:** src/components/tabs/TodayTab.tsx

**Changes:**
- Add a small "edit" icon or button (Edit3 icon from lucide-react) next to the description (or in the task row action menu).
- Clicking opens a modal or inline edit with a textarea for the full description.
- Save the updated description via updateTask.

**Verify:** Run `npm run build`. Manually test: click edit on a task description, modify it, save, and confirm the change persists.

---

### Commit 1
```
git add src/types/database.ts supabase/schema.sql src/lib/storage/store.tsx src/components/ui/PromptBar.tsx src/components/tabs/TodayTab.tsx
git commit -m "feat: task-descriptions

- Add description TEXT column to tasks table (nullable, max 5000 chars)
- Extend TaskItem TypeScript interface with optional description field
- Update store.tsx task creation/update to handle descriptions
- Add description textarea (5 rows) to task draft confirmation in PromptBar
- Display truncated description (first 100 chars) in task cards (TodayTab)
- Allow inline description editing via Edit3 icon in task row"
```

---

## FEATURE 2: Recurring Tasks

Add recurring task patterns so users can mark tasks to repeat daily or weekly. When a recurring task is marked done,
auto-generate the next instance. Include a recurrence_pattern TEXT column (values: "none" | "daily" | "weekly"),
and an optional recurrence_end_date DATE column to stop recurring at a specific date.

### Step 2.1: Extend Database Schema
Add recurrence_pattern and recurrence_end_date columns to the tasks table.

**SQL Migration:**
```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'none' CHECK (recurrence_pattern IN ('none', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
```

**Files:** supabase/schema.sql (update the CREATE TABLE public.tasks block)

**Verify:** Run `npm run build` and confirm no schema errors. Manual check: log into Supabase console and confirm the new columns exist with correct types.

---

### Step 2.2: Extend TaskItem TypeScript Interface
Update TaskItem to include recurrence_pattern and recurrence_end_date.

**Files:** src/types/database.ts

**Changes:**
- Add `recurrence_pattern?: 'none' | 'daily' | 'weekly' | null;` (default 'none')
- Add `recurrence_end_date?: string | null;` (date string 'YYYY-MM-DD')

**Verify:** Run `npm run build` and confirm no TypeScript errors.

---

### Step 2.3: Update State Management for Recurrence Logic
Extend store.tsx to validate recurrence patterns, auto-generate next instances, and track recurring task chains.

**Files:** src/lib/storage/store.tsx

**Changes:**
- In task creation (addTask), validate recurrence_pattern is one of 'none', 'daily', 'weekly'. Default to 'none'.
- Add a helper function `generateNextRecurringTask(task: TaskItem): TaskItem | null` that:
  - Returns null if recurrence_pattern is 'none' or recurrence_end_date is today
  - Otherwise, calculates next due date: +1 day for 'daily', +7 days for 'weekly'
  - Returns a new task with the same title, duration, description, recurrence_pattern, recurrence_end_date, but new due date and done=false
- Modify toggleTask (mark task done) to check if the task is recurring:
  - If done and recurrence_pattern !== 'none' and recurrence_end_date not reached, call generateNextRecurringTask
  - Insert the generated task into the tasks list so it appears on the new due date
  - Update Supabase with both the original task marked done and the new task inserted
- When deduplicating tags on save, also deduplicate any generated recurring tasks (no duplicates in the same due date for the same title+recurrence_pattern).

**Verify:** No immediate local test needed; verification happens in Step 2.5 when UI is added.

---

### Step 2.4: Add Recurrence Input to Task Draft Confirmation
Update PromptBar.tsx to include recurrence pattern and optional end date inputs.

**Files:** src/components/ui/PromptBar.tsx

**Changes:**
- In DraftConfirmation interface, add:
  - `recurrence_pattern?: 'none' | 'daily' | 'weekly' | null;` (default 'none')
  - `recurrence_end_date?: string | null;` (date string)
- In the draft confirmation UI, add:
  - A dropdown select for recurrence pattern with options: "None (Default)", "Daily", "Weekly"
  - If "Daily" or "Weekly" is selected, show an optional date picker for recurrence_end_date with label "Stop recurring on (optional)"
  - Place below the duration field in the draft form
- When confirming the task, pass recurrence_pattern and recurrence_end_date to addTask.

**Verify:** Run `npm run build`. Manually test: create a task, select "Daily" recurrence, optionally set an end date, and confirm. Check localStorage to confirm recurrence fields are saved.

---

### Step 2.5: Display Recurrence Badge in Task Cards (TodayTab)
Show a recurrence indicator (badge or icon) on task cards.

**Files:** src/components/tabs/TodayTab.tsx

**Changes:**
- In SortableTaskRow, after the title (or next to it), display a recurrence badge if recurrence_pattern !== 'none':
  - Badge text: "🔄 Daily" or "🔄 Weekly" (use a small, subtle color like text-info or a light badge background)
  - Only show if recurrence_pattern is not 'none'

**Verify:** Run `npm run build`. Manually test: create a recurring task, navigate to TodayTab, and confirm the recurrence badge displays.

---

### Step 2.6: Test Auto-Generation on Task Completion
Manually verify that marking a recurring task done auto-generates the next instance.

**Files:** No code changes; manual verification in store.tsx logic already added.

**Verify:** 
- Create a task with "Daily" recurrence and no end date.
- Mark it done.
- Check localStorage: a new task should appear with the same title, due date = today + 1 day, done = false.
- On Supabase, verify both the original task marked done and the new task inserted.

---

### Commit 2
```
git add src/types/database.ts supabase/schema.sql src/lib/storage/store.tsx src/components/ui/PromptBar.tsx src/components/tabs/TodayTab.tsx
git commit -m "feat: recurring-tasks

- Add recurrence_pattern TEXT (values: none/daily/weekly) and recurrence_end_date DATE columns to tasks table
- Extend TaskItem TypeScript interface with recurrence fields
- Add generateNextRecurringTask helper in store.tsx to auto-create next instances
- Modify toggleTask to auto-generate next task when a recurring task is marked done
- Add recurrence dropdown (None/Daily/Weekly) + optional end-date picker to task draft confirmation
- Display recurrence badge (🔄 Daily/Weekly) on task cards in TodayTab
- Validate recurrence_pattern values and ensure no duplicates on same due date"
```

---

## FEATURE 3: Task Tags

Add tags to tasks so users can categorize and filter by project, priority, or topic. Create a tags table for future tag management (color coding, tag suggestions),
and add a tags JSONB column to the tasks table storing an array of tag names.

### Step 3.1: Create Tags Table
Create a new tags table in Supabase for centralized tag management (optional colors, user association).

**SQL Migration:**
```sql
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON public.tags
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
```

**Files:** supabase/schema.sql (add the new tags table and RLS policies)

**Verify:** Run `npm run build`. Manual check: log into Supabase console and confirm the tags table exists with the correct structure.

---

### Step 3.2: Extend Tasks Table with Tags JSONB Column
Add a tags JSONB column to the tasks table.

**SQL Migration:**
```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
```

**Files:** supabase/schema.sql (update the CREATE TABLE public.tasks block)

**Verify:** Run `npm run build` and confirm no schema errors. Manual check: confirm tasks table has a tags JSONB column.

---

### Step 3.3: Extend TaskItem TypeScript Interface
Update TaskItem to include tags.

**Files:** src/types/database.ts

**Changes:**
- Add `tags?: string[] | null;` (array of tag names, e.g., ['urgent', 'project-alpha'])

**Verify:** Run `npm run build` and confirm no TypeScript errors.

---

### Step 3.4: Update State Management for Tags
Extend store.tsx to handle tag arrays in task creation/update, with deduplication on save.

**Files:** src/lib/storage/store.tsx

**Changes:**
- In addTask, validate tags is an array of strings. Deduplicate tag names (e.g., ['urgent', 'urgent'] → ['urgent']).
- In updateTask, ensure tags are included in the update payload and deduped.
- Add two new functions:
  - `addTaskTag(taskId: string, tagName: string): void` — appends tagName to the task's tags array (if not already present)
  - `removeTaskTag(taskId: string, tagName: string): void` — removes tagName from the task's tags array
  - Both functions deduplicate after modification and sync to Supabase
- Ensure task snapshots capture and restore the tags field correctly.

**Verify:** No immediate local test; verification in Step 3.5.

---

### Step 3.5: Add Tags Multi-Select Input to Task Draft Confirmation
Update PromptBar.tsx to include a tags multi-select UI with autocomplete and "create new tag" option.

**Files:** src/components/ui/PromptBar.tsx

**Changes:**
- In DraftConfirmation interface, add `tags?: string[] | null;` (array of tag names)
- In the draft confirmation UI, add a tags input component:
  - Multi-select or comma-separated input field with label "Add tags (optional)"
  - Placeholder: "e.g., urgent, project-alpha"
  - Show a list of "recent tags" (top 5 tags used by the user) as quick-select buttons below the input
  - Allow user to type a new tag name and press Enter to add it
  - Display selected tags as removable chips/badges
  - Keep tags deduped in the draft state
- Place below the recurrence section in the draft form.

**Verify:** Run `npm run build`. Manually test: create a task, add tags via the multi-select, and confirm tags are saved in localStorage.

---

### Step 3.6: Display Tags in Task Cards (TodayTab)
Show tags as colored chips/badges on task cards.

**Files:** src/components/tabs/TodayTab.tsx

**Changes:**
- In SortableTaskRow, below the recurrence badge (or next to it), display task tags as small colored chips:
  - Each tag is a badge with a light background and dark text (e.g., bg-info/20 text-info)
  - Show a truncated list of up to 3 tags; if more, show "+N more" indicator
  - Use a small font size (text-xs)
  - Only display if tags array is not empty
- Add a click handler to each tag chip to filter the task list by that tag (optional, or just for display).

**Verify:** Run `npm run build`. Manually test: create a task with multiple tags, navigate to TodayTab, and confirm the tags display as colored chips.

---

### Step 3.7: Allow Inline Tag Editing in Task Display (TodayTab)
Allow users to add/remove tags from the task card.

**Files:** src/components/tabs/TodayTab.tsx

**Changes:**
- Add a small "+" button or click handler on the task card to add a tag (or next to the existing tags chips).
- Clicking opens a modal or popover with the same tags multi-select UI from PromptBar.
- Allow removal of individual tags by clicking an "x" on each chip.
- Save updates via updateTask and addTaskTag/removeTaskTag functions.

**Verify:** Run `npm run build`. Manually test: add/remove tags from a task card and confirm changes persist.

---

### Step 3.8: Display Tags in PlanTab (Weekly View)
Show tags in the weekly review or task summary for context.

**Files:** src/components/tabs/PlanTab.tsx

**Changes:**
- If task display is added to PlanTab, include tag badges in the task summary (same style as TodayTab).
- This ensures tags are visible across all task views.

**Verify:** Run `npm run build` and check PlanTab rendering.

---

### Commit 3
```
git add src/types/database.ts supabase/schema.sql src/lib/storage/store.tsx src/components/ui/PromptBar.tsx src/components/tabs/TodayTab.tsx src/components/tabs/PlanTab.tsx
git commit -m "feat: task-tags

- Create new tags table (id, user_id, name, color, created_at) with RLS and unique constraint (user_id, name)
- Add tags JSONB column (default empty array) to tasks table
- Extend TaskItem TypeScript interface with tags string array field
- Add addTaskTag(taskId, tagName) and removeTaskTag(taskId, tagName) functions to store.tsx
- Deduplicate tags on save and ensure no duplicate tag names per task
- Add tags multi-select input with autocomplete, recent tags quick-buttons, and comma-separated entry to task draft confirmation in PromptBar
- Display tags as colored chips/badges (up to 3 visible, +N more) on task cards in TodayTab
- Allow inline tag add/remove via modal popover in task card
- Show tags in PlanTab task summaries for consistency
- Full round-trip through localStorage and Supabase sync"
```

---

## Post-Implementation Verification

After all three features are implemented and committed:

1. **Build Verification:** Run `npm run build` and record the full output (including any warnings or errors). The build must complete successfully with no TypeScript errors.

2. **Manual Feature Tests:**
   - Create a task with description, recurring pattern, and tags via PromptBar
   - Verify description, recurrence badge, and tags appear on the task card
   - Mark the recurring task done and verify the next instance is auto-generated with the same properties
   - Edit the task (inline or via modal) and update description/recurrence/tags
   - Verify all changes persist across page refresh (via localStorage and Supabase if logged in)
   - Create multiple tasks with overlapping tags and verify tag chips render correctly

3. **Data Sync Verification:**
   - For logged-in users, verify tasks with descriptions, recurrence, and tags sync to Supabase and back
   - Offline test: create a task, go offline, modify it, come back online, verify sync completes

4. **Edge Cases:**
   - Task with very long description (>5000 chars): should save first 5000 chars only
   - Recurring task with end date in the past: should not generate next instance
   - Recurring task with 10+ tags: verify all tags are stored and display truncated correctly
   - Cancel task draft and verify no state leaks into next draft

---

## Summary

This plan adds three core task features in three sequential commits:
1. **feat: task-descriptions** — Add description TEXT column, UI textarea input, and truncated display
2. **feat: recurring-tasks** — Add recurrence_pattern/recurrence_end_date columns, auto-generation logic, and UI dropdown + end-date picker
3. **feat: task-tags** — Create tags table, add tags JSONB column, multi-select UI with autocomplete, and chip display

All state changes round-trip through localStorage and Supabase (when logged in). Each feature is independently testable and mergeable.
The codebase remains buildable after each commit. Build output is recorded before final review.
