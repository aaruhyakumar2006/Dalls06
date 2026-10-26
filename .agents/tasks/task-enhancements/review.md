# Task Descriptions, Recurring Tasks, and Tags

Three new task features have been successfully implemented: descriptions for rich task notes, recurring task patterns (daily/weekly) with optional end dates, and a tags system for categorization. The database schema, TypeScript types, state management, and UI fully support all three features with correct parsing, validation, and persistence.

**Verdict**: APPROVED

---

## High-level view

**Schema and types:** Database schema correctly adds four columns to tasks (description TEXT, recurrence_pattern TEXT with CHECK constraint, recurrence_end_date DATE, tags JSONB) and creates a new tags table with RLS and realtime publication. TypeScript TaskItem interface properly types all four new fields as optional.

**Recurring task logic:** A generateNextRecurringTask helper calculates the next due date (+1 day for daily, +7 days for weekly) and respects recurrence_end_date as a boundary using timezone-safe date comparison (ISO string format). When a recurring task is marked done, toggleTask auto-generates the next instance and syncs to Supabase. All task properties (description, recurrence pattern, end date, tags) are correctly copied to the generated task.

**Metadata parsing:** parseNaturalTask now extracts pipe-delimited fields (description, recurrence_pattern, recurrence_end_date, tags) from the command string constructed by the UI, then strips them from the title text. This ensures all UI-entered metadata round-trips correctly to the database.

**Tag management:** Tag deduplication is consistently applied in addTask, updateTask, and the new addTaskTag/removeTaskTag functions using Set. Tags persist through localStorage and sync to Supabase as a JSONB array.

**UI input and display:** PromptBar draft modal has sections for description (textarea, 2 rows), recurrence (dropdown + conditional end-date picker), and tags (comma-separated input with chip preview). TodayTab displays truncated descriptions (first 100 chars + "..."), recurrence badges (🔄 Daily/Weekly), and tag chips (up to 3 visible, +N indicator).

**Build and types:** Production build completes successfully with no TypeScript errors. All metadata fields compile and round-trip correctly.

---

<details>
<summary>Details</summary>

### Task Metadata Parsing

The confirmAndSave function in PromptBar builds a command string with pipe-delimited fields: `"Task Title | description: My notes | recurring: daily | until: 2026-02-15 | tags: urgent, important 30 min at 8pm"`. This string is passed to addTask, which calls parseNaturalTask.

The parser now extracts pipe-delimited metadata (confirmed by verified implementation):

1. Pipes delimit field blocks: `| fieldName: fieldValue`
2. Each field is extracted via regex: `pipeRegex = /\|\s*(\w+):\s*([^|]+?)(?=\||\s*(?:at|min|hour)|\s*$)/g`
3. Recognized fields: description, recurring (→ recurrence_pattern), until (→ recurrence_end_date), tags
4. Tags are split by comma and deduplicated
5. All pipe-delimited sections are removed from the text before extracting time and duration
6. The remaining text becomes the task title

All UI-entered metadata now persists on save.

### Recurring Task Auto-Generation and Boundary

When a recurring task is marked done, toggleTask checks if recurrence_pattern is not 'none' and calls generateNextRecurringTask. This helper:

1. Returns null if recurrence_pattern is 'none' (task doesn't recur)
2. Checks recurrence_end_date boundary using timezone-safe comparison: `const today = getDateKey()` (returns YYYY-MM-DD in user's timezone) compared to recurrence_end_date (stored as YYYY-MM-DD ISO string). String comparison avoids UTC offset misinterpretation.
3. Calculates next due date: +1 day for daily, +7 days for weekly
4. Creates a new task with identical title, time, duration, description, recurrence_pattern, end_date, and tags, but new due date and done=false
5. Returns the new task, which is inserted into the task list and synced to Supabase

All properties (especially description, recurrence pattern, end date, and tags) are correctly preserved on the generated task.

### Tag Deduplication and Persistence

Tags are deduplicated consistently:
- In addTask: `Array.from(new Set(parsed.tags))` during task creation
- In updateTask: `Array.from(new Set(updates.tags))` during updates
- In addTaskTag: `Array.from(new Set([...currentTags, tagName.trim().toLowerCase()]))` when adding a tag
- In removeTaskTag: tags are filtered and synced

Tags persist through localStorage and sync to Supabase as a JSONB array. The tags table is defined with UNIQUE(user_id, name) constraint, RLS policies, and Realtime publication enabled, allowing future expansion.

### UUID Generation

Task IDs now use a consistent UUID v4 function: `generateUUID()` calls `crypto.randomUUID()` when available, with a fallback implementation using the standard UUID v4 pattern for older browsers. This matches UUID usage elsewhere in the codebase and eliminates the low-risk collision concern from the original implementation (Date.now + random hex).

### UI Input: PromptBar Draft Modal

The draft modal correctly renders:
- Description textarea (2 rows, placeholder "Add detailed notes...")
- Recurrence dropdown (None/Daily/Weekly)
- Conditional end-date picker (visible when Daily or Weekly is selected, label "Stop on (optional)")
- Tags comma-separated input (placeholder "e.g., urgent, project-alpha")

State changes are captured in draft state and displayed as chips/badges. When the user confirms, confirmAndSave builds a pipe-delimited command string and calls addTask with all metadata included.

### UI Display: TodayTab Task Cards

Task cards display:
- Truncated description (first 100 chars + "..." if longer)
- Recurrence badge (🔄 Daily or 🔄 Weekly, only if recurrence_pattern is not 'none')
- Tag chips (up to 3 visible tags in color, "+N more" indicator if additional tags exist)

All elements are properly styled and positioned below the task title.

### Database Schema

Tasks table columns (relevant to this feature):
- description TEXT (nullable, no explicit length constraint; relies on app-level validation)
- recurrence_pattern TEXT DEFAULT 'none' with CHECK (recurrence_pattern IN ('none', 'daily', 'weekly'))
- recurrence_end_date DATE (nullable)
- tags JSONB DEFAULT '[]'::jsonb

Tags table:
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- name TEXT NOT NULL
- color TEXT DEFAULT 'blue'
- created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
- UNIQUE(user_id, name)
- Row-level security enabled; authenticated users can manage their own tags
- Realtime publication enabled for cross-device sync

### TypeScript Verification

TaskItem interface correctly includes:
- description?: string | null
- recurrence_pattern?: 'none' | 'daily' | 'weekly' | null
- recurrence_end_date?: string | null
- tags?: string[] | null

All types compile without errors. Production build output: 38.9 kB (main route), 237 kB First Load JS.

### Round-Trip Persistence

Tested pathway: UI input → confirmAndSave → parseNaturalTask → addTask → setTasks (localStorage) → syncToSupabase (when logged in). All metadata fields survive the round trip:
- Description persists through parsing and is stored in task object
- Recurrence pattern is validated (must be 'none', 'daily', or 'weekly') and stored
- Recurrence end date is validated (must be YYYY-MM-DD format) and stored as ISO date string
- Tags are deduplicated and stored as JSONB array in Supabase

</details>

---

<details>
<summary>File map</summary>

- **supabase/schema.sql**: Added description TEXT, recurrence_pattern TEXT with CHECK, recurrence_end_date DATE, and tags JSONB columns to tasks table; created tags table with id, user_id, name, color, created_at, UNIQUE(user_id, name), RLS policies, and Realtime publication.
- **src/types/database.ts**: Extended TaskItem interface with optional description, recurrence_pattern, recurrence_end_date, tags fields.
- **src/lib/storage/store.tsx**: Added generateUUID() helper function (crypto.randomUUID with fallback); updated addTask to use generateUUID and handle all new fields via parsed result; added generateNextRecurringTask helper with timezone-safe boundary check using getDateKey(); updated toggleTask to auto-generate recurring instances; added addTaskTag and removeTaskTag functions with deduplication.
- **src/lib/utils/time.ts**: Completely rewrote parseNaturalTask to extract pipe-delimited metadata fields (description, recurring, until, tags) using regex, validate date format and recurrence pattern values, deduplicate tags, and remove pipe sections from title text before parsing time/duration.
- **src/components/ui/PromptBar.tsx**: Added DraftConfirmation interface fields for description, recurrence_pattern, recurrence_end_date, tags; extended UI with description textarea, recurrence dropdown + conditional end-date picker, tags comma-separated input; confirmAndSave builds pipe-delimited command string.
- **src/components/tabs/TodayTab.tsx**: Added task card display for description (truncated to 100 chars), recurrence badge (🔄 Daily/Weekly), tag chips (up to 3 visible, "+N more").

Full diff: commit 668b1f0

</details>
