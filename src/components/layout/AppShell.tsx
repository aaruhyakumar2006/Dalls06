'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { detectSwipe, debounce } from '@/lib/utils/gestures';
import ToastContainer from './ToastContainer';
import AuthModal from '../modals/AuthModal';
import SettingsModal from '../modals/SettingsModal';
import OnboardingModal from '../modals/OnboardingModal';
import WeeklyScheduleModal from '../modals/WeeklyScheduleModal';
import ProfileModal from '../modals/ProfileModal';
import CommandPalette from '../ui/CommandPalette';
import ShortcutsModal from '../ui/ShortcutsModal';
import SearchModal from '../ui/SearchModal';
import RallyCounter from '../ui/RallyCounter';
import PromptBar from '../ui/PromptBar';
import { ShuttleIcon, RacketIcon } from '../ui/Icons';
import {
  Calendar,
  RotateCw,
  Activity,
  FolderKanban,
  Sparkles,
  Settings,
  User,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Plus,
  Keyboard,
  Clock,
  Check,
  X,
  AlertTriangle,
  Undo,
  Redo,
  Search,
  BarChart3,
  Layers,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export type TabType = 'today' | 'review' | 'track' | 'plan' | 'analytics' | 'assistant';

export const AppTabContext = React.createContext<{
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  openPromptModal: () => void;
  openScheduleModal: () => void;
  openProfileModal: () => void;
}>({
  currentTab: 'today',
  setCurrentTab: () => {},
  openPromptModal: () => {},
  openScheduleModal: () => {},
  openProfileModal: () => {},
});

export default function AppShell({ children }: AppShellProps) {
  const {
    syncStatus,
    dueReviewItemsCount,
    streak,
    weekDayCounts,
    tasks,
    toggleTask,
    reviewItems,
    todayDateKey,
    isScheduleModalOpen,
    openScheduleModal,
    closeScheduleModal,
    isLoaded,
    undo,
    redo,
    canUndo,
    canRedo,
    isOnline,
    pendingMutationsCount,
    failedMutationsCount,
    syncError,
    retryFailedMutations,
  } = usePlanner();

  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobilePromptOpen, setMobilePromptOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSyncErrorToast, setShowSyncErrorToast] = useState(false);

  // Touch tracking for swipe navigation
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle sync errors
  useEffect(() => {
    if (syncError && !showSyncErrorToast) {
      setShowSyncErrorToast(true);
      // Reset after showing
      setTimeout(() => setShowSyncErrorToast(false), 5000);
    }
  }, [syncError, showSyncErrorToast]);

  // Debounced swipe handler for tab navigation
  const handleSwipeTab = debounce((direction: 'left' | 'right') => {
    const tabIds: TabType[] = ['today', 'review', 'track', 'plan', 'analytics', 'assistant'];
    const currentIndex = tabIds.indexOf(currentTab);
    let nextIndex = currentIndex;

    if (direction === 'left') {
      nextIndex = (currentIndex + 1) % tabIds.length;
    } else if (direction === 'right') {
      nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    }

    setCurrentTab(tabIds[nextIndex]);
  }, 300);

  // Check onboarding on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem('planner-onboarding-done');
      if (!done) {
        setOnboardingOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('DALLS SW registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('SW registration warning:', err);
        });
    }

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch((err) => {
          console.warn('Notification permission request denied:', err);
        });
      }
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && e.shiftKey && !isInput) {
        e.preventDefault();
        redo();
        return;
      }

      // Search: Ctrl+F or Cmd+F
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f' && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // Cmd/Ctrl + K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === '/') {
        e.preventDefault();
        // Focus prompt bar
        const inputEl = document.querySelector('input[placeholder*="Type or speak"]') as HTMLInputElement;
        inputEl?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setMobilePromptOpen(true);
      } else if (e.key === '1') {
        setCurrentTab('today');
      } else if (e.key === '2') {
        setCurrentTab('review');
      } else if (e.key === '3') {
        setCurrentTab('track');
      } else if (e.key === '4') {
        setCurrentTab('plan');
      } else if (e.key === '5') {
        setCurrentTab('analytics');
      } else if (e.key === '6') {
        setCurrentTab('assistant');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setSearchOpen]);

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'today', label: 'Today', icon: <Calendar className="w-5 h-5" /> },
    {
      id: 'review',
      label: 'Review',
      icon: <RotateCw className="w-5 h-5" />,
      badge: dueReviewItemsCount > 0 ? dueReviewItemsCount : undefined,
    },
    { id: 'track', label: 'Track', icon: <Activity className="w-5 h-5" /> },
    { id: 'plan', label: 'Plan', icon: <FolderKanban className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'assistant', label: 'AI Coach', icon: <Sparkles className="w-5 h-5" /> },
  ];

  const dueReviewsList = reviewItems.filter((r) => r.next_review_at <= todayDateKey);

  if (!mounted || !isLoaded) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl font-display shadow-lg animate-bounce">
            D
          </div>
          <div className="space-y-1">
            <h1 className="font-display font-bold text-lg text-ink">DALLS</h1>
            <p className="text-xs font-mono text-mute">Loading your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppTabContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        openPromptModal: () => setMobilePromptOpen(true),
        openScheduleModal,
        openProfileModal: () => setProfileOpen(true),
      }}
    >
      <div className="min-h-screen bg-bg text-ink flex flex-col lg:flex-row">
        {/* ============================================================== */}
        {/* 1. DESKTOP LEFT RAIL (Width ~260px)                             */}
        {/* ============================================================== */}
        <aside
          aria-label="Desktop Navigation Rail"
          className="hidden lg:flex flex-col justify-between w-64 border-r border-gray-200 bg-background p-4 shrink-0 fixed top-0 bottom-0 z-30"
        >
          <div>
            {/* DALLS Brand Header */}
            <div className="flex items-center gap-3 px-2 py-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-xl font-display text-white shadow-md">
                D
              </div>
              <div>
                <h1 className="text-base font-bold font-display tracking-tight leading-none text-text-charcoal">
                  DALLS
                </h1>
                <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">
                  Your Daily Assistant
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1.5" aria-label="Main Navigation">
              {tabs.map((tab, idx) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-card-new text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-card-soft'
                        : 'text-text-muted hover:text-text-charcoal hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {tab.icon}
                      <span className="font-display tracking-tight">{tab.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tab.badge !== undefined && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-secondary text-white rounded-full">
                          {tab.badge}
                        </span>
                      )}
                      <kbd className="text-[10px] font-mono opacity-60">
                        {idx + 1}
                      </kbd>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Command Palette shortcut button */}
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => setPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-text-muted hover:text-text-charcoal shadow-card-soft hover:shadow-card-hover"
              >
                <span className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5" /> Command Palette
                </span>
                <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-background border border-gray-300">
                  ⌘K
                </kbd>
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-text-muted hover:text-text-charcoal shadow-card-soft hover:shadow-card-hover"
              >
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Search
                </span>
                <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-background border border-gray-300">
                  ⌘F
                </kbd>
              </button>
            </div>
          </div>

          {/* Desktop Footer Controls */}
          <div className="space-y-2.5 pt-4 border-t border-gray-200">
            {/* Realtime Sync Status Indicator with Error Handling */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs shadow-card-soft ${
              syncStatus === 'offline' ? 'bg-error/10 border border-error' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                {syncStatus === 'synced' && <CheckCircle2 className="w-4 h-4 text-success" />}
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-primary animate-spin" />}
                {syncStatus === 'offline' && <AlertTriangle className="w-4 h-4 text-error" />}
                {syncStatus === 'local_only' && <CheckCircle2 className="w-4 h-4 text-text-muted" />}
                <span className={`font-semibold text-[11px] ${
                  syncStatus === 'offline' ? 'text-error' : 'text-text-charcoal'
                }`}>
                  {syncStatus === 'synced'
                    ? 'Live Realtime ✓'
                    : syncStatus === 'syncing'
                    ? 'Syncing...'
                    : syncStatus === 'offline'
                    ? 'Offline - Changes queued'
                    : 'Local Cache'}
                </span>
              </div>
              <button
                onClick={() => setAuthOpen(true)}
                className={`text-[10px] font-bold uppercase tracking-wider hover:underline ${
                  syncStatus === 'offline' ? 'text-error' : 'text-primary'
                }`}
              >
                {syncStatus === 'offline' ? 'Retry' : 'Sync'}
              </button>
            </div>

            {/* Offline warning banner */}
            {syncStatus === 'offline' && (
              <div className="p-2.5 bg-error/10 border-l-2 border-error rounded text-[10px] text-error font-semibold space-y-1">
                <div>⚠️ You're offline</div>
                <div className="text-[9px] font-medium text-error/80">
                  Your changes are saved locally and will sync automatically when you're back online.
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo (Ctrl+Z)"
                className="p-2 text-text-muted hover:text-text-charcoal hover:bg-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </button>

              <button
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo (Ctrl+Shift+Z)"
                className="p-2 text-text-muted hover:text-text-charcoal hover:bg-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShortcutsOpen(true)}
                aria-label="Shortcuts cheatsheet"
                className="p-2 text-text-muted hover:text-text-charcoal hover:bg-white rounded-xl transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
                className="p-2 text-text-muted hover:text-text-charcoal hover:bg-white rounded-xl transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                onClick={() => setProfileOpen(true)}
                aria-label="Student Profile"
                className="p-2 text-text-muted hover:text-text-charcoal hover:bg-white rounded-xl transition-colors"
                title="View Profile Details"
              >
                <User className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* 2. MAIN CENTER CONTENT COLUMN                                  */}
        {/* ============================================================== */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          {/* Top Bar for Mobile */}
          <header className="lg:hidden flex flex-col border-b border-gray-200 bg-white sticky top-0 z-20">
            {/* Sync status bar */}
            {syncError && (
              <div className="flex items-center justify-between px-3 py-2 bg-error/10 border-b border-error text-[10px] sm:text-[11px] font-semibold text-error">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {syncError}
                </span>
                <button onClick={retryFailedMutations} className="underline">
                  Retry
                </button>
              </div>
            )}
            {!isOnline && (
              <div className="flex items-center justify-between px-3 py-2 bg-warning/10 border-b border-warning text-[10px] sm:text-[11px] font-semibold text-yellow-800">
                <span className="flex items-center gap-1.5">
                  <CloudOff className="w-3.5 h-3.5" />
                  Offline – {pendingMutationsCount} pending
                </span>
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 h-14">
              {/* DALLS Logo */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold font-display text-lg">
                  D
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold font-display text-sm tracking-tight block text-text-charcoal">
                    DALLS
                  </span>
                </div>
              </div>

              {/* Right Icon Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Command palette"
                  className="p-2 text-gray-400 hover:text-primary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Settings"
                  className="p-2 text-gray-400 hover:text-primary rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setProfileOpen(true)}
                  aria-label="Profile"
                  className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                >
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Real Laptop Layout: Center Column + Right Panel on Desktop */}
          <div className="flex-1 flex flex-col xl:flex-row bg-background">
            {/* Center Timeline Column */}
            <main className="flex-1 max-w-[720px] w-full mx-auto p-4 sm:p-6 pb-24 lg:pb-12 space-y-6"
              onTouchStart={(e) => {
                if (e.touches.length === 1) {
                  touchStartXRef.current = e.touches[0].clientX;
                  touchStartYRef.current = e.touches[0].clientY;
                }
              }}
              onTouchEnd={(e) => {
                if (e.changedTouches.length === 1) {
                  const endX = e.changedTouches[0].clientX;
                  const endY = e.changedTouches[0].clientY;
                  const direction = detectSwipe(
                    touchStartXRef.current,
                    endX,
                    touchStartYRef.current,
                    endY,
                    50
                  );
                  if (direction) {
                    handleSwipeTab(direction);
                  }
                }
              }}
            >
              {children}
            </main>

            {/* ============================================================== */}
            {/* 3. DESKTOP RIGHT PANEL (Section 3 & 7 requirement: real laptop)*/}
            {/* ============================================================== */}
            <aside
              aria-label="Desktop Right Panel"
              className="hidden xl:block w-80 2xl:w-96 border-l border-gray-200 bg-white p-4 shrink-0 overflow-y-auto space-y-4"
            >
              {/* Scoreboard Rally Counter */}
              <RallyCounter streak={streak} weekDayCounts={weekDayCounts} />

              {/* Quick Spaced Review Due Snapshot */}
              <div className="p-4 rounded-card-xl bg-white shadow-card-soft space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-text-charcoal flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-success" /> Due Spaced Reviews
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-white font-bold text-[10px]">
                    {dueReviewsList.length} DUE
                  </span>
                </div>

                {dueReviewsList.length === 0 ? (
                  <p className="text-xs text-text-muted font-medium">
                    All caught up. Next review pushes at 19:15.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {dueReviewsList.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setCurrentTab('review')}
                        className="p-2 bg-white rounded-lg border border-gray-300 text-xs hover:border-primary cursor-pointer transition-all"
                      >
                        <div className="font-semibold text-text-charcoal truncate">{item.title}</div>
                        <div className="text-[10px] text-text-muted uppercase font-mono mt-0.5">
                          Stage {item.stage} • {item.topic_kind}
                        </div>
                      </div>
                    ))}
                    {dueReviewsList.length > 3 && (
                      <button
                        onClick={() => setCurrentTab('review')}
                        className="text-[11px] font-bold text-primary hover:underline block text-center w-full pt-1"
                      >
                        + {dueReviewsList.length - 3} more items on Review tab
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Today's Task List on Desktop Right Panel */}
              <div className="p-4 rounded-card-xl bg-white shadow-card-soft space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-bold uppercase tracking-wider text-text-charcoal">
                    Top Priority Tasks
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {tasks.filter((t) => t.done).length}/{tasks.length} Done
                  </span>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="p-3 bg-white rounded-lg border border-dashed border-gray-300 text-xs text-text-muted text-center">
                      No extra tasks queued.
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-300 text-xs"
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            task.done ? 'bg-success border-gray-400 text-text-charcoal' : 'border-gray-300'
                          }`}
                        >
                          {task.done && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                        <span
                          className={`truncate font-medium flex-1 ${
                            task.done ? 'line-through text-text-muted' : 'text-text-charcoal'
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.at_time && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            {task.at_time}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. MOBILE BOTTOM TAB BAR WITH RAISED CENTER '+' BUTTON          */}
        {/* ============================================================== */}
        <nav
          aria-label="Bottom tab navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="relative flex items-center justify-around px-2 max-w-[500px] mx-auto h-16">
            {/* Tab 1: Today (Calendar) */}
            <button
              onClick={() => setCurrentTab('today')}
              aria-label="Today"
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                currentTab === 'today' ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Calendar className="w-6 h-6" />
            </button>

            {/* Tab 2: Plan (Layers) */}
            <button
              onClick={() => setCurrentTab('plan')}
              aria-label="Plan"
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                currentTab === 'plan' ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Layers className="w-6 h-6" />
            </button>

            {/* CENTER RAISED '+' ACTION BUTTON */}
            <div className="relative -top-6 flex items-center justify-center">
              <button
                onClick={() => setMobilePromptOpen(true)}
                aria-label="Quick add task"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg flex items-center justify-center transition-all min-h-[44px] active:scale-95"
              >
                <Plus className="w-7 h-7 stroke-[3]" />
              </button>
            </div>

            {/* Tab 3: Track (Activity) */}
            <button
              onClick={() => setCurrentTab('track')}
              aria-label="Track"
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                currentTab === 'track' ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Activity className="w-6 h-6" />
            </button>

            {/* Tab 4: Analytics (BarChart) */}
            <button
              onClick={() => setCurrentTab('analytics')}
              aria-label="Analytics"
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                currentTab === 'analytics' ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <BarChart3 className="w-6 h-6" />
            </button>

            {/* Tab 5: Review (RotateCw) */}
            <button
              onClick={() => setCurrentTab('review')}
              aria-label="Review"
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] transition-colors relative ${
                currentTab === 'review' ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <RotateCw className="w-6 h-6" />
              {dueReviewItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {dueReviewItemsCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Prompt Modal (Opened via center '+' button) */}
        {mobilePromptOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={() => setMobilePromptOpen(false)}
          >
            <div
              className="w-full max-h-[90vh] sm:max-w-lg bg-white rounded-t-card-xl sm:rounded-card-xl shadow-card-hover p-4 sm:p-6 space-y-4 animate-in slide-in-from-bottom overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="font-display text-base font-bold text-text-charcoal flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" /> Quick Add Task
                </span>
                <button
                  onClick={() => setMobilePromptOpen(false)}
                  className="p-1.5 rounded-full text-text-muted hover:text-text-charcoal hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <PromptBar
                autoFocus
                onTaskScheduled={() => setMobilePromptOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Modals & Live Region Toasts */}
        <ToastContainer />
        <ProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onOpenSchedule={openScheduleModal}
        />
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <OnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
        <WeeklyScheduleModal isOpen={isScheduleModalOpen} onClose={closeScheduleModal} />
        <CommandPalette
          isOpen={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onOpenNewTask={() => setMobilePromptOpen(true)}
          onOpenTimer={() => {
            // trigger focus timer
            const btn = document.querySelector('button[title*="focus timer"]') as HTMLButtonElement;
            btn?.click();
          }}
          onOpenSleep={() => {
            setCurrentTab('track');
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenScheduleModal={openScheduleModal}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </AppTabContext.Provider>
  );
}
