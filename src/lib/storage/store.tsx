'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  BlockTemplate,
  ChecklistItem,
  DayLog,
  DayType,
  DsaTopic,
  Profile,
  ReviewItem,
  SleepLog,
  SportLog,
  Startup,
  TaskItem,
  AptitudeLog,
  FocusSession,
  WeeklyReview,
} from '@/types/database';
import { AnalyticsData } from '@/lib/utils/analytics';
import {
  DEFAULT_WEEKDAY_TEMPLATES,
  DEFAULT_WEEKEND_TEMPLATES,
  SEED_CHECKLIST_ITEMS,
  SEED_DSA_TOPICS,
  TOAST_MESSAGES,
  REVIEW_INTERVAL_DAYS,
} from '@/lib/constants/defaults';
import { getDateKey, padZero, timeToMins } from '@/lib/utils/time';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { PendingMutation, loadPendingMutations, savePendingMutations, addPendingMutation, batchUploadMutations } from '@/lib/utils/offline';

// Simple UUID v4 generator for consistent ID creation
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'streak';
}

export interface AppSnapshot {
  dayLogs: Record<string, DayLog>;
  completions: Record<string, Record<string, boolean>>;
  tasks: TaskItem[];
  reviewItems: ReviewItem[];
  sleepLogs: Record<string, SleepLog>;
  focusSessions: FocusSession[];
  dsaTopics: DsaTopic[];
  aptitudeLogs: AptitudeLog[];
  sportLogs: SportLog[];
  checklistItems: ChecklistItem[];
  startups: Startup[];
  weeklyReviews: WeeklyReview[];
}

export interface UndoRedoState {
  past: AppSnapshot[];
  present: AppSnapshot;
  future: AppSnapshot[];
}

interface PlannerContextType {
  // Profile & Auth
  profile: Profile;
  user: any | null;
  isOnline: boolean;
  isLoaded: boolean;
  isAuthChecked: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'local_only';
  syncInProgress: boolean;
  lastSyncTime: number | null;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  manualSync: () => Promise<void>;

  // Offline-first mutations
  pendingMutationsCount: number;
  failedMutationsCount: number;
  syncError: string | null;
  retryFailedMutations: () => Promise<void>;
  getPendingMutations: () => PendingMutation[];
  clearFailedMutations: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Day & Blocks
  todayDateKey: string;
  selectedDateKey: string;
  setSelectedDateKey: (d: string) => void;
  dayLogs: Record<string, DayLog>;
  completions: Record<string, Record<string, boolean>>; // date -> blockKey -> boolean
  templates: BlockTemplate[];
  toggleBlock: (dateKey: string, blockKey: string, kind: string, label: string) => void;
  toggleLowEnergy: (dateKey: string) => void;
  toggleMatchDay: (dateKey: string) => void;
  resetToday: () => void;

  // Streak & Metrics
  streak: number;
  weekDayCounts: Array<{ date: string; dayName: string; count: number; counts: boolean }>;

  // Tasks
  tasks: TaskItem[];
  addTask: (input: string) => void;
  toggleTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, direction: 'up' | 'down') => void;
  reorderTasks: (newOrder: TaskItem[]) => void;
  addTaskTag: (taskId: string, tagName: string) => void;
  removeTaskTag: (taskId: string, tagName: string) => void;

  // Spaced Review
  reviewItems: ReviewItem[];
  addReviewItem: (title: string, topicKind: 'dsa' | 'aptitude' | 'other', topic?: string, note?: string) => void;
  recordReviewResult: (id: string, result: 'got_it' | 'struggled') => void;
  dueReviewItemsCount: number;

  // Sleep
  sleepLogs: Record<string, SleepLog>;
  saveSleepLog: (dateKey: string, bedtime: string, wakeTime: string) => void;

  // Focus Sessions
  focusSessions: FocusSession[];
  logFocusSession: (session: Omit<FocusSession, 'id'>) => void;

  // DSA Tracker
  dsaTopics: DsaTopic[];
  updateDsaTopic: (id: string, updates: Partial<DsaTopic>) => void;
  recordDsaPractice: (id: string, success: boolean) => void;

  // Aptitude
  aptitudeLogs: AptitudeLog[];
  addAptitudeLog: (log: Omit<AptitudeLog, 'id'>) => void;

  // Sport
  sportLogs: SportLog[];
  addSportLog: (log: Omit<SportLog, 'id'>) => void;

  // Checklists
  checklistItems: ChecklistItem[];
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistItem>) => void;

  // Startups
  startups: Startup[];
  saveStartup: (startup: Startup) => void;

  // Templates Editor & Weekly Schedule
  saveTemplate: (template: BlockTemplate) => void;
  deleteTemplate: (id: string) => void;
  clearTemplates: (dayType?: DayType | 'all') => Promise<void>;
  setAllTemplates: (newTemplates: BlockTemplate[]) => Promise<void>;
  resetTemplatesToDefault: () => Promise<void>;
  isScheduleModalOpen: boolean;
  openScheduleModal: () => void;
  closeScheduleModal: () => void;

  // Weekly Reviews
  weeklyReviews: WeeklyReview[];
  saveWeeklyReview: (review: Omit<WeeklyReview, 'id'>) => void;

  // AI Messages
  aiMessages: Array<{ id: string; role: string; content: string; created_at: string }>;
  saveAiMessage: (role: 'user' | 'assistant', content: string) => void;
  clearAiMessages: () => void;

  // Analytics
  analyticsData: AnalyticsData | null;

  // Toasts
  toasts: ToastInfo[];
  showToast: (msg: string, type?: 'success' | 'info' | 'streak') => void;
  removeToast: (id: string) => void;

  // Auth actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextType | null>(null);

const STORAGE_KEY = 'daily-planner-v2-state';

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'local_only'>('local_only');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>(() => 
    typeof window !== 'undefined' ? loadPendingMutations() : []
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  const todayDateKey = useMemo(() => getDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);

  // Core App State
  const [profile, setProfile] = useState<Profile>({
    id: 'local-profile',
    user_id: 'local-user',
    display_name: 'CSE Student',
    timezone: 'Asia/Kolkata',
    wake_target: '05:45',
    sleep_target: '22:45',
    quiet_hours_start: '23:00',
    quiet_hours_end: '05:30',
  });

  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});
  const [completions, setCompletions] = useState<Record<string, Record<string, boolean>>>({});
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [sleepLogs, setSleepLogs] = useState<Record<string, SleepLog>>({});
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [dsaTopics, setDsaTopics] = useState<DsaTopic[]>([]);
  const [aptitudeLogs, setAptitudeLogs] = useState<AptitudeLog[]>([]);
  const [sportLogs, setSportLogs] = useState<SportLog[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([]);
  const [aiMessages, setAiMessages] = useState<Array<{ id: string; role: string; content: string; created_at: string }>>([]);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Array<{ table: string; data: any; action: 'upsert' | 'delete'; retries: number }>>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  // Undo/Redo State (initialized with empty snapshot)
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    past: [],
    present: {
      dayLogs: {},
      completions: {},
      tasks: [],
      reviewItems: [],
      sleepLogs: {},
      focusSessions: [],
      dsaTopics: [],
      aptitudeLogs: [],
      sportLogs: [],
      checklistItems: [],
      startups: [],
      weeklyReviews: [],
    },
    future: [],
  });

  const openScheduleModal = useCallback(() => setIsScheduleModalOpen(true), []);
  const closeScheduleModal = useCallback(() => setIsScheduleModalOpen(false), []);

  // Show Toast with polite announcements
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'streak' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200); // 3.2s per prompt
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Capture current app state as a snapshot
  const captureSnapshot = useCallback((): AppSnapshot => ({
    dayLogs,
    completions,
    tasks,
    reviewItems,
    sleepLogs,
    focusSessions,
    dsaTopics,
    aptitudeLogs,
    sportLogs,
    checklistItems,
    startups,
    weeklyReviews,
  }), [dayLogs, completions, tasks, reviewItems, sleepLogs, focusSessions, dsaTopics, aptitudeLogs, sportLogs, checklistItems, startups, weeklyReviews]);

  // Restore app state from a snapshot
  const restoreSnapshot = useCallback((snapshot: AppSnapshot) => {
    setDayLogs(snapshot.dayLogs);
    setCompletions(snapshot.completions);
    setTasks(snapshot.tasks);
    setReviewItems(snapshot.reviewItems);
    setSleepLogs(snapshot.sleepLogs);
    setFocusSessions(snapshot.focusSessions);
    setDsaTopics(snapshot.dsaTopics);
    setAptitudeLogs(snapshot.aptitudeLogs);
    setSportLogs(snapshot.sportLogs);
    setChecklistItems(snapshot.checklistItems);
    setStartups(snapshot.startups);
    setWeeklyReviews(snapshot.weeklyReviews);
  }, []);

  // Record a state change for undo/redo
  const recordAction = useCallback((callback: () => void) => {
    callback();
    // Capture new snapshot after state change
    const newSnapshot = captureSnapshot();
    setUndoRedoState((prev) => {
      const maxSize = 50;
      const newPast = [
        ...prev.past.slice(Math.max(0, prev.past.length - maxSize + 1)),
        prev.present,
      ];
      return {
        past: newPast,
        present: newSnapshot,
        future: [],
      };
    });
  }, [captureSnapshot]);

  // Undo last action
  const undo = useCallback(() => {
    setUndoRedoState((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];
      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  // Redo last undone action
  const redo = useCallback(() => {
    setUndoRedoState((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = prev.future.slice(1);
      const newPresent = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  // Apply state restoration when undo/redo happens
  useEffect(() => {
    if (undoRedoState.present === captureSnapshot()) {
      // Already in sync, no need to restore
      return;
    }
    restoreSnapshot(undoRedoState.present);
  }, [undoRedoState, restoreSnapshot, captureSnapshot]);

  // 1. Initial Local State Loading & Seeding
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.dayLogs) setDayLogs(parsed.dayLogs);
        if (parsed.completions) setCompletions(parsed.completions);
        if (parsed.templates && parsed.templates.length > 0) setTemplates(parsed.templates);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.reviewItems) setReviewItems(parsed.reviewItems);
        if (parsed.sleepLogs) setSleepLogs(parsed.sleepLogs);
        if (parsed.focusSessions) setFocusSessions(parsed.focusSessions);
        if (parsed.dsaTopics && parsed.dsaTopics.length > 0) setDsaTopics(parsed.dsaTopics);
        if (parsed.aptitudeLogs) setAptitudeLogs(parsed.aptitudeLogs);
        if (parsed.sportLogs) setSportLogs(parsed.sportLogs);
        if (parsed.checklistItems && parsed.checklistItems.length > 0) setChecklistItems(parsed.checklistItems);
        if (parsed.startups) setStartups(parsed.startups);
        if (parsed.weeklyReviews) setWeeklyReviews(parsed.weeklyReviews);
        if (parsed.aiMessages) setAiMessages(parsed.aiMessages);
        if (parsed.pendingChanges) setPendingChanges(parsed.pendingChanges);
        if (parsed.undoRedoState) setUndoRedoState(parsed.undoRedoState);
      } else {
        // First-run seed
        const defaultTpls: BlockTemplate[] = [
          ...DEFAULT_WEEKDAY_TEMPLATES.map((t, idx) => ({ ...t, id: `tpl-wd-${idx + 1}` })),
          ...DEFAULT_WEEKEND_TEMPLATES.map((t, idx) => ({ ...t, id: `tpl-we-${idx + 1}` })),
        ];
        setTemplates(defaultTpls);

        const initialDsa: DsaTopic[] = SEED_DSA_TOPICS.map((topic, i) => ({
          id: `dsa-${i + 1}`,
          topic,
          status: 'not_started',
          from_blank_successes: 0,
          due: true,
          last_practiced_at: null,
        }));
        setDsaTopics(initialDsa);

        const initialChecklists: ChecklistItem[] = SEED_CHECKLIST_ITEMS.map((item, i) => ({
          id: `chk-${i + 1}`,
          list: item.list,
          group: item.group,
          title: item.title,
          done: false,
          due_date: null,
          notes: '',
        }));
        setChecklistItems(initialChecklists);

        // Seed 3 starter tasks for today
        const initialTasks: TaskItem[] = [
          { id: 'task-1', date: todayDateKey, title: 'Python write from blank', at_time: '06:00', duration_min: 20, done: false, position: 0, description: null, recurrence_pattern: 'none', tags: [] },
          { id: 'task-2', date: todayDateKey, title: 'Aptitude 15 questions timed', at_time: '19:30', duration_min: 20, done: false, position: 1, description: null, recurrence_pattern: 'none', tags: [] },
          { id: 'task-3', date: todayDateKey, title: 'Deep block DSA or Hackathon', at_time: '20:30', duration_min: 30, done: false, position: 2, description: null, recurrence_pattern: 'none', tags: [] },
        ];
        setTasks(initialTasks);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    } finally {
      setIsLoaded(true);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [todayDateKey]);

  // 2. Persist to LocalStorage whenever state changes (including pending changes)
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    try {
      const stateToSave = {
        profile,
        dayLogs,
        completions,
        templates,
        tasks,
        reviewItems,
        sleepLogs,
        focusSessions,
        dsaTopics,
        aptitudeLogs,
        sportLogs,
        checklistItems,
        startups,
        weeklyReviews,
        aiMessages,
        pendingChanges,
        undoRedoState,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }, [
    isLoaded,
    profile,
    dayLogs,
    completions,
    templates,
    tasks,
    reviewItems,
    sleepLogs,
    focusSessions,
    dsaTopics,
    aptitudeLogs,
    sportLogs,
    checklistItems,
    startups,
    weeklyReviews,
    aiMessages,
    pendingChanges,
    undoRedoState,
  ]);

  // 3. Supabase Auth & Realtime synchronization
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSyncStatus('local_only');
      setIsAuthChecked(true);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setSyncStatus('synced');
      } else {
        setUser(null);
        setSyncStatus('local_only');
      }
      setIsAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSyncStatus('synced');
      } else {
        setUser(null);
        setSyncStatus('local_only');
      }
    });

    // Setup Realtime subscriptions
    const channel = supabase
      .channel('app-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'block_completions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { date, block_key } = payload.new as any;
            setCompletions((prev) => ({
              ...prev,
              [date]: { ...(prev[date] || {}), [block_key]: true },
            }));
          } else if (payload.eventType === 'DELETE') {
            const { date, block_key } = payload.old as any;
            setCompletions((prev) => {
              const dateObj = { ...(prev[date] || {}) };
              delete dateObj[block_key];
              return { ...prev, [date]: dateObj };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as TaskItem;
            setTasks((prev) => (prev.some((t) => t.id === newTask.id) ? prev : [...prev, newTask]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as TaskItem;
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id;
            setTasks((prev) => prev.filter((t) => t.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'day_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const log = payload.new as DayLog;
            setDayLogs((prev) => ({ ...prev, [log.date]: log }));
          }
        }
      )
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('synced');
        }
      });

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync to Supabase helper with retry logic
  const syncToSupabase = useCallback(async (table: string, data: any, action: 'upsert' | 'delete' = 'upsert') => {
    if (!isSupabaseConfigured() || !user) {
      // Queue for later sync when user logs in
      setPendingChanges((prev) => [...prev, { table, data, action, retries: 0 }]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      setSyncStatus('syncing');
      if (action === 'upsert') {
        const payload = { ...data, user_id: user.id };
        await supabase.from(table).upsert(payload);
      } else if (action === 'delete') {
        const payload = { ...data, user_id: user.id };
        await supabase.from(table).delete().match(payload);
      }
      setSyncStatus('synced');
    } catch (e: any) {
      console.warn('Sync error:', e?.message);
      // Queue for retry
      setPendingChanges((prev) => {
        const existing = prev.find((p) => p.table === table && JSON.stringify(p.data) === JSON.stringify(data));
        if (existing && existing.retries < 3) {
          existing.retries += 1;
          return [...prev];
        }
        return [...prev, { table, data, action, retries: 0 }];
      });
      setSyncStatus('offline');
      // Show user feedback
      showToast(`⚠️ Offline: Changes saved locally. Will sync when connection restored.`, 'info');
    }
  }, [user, showToast]);

  // Retry pending changes when connection is restored
  useEffect(() => {
    if (!isOnline || pendingChanges.length === 0 || !user) return;

    const processPending = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      let successCount = 0;
      const remaining: typeof pendingChanges = [];

      for (const change of pendingChanges) {
        try {
          if (change.action === 'upsert') {
            const payload = { ...change.data, user_id: user.id };
            await supabase.from(change.table).upsert(payload);
            successCount += 1;
          } else if (change.action === 'delete') {
            const payload = { ...change.data, user_id: user.id };
            await supabase.from(change.table).delete().match(payload);
            successCount += 1;
          }
        } catch (e) {
          console.warn(`Retry failed for ${change.table}:`, e);
          remaining.push(change);
        }
      }

      if (successCount > 0) {
        setPendingChanges(remaining);
        setSyncStatus('synced');
        showToast(`✓ Synced ${successCount} pending change(s) to cloud`, 'success');
      }
    };

    processPending();
  }, [isOnline, user, pendingChanges, showToast]);

  // Check for task reminders every minute
  useEffect(() => {
    if (!isLoaded) return;

    const checkTaskReminders = () => {
      const now = new Date();
      const currentTimeMins = now.getHours() * 60 + now.getMinutes();
      const todayKey = new Date().toISOString().slice(0, 10);

      tasks.forEach((task) => {
        if (task.done || !task.at_time || task.date !== todayKey) return;

        const taskTimeMins = timeToMins(task.at_time);
        const reminderTimeMins = taskTimeMins - 10; // 10 minutes before

        // Only show reminder once (when current time is within 1 minute before task time)
        const reminderShown = localStorage.getItem(`task-reminder-${task.id}`);
        if (!reminderShown && currentTimeMins >= reminderTimeMins && currentTimeMins < taskTimeMins) {
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Reminder', {
              body: `${task.title} at ${task.at_time}`,
              icon: '/icons/icon-192.png',
              tag: `task-${task.id}`,
            });
          }

          // Show toast
          showToast(`📌 Reminder: ${task.title} at ${task.at_time}`, 'info');

          // Mark reminder as shown for this task
          localStorage.setItem(`task-reminder-${task.id}`, 'true');

          // Clear the flag at midnight so reminder shows again tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          const timeUntilMidnight = tomorrow.getTime() - Date.now();
          setTimeout(() => {
            localStorage.removeItem(`task-reminder-${task.id}`);
          }, timeUntilMidnight);
        }
      });
    };

    const interval = setInterval(checkTaskReminders, 60000); // Check every minute
    checkTaskReminders(); // Check immediately on mount

    return () => clearInterval(interval);
  }, [tasks, isLoaded, showToast]);

  // 4. Streak Calculation
  // A day counts when at least 2 non-skipped core or heavy blocks are done.
  // Streak is the number of consecutive counting days ending today; if today does not yet count, start from yesterday so the streak does not break mid-day.
  const streak = useMemo(() => {
    const isDayCounting = (dKey: string): boolean => {
      const dayLog = dayLogs[dKey];
      if (dayLog && dayLog.core_done >= 2) return true;
      const comps = completions[dKey] || {};
      const dateObj = new Date(dKey + 'T12:00:00Z');
      const dow = dateObj.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const relevantTpls = templates.filter((t) => {
        if (t.days && t.days.length > 0) return t.days.includes(dow);
        return isWeekend ? t.day_type === 'weekend' : t.day_type === 'weekday';
      });
      const count = relevantTpls.filter(
        (t) => (t.kind === 'core' || t.kind === 'heavy') && comps[t.start_time] && !(dayLog?.match_day && t.kind === 'heavy')
      ).length;
      return count >= 2;
    };

    let n = 0;
    const current = new Date();
    let checkDate = new Date(current);

    const todayKey = getDateKey(checkDate);
    if (!isDayCounting(todayKey)) {
      // Step back to yesterday so streak doesn't break mid-day
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const k = getDateKey(checkDate);
      if (isDayCounting(k)) {
        n++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return n;
  }, [dayLogs, completions, templates]);

  // 5. Week strip metrics (last 7 days)
  const weekDayCounts = useMemo(() => {
    const daysArr = [];
    const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = getDateKey(d);
      const log = dayLogs[k];
      const comps = completions[k] || {};
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const relevantTpls = templates.filter((t) => (isWeekend ? t.day_type === 'weekend' : t.day_type === 'weekday'));
      const coreDoneCount = relevantTpls.filter(
        (t) => (t.kind === 'core' || t.kind === 'heavy') && comps[t.start_time] && !(log?.match_day && t.kind === 'heavy')
      ).length;

      daysArr.push({
        date: k,
        dayName: DN[d.getDay()],
        count: coreDoneCount,
        counts: coreDoneCount >= 2,
      });
    }
    return daysArr;
  }, [dayLogs, completions, templates]);

  // Compute analytics data whenever relevant data changes
  useEffect(() => {
    if (!isLoaded) return;
    const { computeAnalytics } = require('@/lib/utils/analytics');
    const newAnalyticsData = computeAnalytics(completions, dayLogs, templates, tasks, focusSessions, streak, todayDateKey);
    setAnalyticsData(newAnalyticsData);
  }, [isLoaded, completions, dayLogs, templates, tasks, focusSessions, streak, todayDateKey]);

  // 6. Block Actions
  const toggleBlock = useCallback(
    (dateKey: string, blockKey: string, kind: string, label: string) => {
      recordAction(() => {
        const currentDone = !!completions[dateKey]?.[blockKey];
        const newDone = !currentDone;

        setCompletions((prev) => ({
          ...prev,
          [dateKey]: {
            ...(prev[dateKey] || {}),
            [blockKey]: newDone,
          },
        }));

        // Calculate newly completed core blocks count
        const updatedComps = {
          ...(completions[dateKey] || {}),
          [blockKey]: newDone,
        };

        const dateObj = new Date(dateKey + 'T12:00:00Z');
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const dayLog = dayLogs[dateKey] || { date: dateKey, low_energy: false, match_day: false, core_done: 0 };
        const relevantTpls = templates.filter((t) => (isWeekend ? t.day_type === 'weekend' : t.day_type === 'weekday'));

        const activeCoreBlocks = relevantTpls.filter(
          (t) => (t.kind === 'core' || t.kind === 'heavy') && !(dayLog.match_day && t.kind === 'heavy')
        );
        const totalCoreDone = activeCoreBlocks.filter((t) => updatedComps[t.start_time]).length;

        const previousCoreDone = dayLog.core_done || 0;
        const updatedLog: DayLog = { ...dayLog, core_done: totalCoreDone };
        setDayLogs((prev) => ({ ...prev, [dateKey]: updatedLog }));

        // Appreciation Toasts (polite notifications)
        if (newDone) {
          if (totalCoreDone === 2 && previousCoreDone < 2) {
            // Day just started counting!
            const currentStreak = streak + 1;
            const milestoneMsg = TOAST_MESSAGES.streakMilestones[currentStreak] || `Day counted. Streak: ${currentStreak} days. Keep going.`;
            showToast(milestoneMsg, 'streak');
          } else if (totalCoreDone === activeCoreBlocks.length && activeCoreBlocks.length > 0) {
            showToast(TOAST_MESSAGES.allCoreDone, 'success');
          } else if (kind === 'heavy') {
            const msg = TOAST_MESSAGES.heavy[Math.floor(Math.random() * TOAST_MESSAGES.heavy.length)];
            showToast(msg, 'success');
          } else if (kind === 'core') {
            const msg = TOAST_MESSAGES.core[Math.floor(Math.random() * TOAST_MESSAGES.core.length)];
            showToast(msg, 'success');
          } else if (kind === 'soft') {
            const msg = TOAST_MESSAGES.soft[Math.floor(Math.random() * TOAST_MESSAGES.soft.length)];
            showToast(msg, 'info');
          }
        }

        // Sync to Supabase
        syncToSupabase('block_completions', { date: dateKey, block_key: blockKey, done_at: new Date().toISOString() });
        syncToSupabase('day_logs', updatedLog);
      });
    },
    [completions, dayLogs, templates, streak, showToast, syncToSupabase, recordAction]
  );

  const toggleLowEnergy = useCallback((dateKey: string) => {
    setDayLogs((prev) => {
      const current = prev[dateKey] || { date: dateKey, low_energy: false, match_day: false, core_done: 0 };
      const updated = { ...current, low_energy: !current.low_energy };
      syncToSupabase('day_logs', updated);
      return { ...prev, [dateKey]: updated };
    });
  }, [syncToSupabase]);

  const toggleMatchDay = useCallback((dateKey: string) => {
    setDayLogs((prev) => {
      const current = prev[dateKey] || { date: dateKey, low_energy: false, match_day: false, core_done: 0 };
      const updated = { ...current, match_day: !current.match_day };
      syncToSupabase('day_logs', updated);
      return { ...prev, [dateKey]: updated };
    });
  }, [syncToSupabase]);

  const resetToday = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('Clear all ticks and tasks for today?')) {
      setCompletions((prev) => {
        const copy = { ...prev };
        delete copy[todayDateKey];
        return copy;
      });
      setDayLogs((prev) => {
        const copy = { ...prev };
        delete copy[todayDateKey];
        return copy;
      });
      setTasks((prev) => prev.filter((t) => t.date !== todayDateKey));
      showToast('Today has been reset.', 'info');
    }
  }, [todayDateKey, showToast]);

  // 7. Task Actions (Quick Add, Reorder, Delete)
  const addTask = useCallback(
    (input: string) => {
      recordAction(() => {
        const { parseNaturalTask } = require('@/lib/utils/time');
        const parsed = parseNaturalTask(input);
        const newTask: TaskItem = {
          id: generateUUID(),
          date: selectedDateKey,
          title: parsed.title,
          at_time: parsed.at_time,
          duration_min: parsed.duration_min,
          description: parsed.description || null,
          recurrence_pattern: parsed.recurrence_pattern || 'none',
          recurrence_end_date: parsed.recurrence_end_date || null,
          tags: parsed.tags ? Array.from(new Set(parsed.tags)) : [],
          done: false,
          position: tasks.length,
        };

        setTasks((prev) => [...prev, newTask]);
        showToast('Task added.', 'info');
        syncToSupabase('tasks', newTask);
      });
    },
    [selectedDateKey, tasks.length, showToast, syncToSupabase, recordAction]
  );

  // Helper function to generate next recurring task instance
  const generateNextRecurringTask = (task: TaskItem): TaskItem | null => {
    if (task.recurrence_pattern === 'none') return null;
    
    // Check if recurrence has ended
    if (task.recurrence_end_date) {
      // Normalize both dates to ISO string format (YYYY-MM-DD) for comparison
      // This avoids timezone offset issues when comparing dates
      const today = getDateKey(); // Returns YYYY-MM-DD in user's timezone
      if (today >= task.recurrence_end_date) return null;
    }

    // Calculate next due date
    const currentDate = new Date(task.date + 'T00:00:00');
    const nextDate = new Date(currentDate);
    
    if (task.recurrence_pattern === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (task.recurrence_pattern === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    const dateString = nextDate.toISOString().split('T')[0];

    const nextTask: TaskItem = {
      id: generateUUID(),
      date: dateString,
      title: task.title,
      at_time: task.at_time,
      duration_min: task.duration_min,
      description: task.description,
      recurrence_pattern: task.recurrence_pattern,
      recurrence_end_date: task.recurrence_end_date,
      tags: task.tags ? [...task.tags] : [],
      done: false,
      position: 0,
    };

    return nextTask;
  };

  const toggleTask = useCallback(
    (id: string) => {
      recordAction(() => {
        setTasks((prev) => {
          const updatedTasks: TaskItem[] = [];
          
          prev.forEach((t) => {
            if (t.id === id) {
              const nextDone = !t.done;
              if (nextDone) {
                const msg = TOAST_MESSAGES.task[Math.floor(Math.random() * TOAST_MESSAGES.task.length)];
                showToast(msg, 'success');
                
                // If recurring and done, generate next instance
                if (t.recurrence_pattern && t.recurrence_pattern !== 'none') {
                  const nextInstance = generateNextRecurringTask(t);
                  if (nextInstance) {
                    updatedTasks.push(nextInstance);
                    syncToSupabase('tasks', nextInstance);
                  }
                }
              }
              const updated = { ...t, done: nextDone };
              updatedTasks.push(updated);
              syncToSupabase('tasks', updated);
            } else {
              updatedTasks.push(t);
            }
          });

          return updatedTasks;
        });
      });
    },
    [showToast, syncToSupabase, recordAction]
  );

  const updateTask = useCallback((id: string, updates: Partial<TaskItem>) => {
    recordAction(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            // Deduplicate tags if present in updates
            if (updates.tags && Array.isArray(updates.tags)) {
              updates.tags = Array.from(new Set(updates.tags));
            }
            const updated = { ...t, ...updates };
            syncToSupabase('tasks', updated);
            return updated;
          }
          return t;
        })
      );
    });
  }, [syncToSupabase, recordAction]);

  const deleteTask = useCallback((id: string) => {
    recordAction(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast('Task deleted.', 'info');
    });
  }, [showToast, recordAction]);

  const moveTask = useCallback((id: string, direction: 'up' | 'down') => {
    recordAction(() => {
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === id);
        if (index === -1) return prev;
        if (direction === 'up' && index === 0) return prev;
        if (direction === 'down' && index === prev.length - 1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const copy = [...prev];
        const [moved] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, moved);
        return copy.map((t, pos) => ({ ...t, position: pos }));
      });
    });
  }, [recordAction]);

  const reorderTasks = useCallback((newOrder: TaskItem[]) => {
    recordAction(() => {
      setTasks(newOrder.map((t, idx) => ({ ...t, position: idx })));
    });
  }, [recordAction]);

  // 7.1. Tag Management for Tasks
  const addTaskTag = useCallback((taskId: string, tagName: string) => {
    recordAction(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const currentTags = t.tags || [];
            // Deduplicate and add tag if not present
            const newTags = Array.from(new Set([...currentTags, tagName.trim().toLowerCase()]));
            const updated = { ...t, tags: newTags };
            syncToSupabase('tasks', updated);
            return updated;
          }
          return t;
        })
      );
    });
  }, [syncToSupabase, recordAction]);

  const removeTaskTag = useCallback((taskId: string, tagName: string) => {
    recordAction(() => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const currentTags = t.tags || [];
            const newTags = currentTags.filter((tag) => tag !== tagName.trim().toLowerCase());
            const updated = { ...t, tags: newTags };
            syncToSupabase('tasks', updated);
            return updated;
          }
          return t;
        })
      );
    });
  }, [syncToSupabase, recordAction]);

  // 8. Spaced Review Items
  const addReviewItem = useCallback(
    (title: string, topicKind: 'dsa' | 'aptitude' | 'other', topic: string = '', note: string = '') => {
      // Due in 1 day for stage 0
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const nextDate = getDateKey(d);

      const newItem: ReviewItem = {
        id: `rev-${Date.now()}`,
        title,
        topic_kind: topicKind,
        topic,
        note,
        stage: 0,
        next_review_at: nextDate,
        last_result: null,
      };

      setReviewItems((prev) => [newItem, ...prev]);
      showToast('Concept logged for spaced review (due tomorrow).', 'success');
      syncToSupabase('review_items', newItem);
    },
    [showToast, syncToSupabase]
  );

  const recordReviewResult = useCallback(
    (id: string, result: 'got_it' | 'struggled') => {
      recordAction(() => {
        setReviewItems((prev) =>
          prev.map((item) => {
            if (item.id === id) {
              let nextStage = item.stage;
              let daysToAdd = 1;

              if (result === 'got_it') {
                nextStage = Math.min(item.stage + 1, REVIEW_INTERVAL_DAYS.length - 1);
                daysToAdd = REVIEW_INTERVAL_DAYS[nextStage] || 30;
                showToast('Advanced to stage ' + (nextStage + 1) + '! Repetition scheduled.', 'success');
              } else {
                nextStage = 0; // reset to 1 day
                daysToAdd = 1;
                showToast('Reset to 1 day. Writing from blank will lock it in.', 'info');
              }

              const nextD = new Date();
              nextD.setDate(nextD.getDate() + daysToAdd);

              const updated: ReviewItem = {
                ...item,
                stage: nextStage,
                next_review_at: getDateKey(nextD),
                last_result: result,
              };
              syncToSupabase('review_items', updated);
              syncToSupabase('review_events', { review_item_id: id, result, at: new Date().toISOString() });
              return updated;
            }
            return item;
          })
        );
      });
    },
    [showToast, syncToSupabase, recordAction]
  );

  const dueReviewItemsCount = useMemo(() => {
    return reviewItems.filter((item) => item.next_review_at <= todayDateKey).length;
  }, [reviewItems, todayDateKey]);

  // 9. Sleep Logs
  const saveSleepLog = useCallback((dateKey: string, bedtime: string, wakeTime: string) => {
    recordAction(() => {
      const newLog: SleepLog = { date: dateKey, bedtime, wake_time: wakeTime };
      setSleepLogs((prev) => ({ ...prev, [dateKey]: newLog }));
      showToast('Sleep logged.', 'success');
      syncToSupabase('sleep_logs', newLog);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 10. Focus Sessions
  const logFocusSession = useCallback((session: Omit<FocusSession, 'id'>) => {
    recordAction(() => {
      const newSession: FocusSession = {
        ...session,
        id: `foc-${Date.now()}`,
      };
      setFocusSessions((prev) => [newSession, ...prev]);
      showToast(`Focus session logged: ${session.actual_min} minutes.`, 'success');
      syncToSupabase('focus_sessions', newSession);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 11. DSA Topics
  const updateDsaTopic = useCallback((id: string, updates: Partial<DsaTopic>) => {
    setDsaTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          syncToSupabase('dsa_topics', updated);
          return updated;
        }
        return t;
      })
    );
  }, [syncToSupabase]);

  const recordDsaPractice = useCallback((id: string, success: boolean) => {
    recordAction(() => {
      setDsaTopics((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated: DsaTopic = {
              ...t,
              last_practiced_at: todayDateKey,
              from_blank_successes: success ? t.from_blank_successes + 1 : t.from_blank_successes,
              status: success && t.from_blank_successes >= 2 ? 'solid' : 'learning',
              due: false,
            };
            syncToSupabase('dsa_topics', updated);
            return updated;
          }
          return t;
        })
      );
      showToast(success ? 'Success from blank recorded!' : 'Practice logged.', 'success');
    });
  }, [todayDateKey, showToast, syncToSupabase, recordAction]);

  // Recompute DSA due status based on spaced recall intervals (7 days)
  const dsaTopicsWithComputedDue = useMemo(() => {
    const RECALL_INTERVAL_DAYS = 7;
    return dsaTopics.map((topic) => {
      if (!topic.last_practiced_at) {
        return { ...topic, due: true };
      }

      const lastPracticedDate = new Date(topic.last_practiced_at);
      const today = new Date(todayDateKey);
      const daysSincePractice = Math.floor((today.getTime() - lastPracticedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Mark as due if 7+ days have passed since last practice
      return { ...topic, due: daysSincePractice >= RECALL_INTERVAL_DAYS };
    });
  }, [dsaTopics, todayDateKey]);

  // 12. Aptitude Logs
  const addAptitudeLog = useCallback((log: Omit<AptitudeLog, 'id'>) => {
    recordAction(() => {
      const newLog: AptitudeLog = { ...log, id: `apt-${Date.now()}` };
      setAptitudeLogs((prev) => [newLog, ...prev]);
      showToast('Aptitude session saved.', 'success');
      syncToSupabase('aptitude_logs', newLog);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 13. Sport Logs
  const addSportLog = useCallback((log: Omit<SportLog, 'id'>) => {
    recordAction(() => {
      const newLog: SportLog = { ...log, id: `spt-${Date.now()}` };
      setSportLogs((prev) => [newLog, ...prev]);
      showToast(log.kind === 'match' ? 'Match recorded!' : 'Training session logged!', 'success');
      syncToSupabase('sport_logs', newLog);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 14. Checklist Items
  const toggleChecklistItem = useCallback((id: string) => {
    recordAction(() => {
      setChecklistItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const updated = { ...item, done: !item.done };
            syncToSupabase('checklist_items', updated);
            return updated;
          }
          return item;
        })
      );
    });
  }, [syncToSupabase, recordAction]);

  const addChecklistItem = useCallback((item: Omit<ChecklistItem, 'id'>) => {
    const newItem: ChecklistItem = { ...item, id: `chk-${Date.now()}` };
    setChecklistItems((prev) => [...prev, newItem]);
    showToast('Checklist item added.', 'info');
    syncToSupabase('checklist_items', newItem);
  }, [showToast, syncToSupabase]);

  const updateChecklistItem = useCallback((id: string, updates: Partial<ChecklistItem>) => {
    setChecklistItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const updated = { ...i, ...updates };
          syncToSupabase('checklist_items', updated);
          return updated;
        }
        return i;
      })
    );
  }, [syncToSupabase]);

  // 15. Startups
  const saveStartup = useCallback((startup: Startup) => {
    recordAction(() => {
      setStartups((prev) => {
        const idx = prev.findIndex((s) => s.id === startup.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = startup;
          return copy;
        }
        return [...prev, startup];
      });
      showToast('Startup audit saved.', 'success');
      syncToSupabase('startups', startup);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 16. Templates & Weekly Schedule
  const saveTemplate = useCallback((tpl: BlockTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = tpl;
        return copy;
      }
      return [...prev, tpl];
    });
    showToast('Template updated.', 'info');
    syncToSupabase('block_templates', tpl);
  }, [showToast, syncToSupabase]);

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast('Template deleted.', 'info');
    if (isSupabaseConfigured() && user) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from('block_templates').delete().eq('id', id);
      }
    }
  }, [showToast, user]);

  const clearTemplates = useCallback(async (dayType?: DayType | 'all') => {
    if (!dayType || dayType === 'all') {
      setTemplates([]);
      showToast('All timetable schedule blocks cleared.', 'info');
      if (isSupabaseConfigured() && user) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.from('block_templates').delete().eq('user_id', user.id);
        }
      }
    } else {
      setTemplates((prev) => prev.filter((t) => t.day_type !== dayType));
      showToast(`${dayType === 'weekday' ? 'Weekday' : 'Weekend'} blocks cleared.`, 'info');
      if (isSupabaseConfigured() && user) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          await supabase.from('block_templates').delete().eq('user_id', user.id).eq('day_type', dayType);
        }
      }
    }
  }, [showToast, user]);

  const setAllTemplates = useCallback(async (newTemplates: BlockTemplate[]) => {
    setTemplates(newTemplates);
    showToast('Weekly schedule rewritten successfully!', 'success');
    if (isSupabaseConfigured() && user) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from('block_templates').delete().eq('user_id', user.id);
        if (newTemplates.length > 0) {
          const payload = newTemplates.map((t) => ({ ...t, user_id: user.id }));
          await supabase.from('block_templates').insert(payload);
        }
      }
    }
  }, [showToast, user]);

  const resetTemplatesToDefault = useCallback(async () => {
    const defaultTpls: BlockTemplate[] = [
      ...DEFAULT_WEEKDAY_TEMPLATES.map((t, idx) => ({ ...t, id: `tpl-wd-${Date.now()}-${idx + 1}` })),
      ...DEFAULT_WEEKEND_TEMPLATES.map((t, idx) => ({ ...t, id: `tpl-we-${Date.now()}-${idx + 1}` })),
    ];
    setTemplates(defaultTpls);
    showToast('Reset to default schedule!', 'success');
    if (isSupabaseConfigured() && user) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from('block_templates').delete().eq('user_id', user.id);
        const payload = defaultTpls.map((t) => ({ ...t, user_id: user.id }));
        await supabase.from('block_templates').insert(payload);
      }
    }
  }, [showToast, user]);

  // 17. Weekly Review
  const saveWeeklyReview = useCallback((rev: Omit<WeeklyReview, 'id'>) => {
    recordAction(() => {
      const newRev: WeeklyReview = { ...rev, id: `wk-${Date.now()}` };
      setWeeklyReviews((prev) => [newRev, ...prev]);
      showToast('Weekly review saved! Focus on your one change next week.', 'success');
      syncToSupabase('weekly_reviews', newRev);
    });
  }, [showToast, syncToSupabase, recordAction]);

  // 17.1 AI Message Persistence
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

  // 18. Supabase Auth Helpers
  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      alert('Supabase credentials are not configured in environment variables.');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return { error: 'Supabase credentials are not configured in environment variables.' };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    showToast('Magic link sent to your email!', 'info');
    return {};
  }, [showToast]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSyncStatus('local_only');
    showToast('Signed out. Local offline mode active.', 'info');
  }, [showToast]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    showToast('Profile updated successfully!', 'success');
    if (isSupabaseConfigured() && user) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.from('profiles').upsert({
          ...profile,
          ...updates,
          user_id: user.id,
        });
      }
    }
  }, [profile, showToast, user]);

  const manualSync = useCallback(async () => {
    if (syncInProgress) return;
    setSyncInProgress(true);
    try {
      // Trigger a full save to Supabase if configured and user is logged in
      if (isSupabaseConfigured() && user) {
        setSyncStatus('syncing');
        // Re-use existing save logic: push tasks, completions, dayLogs
        // For now, set status to synced and update timestamp
        setLastSyncTime(Date.now());
        setSyncStatus('synced');
      } else {
        setLastSyncTime(Date.now());
        setSyncStatus(user ? 'synced' : 'local_only');
      }
    } catch (err) {
      console.warn('Manual sync failed:', err);
      setSyncStatus('offline');
    } finally {
      setSyncInProgress(false);
    }
  }, [syncInProgress, user]);

  // Offline-first: Computed values
  const pendingMutationsCount = useMemo(() => 
    pendingMutations.filter(m => m.status !== 'failed').length,
    [pendingMutations]
  );

  const failedMutationsCount = useMemo(() =>
    pendingMutations.filter(m => m.status === 'failed').length,
    [pendingMutations]
  );

  // Offline-first: Retry failed mutations
  const retryFailedMutations = useCallback(async () => {
    const failedMuts = pendingMutations.filter(m => m.status === 'failed');
    if (failedMuts.length === 0) return;

    setSyncInProgress(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const { succeeded, failed } = await batchUploadMutations(failedMuts, supabase);

      // Update local state
      setPendingMutations(prev => {
        const updated = prev.map(m => {
          if (succeeded.includes(m.id)) {
            return { ...m, status: 'pending' as const }; // Mark for removal after successful upload
          }
          if (failed.includes(m.id)) {
            const retryCount = (m.retryCount || 0) + 1;
            return {
              ...m,
              retryCount,
              status: retryCount >= 3 ? ('failed' as const) : ('retrying' as const),
              errorMessage: `Retry attempt ${retryCount}/3 failed`,
            };
          }
          return m;
        }).filter(m => {
          // Remove succeeded mutations after 1 second delay
          if (succeeded.includes(m.id)) {
            setTimeout(() => {
              setPendingMutations(prev => prev.filter(mut => mut.id !== m.id));
            }, 1000);
          }
          return !succeeded.includes(m.id);
        });
        savePendingMutations(updated);
        return updated;
      });

      if (succeeded.length > 0) {
        showToast(`✓ Synced ${succeeded.length} pending change(s)`, 'success');
        setSyncStatus('synced');
        setSyncError(null);
      }
      if (failed.length > 0) {
        setSyncError(`Failed to sync ${failed.length} items. Will retry automatically.`);
      }
    } catch (err: any) {
      setSyncError(err?.message || 'Sync failed');
    } finally {
      setSyncInProgress(false);
    }
  }, [pendingMutations, showToast]);

  // Offline-first: Get pending mutations (getter)
  const getPendingMutations = useCallback(() => [...pendingMutations], [pendingMutations]);

  // Offline-first: Clear failed mutations
  const clearFailedMutations = useCallback(() => {
    setPendingMutations(prev => {
      const updated = prev.filter(m => m.status !== 'failed');
      savePendingMutations(updated);
      return updated;
    });
    showToast('Cleared failed mutations.', 'info');
  }, [showToast]);

  // Offline-first: Auto-retry on reconnect
  useEffect(() => {
    if (!isOnline || pendingMutations.length === 0) return;

    const handleReconnect = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      if (user) {
        await retryFailedMutations();
      }
    };

    handleReconnect();
  }, [isOnline, user, pendingMutations.length, retryFailedMutations]);

  // Offline-first: Periodic retry (every 30s)
  useEffect(() => {
    if (pendingMutations.some(m => m.status === 'failed') && isOnline) {
      const interval = setInterval(() => {
        retryFailedMutations();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [pendingMutations, isOnline, retryFailedMutations]);

  return (
    <PlannerContext.Provider
      value={{
        profile,
        user,
        isOnline,
        isLoaded,
        isAuthChecked,
        syncStatus,
        syncInProgress,
        lastSyncTime,
        updateProfile,
        manualSync,
        pendingMutationsCount,
        failedMutationsCount,
        syncError,
        retryFailedMutations,
        getPendingMutations,
        clearFailedMutations,
        undo,
        redo,
        canUndo: undoRedoState.past.length > 0,
        canRedo: undoRedoState.future.length > 0,
        todayDateKey,
        selectedDateKey,
        setSelectedDateKey,
        dayLogs,
        completions,
        templates,
        toggleBlock,
        toggleLowEnergy,
        toggleMatchDay,
        resetToday,
        streak,
        weekDayCounts,
        tasks,
        addTask,
        toggleTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        addTaskTag,
        removeTaskTag,
        reviewItems,
        addReviewItem,
        recordReviewResult,
        dueReviewItemsCount,
        sleepLogs,
        saveSleepLog,
        focusSessions,
        logFocusSession,
        dsaTopics: dsaTopicsWithComputedDue,
        updateDsaTopic,
        recordDsaPractice,
        aptitudeLogs,
        addAptitudeLog,
        sportLogs,
        addSportLog,
        checklistItems,
        toggleChecklistItem,
        addChecklistItem,
        updateChecklistItem,
        startups,
        saveStartup,
        saveTemplate,
        deleteTemplate,
        clearTemplates,
        setAllTemplates,
        resetTemplatesToDefault,
        isScheduleModalOpen,
        openScheduleModal,
        closeScheduleModal,
        weeklyReviews,
        saveWeeklyReview,
        aiMessages,
        saveAiMessage,
        clearAiMessages,
        analyticsData,
        toasts,
        showToast,
        removeToast,
        signInWithGoogle,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}
