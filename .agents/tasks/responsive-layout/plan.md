# Implementation Plan: Mobile Responsive Layout for Daily Planner PWA

## Scope
This plan covers responsive CSS/Tailwind changes only for mobile (320-480px) and tablet (481-768px) breakpoints. No new features, touch gestures, offline logic, lazy-loading, or authentication changes. Desktop layout (>768px) remains unchanged.

## Architecture Decisions

### 1. Breakpoint Strategy: Mobile-First
- **Mobile (default, base classes):** 320-767px
- **Tablet/Desktop (sm/md overrides):** 768px+
- **All responsive classes use Tailwind's sm: (640px) and md: (768px) prefixes** to override mobile base styles on larger screens
- This ensures the desktop layout is explicitly preserved, not accidentally broken by mobile changes

### 2. Bottom Navigation Pattern (Mobile Only)
- New mobile-only bottom nav bar with 5 main tabs: Today, Review, Track, Plan, and a toggle between Plan/Analytics (controlled by `currentTab` state)
- Assistant tab moved to a "More" menu (hamburger icon with dropdown or separate modal)
- **Desktop:** Existing left rail remains, no bottom nav
- Bottom nav `height: ~60px` on mobile, includes safe-area-inset-bottom for notched phones
- Active tab indicator: underline or highlight, text color changes to court-blue
- Minimum 44px touch targets per WCAG AA

### 3. Modals: Responsive Full-Screen Pattern
- **Mobile (<768px):** full-screen modal from bottom, no max-width constraint, 12px padding
- **Desktop (≥768px):** centered modal with max-width, 24px padding (existing behavior mostly preserved)
- Use `sm:max-w-md sm:max-h-96` style overrides to restore desktop modal sizing and centering

### 4. Content Area Padding Scale
- **Mobile:** 12px (px-3)
- **Tablet/Desktop:** 16px (px-4 sm:px-6)

### 5. Card & Form Input Sizing
- **All platforms:** Minimum 44px height for buttons and inputs (WCAG AA touch target)
- **Mobile:** Full-width buttons and inputs (no width constraints)
- **Tablet/Desktop:** Constrained widths using max-w- classes

---

## Implementation Plan

### ✅ Phase 1: AppShell Layout Refactoring
Create mobile-first responsive structure with bottom nav, compact header, and preserved desktop rail.

#### 1.1 Update AppShell Header (Mobile)
- **Current:** TopBar only on lg:hidden; shows logo, theme toggle, command palette, settings, profile buttons
- **Changes:**
  - Reduce padding: change from `px-4 py-3` to `px-3 py-2` on mobile
  - Icons remain at w-4 h-4 (sufficient touch target with padding)
  - Header stays single row on mobile; no vertical stack needed
  - Keep responsive text: logo visible on mobile (already compact in code)
  - Preserve existing sync status bar below header on mobile
- **Files:** `src/components/layout/AppShell.tsx` (lines ~290-320)
- **Verify:** `npm run build` and `npm run lint` pass, no TS errors

#### 1.2 Add Mobile Bottom Navigation Bar (New Component Inline)
- **New HTML structure** in AppShell (where mobile bottom nav currently is, lines ~585-650):
  - 5 main tabs: Today, Review, Track, Plan (with toggle logic for Analytics), Assistant (conditionally hidden or in menu)
  - Replace current 4-button layout with proper 5-tab structure
  - Tab layout: 5 flex-equal buttons in a row, w-[20%] each, minimum 48px height
  - Active tab indicator: text-court-blue and font-bold
  - Badge support for Review tab (existing dueReviewItemsCount)
  - Raised center '+' button: position -top-5, already implemented, keep as-is
- **Remove the existing manual Plan/Analytics toggle button**, replace with standard 5-tab layout
- **Preserve desktop:** Keep `lg:hidden` class on bottom nav, no changes on lg breakpoint
- **Files:** `src/components/layout/AppShell.tsx`
- **Verify:** `npm run build` passes, bottom nav renders only on DevTools mobile view (375px), hidden on desktop simulation

#### 1.3 Refactor Content Area Main Column
- **Current:** `flex-1 max-w-[720px] w-full mx-auto p-4 sm:px-6 sm:py-6 pb-28 lg:pb-12`
- **Changes:**
  - Mobile (base): `p-3` (12px) instead of p-4, `pb-24` to accommodate 60px bottom nav + safe area
  - Tablet/Desktop (sm:): `sm:px-4 sm:py-4 lg:px-6 lg:py-6 lg:pb-8` to restore existing spacing
  - Preserve `max-w-[720px]` for desktop readability
- **Files:** `src/components/layout/AppShell.tsx` (lines ~570)
- **Verify:** DevTools mobile view shows content without horizontal scroll at 320px width

#### 1.4 Reduce Desktop Right Panel Visibility
- **Current:** Right panel hidden on xl:, visible on xl:
- **No changes needed:** Panel already has correct breakpoints
- **Verify:** Right panel still visible on 1280px+ widths in DevTools

### ✅ Phase 2: Tab-Specific Responsive Updates

#### 2.1 TodayTab Responsive Layout
- **Current structure:** Task cards with drag-and-drop, time picker, status indicators
- **Changes:**
  - Card padding: `p-3` (base mobile) → `sm:p-4` (restore to desktop)
  - Task row: change from `flex items-center gap-2` to `flex flex-col sm:flex-row` on mobile to avoid wrapping of drag handle and content
  - Time picker dropdown: full-width on mobile `w-full sm:w-auto`
  - Actions (move up/down/delete): stack vertically in a `flex flex-col gap-1 sm:flex-row` group on mobile
  - Button sizing: `p-1.5 sm:p-2` for action buttons to ensure 44px touch target with padding
  - Labels and text: `text-xs sm:text-sm` (10px → 12px on desktop)
- **Files:** `src/components/tabs/TodayTab.tsx`
- **Verify:** `npm run build`, DevTools at 375px shows stacked task rows without horizontal scroll, action buttons are 44px minimum

#### 2.2 PlanTab Responsive Layout
- **Current structure:** Subtabs (schedule, checklists, startups, weeklyReview), day sections, forms
- **Changes:**
  - Day sections: Add collapsible accordion on mobile; use `space-y-3 sm:space-y-4` for day gaps
  - Checklists: Single column on mobile (w-full), each item `flex flex-col sm:flex-row` to stack due date on mobile
  - Startup audit form: Stack form fields vertically with `gap-3 sm:gap-4`
  - Weekly review form: Full-width inputs `w-full`, change grid from 2-col to 1-col on mobile `grid-cols-1 sm:grid-cols-2`
  - Card padding: `p-3 sm:p-4` scale
- **Files:** `src/components/tabs/PlanTab.tsx`
- **Verify:** `npm run build`, weekly review form stacks correctly on mobile, no horizontal scroll

#### 2.3 TrackTab Responsive Layout
- **Current structure:** Subtabs (dsa, aptitude, sleep, sport), charts, logs
- **Changes:**
  - Sleep chart: Reduce height on mobile to fit in viewport; change from `h-48 sm:h-64` 
  - Sleep table: Single column layout on mobile `grid grid-cols-1 sm:grid-cols-3` for day stats
  - DSA topics list: `grid grid-cols-1 sm:grid-cols-2` instead of 3 columns
  - Aptitude form: Stack inputs vertically, full-width `w-full`
  - Sport log form: Full-width inputs, `gap-3 sm:gap-4` between fields
  - Typography: Input/select height `h-10 sm:h-11` to ensure 44px minimum with padding
- **Files:** `src/components/tabs/TrackTab.tsx`
- **Verify:** `npm run build`, DevTools 375px width shows single-column layout, charts fit without scroll

#### 2.4 AnalyticsTab Responsive Layout
- **Current structure:** Metric cards, charts (bar/line), day-of-week stats, insights
- **Changes:**
  - Metric cards: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4` instead of 4-column on mobile
  - Charts (BarChart3, line charts): Reduce height on mobile `h-40 sm:h-48` for scrollability
  - Insight list: Stack vertically `gap-2 sm:gap-3`
  - Card padding: `p-3 sm:p-4`
  - Typography: `text-xs sm:text-sm` for readability
- **Files:** `src/components/tabs/AnalyticsTab.tsx`
- **Verify:** `npm run build`, no horizontal scroll at 320px, charts stack without cramping

#### 2.5 ReviewTab Responsive Layout
- **Current structure:** Add form, due items list, upcoming items list
- **Changes:**
  - Form fields: Full-width `w-full`, stacked vertically
  - Input/textarea: `h-10 sm:h-11` minimum (44px with padding)
  - Topic filter buttons: `grid grid-cols-2 sm:grid-cols-4` responsive wrap
  - Review item cards: Single column on mobile, card padding `p-3 sm:p-4`
  - Buttons: Full-width `w-full` on mobile, icon+text layouts, font-sizes `text-xs sm:text-sm`
- **Files:** `src/components/tabs/ReviewTab.tsx`
- **Verify:** `npm run build`, add form stacks correctly, due items list is readable without scroll

### ✅ Phase 3: Modal & Form Responsive Updates

#### 3.1 AuthModal Responsive Behavior
- **Current:** Centered modal with max-w-md
- **Changes:**
  - Base mobile: Remove max-width on mobile, use full viewport width with p-4 padding
  - Add `w-full max-h-[90vh] overflow-y-auto` on mobile to allow scrolling if content is tall
  - Desktop override: `sm:max-w-md` to restore centered modal width
  - Buttons: Full-width `w-full` on mobile, stacked layout
  - Typography: Font sizes `text-sm sm:text-base` scale
- **Files:** `src/components/modals/AuthModal.tsx`
- **Verify:** DevTools mobile view (375px) shows full-screen modal, desktop shows centered modal

#### 3.2 SettingsModal Responsive Behavior
- **Current:** Centered modal with max-w-2xl
- **Changes:**
  - Base mobile: Full-width `w-full`, full-screen with p-3 padding, `max-h-[95vh] overflow-y-auto`
  - Tab buttons: `grid grid-cols-2 sm:grid-cols-5` to fit tabs on mobile
  - Form inputs: Full-width `w-full`, stacked fields with `gap-3 sm:gap-4`
  - Template cards: `grid grid-cols-1 sm:grid-cols-2` for single column on mobile
  - Buttons and controls: Full-width `w-full` on mobile, `sm:w-auto` on desktop
  - Input/select height: `h-10 sm:h-11`
- **Files:** `src/components/modals/SettingsModal.tsx`
- **Verify:** `npm run build`, settings modal is usable on mobile without horizontal scroll

#### 3.3 WeeklyScheduleModal Responsive Behavior
- **Current:** Not fully reviewed, likely centered modal
- **Changes:**
  - Base mobile: Full-width, full-screen pattern with overflow-y-auto, p-3 padding
  - Desktop: `sm:max-w-lg sm:max-h-96` to restore centered modal
  - Form elements: Full-width inputs and buttons
  - Typography: `text-xs sm:text-sm`
- **Files:** `src/components/modals/WeeklyScheduleModal.tsx`
- **Verify:** `npm run build`, modal is readable on mobile without horizontal scroll

#### 3.4 ProfileModal, OnboardingModal, FocusTimerModal
- **Same pattern as AuthModal and SettingsModal:**
  - Base: Full-width, full-screen
  - Desktop (sm:): Centered with max-width
  - Full-width form elements on mobile
  - 44px minimum touch targets
- **Files:** `src/components/modals/ProfileModal.tsx`, `src/components/modals/OnboardingModal.tsx`, `src/components/modals/FocusTimerModal.tsx`
- **Verify:** `npm run build` passes for all modals

### ✅ Phase 4: Global Typography & Spacing Adjustments

#### 4.1 Update globals.css (Touch Targets & Reduced Motion)
- **Current:** Already has good touch target baseline (touch-action: manipulation, 3px focus outline)
- **No changes needed** for globals.css; Tailwind classes will handle responsive font sizing
- **Verify:** No changes to globals.css

#### 4.2 Typography Scale in All Tabs and Modals
- Apply Tailwind responsive font sizing across all files:
  - Body text: `text-xs sm:text-sm` (14px → 14px, no change but explicit)
  - Labels: `text-[10px] sm:text-xs` (10px labels on mobile, 12px on desktop)
  - Headings (h3): `text-lg sm:text-xl` (18px → 20px)
  - Headings (h2): `text-xl sm:text-2xl` (20px → 24px)
- **Files:** All tab and modal files (search for `text-xs`, `text-sm`, `text-lg` and add sm: overrides where appropriate)
- **Verify:** Typography is readable on mobile 320px width without overflow

#### 4.3 Spacing Scale Consistency
- Replace `gap-6 gap-8` on mobile with `gap-3 gap-4`, restore on desktop with `sm:gap-6 sm:gap-8`
- Replace `space-y-6 space-y-8` with `space-y-3 space-y-4 sm:space-y-6 sm:space-y-8`
- Replace `p-6 p-8` with `p-3 p-4 sm:p-6 sm:p-8`
- **Files:** All tabs and modals
- **Verify:** `npm run build`, spacing is visually balanced on mobile

### ✅ Phase 5: Button & Input Minimum Touch Targets (44px)

#### 5.1 All Interactive Elements
- Audit all buttons, inputs, selects, and checkboxes to ensure **minimum 44px height** (WCAG AA)
- Apply `h-11 sm:h-12` or `min-h-11` across all interactive elements
- Apply generous padding around tap targets (8px minimum between buttons)
- **Files:** All tab and modal files
- **Verify:** DevTools mobile view, all buttons/inputs are easily tappable without zooming

### ✅ Phase 6: Testing & Verification

#### 6.1 Build Verification
- Command: `npm run build`
- Expected: No TypeScript errors, build completes successfully
- Files checked: All tabs, all modals, AppShell

#### 6.2 Lint Verification
- Command: `npm run lint`
- Expected: No linting errors or warnings
- Files checked: All changed files

#### 6.3 Manual Mobile Viewport Testing
- Open browser DevTools, enable mobile emulation
- Test at 320px width: No horizontal scroll, all content readable, bottom nav visible
- Test at 375px width (iPhone SE): All tabs accessible via bottom nav, touch targets are 44px+
- Test at 768px width (iPad): Desktop layout should start showing (left rail becomes visible on lg: breakpoint)
- Verify each tab: TodayTab, ReviewTab, PlanTab, TrackTab, AnalyticsTab
- Verify each modal: AuthModal, SettingsModal, WeeklyScheduleModal, ProfileModal, OnboardingModal
- Test bottom nav: All 5 tabs navigate correctly, Review badge displays, center '+' button works

#### 6.4 No Regression on Desktop
- Test at 1024px width (desktop): Left rail visible, right panel hidden (hidden on xl:), tabs accessible
- Test at 1280px width (2xl): Right panel visible, layout unchanged from before responsive changes
- Verify existing keyboard shortcuts still work

---

## Commit Strategy

The implementation will be organized into three commits, each leaving the codebase in a buildable state:

### Commit 1: `feat: responsive-layout-appshell`
- AppShell layout refactoring: compact header, bottom nav, content area padding
- Files: `src/components/layout/AppShell.tsx`
- Verification: `npm run build && npm run lint` pass, DevTools mobile view shows bottom nav

### Commit 2: `feat: responsive-tabs-mobile`
- All tab responsive updates: TodayTab, PlanTab, TrackTab, AnalyticsTab, ReviewTab
- Typography and spacing scale applied
- Files: `src/components/tabs/TodayTab.tsx`, `src/components/tabs/PlanTab.tsx`, `src/components/tabs/TrackTab.tsx`, `src/components/tabs/AnalyticsTab.tsx`, `src/components/tabs/ReviewTab.tsx`
- Verification: `npm run build && npm run lint` pass, all tabs render correctly on mobile

### Commit 3: `feat: responsive-modals-forms`
- Modal responsive behavior: AuthModal, SettingsModal, WeeklyScheduleModal, ProfileModal, OnboardingModal, FocusTimerModal
- Full-screen on mobile, centered on desktop
- Input/button 44px minimum touch targets
- Files: All modal files in `src/components/modals/`
- Verification: `npm run build && npm run lint` pass, modals render full-screen on mobile, centered on desktop

---

## Acceptance Criteria

All of these must pass before the workflow completes:

- ✅ `npm run build` completes without errors
- ✅ `npm run lint` completes without errors or warnings
- ✅ DevTools mobile view (320px width): No horizontal scroll, all content visible
- ✅ DevTools mobile view (375px width): Bottom nav visible with 5 tabs, all tabs navigate correctly
- ✅ DevTools mobile view (320-480px): All modals render full-screen, inputs/buttons are tappable (44px+)
- ✅ DevTools tablet view (768px width): Bottom nav hidden, left rail visible on lg: breakpoint
- ✅ DevTools desktop view (1024px+): Left rail visible, desktop layout unchanged from original
- ✅ DevTools 2xl view (1280px+): Right panel visible and functional
- ✅ Each tab (Today, Review, Track, Plan, Analytics) responsive and readable on mobile without horizontal scroll
- ✅ Typography scales correctly: labels readable on 320px width, no text overflow
- ✅ Touch targets: All buttons/inputs minimum 44px height
- ✅ No visual regression on desktop (compare before/after at 1024px+)

---

## Out of Scope

The following are explicitly excluded from this task:

- Touch gestures (swipe, long-press, pinch-zoom)
- Offline logic or sync queue changes
- Authentication flow implementation (already scaffolded)
- Lazy-loading of tabs or components
- New features beyond responsive layout
- Performance optimizations (code splitting, image optimization)
- Day mode CSS changes (low-energy/match day UI updates) — these are separate tasks
- Push notification UI implementation — separate task

---

## Notes

- All base classes are mobile-first (no sm: prefix means mobile default)
- All sm: and md: prefixes restore desktop behavior (width ≥640px and ≥768px respectively)
- Existing Tailwind configuration is sufficient; no new PostCSS plugins needed
- Safe-area-inset support already in place (globals.css `padding-bottom: env(safe-area-inset-bottom, 0px)`)
- No new dependencies required
- Branch name: feature/responsive-mobile-layout (or similar)
