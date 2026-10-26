# Implementation Plan: Rename to DALLS & Modernize Mobile Navigation

## Project Context

**Project Type:** Next.js 14 PWA (App Router) + TypeScript + Tailwind CSS  
**Language:** TypeScript/React  
**Build System:** npm + Next.js build system  
**Test Framework:** No formal test framework detected (manual testing via dev server)  
**Build Command:** `npm run build`  
**Dev Command:** `npm run dev`  
**Verification:** Manual inspection in browser at http://localhost:3000, with Chrome DevTools mobile emulation (320px-480px width)

**Key Files Discovered:**
- `src/components/layout/AppShell.tsx` - Main layout shell with desktop sidebar and mobile navigation
- `src/app/layout.tsx` - Root layout with metadata
- `public/manifest.json` - PWA manifest
- `package.json` - Package metadata
- `README.md` - Project documentation
- `tailwind.config.ts` - Tailwind configuration with teal (#4ECDC4) already defined as primary color
- `src/app/globals.css` - CSS variables and design system
- `src/components/ui/Icons.tsx` - Custom SVG icons (ShuttleIcon, RacketIcon, etc.)

**Current State:**
- App is called "Daily Planner — Match Point" with badminton/sports theming
- Top header on mobile shows "Match Point" branding with ShuttleIcon logo
- Bottom navigation has 6 tabs with text labels: Today, Review, Track, Plan, Analytics, Assistant
- Center '+' button already exists in bottom nav (raised design)
- Teal color (#4ECDC4) already defined in tailwind.config.ts as `primary`
- Icons from lucide-react library available

**Design Decisions:**
1. **Logo approach:** Use a simple "D" text in teal circle for DALLS logo instead of creating new icon files, since no icon generation tooling is evident and this is faster
2. **Bottom nav reduction:** Keep 5 core tabs (Today, Plan, Track, Review, Analytics), remove Assistant tab from bottom nav entirely to declutter, can be accessed via command palette
3. **Icon mapping:** Calendar (Today), Layers (Plan), Plus (center FAB), Activity (Track), BarChart3 (Analytics) - this provides clear visual hierarchy
4. **Active state:** Use teal color on icon itself, remove background highlight boxes for cleaner look
5. **Remove text labels on mobile:** Icons only below 768px breakpoint, add back labels on tablet/desktop

---

## Implementation Steps

- [ ] 1. **Rename application metadata to "DALLS"**
      
      Update all branding references from "Daily Planner" / "Match Point" to "DALLS" in metadata files.
      
      **Files to modify:**
      - `src/app/layout.tsx` - Change title to "DALLS — Your Daily Assistant", appleWebApp.title to "DALLS"
      - `public/manifest.json` - Change name to "DALLS", short_name to "DALLS", update description to reference DALLS
      - `package.json` - Change name from "daily-planner-pwa" to "dalls-pwa"
      - `README.md` - Change title from "# Daily Planner — Student Productivity PWA" to "# DALLS — Your Daily Assistant"
      
      **Verify:** Run `npm run dev`, open http://localhost:3000, check browser tab title shows "DALLS — Your Daily Assistant", check manifest.json is valid JSON

---

- [ ] 2. **Redesign mobile top header with clean icon-based layout**
      
      Replace the current mobile header (shows "Match Point" text + ShuttleIcon) with a minimal design: DALLS logo (teal circle with "D") on left, 4 icon buttons on right (Moon/Sun, Keyboard, Settings, User).
      
      **Files to modify:**
      - `src/components/layout/AppShell.tsx` - Find the mobile header section (className "lg:hidden flex flex-col border-b"), modify the brand area and right-side buttons:
        - Left: Replace ShuttleIcon and "Match Point" text with a teal circle (40px diameter, bg-primary) containing white "D" text (font-display, font-bold, text-lg)
        - Right button row: Keep only 4 icons (theme toggle Moon/Sun, Keyboard for command palette, Settings, User profile) - remove any redundant buttons
        - Ensure each button has min 44px touch target
        - Remove all text labels from icon buttons on mobile
        - Set header height to 56px with px-3 py-2 padding
        - Use gap-2 for icon button spacing
        - Icons should be w-4 h-4 (16px) or w-5 h-5 (18px), text-text-muted (#7F8C8D) when inactive, text-primary when active
      
      **Verify:** Run `npm run dev`, open DevTools mobile view (375px width), confirm header shows teal "D" logo on left, 4 icon buttons on right, height ~56px, all buttons tappable

---

- [ ] 3. **Redesign bottom navigation to 5 icons only (no text labels on mobile)**
      
      Simplify bottom nav from 6 tabs with labels to 5 icon-only tabs with center teal plus button. Remove "Assistant" tab from bottom nav.
      
      **Files to modify:**
      - `src/components/layout/AppShell.tsx` - Find bottom navigation section (className "lg:hidden fixed bottom-0"):
        - Reorder tabs to: Calendar (Today, position 0), Layers (Plan, position 1), [CENTER PLUS BUTTON], Activity (Track, position 3), BarChart3 (Analytics, position 4)
        - Remove Review tab from bottom nav entirely (too cluttered with 5 + center button = 6 elements)
        - Remove Assistant tab from bottom nav (access via command palette instead)
        - Remove all `<span>` text labels on mobile (below lg: breakpoint)
        - Change active state styling: remove background boxes (bg-primary/10), use only icon color change (text-primary when active, text-text-muted when inactive)
        - Set icon size to w-6 h-6 (24px) for better visibility
        - Ensure center Plus button remains elevated with shadow, teal background (bg-primary), size w-14 h-14 (56px diameter), rounded-full
        - Use `justify-around` or `justify-evenly` for even spacing
        - Each tab button should have min-h-[44px] min-w-[44px] for touch targets
        - Bottom nav height: h-16 (64px) on mobile
      
      **Note:** The Review tab can be accessed via the desktop sidebar or command palette. Analytics was originally hidden; now it's promoted to bottom nav.
      
      **Verify:** Run `npm run dev`, mobile view, confirm 5 icons visible (Calendar, Layers, Plus, Activity, BarChart3), no text labels, center plus button is teal circle, tapping changes icon color to teal

---

- [ ] 4. **Update desktop sidebar branding to DALLS**
      
      Replace "Match Point" branding in desktop left rail with "DALLS" branding for consistency.
      
      **Files to modify:**
      - `src/components/layout/AppShell.tsx` - Find desktop sidebar section (className "hidden lg:flex flex-col"):
        - In the brand header div (contains ShuttleIcon + text), replace:
          - Change h1 text from "Match Point" to "DALLS"
          - Change subtitle from "CSE Coach PWA" to "Your Daily Assistant" or keep original if preferred
          - Consider replacing ShuttleIcon with same teal circle "D" logo for consistency, OR keep ShuttleIcon if sports theme is desired on desktop
      
      **Verify:** Run `npm run dev`, desktop view (>1024px), confirm sidebar shows "DALLS" branding

---

- [ ] 5. **Adjust tab navigation logic for new bottom nav structure**
      
      Update keyboard shortcuts and tab navigation arrays to reflect the removal of Assistant and Review tabs from bottom nav while maintaining their functionality via other access points.
      
      **Files to modify:**
      - `src/components/layout/AppShell.tsx`:
        - Find the `tabs` array definition (around line 270) - this defines tabs for desktop sidebar (keep all 6 tabs)
        - The desktop sidebar should keep all 6 tabs: Today, Review, Track, Plan, Analytics, Assistant
        - Only the mobile bottom nav displays 5 tabs (exclude Review and Assistant)
        - Keyboard shortcuts (1-6 keys) should still work for all 6 tabs
        - Ensure swipe navigation works correctly with new tab order
        - Update any hardcoded tab ordering logic to match: ['today', 'plan', 'track', 'analytics'] for mobile bottom nav
      
      **Note:** Desktop sidebar keeps full navigation, mobile bottom nav is simplified. Users can still access Review and Assistant via desktop or command palette on mobile.
      
      **Verify:** Press keys 1-6, confirm navigation works, swipe left/right on mobile, confirm tab switching works correctly

---

- [ ] 6. **Visual polish: Remove thick borders and ensure teal accent consistency**
      
      Clean up any remaining "sticker" design elements (thick borders, shadows) in the navigation components to match the modern, minimal aesthetic.
      
      **Files to modify:**
      - `src/components/layout/AppShell.tsx`:
        - Search for any `border-2`, `border-ink`, `shadow-sticker` classes in header/nav sections
        - Replace with subtle `border` (1px) and `border-gray-200` or remove borders entirely
        - Ensure all uses of blue/pink/yellow colors in nav are replaced with teal (#4ECDC4 / primary)
        - Confirm icon hover states use `hover:text-primary` for consistency
      
      **Verify:** Visual inspection in DevTools, no thick borders on nav elements, teal used as primary accent color throughout

---

- [ ] 7. **Final integration test and responsive check**
      
      Test the complete implementation across mobile, tablet, and desktop breakpoints to ensure responsive behavior and no regressions.
      
      **Testing procedure:**
      - Start dev server: `npm run dev`
      - Test mobile (320px, 375px, 414px widths):
        - Header: Teal "D" logo visible, 4 icon buttons visible, ~56px height, no overflow
        - Bottom nav: 5 icons visible (no labels), center plus button prominent, even spacing
        - Tap each tab: icon changes to teal, content switches
        - Tap plus button: modal opens
        - All buttons have adequate touch targets (44px+)
      - Test tablet (768px width):
        - Check if text labels appear on bottom nav (optional enhancement)
        - Header should still be compact
      - Test desktop (1024px+ width):
        - Bottom nav hidden, desktop sidebar visible
        - Sidebar shows "DALLS" branding
        - All 6 tabs available in sidebar
      - Test dark mode: toggle theme, ensure colors work in both modes
      - Test keyboard shortcuts: 1-6 keys, Cmd+K, ? for shortcuts
      
      **No formal test suite exists, verification is manual via browser DevTools.**
      
      **Verify:** All breakpoints tested, no visual bugs, navigation works correctly, theme toggle works, app renamed to DALLS everywhere

---

## Notes

- No backend changes required; this is purely frontend UI work
- No database schema changes
- No new dependencies needed (all icons available via lucide-react)
- Build time may exceed 60s; allow 2-3 minutes for `npm run build`
- The existing teal color (#4ECDC4) in tailwind.config.ts perfectly matches the design reference
- The center plus button (FAB) already exists in current implementation; we're refining its visual treatment
- Review and Assistant tabs remain accessible via desktop sidebar and command palette, just removed from mobile bottom nav for cleaner UI
