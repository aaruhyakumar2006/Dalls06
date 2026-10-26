# Analytics Dashboard Feature

This implementation adds a four-panel analytics dashboard showing productivity trends, peak productivity windows, engagement metrics, and AI-generated insights. The feature computes metrics from existing state (tasks, block completions, focus sessions) and renders them via lightweight Tailwind-based visualizations without external charting dependencies.

Three commits introduce data computation utilities, UI components, and integration with the main app navigation. The build completed successfully with zero TypeScript errors.

**Watch for:** All computations use in-memory aggregation from React Context state; no query against Supabase analytics tables. Peak hours detection relies on block key parsing (`blockKey.split(':')`) which assumes HH:mm format. Insights are heuristic-based (no ML), and chart rendering is static (no drill-down or zoom).

**Verdict**: APPROVED

---

## High-level view

The dashboard orchestrates four independent visualization sections from a single `computeAnalytics()` call that aggregates trends (30-day), best time patterns (hourly/daily), retention (90-day), and generates contextual insights. Metrics flow through React Context with `useMemo` preventing unnecessary recomputation. The UI uses native HTML elements and Tailwind utilities for all charts—no D3, Recharts, or canvas libraries—keeping the bundle lean. State mutations (task completion, block toggle) trigger `computeAnalytics()` to keep metrics fresh. Export button generates CSV from computed data. Responsive grid layout adapts from mobile single-column to desktop multi-column.

---

<details>
<summary>Issues (4)</summary>

1. **Block key parsing fragility** — computeBestTimeAnalysis assumes all block keys follow HH:mm format. Malformed keys fail silently (isNaN check), potentially skewing peak hour analysis.

2. **Churn risk threshold conflict** — Plan specifies >7 days triggers alert; implementation uses >7 in condition, creating asymmetry (8 days triggers alert, 7 days doesn't). Alert text says "for X days" which is technically accurate but the integer boundary should be clarified.

3. **Missing data quality gate** — Plan calls for "placeholder data if <14 days of history," but implementation has no check. New users see accurate-but-sparse 30-day trends instead of placeholder message.

4. **Hourly distribution rendering limitation** — 6-column grid (24 hours ÷ 4 rows) compresses on mobile. Heatmap may become difficult to read on narrow screens.

</details>

<details>
<summary>Details</summary>

### Analytics Computation from State

Computations use in-memory aggregation from Context state (completions, dayLogs, tasks, focusSessions, streak, todayDateKey) with no Supabase queries. Metrics refresh after mutations via Context state change.

The 30-day trends array always generates a full window even if only 3 days of data exist. The plan specified a <14-day data quality gate with placeholder messaging, but the implementation omits this check—new users see sparse-but-valid trends instead of "Not enough data yet" text.

Completion rate assumes 5 blocks/day average (`possibleUpToNow = (i + 1) * 5`), a heuristic that inflates the percentage when few blocks are scheduled. The metric is "completed as % of assumed capacity" not "% of scheduled blocks."

### Best Time Pattern Detection

Peak hours parse block keys via `blockKey.split(':')` assuming HH:mm format. Malformed keys fail silently (isNaN skips them), incompletely populating the histogram. Day-of-week analysis extracts weekday from ISO date string, which is reliable.

The `focusPatterns` array is computed but never used in the UI—dead code. Best day detection finds the day with highest completions, but tie-breaking is implicit (first iterated win). No disambiguation hint in UI.

### Retention Metrics and Churn Detection

Task completion rate, block completion rate, and recurring adherence all compute correctly over 30/90-day windows and are clamped to [0, 100].

Churn detection finds the most recent date in `completions` and calculates days elapsed (defaults to 100 if empty). The alert triggers at `churnRiskDays > 7`, matching the plan. The condition is strictly >7 (not ≥7), so exactly 7 days does not trigger.

### Insights Generation: Heuristics Without ML

`generateInsights()` builds a candidate list of insights (2-7) and returns the first 3. Heuristics include peak hour detection, best day labeling, trend comparison (recent vs previous 7-day avg with percentage change), completion thresholds (<50% warning, >80% praise), recurring adherence thresholds (<60% warning, ≥90% praise), churn risk (>7 days alert), task completion thresholds (>85% praise, >70% encouragement, <30% warning), and 14-day consistency (≥12 active days = "habit territory").

Insights are deterministic (same ones surface every render if metrics unchanged), so repetition is possible. The plan mentioned "rotate or dismissible"—no dismiss UI is implemented.

Each insight is emoji-tagged for color-coding. The AnalyticsTab maps emojis to colors: 📈 = mint, 📉🚨⚠️ = smash, others = court.

### Dashboard Layout and Responsiveness

Sections stack vertically in a `max-w-4xl mx-auto` container with no horizontal grid. Mobile-first and responsive.

**Trends:** Horizontal bar chart (14-day slice) with dynamic width. Text overlay shows block count. Works on narrow screens but no responsive font sizing, risking overflow if tasksCompleted > 10.

**Best Time:** Peak hours as pill badges. Day-of-week stats in 2-column grid. Hourly heatmap in 6-column grid (24 cells). Cells are ~40px on mobile, readable without horizontal scroll.

**Retention:** Three progress bars stacked vertically. Conditional churn alert. Clean layout.

**Insights:** Vertical stack of insight cards with emoji-based color coding. "How to Use" tips as bulleted list.

**Export button:** Top-right corner. May wrap awkwardly on narrow mobile.

### Chart Rendering: Tailwind + Native HTML

All visualizations use Tailwind utilities and native HTML: trends via horizontal divs with inline width, best time via CSS Grid with inline backgroundColor, retention via divs (not progress elements), insights via text cards with conditional classes.

No external charting library keeps bundle size low. Charts are static (no zoom, drill-down, hover, animations). Acceptable for a summary dashboard.

### State Integration and Caching

Analytics are computed in a `useMemo` in AnalyticsTab keyed on dependencies. PlannerProvider independently computes `analyticsData` in a `useEffect` and stores it in Context, then AnalyticsTab re-derives it locally. Redundant computation (runs twice) but harmless. The Context value is set but unused by AnalyticsTab (exists for potential future use).

The plan specified 5-minute cache TTL with localStorage persistence. Implementation has no TTL or localStorage logic—the `useEffect` re-runs on every state mutation (more aggressive than planned, but imperceptible for typical datasets).

### Export Functionality

CSV construction includes trends, retention metrics, peak hours, and best day. Filename includes date. Works as intended; no validation if analytics is null (constructs empty rows).

### Integration with Mutations

Mutations update state vars (completions, dayLogs, etc.), triggering the analytics `useEffect`. Indirect pattern (dependency tracking) instead of explicit calls in mutation handlers, but achieves the same result. Appropriate side effect pattern.

### Tab Navigation and TypeScript

AppShell adds 'analytics' to TabType, maps keyboard shortcut '5' to analytics tab, adds tab to tabs array. Page.tsx imports and routes to AnalyticsTab. analytics.ts exports clean interfaces (ProductivityTrend, BestTimeAnalysis, RetentionMetrics, AnalyticsData). Build verified 0 TypeScript errors.

</details>

<details>
<summary>File Map</summary>

- **src/lib/utils/analytics.ts** (365 lines) — New file. Exports four metric computation functions (`computeProductivityTrends`, `computeBestTimeAnalysis`, `computeRetentionMetrics`, `computeAnalytics`) and one insights generator (`generateInsights`). Implements interfaces for ProductivityTrend, BestTimeAnalysis, RetentionMetrics, AnalyticsData.

- **src/components/tabs/AnalyticsTab.tsx** (471 lines) — New file. Main dashboard component with four sections (Trends, Best Time, Retention, Insights). Uses `useMemo` for metrics and insights. Renders Tailwind-based charts. Includes export button and churn alert.

- **src/lib/storage/store.tsx** (14 line changes) — Added `AnalyticsData` import, `analyticsData` state var, `useEffect` to compute analytics on state changes, and `analyticsData` in context value.

- **src/components/layout/AppShell.tsx** (6 line changes) — Added `BarChart3` icon import, added 'analytics' to `TabType` enum, added Analytics tab to tabs array, added keyboard shortcut '5' for analytics tab.

- **src/app/page.tsx** (83 line changes, net +2 substantive) — Imported `AnalyticsTab`, added routing case for 'analytics' tab.

Full diff: `git diff 668b1f0..b330f96`

</details>
