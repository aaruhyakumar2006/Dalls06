# Implementation Plan: Complete UI Redesign for Daily Planner PWA

## Overview
Transform the entire UI from the current "Match Point" sports-themed design to a modern, playful, card-based design inspired by contemporary task management apps. The redesign introduces warm colors (teal, coral, purple, yellow), highly rounded cards (20-24px radius), generous spacing, and delightful micro-interactions while preserving all existing functionality.

## Design System Migration Summary
- **From**: Sports/court theme (blues, pinks, sticker shadows, 18px radius)
- **To**: Modern warm palette (teal/coral/purple/yellow, soft shadows, 20-24px radius)
- **Key Pattern**: All existing functionality must remain intact; this is purely visual

---

## Phase 1: Design System Foundation (3 items)

### ☐ 1. Update Tailwind Configuration with New Design Tokens
**What**: Replace current color palette and design tokens in `tailwind.config.ts` with new modern, warm color system. Extend border-radius options (20px, 24px) and custom shadow utilities for soft, elevated cards.

**Files to modify**:
- `e:\personal todo\tailwind.config.ts`

**Changes**:
- Keep existing `darkMode` config unchanged
- Replace `colors.extend` section with new palette:
  - `primary`: { DEFAULT: '#4ECDC4', dark: '#45B7AF' } (teal)
  - `secondary`: { DEFAULT: '#FF6B6B', light: '#FFB84D' } (coral/orange)
  - `accent`: { purple: '#9B7EBD', yellow: '#FFE66D' }
  - `background`: { DEFAULT: '#FAFAFA', cream: '#FFF8E7' }
  - `text`: { DEFAULT: '#2C3E50', muted: '#7F8C8D' }
  - `success`: '#6BCF7F', `warning`: '#FFB84D', `error`: '#FF6B6B'
- Keep existing `bg`, `card`, `ink`, `mute`, `rail` as CSS custom properties for backward compatibility during transition
- Add `borderRadius`: { 'card-new': '20px', 'card-xl': '24px', 'pill': '999px' }
- Add `boxShadow`: { 'card-soft': '0 4px 12px rgba(0,0,0,0.08)', 'card-hover': '0 8px 16px rgba(0,0,0,0.12)' }

**Verify**: Run `npm run build` — should complete without errors.

---

### ☐ 2. Update Global CSS with New Variables and Transitions
**What**: Update `globals.css` to introduce new CSS custom properties for the warm color palette, smooth transitions, and remove/preserve old variables for backward compatibility during gradual migration.

**Files to modify**:
- `e:\personal todo\src\app\globals.css`

**Changes**:
- Add new CSS variables in `:root`:
  - `--primary-teal: #4ECDC4;`
  - `--secondary-coral: #FF6B6B;`
  - `--secondary-orange: #FFB84D;`
  - `--accent-purple: #9B7EBD;`
  - `--accent-yellow: #FFE66D;`
  - `--bg-off-white: #FAFAFA;`
  - `--bg-cream: #FFF8E7;`
  - `--text-charcoal: #2C3E50;`
  - `--text-gray: #7F8C8D;`
  - `--success-mint: #6BCF7F;`
  - `--warning-orange: #FFB84D;`
  - `--error-coral: #FF6B6B;`
- Keep existing `--bg`, `--card`, `--ink`, etc. for now (will be phased out component by component)
- Update dark mode variables in `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]` with adjusted teal/coral/purple shades
- Add global transition utilities:
  ```css
  * {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  button:active, a:active {
    transform: scale(0.98);
  }
  ```
- Remove `.court-sticker` styles (will be replaced by new card system)
- Keep focus-visible styles unchanged (accessibility requirement)

**Verify**: Run `npm run build` — should complete without errors. Visual changes not yet visible.

---

### ☐ 3. Create Reusable Card Component System
**What**: Create new UI component files for the modern card-based design system: `Card.tsx`, `StatCard.tsx`, and `ProgressRing.tsx`. These will be used across all tabs.

**Files to create**:
- `e:\personal todo\src\components\ui\Card.tsx`
- `e:\personal todo\src\components\ui\StatCard.tsx`
- `e:\personal todo\src\components\ui\ProgressRing.tsx`

**Card.tsx spec**:
- Accept props: `variant` ('default' | 'elevated' | 'outlined'), `padding` ('sm' | 'md' | 'lg'), `rounded` ('lg' | 'xl' | '2xl'), `onClick?`, `className?`, `children`
- Default: white background, 20px border-radius, soft shadow (0 4px 12px rgba(0,0,0,0.08))
- Hover state: slight lift (translateY(-2px)), shadow increase
- Use Tailwind classes: `bg-white rounded-card-new shadow-card-soft hover:shadow-card-hover transition-all`

**StatCard.tsx spec**:
- Accept props: `icon`, `label`, `value`, `color` ('teal' | 'coral' | 'purple' | 'yellow'), `trend?` ('+12%' | '-5%')
- Layout: Icon in colored circle (left), label + large value (center), optional trend indicator (right)
- Card wrapper using Card component with variant='elevated'

**ProgressRing.tsx spec**:
- Accept props: `progress` (0-100), `size` ('sm' | 'md' | 'lg'), `color`, `strokeWidth`, `label?`
- SVG circular progress indicator with animated stroke-dashoffset
- Display percentage in center
- Use CSS custom properties for smooth animation

**Verify**: Run `npm run build` — should complete without errors. Components not yet used.

---

## Phase 2: Layout Redesign (2 items)

### ☐ 4. Redesign AppShell Header and Bottom Navigation
**What**: Update `AppShell.tsx` to replace sports-themed header with modern card-based design. Desktop left rail gets new card styling. Bottom nav gets pill-shaped active states. Mobile header shows user greeting + progress ring.

**Files to modify**:
- `e:\personal todo\src\components\layout\AppShell.tsx`

**Changes**:
- **Desktop left rail** (`.hidden lg:flex` sidebar):
  - Replace `bg-card border-r-2 border-ink` with `bg-background p-4 border-r border-gray-200`
  - Brand header: Keep ShuttleIcon but update card styling to use new `rounded-card-xl bg-white shadow-card-soft`
  - Navigation buttons: Replace sticker shadows with soft cards, active state gets `bg-primary text-white` instead of `bg-court`
  - Badge colors: Replace `bg-smash` with `bg-secondary-coral`
  - Sync status indicator: Replace sticker shadow with soft card, use new color variables

- **Mobile top header** (`.lg:hidden` header):
  - Add user greeting section: "Hello, [Name]" with small avatar (if profile exists)
  - Add small ProgressRing component showing today's completion (task count / total tasks)
  - Keep theme toggle, palette, settings buttons but update styling to rounded-xl with soft hover states

- **Bottom navigation** (`.lg:hidden fixed bottom-0`):
  - Keep 5-tab structure (Today, Review, Track, Plan, Analytics, Assistant with center FAB)
  - Active tab: Replace `text-court font-bold` with pill-shaped background `bg-primary/10 text-primary rounded-pill px-3 py-1`
  - Inactive tabs: `text-muted hover:text-text-charcoal`
  - Badge: Replace `bg-smash` with `bg-secondary-coral`
  - Center '+' button: Keep elevated but update shadow to `shadow-card-hover`, use `bg-primary` instead of `bg-shuttle`

- **Desktop right panel** (`.hidden xl:block` sidebar):
  - RallyCounter: Update card wrapper to use new Card component
  - Due reviews card: Use new Card component with `rounded-card-xl shadow-card-soft`
  - Task list card: Use new Card component

**Verify**: Run `npm run build` — should complete without errors. Load app in browser, check that header/nav render correctly on desktop (1440px) and mobile (375px). All navigation should still work.

---

### ☐ 5. Update Content Area Layout and Spacing
**What**: Adjust main content wrapper in `AppShell.tsx` to use new spacing tokens (16-24px gaps), off-white background, and ensure cards have proper breathing room.

**Files to modify**:
- `e:\personal todo\src\components\layout\AppShell.tsx`

**Changes**:
- Main content wrapper (`<main className="flex-1 ..."`):
  - Update `bg-bg` to `bg-background` (off-white #FAFAFA)
  - Increase padding from `p-3 sm:p-4` to `p-4 sm:p-6`
  - Add gap utility if using flex/grid: `gap-6`
- Ensure `max-w-[720px]` center constraint remains for readability
- Right panel spacing: Ensure `space-y-4` becomes `space-y-6` for more generous gaps

**Verify**: Run `npm run build` — should complete. Visual check: Content should have more breathing room, off-white background visible.

---

## Phase 3: Tab Redesigns (6 items, one per tab)

### ☐ 6. Redesign TodayTab with Greeting Header and Card-Based Tasks
**What**: Transform `TodayTab.tsx` from sports-themed design to modern card layout. Add greeting header ("Good Morning, [Name]"), progress ring for today's completion, task cards with rounded corners, and time badges.

**Files to modify**:
- `e:\personal todo\src\components\tabs\TodayTab.tsx`

**Changes**:
- **Replace SkyHeader** with new greeting section:
  - Time-based greeting: "Good Morning" (5am-12pm), "Good Afternoon" (12pm-5pm), "Good Evening" (5pm-9pm), "Night Owl" (9pm-5am)
  - Display user name from profile if available
  - Add sun/moon icon based on time of day (lucide-react: Sun, Moon, Cloud, CloudMoon)
  - Use Card component with gradient background: `bg-gradient-to-br from-primary to-primary-dark`
  - Include small ProgressRing showing today's task completion

- **Task list redesign**:
  - Replace sticker-style borders with Card component wrappers
  - Each task card: `rounded-card-xl shadow-card-soft hover:shadow-card-hover p-4`
  - Checkbox: Rounded circle, checked state `bg-success-mint` instead of `bg-mint`
  - Time badge: Pill shape `rounded-pill bg-primary/10 text-primary px-3 py-1 text-xs font-semibold`
  - Category/tag badges: Similar pill style with appropriate colors (coral for urgent, purple for project, yellow for learning)

- **Block schedule section**:
  - Current "Right now" dark card: Replace with Card component, use `bg-primary text-white` instead of dark background
  - Border accent: Replace yellow (`border-shuttle`) with `border-accent-yellow`
  - Other block cards: Use Card component with appropriate color backgrounds (coral for deep work, teal for review, purple for sport, yellow for wind-down)
  - Increase border-radius to 20px

- **Focus timer modal trigger**: Update button styling to use new primary color and rounded-xl

- **Keep all functionality**: DnD sorting, swipe-to-delete, long-press menus, Google Calendar links — all must still work

**Verify**: Run `npm run build` — should complete. Manual test: Open TodayTab, verify greeting shows correctly, tasks are clickable, drag-drop works, completion triggers confetti, time badges display, no console errors.

---

### ☐ 7. Redesign PlanTab with Weekly Calendar Cards and Schedule Blocks
**What**: Transform `PlanTab.tsx` to modern card-based design. Week view as horizontal scrollable calendar cards, day selector with active pill state, task list for selected day, and recurring task indicators.

**Files to modify**:
- `e:\personal todo\src\components\tabs\PlanTab.tsx`

**Changes**:
- **Header section**: Use Card component for tab selector (schedule / checklists / startups / weekly review)
  - Active tab: `bg-primary text-white rounded-pill px-4 py-2`
  - Inactive: `text-muted hover:text-text-charcoal`

- **Schedule sub-tab**:
  - Week view: Horizontal scroll with 7 day cards
  - Each day card: Card component `rounded-card-xl shadow-card-soft`, selected day gets `border-2 border-primary`
  - Day name: Bold, accent color if today
  - Date number: Large, primary color
  - Task count badge: Pill shape with count

- **Task list for selected day**:
  - Each task: Card component with checkbox, title, time badge (same pattern as TodayTab item 6)
  - Add recurring task indicator: `🔄` icon badge in top-right corner if recurrence_pattern !== 'none'

- **Checklists sub-tab**:
  - List selector (placement / startup / hackathon / flagship): Horizontal pills with active state
  - Checklist items: Card components with checkbox, rounded-xl, soft shadow
  - Add item button: `bg-primary text-white rounded-xl` with plus icon

- **Startups sub-tab**:
  - Startup card: Large Card component with fields in organized sections
  - Update button: Primary color, rounded-xl

- **Weekly review sub-tab**:
  - Summary metrics: Grid of StatCard components (counting days, focus minutes, aptitude accuracy, sleep hygiene)
  - Review form: Card component with inputs
  - "One change" field: Larger, emphasized
  - Submit button: Primary gradient background, rounded-xl

**Verify**: Run `npm run build` — should complete. Manual test: Navigate through all 4 sub-tabs (schedule/checklists/startups/weekly review), verify calendar navigation works, checklist toggle works, startup form saves, weekly review submits.

---

### ☐ 8. Redesign TrackTab with Stat Cards and Mini Charts
**What**: Transform `TrackTab.tsx` to modern dashboard design with prominent stat cards at top (DSA Topics, Sports, Sleep) showing icons + numbers, followed by charts section and input forms in cards.

**Files to modify**:
- `e:\personal todo\src\components\tabs\TrackTab.tsx`

**Changes**:
- **Sub-tab selector** (DSA / Aptitude / Sleep / Sport):
  - Horizontal pills with icons
  - Active: `bg-primary text-white rounded-pill`
  - Inactive: `text-muted hover:text-text-charcoal`

- **DSA sub-tab**:
  - Hero stat at top: StatCard component showing "Topics Practiced" with large number, Code icon, teal color
  - DSA topic grid: Each topic as Card component
  - Topic card layout: Icon (language icon), topic name (bold), "Practiced from blank" button (primary color, rounded-lg), last practiced date (small, muted)
  - Due topics (7+ days): Border accent in coral `border-l-4 border-secondary-coral`
  - Practice button click: Celebration with confetti (keep existing)

- **Aptitude sub-tab**:
  - StatCard grid: Accuracy %, Questions solved, Avg time/question
  - Colors: Calculator icon with purple, TrendingUp icon with teal
  - Input form: Card component with form fields
  - Submit button: Primary color, rounded-xl

- **Sleep sub-tab**:
  - StatCard: Avg sleep hours (last 7 days), Moon icon, purple color
  - 7-day sleep chart: Card component containing simple bar chart
  - Each bar: Rounded top corners, color-coded (green if >= 7h, coral if < 7h)
  - X-axis: Day names (S M T W T F S)
  - Y-axis: Hours (0-10)
  - Target lines: Bedtime 22:45, wake 05:45 (dashed horizontal lines)
  - Correlation insight: Card component below chart showing "On adequate sleep (≥7h), you complete X more core blocks on average"
  - Log form: Card component with time inputs

- **Sport sub-tab**:
  - StatCard: Matches won, Trophy icon, yellow color
  - Sport log list: Each entry as Card component with match/drill icon, opponent, score, date
  - Add log button: Primary color, rounded-xl
  - Inactivity alert (7+ days): Card component with AlertTriangle icon, coral background

**Verify**: Run `npm run build` — should complete. Manual test: Navigate through all 4 sub-tabs, submit DSA practice (check confetti), log aptitude session, log sleep (verify chart updates), log sport match.

---

### ☐ 9. Redesign ReviewTab with Spaced Review Cards
**What**: Transform `ReviewTab.tsx` to modern card design with review items as interactive cards, stage indicators, and action buttons.

**Files to modify**:
- `e:\personal todo\src\components\tabs\ReviewTab.tsx`

**Changes**:
- **Header section**:
  - Badge: Pill shape `bg-primary text-white px-3 py-1 rounded-pill`
  - Due count badge: `bg-secondary-coral text-white`
  - Add concept button: Primary gradient background, rounded-xl, Plus icon

- **Filter section**:
  - Topic filter pills (All / DSA / Aptitude / Startup / Sport): Horizontal scroll
  - Active: `bg-primary text-white rounded-pill`
  - Inactive: `border border-gray-300 text-muted rounded-pill`

- **Due review items**:
  - Each item: Large Card component with elevated shadow
  - Card layout:
    - Top: Concept title (bold, large)
    - Middle: Stage indicator (1d → 3d → 7d → 14d → 30d) with progress dots (filled = completed stages, outlined = future stages)
    - Bottom: Topic kind badge (pill, color-coded by type), "Try from blank" prompt
    - Action buttons: "Got it" (success green, rounded-lg, checkmark icon), "Struggled" (coral, rounded-lg, RotateCcw icon)
  - Hover state: Lift slightly with shadow increase

- **Upcoming review items**:
  - Collapsed by default with "Show upcoming (X items)" button
  - Similar card design but muted colors
  - Next review date badge: Gray pill with Clock icon

- **Add concept modal/form**:
  - If inline: Card component with form fields
  - Title input: Larger, rounded-xl borders
  - Topic kind dropdown: Rounded-xl
  - Submit button: Primary gradient, rounded-xl

**Verify**: Run `npm run build` — should complete. Manual test: Click "Got it" on a review item (check confetti + toast), click "Struggled" (check reset to stage 1), add new concept, filter by topic kind.

---

### ☐ 10. Redesign AnalyticsTab as Modern Dashboard
**What**: Transform `AnalyticsTab.tsx` into modern dashboard with hero metrics (completion rate, streak, weekly total), trend charts, and AI-generated insight cards.

**Files to modify**:
- `e:\personal todo\src\components\tabs\AnalyticsTab.tsx`

**Changes**:
- **Hero stats section** (top row):
  - Grid of 3 StatCard components:
    1. Completion rate % (TrendingUp icon, teal)
    2. Current streak 🔥 (Flame icon, coral)
    3. Weekly total tasks (CheckCircle icon, purple)
  - Each StatCard shows large number, trend indicator (up/down arrow with %), small label

- **Charts section**:
  - Trend chart card: Card component containing line chart (tasks completed over last 14 days)
  - X-axis: Dates, Y-axis: Task count
  - Line color: Primary teal with gradient fill below
  - Data points: Small circles on line
  - Peak hours chart card: Card component containing horizontal bar chart
  - Each bar: Rounded, colored by hour range (morning=teal, afternoon=purple, evening=coral)

- **Insights section**:
  - Grid of insight cards (2 columns on desktop, 1 on mobile)
  - Each insight: Card component with Sparkles/Lightbulb icon, insight text, rounded-xl
  - Insight examples:
    - "Your best day is Monday with 4.2 avg tasks completed"
    - "You're 23% more productive after 7+ hours of sleep"
    - "Focus sessions peak at 11am — schedule deep work then"
  - Card colors: Rotate through accent colors (purple, yellow, teal backgrounds with low opacity)

- **Day-of-week breakdown**:
  - Card component with 7 mini stat rows (one per day)
  - Each row: Day name, small bar chart showing completion rate, number
  - Best day: Highlighted with success-mint background
  - Worst day: Highlighted with warning-orange background

- **Export button** (if needed): Primary color, rounded-xl, Download icon

**Verify**: Run `npm run build` — should complete. Manual test: View AnalyticsTab, verify stats display correctly, charts render, insights are readable, no layout breaks on mobile 375px or desktop 1440px.

---

### ☐ 11. Redesign AssistantTab with Friendly Chat Interface
**What**: Transform `AssistantTab.tsx` to modern chat UI with friendly AI avatar, speech bubbles (user right-aligned teal, AI left-aligned gray), and rounded input bar.

**Files to modify**:
- `e:\personal todo\src\components\tabs\AssistantTab.tsx`

**Changes**:
- **AI avatar section** (top):
  - Card component with gradient background `from-accent-purple to-primary`
  - Large friendly icon: Sparkles icon (lucide-react) or custom illustration
  - Greeting text: "Your AI Coach" (bold, white text)
  - Subtitle: "Ask me anything about your progress, tasks, or focus strategy" (smaller, white/70 opacity)

- **Chat bubbles**:
  - User messages: Right-aligned, `bg-primary text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm` (tail effect on bottom-right), max-width 80%, padding 12px 16px
  - AI messages: Left-aligned, `bg-gray-200 text-text-charcoal rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl` (tail effect on top-left), max-width 80%, padding 12px 16px
  - Message spacing: `space-y-3` between messages
  - Timestamp: Small muted text below each bubble

- **Task draft confirmation card** (when AI parses a task):
  - Card component with accent-yellow background (low opacity)
  - Layout: Icon, parsed task details (title, time, duration), "Confirm" button (success green, rounded-lg), "Edit" button (muted, rounded-lg)

- **Input bar** (bottom, sticky):
  - Card component: `rounded-pill shadow-card-soft`, white background
  - Input field: Transparent background, no border, placeholder "Type or speak..."
  - Mic button: Circular, primary color when listening (with pulse animation)
  - Send button: Circular, primary gradient background, Send icon (lucide-react)

- **Loading state**: Small typing indicator (3 animated dots) in AI bubble style

**Verify**: Run `npm run build` — should complete. Manual test: Send message (check bubble alignment), parse task via AI (check confirmation card), click mic button (check listening state), send task to assistant (check streaming response if implemented).

---

## Phase 4: Modals and Forms (2 items)

### ☐ 12. Redesign All Modals with Rounded Corners and Soft Shadows
**What**: Update all modal components (`AuthModal.tsx`, `FocusTimerModal.tsx`, `OnboardingModal.tsx`, `ProfileModal.tsx`, `SettingsModal.tsx`, `WeeklyScheduleModal.tsx`) to use new card design system with 24px border-radius, soft shadows, and generous padding.

**Files to modify**:
- `e:\personal todo\src\components\modals\AuthModal.tsx`
- `e:\personal todo\src\components\modals\FocusTimerModal.tsx`
- `e:\personal todo\src\components\modals\OnboardingModal.tsx`
- `e:\personal todo\src\components\modals\ProfileModal.tsx`
- `e:\personal todo\src\components\modals\SettingsModal.tsx`
- `e:\personal todo\src\components\modals\WeeklyScheduleModal.tsx`

**Changes (apply to all modals)**:
- **Modal backdrop**: Replace `bg-ink/60` with `bg-black/40 backdrop-blur-md`
- **Modal container**:
  - Replace `border-2 border-ink shadow-sticker` with `shadow-card-hover rounded-card-xl`
  - Mobile: Full-screen with `rounded-t-card-xl` on top corners only
  - Desktop: Centered card with `max-w-md` or `max-w-lg` depending on content
  - Padding: Increase from `p-4` to `p-6`

- **Close button**: Circular, top-right, `rounded-full hover:bg-gray-100`, larger touch target (44x44px min)

- **Modal header**:
  - Title: Larger, bolder font (text-xl or text-2xl)
  - Icon/badge: If present, use new color palette (teal for sync, coral for alerts, purple for special)

- **AuthModal specific**:
  - Sign-in buttons: Rounded-xl, primary color gradient for Google button
  - Email input: Rounded-xl borders, soft focus state (primary outline)
  - Success/error messages: Card component with appropriate color (success-mint bg for success, error-coral bg for error)

- **FocusTimerModal specific**:
  - Timer presets: Pill-shaped buttons, active state with primary background
  - Large timer display: Card component with gradient background
  - "Phone in another room?" checkbox: Larger, rounded checkbox with primary color when checked
  - Start button: Large, primary gradient, rounded-xl, pulse animation when ready

- **OnboardingModal specific**:
  - Slide indicators: Horizontal dots, active=primary color, inactive=gray
  - Skip button: Text button, muted color
  - Next/Done buttons: Primary gradient, rounded-xl

- **ProfileModal specific**:
  - Avatar section: Circular avatar with border, large (80px or 100px)
  - Form fields: Rounded-xl inputs with soft borders
  - Save button: Primary gradient, rounded-xl

- **SettingsModal specific**:
  - Section headers: Bold, with icon
  - Toggle switches: Modern toggle design (rounded-pill track, circular thumb, primary color when on)
  - Theme selector: Pill buttons (Light/Dark/Auto), active state with primary background
  - Danger zone (reset data): Card component with error-coral border

- **WeeklyScheduleModal specific**:
  - Day tabs: Horizontal pills, active state with primary background
  - Time slots: Card components, editable fields with rounded-xl inputs
  - Save button: Primary gradient, rounded-xl

**Verify**: Run `npm run build` — should complete. Manual test: Open each modal (auth, focus timer, onboarding, profile, settings, weekly schedule), verify layout is correct, all interactions work, forms submit successfully, modals close correctly.

---

### ☐ 13. Update All Form Inputs and Buttons with Modern Styling
**What**: Systematically update all `<input>`, `<textarea>`, `<select>`, and `<button>` elements across the codebase to use new design tokens: rounded borders (12-16px), soft focus states (primary outline), larger touch targets (min 44px height), and primary gradient buttons.

**Files to modify**:
- All tab components (TodayTab, PlanTab, TrackTab, ReviewTab, AnalyticsTab, AssistantTab)
- All modal components
- PromptBar.tsx
- Any other components with form inputs

**Changes**:
- **Text inputs (`<input type="text">`, `<input type="email">`, etc.)**:
  - Base style: `rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`
  - Min height: 44px for mobile touch targets
  - Placeholder: `text-muted`

- **Textarea**:
  - Same as text inputs but with `resize-y` or `resize-none`

- **Select dropdowns**:
  - Same as text inputs with dropdown arrow icon (lucide-react ChevronDown)

- **Checkboxes**:
  - Custom styled: Rounded square (6px radius), primary color when checked, white background with gray border when unchecked
  - Min size: 20x20px

- **Radio buttons**:
  - Circular, primary color when selected

- **Primary buttons**:
  - `bg-primary hover:bg-primary-dark text-white rounded-xl px-6 py-3 font-semibold shadow-card-soft hover:shadow-card-hover transition-all active:scale-98`
  - Min height: 44px

- **Secondary buttons**:
  - `border border-gray-300 text-text-charcoal hover:bg-gray-100 rounded-xl px-6 py-3 font-semibold`

- **Icon buttons**:
  - Circular or rounded-lg, min 44x44px touch target
  - `hover:bg-gray-100 transition-colors`

- **Destructive buttons** (delete, reset):
  - `bg-error-coral hover:bg-red-600 text-white rounded-xl`

**Verify**: Run `npm run build` — should complete. Manual test: Interact with all forms (add task, log sleep, submit review), verify inputs are styled correctly, focus states work, buttons are clickable, no accessibility regressions (tab navigation, screen reader labels).

---

## Phase 5: Micro-Interactions and Polish (3 items)

### ☐ 14. Implement Smooth Transitions and Hover States
**What**: Add smooth transitions to all interactive elements across the app: hover states with slight lift, focus states with glow, active states with scale-down, loading states with skeleton cards.

**Files to modify**:
- All component files that have interactive elements

**Changes**:
- **Card hover states** (already partially implemented in Card component, item 3):
  - On hover: `transform: translateY(-2px)`, `box-shadow` increase from card-soft to card-hover
  - Transition: `transition: all 0.2s ease`

- **Button hover states**:
  - Primary buttons: Slight brightness increase, shadow increase
  - Icon buttons: Background color change to gray-100
  - Transition: `transition: all 0.2s ease`

- **Button active/press states**:
  - All buttons: `transform: scale(0.98)` on click
  - Transition: `transition: transform 0.1s ease`

- **Loading skeleton cards**:
  - Create skeleton version of Card component with animated gradient background
  - Use for loading states in AnalyticsTab charts, AssistantTab while streaming, etc.
  - Animation: `bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200` with `background-position` animation

- **Fade-in animations**:
  - New cards/items appearing: `animate-in fade-in zoom-in-98 duration-200`
  - Use Tailwind's built-in animation utilities or define custom keyframes in globals.css

**Verify**: Run `npm run build` — should complete. Manual test: Hover over cards (check lift), hover over buttons (check state change), click buttons (check scale-down), load AnalyticsTab (check skeleton if implemented), add new task (check fade-in animation).

---

### ☐ 15. Add Task Completion Celebration Animation
**What**: Enhance existing confetti celebration when tasks/reviews are completed. Add checkbox check animation (smooth scale + checkmark draw), and optional subtle sound effect (if user has sound enabled in settings).

**Files to modify**:
- `e:\personal todo\src\components\tabs\TodayTab.tsx` (task completion)
- `e:\personal todo\src\components\tabs\ReviewTab.tsx` (review "Got it" action)
- `e:\personal todo\src\components\tabs\TrackTab.tsx` (DSA practice logged)

**Changes**:
- **Checkbox check animation**:
  - When task is toggled to done, animate the checkmark SVG path with `stroke-dashoffset` from full length to 0
  - Checkbox background: Scale from 0.8 to 1 with bounce easing
  - Duration: 300ms
  - Keep existing confetti call with `canvas-confetti`

- **Confetti customization**:
  - Use new color palette: `colors: ['#4ECDC4', '#FF6B6B', '#FFE66D', '#9B7EBD', '#6BCF7F']`
  - Particle count: 30-50 for task completion, 70-100 for weekly review submission

- **Sound effect** (optional, only if user has sound enabled):
  - Play short "success" sound (200ms chime or bell)
  - Check localStorage for `planner-sound-enabled` flag
  - Use Web Audio API with user-friendly volume (0.3)

- **Haptic feedback** (mobile):
  - Already implemented with `navigator.vibrate([30, 40])` in ReviewTab — ensure consistent across all completion actions
  - Pattern: Short pulse (30ms), pause (40ms), short pulse (30ms)

**Verify**: Run `npm run build` — should complete. Manual test: Complete a task in TodayTab (check confetti + animation), mark review as "Got it" in ReviewTab (check confetti), log DSA practice in TrackTab (check confetti), test on mobile device for haptic feedback.

---

### ☐ 16. Create Empty State Illustrations and Friendly Messages
**What**: Design and implement empty states for all major sections (no tasks, no reviews, no analytics data) with friendly illustrations (simple SVG or emoji) and encouraging copy.

**Files to modify**:
- `e:\personal todo\src\components\tabs\TodayTab.tsx` (no tasks)
- `e:\personal todo\src\components\tabs\ReviewTab.tsx` (no due reviews)
- `e:\personal todo\src\components\tabs\TrackTab.tsx` (no DSA topics practiced)
- `e:\personal todo\src\components\tabs\AnalyticsTab.tsx` (no data yet)
- `e:\personal todo\src\components\tabs\AssistantTab.tsx` (no chat history)

**Changes**:
- **Empty state pattern** (consistent across all tabs):
  - Container: Card component with centered content, generous padding
  - Illustration: Simple SVG icon (from lucide-react) or emoji, large size (64px or 80px), muted color
  - Heading: Bold, encouraging text (e.g., "Your day is a blank canvas")
  - Subtext: Helpful guidance (e.g., "Add your first task using the + button or type below")
  - CTA button: Primary color, rounded-xl, icon + text (e.g., "+ Add Your First Task")

- **TodayTab empty state**:
  - Icon: Calendar or Sun icon
  - Heading: "Ready for a productive day?"
  - Subtext: "Add tasks using the input bar below or press the + button"

- **ReviewTab empty state** (no due reviews):
  - Icon: CheckCircle or Trophy
  - Heading: "All caught up!"
  - Subtext: "No reviews due today. Next batch arrives at 19:15. Keep mastering concepts from blank memory."

- **TrackTab empty state** (no practice logged):
  - Icon: Code or TrendingUp
  - Heading: "Start tracking your practice"
  - Subtext: "Log your first DSA session to see insights and track your progress"
  - CTA: "Record Practice Session"

- **AnalyticsTab empty state** (no data):
  - Icon: BarChart or Activity
  - Heading: "Your insights will appear here"
  - Subtext: "Complete a few tasks and reviews to unlock analytics and trends"

- **AssistantTab empty state** (if no messages):
  - Icon: Sparkles or MessageCircle
  - Heading: "Your AI coach is ready"
  - Subtext: "Ask me anything about your tasks, progress, or focus strategy"

**Verify**: Run `npm run build` — should complete. Manual test: Clear all data (or use fresh profile), navigate to each tab, verify empty states display correctly with illustration/icon, copy is readable, CTA buttons work.

---

## Phase 6: Final Testing and Verification (2 items)

### ☐ 17. Comprehensive Responsive Testing and Bug Fixes
**What**: Test the redesigned UI across multiple screen sizes (mobile 320px-768px, tablet 768px-1024px, desktop 1024px+), verify all components render correctly, no layout breaks, all interactions work, and fix any bugs found.

**Devices/viewports to test**:
- Mobile: 320px (iPhone SE), 375px (iPhone 13), 390px (iPhone 14), 414px (iPhone Plus)
- Tablet: 768px (iPad Portrait), 1024px (iPad Landscape)
- Desktop: 1280px (Laptop), 1440px (Desktop), 1920px (Large Desktop)

**Test checklist** (perform on each device class):
1. Navigation: Bottom nav on mobile, left rail on desktop, all tabs accessible
2. TodayTab: Greeting header displays, tasks are readable, checkboxes work, drag-drop works on touch/mouse
3. PlanTab: Week calendar scrolls horizontally on mobile, day selection works, checklist toggles work
4. TrackTab: Stat cards display in grid (1 col mobile, 3 col desktop), charts render correctly, forms submit
5. ReviewTab: Review cards display, stage indicators visible, "Got it"/"Struggled" buttons work, confetti triggers
6. AnalyticsTab: Hero stats in grid, charts render without overflow, insights cards wrap correctly
7. AssistantTab: Chat bubbles align correctly (user right, AI left), input bar sticks to bottom, send button works
8. Modals: All modals open/close correctly, forms inside modals are usable, no scroll issues
9. Dark mode: Toggle theme, verify new color palette adapts correctly, readability maintained
10. Accessibility: Tab navigation works, focus indicators visible, screen reader labels present (aria-label)

**Files to modify**: Any files with layout/styling bugs discovered during testing

**Verify**: Run `npm run build` — should complete. Manual test on actual devices or Chrome DevTools device emulation for all viewports listed above. Document any bugs found and fix them in this step.

---

### ☐ 18. Final Build, Manual Walkthrough, and Functionality Regression Check
**What**: Perform final production build, complete manual walkthrough of all features to ensure no functionality was broken during the visual redesign, verify all existing features still work as expected.

**Build verification**:
- Run `npm run build` — must complete without errors or warnings
- Check build output size (should not significantly increase)
- Run `npm run start` — verify production build works locally

**Feature regression checklist** (must all pass):
1. **Authentication**: Sign in with email, sign out, sync status indicator updates
2. **Tasks**: Add task via PromptBar (natural language parsing), toggle task completion, edit task, delete task, drag-drop reorder, Google Calendar link generation
3. **Focus blocks**: Toggle block completion on TodayTab, streak increments correctly when 2+ blocks completed
4. **Spaced review**: Add review item, mark "Got it" (stage advances), mark "Struggled" (resets to 1d), due count badge updates
5. **Focus timer**: Open timer modal, select preset (20/25/45/60 min), start timer, complete session, verify session logged
6. **Sleep tracking**: Log sleep (bedtime + wake time), verify 7-day chart updates, correlation insight displays
7. **DSA tracking**: Mark topic as practiced, due flag (7+ days) triggers, topic status persists
8. **Aptitude tracking**: Log aptitude session, accuracy % calculates correctly, logs display in list
9. **Sport tracking**: Log badminton match (W/L), drill session, inactivity alert (7+ days) displays
10. **Checklists**: Toggle checklist item, add new item, verify across placement/startup/hackathon lists
11. **Weekly review**: Fill out form, submit, verify data saved, next review form resets
12. **Analytics**: Verify completion rate calculates correctly, streak displays, charts show data, insights generate
13. **AI Assistant**: Send message, receive streaming response (if implemented), parse task from chat, confirm and add task
14. **Offline support**: Disconnect network, make changes (add task, toggle completion), reconnect, verify changes sync
15. **Push notifications**: Enable notifications in settings, test push (if cron is set up), verify notification displays
16. **Theme toggle**: Switch light/dark/system, verify colors adapt, preference persists on reload
17. **Command palette**: Open with Cmd+K, search for action, execute action
18. **Keyboard shortcuts**: Test undo (Cmd+Z), redo (Cmd+Shift+Z), search (Cmd+F), tab switching (1-6 keys)
19. **Profile**: Open profile modal, edit name/settings, save, verify persists
20. **Settings**: Toggle settings (notifications, theme), verify changes save

**Files to check**: All tab files, all modal files, AppShell, PromptBar

**Verify**: All checklist items pass. No console errors. No visual regressions. All features work identically to before the redesign.

---

## Summary

**Total items**: 18 steps across 6 phases
- **Phase 1** (Foundation): 3 steps — Design tokens, CSS variables, reusable components
- **Phase 2** (Layout): 2 steps — AppShell header/nav, content spacing
- **Phase 3** (Tabs): 6 steps — One per tab (Today, Plan, Track, Review, Analytics, Assistant)
- **Phase 4** (Modals): 2 steps — All modals redesigned, form inputs updated
- **Phase 5** (Polish): 3 steps — Transitions, animations, empty states
- **Phase 6** (Testing): 2 steps — Responsive testing, final regression check

**Critical path**: Must complete Phase 1 (items 1-3) before any other work. Phases 2-5 can partially overlap but should follow the order for safety. Phase 6 must be last.

**Build verification**: After every step, run `npm run build` to catch errors early.

**Manual testing**: After every major visual change (Phase 2-5), manually test in browser on mobile + desktop viewports.

**Accessibility**: Preserve all aria-labels, focus indicators, keyboard navigation throughout redesign.

**No feature changes**: This is a pure visual redesign. Every existing feature, interaction, and data flow must remain identical.
