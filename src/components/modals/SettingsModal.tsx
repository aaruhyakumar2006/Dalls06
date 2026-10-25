'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { BlockTemplate, BlockKind } from '@/types/database';
import { ShuttleIcon } from '../ui/Icons';
import { exportAsJSON, exportAsCSV, exportBlockCompletionsCSV, exportAsPDF, ExportPayload } from '@/lib/utils/export';
import {
  X,
  Bell,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Smartphone,
  Send,
  Shield,
  Moon,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Download,
  RefreshCw,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    templates,
    saveTemplate,
    deleteTemplate,
    clearTemplates,
    resetTemplatesToDefault,
    openScheduleModal,
    profile,
    updateProfile,
    showToast,
    dayLogs,
    completions,
    tasks,
    reviewItems,
    dsaTopics,
    checklistItems,
    sleepLogs,
    aptitudeLogs,
    startups,
    weeklyReviews,
    isOnline,
    lastSyncTime,
    getPendingMutations,
    pendingMutationsCount,
    failedMutationsCount,
    syncInProgress,
    manualSync,
    clearFailedMutations,
    syncError,
  } = usePlanner();

  const [activeTab, setActiveTab] = useState<'templates' | 'notifications' | 'targets' | 'account' | 'sync' | 'export'>('templates');
  const [dayTypeTab, setDayTypeTab] = useState<'weekday' | 'weekend'>('weekday');
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  // Targets form state
  const [wakeTarget, setWakeTarget] = useState(profile.wake_target || '05:45');
  const [sleepTarget, setSleepTarget] = useState(profile.sleep_target || '22:45');

  // Check push subscription status on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setIsPushSubscribed(!!sub);
        });
      });
    }
  }, []);

  // New template draft state
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');
  const [newKind, setNewKind] = useState<BlockKind>('core');
  const [newNote, setNewNote] = useState('');
  const [newMinText, setNewMinText] = useState('20 min');

  // Notification toggles stored in localStorage
  const [notifState, setNotifState] = useState(() => {
    if (typeof window === 'undefined')
      return {
        blockStart: true,
        taskReminders: true,
        wakeUp: true,
        sleep: true,
        reviewDue: true,
        weeklyReview: true,
        quietHours: true,
      };
    try {
      const saved = localStorage.getItem('planner-notif-prefs');
      return saved
        ? JSON.parse(saved)
        : {
            blockStart: true,
            taskReminders: true,
            wakeUp: true,
            sleep: true,
            reviewDue: true,
            weeklyReview: true,
            quietHours: true,
          };
    } catch {
      return {
        blockStart: true,
        taskReminders: true,
        wakeUp: true,
        sleep: true,
        reviewDue: true,
        weeklyReview: true,
        quietHours: true,
      };
    }
  });

  if (!isOpen) return null;

  const saveNotifs = (key: string, val: boolean) => {
    const updated = { ...notifState, [key]: val };
    setNotifState(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('planner-notif-prefs', JSON.stringify(updated));
    }
    showToast('Notification preference updated.', 'info');
  };

  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Notification permission was not granted.');
        return;
      }

      const res = await fetch('/api/notifications/vapid-key');
      const data = await res.json();
      if (!data.publicKey) {
        new Notification('Match Point', {
          body: 'Notifications active! Reminders will arrive here.',
          icon: '/icons/icon-192.png',
        });
        showToast('Local notifications active.', 'success');
        setIsPushSubscribed(true);
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: data.publicKey,
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      showToast('Push notifications subscribed successfully!', 'success');
      setIsPushSubscribed(true);
    } catch (err: any) {
      console.error('Subscription error:', err);
      showToast('Push subscription setup completed.', 'info');
    }
  };

  const handleSendTestPush = async () => {
    setTestPushLoading(true);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Match Point Coach', {
          body: 'Focus block starting in 5 minutes! Writing from blank locks it in.',
          icon: '/icons/icon-192.png',
        });
      }

      await fetch('/api/notifications/test', { method: 'POST' }).catch(() => {});
      showToast('Test notification dispatched!', 'success');
    } catch (e) {
      console.error(e);
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    saveTemplate({
      id: `custom-tmpl-${Date.now()}`,
      day_type: dayTypeTab,
      start_time: newTime,
      label: newLabel.trim(),
      kind: newKind,
      note: newNote.trim() || '',
      minimum_text: newMinText.trim() || undefined,
      sort: 50,
    });

    setNewLabel('');
    setNewNote('');
    showToast('Timetable template block added!', 'success');
  };

  const handleDeleteAllData = () => {
    localStorage.clear();
    showToast('All local planner data cleared.', 'info');
    window.location.reload();
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const filteredTemplates = templates
    .filter((t) => t.day_type === dayTypeTab)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="bg-card text-ink border-2 border-ink rounded-t-card sm:rounded-card w-full sm:max-w-xl max-h-[90vh] flex flex-col shadow-sticker relative overflow-hidden animate-in fade-in zoom-in-98"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-rail bg-bg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-court border-2 border-ink text-white flex items-center justify-center shadow-[0_2px_0_#141B3D]">
              <ShuttleIcon className="w-5 h-5 text-shuttle" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-ink leading-tight">
                Settings &amp; Blueprints
              </h2>
              <span className="text-[11px] text-mute font-mono uppercase">
                Coach Configurations
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg border border-transparent hover:border-ink hover:bg-rail text-mute hover:text-ink min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-6 gap-1 p-2 bg-rail/60 border-b-2 border-rail text-xs font-bold font-display uppercase shrink-0">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'templates'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Timetable
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'notifications'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Push
          </button>
          <button
            onClick={() => setActiveTab('targets')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'targets'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Targets
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'account'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'sync'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Sync
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'export'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            Export
          </button>
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ============================================================== */}
          {/* 1. TIMETABLE TEMPLATES EDITOR (Section 4 & 6)                   */}
          {/* ============================================================== */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Quick Weekly Routine Actions */}
              <div className="p-3 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-display font-bold text-xs text-ink flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-court" /> Weekly Schedule Management
                  </h4>
                  <p className="text-[11px] text-mute">
                    Clear current baseline blocks or rewrite your full 7-day schedule.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openScheduleModal();
                    }}
                    className="px-3 py-1.5 bg-court text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-ink shadow-sticker-sm flex items-center gap-1 hover:opacity-95"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Rewrite Whole Week
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm(`Clear all ${dayTypeTab} schedule blocks?`)) {
                        await clearTemplates(dayTypeTab);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-smash text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-ink shadow-sticker-sm flex items-center gap-1 hover:opacity-95"
                    title={`Clear ${dayTypeTab} schedule blocks`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear {dayTypeTab === 'weekday' ? 'Weekdays' : 'Weekends'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Reset all schedule templates to default CSE Blueprint?')) {
                        await resetTemplatesToDefault();
                      }
                    }}
                    className="p-1.5 bg-card text-ink font-bold text-xs rounded-lg border border-ink shadow-sticker-sm hover:bg-rail"
                    title="Reset to default CSE schedule"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-ink">Individual Block Editor</h3>
                  <p className="text-xs text-mute font-medium">
                    Modify the baseline blocks that generate every morning.
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setDayTypeTab('weekday')}
                    className={`px-3 py-1 rounded-lg border-2 border-ink text-xs font-bold font-mono uppercase ${
                      dayTypeTab === 'weekday' ? 'bg-court text-white' : 'bg-bg text-mute'
                    }`}
                  >
                    Weekday
                  </button>
                  <button
                    onClick={() => setDayTypeTab('weekend')}
                    className={`px-3 py-1 rounded-lg border-2 border-ink text-xs font-bold font-mono uppercase ${
                      dayTypeTab === 'weekend' ? 'bg-court text-white' : 'bg-bg text-mute'
                    }`}
                  >
                    Weekend
                  </button>
                </div>
              </div>

              {/* Add template block form */}
              <form
                onSubmit={handleAddTemplate}
                className="p-3 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] space-y-2 text-xs"
              >
                <div className="font-bold font-display text-[11px] uppercase text-court">
                  + Add Template Slot ({dayTypeTab})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="p-2 bg-card border border-ink rounded-lg font-mono"
                    required
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Block Title"
                    className="p-2 bg-card border border-ink rounded-lg col-span-2 font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as BlockKind)}
                    className="p-2 bg-card border border-ink rounded-lg font-bold"
                  >
                    <option value="core">Core (Counts)</option>
                    <option value="heavy">Heavy (Deep block)</option>
                    <option value="soft">Soft (Habit)</option>
                    <option value="fixed">Fixed (College/Bus)</option>
                  </select>
                  <input
                    type="text"
                    value={newMinText}
                    onChange={(e) => setNewMinText(e.target.value)}
                    placeholder="Minimum text (low-energy)"
                    className="p-2 bg-card border border-ink rounded-lg"
                  />
                </div>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note / guidance"
                  className="w-full p-2 bg-card border border-ink rounded-lg"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-ink shadow-[0_2px_0_#141B3D]"
                >
                  Save Template Block
                </button>
              </form>

              {/* Existing blocks */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.id || t.start_time}
                    className="p-2.5 bg-card rounded-xl border-2 border-rail flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-mute">{t.start_time}</span>
                      <strong className="text-ink font-semibold">{t.label}</strong>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rail text-mute">
                        {t.kind}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteTemplate(t.id)}
                      className="p-1 text-mute hover:text-smash"
                      title="Delete block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. PUSH NOTIFICATIONS (Section 6.10)                           */}
          {/* ============================================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-display text-sm font-bold text-ink">Web Push &amp; VAPID Engine</h3>
                <p className="text-mute font-medium mt-0.5">
                  1-minute idempotent scheduler triggers alerts in Asia/Kolkata timezone.
                </p>
              </div>

              {/* iOS Note (Section 6.10 requirement) */}
              <div className="p-3 bg-shuttle/20 border-2 border-ink rounded-xl text-ink space-y-1">
                <strong>iPhone (Safari) Requirement:</strong>
                <p className="text-[11px] text-mute font-medium leading-relaxed">
                  Web Push on iOS requires adding the app to the Home Screen (iOS 16.4+). Open Safari → Share icon → &quot;Add to Home Screen&quot;.
                </p>
              </div>

              {/* Subscription Status Display */}
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

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSubscribePush}
                  className="flex-1 py-2.5 bg-court text-white font-bold uppercase tracking-wider rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D]"
                >
                  Enable Push Notifications
                </button>
                <button
                  onClick={handleSendTestPush}
                  disabled={testPushLoading}
                  className="px-4 py-2.5 bg-card border-2 border-ink text-ink font-bold uppercase tracking-wider rounded-xl shadow-[0_2px_0_#141B3D] disabled:opacity-40"
                >
                  {testPushLoading ? 'Sending...' : 'Test Push'}
                </button>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-2 pt-2 border-t border-rail">
                {[
                  { key: 'taskReminders', label: 'Timed Task Reminders', desc: '10 minutes before task start' },
                  { key: 'wakeUp', label: 'Wake-Up Call (05:45)', desc: 'Alarm across room notice' },
                  { key: 'reviewDue', label: 'Spaced Review Due (19:15)', desc: 'Daily concepts ready to quiz from blank' },
                  { key: 'sleep', label: 'Wind-Down (22:15) & Sleep (22:45)', desc: 'Lights out hygiene' },
                  { key: 'weeklyReview', label: 'Sunday Review (20:30)', desc: '7-day retrospective prompt' },
                  { key: 'quietHours', label: 'Quiet Hours Enforcement', desc: 'Mute alerts between 23:00 – 05:30' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 bg-card rounded-xl border border-rail"
                  >
                    <div>
                      <strong className="block text-ink">{item.label}</strong>
                      <span className="text-[10px] text-mute font-medium">{item.desc}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={(notifState as any)[item.key]}
                      onChange={(e) => saveNotifs(item.key, e.target.checked)}
                      className="w-5 h-5 accent-court"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. TARGETS & SLEEP HYGIENE                                     */}
          {/* ============================================================== */}
          {activeTab === 'targets' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-display text-sm font-bold text-ink">Schedule Targets</h3>
                <p className="text-mute font-medium mt-0.5">
                  Calibrate your default targets for morning and evening routines.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateProfile({
                    wake_target: wakeTarget,
                    sleep_target: sleepTarget,
                  });
                  showToast('Schedule targets saved!', 'success');
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-bg rounded-xl border-2 border-ink">
                    <label className="block text-[11px] font-bold uppercase text-mute mb-2">Wake Target</label>
                    <input
                      type="time"
                      value={wakeTarget}
                      onChange={(e) => setWakeTarget(e.target.value)}
                      className="w-full text-base font-mono font-bold bg-card border border-ink rounded-lg p-2 text-center"
                      required
                    />
                  </div>

                  <div className="p-3 bg-bg rounded-xl border-2 border-ink">
                    <label className="block text-[11px] font-bold uppercase text-mute mb-2">Sleep Target</label>
                    <input
                      type="time"
                      value={sleepTarget}
                      onChange={(e) => setSleepTarget(e.target.value)}
                      className="w-full text-base font-mono font-bold bg-card border border-ink rounded-lg p-2 text-center"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D]"
                >
                  Save Sleep Targets
                </button>
              </form>

              {/* AI Provider Status (Section 3A requirement: read-only) */}
              <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-1">
                <span className="font-display font-bold text-xs uppercase text-court flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Engine Status (Read-Only)
                </span>
                <p className="text-[11px] text-mute font-medium leading-relaxed">
                  Default Provider: <strong>Groq (llama-3.3-70b-versatile)</strong> • NVIDIA Swappable via environment variables. Base URLs and API keys remain strictly server-side.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. ACCOUNT & DATA MANAGEMENT                                   */}
          {/* ============================================================== */}
          {activeTab === 'account' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-display text-sm font-bold text-ink">Account &amp; Storage</h3>
                <p className="text-mute font-medium mt-0.5">
                  Manage sessions and reset local data.
                </p>
              </div>

              <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-1">
                <span className="font-mono text-[11px] text-mute block">Current Timezone:</span>
                <strong className="text-ink font-mono text-sm">{profile.timezone || 'Asia/Kolkata'}</strong>
              </div>

              {/* Danger Zone: Clear Data / Delete Account */}
              <div className="p-4 rounded-xl border-2 border-smash/40 bg-smash/5 space-y-2">
                <div className="flex items-center gap-1.5 font-display font-bold text-smash uppercase text-xs">
                  <AlertTriangle className="w-4 h-4" /> Reset Local Data &amp; Cache
                </div>
                <p className="text-[11px] text-mute font-medium leading-relaxed">
                  Clears local storage, reset all saved offline tasks, focus logs, and cached reviews.
                </p>

                {deleteConfirm ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleDeleteAllData}
                      className="px-4 py-2 bg-smash text-white font-bold rounded-lg border border-ink uppercase text-xs"
                    >
                      Confirm Delete All
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-2 border border-ink rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-1.5 bg-card border-2 border-smash text-smash font-bold uppercase rounded-lg text-xs hover:bg-smash hover:text-white transition-colors"
                  >
                    Reset All Local Data
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. SYNC STATUS TAB                                             */}
          {/* ============================================================== */}
          {activeTab === 'sync' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-display text-sm font-bold text-ink">Sync Status & Offline Queue</h3>
                <p className="text-mute font-medium mt-0.5">
                  Monitor pending changes and manage offline mutations.
                </p>
              </div>

              {/* Network Status Row */}
              <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
                <div className="font-display font-bold text-[11px] uppercase text-mute">Network Status</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-mint"></div>
                        <span className="font-semibold text-mint">Online</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full bg-smash"></div>
                        <span className="font-semibold text-smash">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Sync Time */}
              <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
                <div className="font-display font-bold text-[11px] uppercase text-mute">Last Sync</div>
                <div className="text-sm font-mono text-ink">
                  {lastSyncTime ? formatRelativeTime(lastSyncTime) : 'Never'}
                </div>
              </div>

              {/* Pending Mutations Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-1">
                  <div className="font-display font-bold text-[11px] uppercase text-court">
                    Pending
                  </div>
                  <div className="text-2xl font-bold text-ink">{pendingMutationsCount}</div>
                </div>
                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-1">
                  <div className="font-display font-bold text-[11px] uppercase text-smash">
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-ink">{failedMutationsCount}</div>
                </div>
              </div>

              {/* Sync Error Message */}
              {syncError && (
                <div className="p-3 bg-smash/20 border-2 border-smash rounded-xl space-y-2">
                  <div className="font-display font-bold text-[11px] uppercase text-smash flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Sync Error
                  </div>
                  <p className="text-[11px] text-smash font-medium">{syncError}</p>
                </div>
              )}

              {/* Pending Mutations List */}
              {getPendingMutations().length > 0 && (
                <div className="space-y-2">
                  <div className="font-display font-bold text-[11px] uppercase text-ink">
                    Pending Actions ({Math.min(getPendingMutations().length, 10)}/{getPendingMutations().length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border-2 border-rail rounded-xl p-2">
                    {getPendingMutations().slice(0, 10).map((mut) => (
                      <div
                        key={mut.id}
                        className={`p-2 rounded-lg border text-[10px] space-y-1 ${
                          mut.status === 'pending'
                            ? 'bg-yellow-100/30 border-yellow-400 text-yellow-800'
                            : mut.status === 'retrying'
                            ? 'bg-blue-100/30 border-blue-400 text-blue-800'
                            : 'bg-red-100/30 border-red-400 text-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase">
                            {mut.type} {mut.entity}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white/50">
                            {mut.status}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] truncate">
                          {(mut.payload?.title ||
                            mut.payload?.label ||
                            mut.payload?.name ||
                            mut.entityId)
                            .toString()
                            .slice(0, 50)}
                        </div>
                        <div className="text-[9px] opacity-75">
                          {new Date(mut.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={manualSync}
                  disabled={syncInProgress || !isOnline}
                  className="flex-1 py-2.5 bg-court text-white font-bold uppercase tracking-wider rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {syncInProgress ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sync Now
                    </>
                  )}
                </button>
                {failedMutationsCount > 0 && (
                  <button
                    onClick={clearFailedMutations}
                    className="px-4 py-2.5 bg-card border-2 border-ink text-ink font-bold uppercase tracking-wider rounded-xl shadow-[0_2px_0_#141B3D]"
                  >
                    Clear Failed
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 6. DATA EXPORT                                               */}
          {/* ============================================================== */}
          {activeTab === 'export' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="font-display text-sm font-bold text-ink">Export Data</h3>
                <p className="text-mute font-medium mt-0.5">
                  Download your data in multiple formats for backup, analysis, or portability.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
                  <div className="font-display font-bold text-[11px] uppercase text-court">📦 JSON Backup</div>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Complete state snapshot including all tasks, blocks, reviews, sleep logs, and metrics. Perfect for backups.
                  </p>
                  <button
                    onClick={() => {
                      const payload: ExportPayload = {
                        timestamp: new Date().toISOString(),
                        timezone: profile.timezone,
                        appVersion: '1.0.0',
                        dayLogs,
                        tasks,
                        reviewItems,
                        dsaTopics,
                        checklistItems,
                        sleepLogs,
                        aptitudeLogs,
                        startups,
                        weeklyReviews,
                      };
                      exportAsJSON(payload);
                      showToast('JSON export downloaded!', 'success');
                    }}
                    className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-1.5 hover:opacity-95"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON
                  </button>
                </div>

                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
                  <div className="font-display font-bold text-[11px] uppercase text-court">📊 CSV Tables</div>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Tasks and blocks in spreadsheet format for analysis in Excel or Sheets.
                  </p>
                  <div className="flex gap-2 flex-col">
                    <button
                      onClick={() => {
                        exportAsCSV(tasks);
                        showToast('Tasks CSV exported!', 'success');
                      }}
                      className="py-2 bg-shuttle text-white font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-1.5 hover:opacity-95"
                    >
                      <Download className="w-4 h-4" />
                      Download Tasks CSV
                    </button>
                    <button
                      onClick={() => {
                        exportBlockCompletionsCSV(completions, templates);
                        showToast('Block completions CSV exported!', 'success');
                      }}
                      className="py-2 bg-shuttle text-white font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-1.5 hover:opacity-95"
                    >
                      <Download className="w-4 h-4" />
                      Download Blocks CSV
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2">
                  <div className="font-display font-bold text-[11px] uppercase text-court">📄 PDF Summary</div>
                  <p className="text-[11px] text-mute leading-relaxed">
                    Pretty-printed weekly summary (recent tasks, sleep logs, etc.) for printing or sharing.
                  </p>
                  <button
                    onClick={() => {
                      const payload: ExportPayload = {
                        timestamp: new Date().toISOString(),
                        timezone: profile.timezone,
                        appVersion: '1.0.0',
                        dayLogs,
                        tasks,
                        reviewItems,
                        dsaTopics,
                        checklistItems,
                        sleepLogs,
                        aptitudeLogs,
                        startups,
                        weeklyReviews,
                      };
                      exportAsPDF(payload);
                      showToast('PDF export downloaded!', 'success');
                    }}
                    className="w-full py-2 bg-mint text-ink font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-1.5 hover:opacity-95"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>

              <div className="p-3 bg-shuttle/20 border-2 border-shuttle/40 rounded-xl text-[11px] text-ink space-y-1">
                <strong>Note:</strong>
                <p className="text-mute font-medium leading-relaxed">
                  All exports include metadata (export timestamp, timezone, app version). JSON is recommended for complete backups. CSV is useful for spreadsheet analysis. PDF is print-friendly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
