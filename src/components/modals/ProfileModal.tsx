'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ShuttleIcon, RacketIcon } from '../ui/Icons';
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Clock,
  Moon,
  Sun,
  Flame,
  CheckCircle,
  AlertCircle,
  Calendar,
  Save,
  LogOut,
  RefreshCw,
  Edit2,
  Globe,
  Sliders,
  Check,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSchedule?: () => void;
}

export default function ProfileModal({ isOpen, onClose, onOpenSchedule }: ProfileModalProps) {
  const {
    profile,
    updateProfile,
    user,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    streak,
    weekDayCounts,
    sportLogs,
    reviewItems,
    syncStatus,
    showToast,
  } = usePlanner();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.display_name || 'CSE Student');
  const [timezone, setTimezone] = useState(profile.timezone || 'Asia/Kolkata');
  const [wakeTarget, setWakeTarget] = useState(profile.wake_target || '05:45');
  const [sleepTarget, setSleepTarget] = useState(profile.sleep_target || '22:45');
  const [quietStart, setQuietStart] = useState(profile.quiet_hours_start || '23:00');
  const [quietEnd, setQuietEnd] = useState(profile.quiet_hours_end || '05:30');

  // Auth form state
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const configured = isSupabaseConfigured();

  // Sync state with profile
  useEffect(() => {
    if (profile) {
      setName(profile.display_name || 'CSE Student');
      setTimezone(profile.timezone || 'Asia/Kolkata');
      setWakeTarget(profile.wake_target || '05:45');
      setSleepTarget(profile.sleep_target || '22:45');
      setQuietStart(profile.quiet_hours_start || '23:00');
      setQuietEnd(profile.quiet_hours_end || '05:30');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const countingDays = weekDayCounts.filter((w) => w.counts).length;

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateProfile({
      display_name: name.trim() || 'CSE Student',
      timezone,
      wake_target: wakeTarget,
      sleep_target: sleepTarget,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
    });
    setIsEditing(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setAuthLoading(true);
    setAuthMsg(null);
    const res = await signInWithEmail(email);
    setAuthLoading(false);
    if (res?.error) {
      setAuthMsg({ text: res.error, type: 'error' });
    } else {
      setAuthMsg({ text: 'Check your email for the magic sign-in link!', type: 'success' });
      setEmail('');
    }
  };

  const autoDetectTimezone = () => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setTimezone(tz);
        showToast(`Detected timezone: ${tz}`, 'info');
      }
    } catch {
      showToast('Could not auto-detect timezone', 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Student Profile and Details"
        className="w-full sm:max-w-lg bg-card text-ink rounded-t-card sm:rounded-card border-2 border-ink shadow-sticker overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* 1. HEADER                                                      */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-rail bg-bg/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-court text-white flex items-center justify-center border-2 border-ink shadow-[0_2px_0_#141B3D]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                Student Profile
              </h2>
              <p className="text-[11px] text-mute font-medium">
                Personal details, consistency stats &amp; cloud sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="p-1.5 rounded-lg border-2 border-ink bg-bg text-mute hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* 2. BODY CONTENT (SCROLLABLE)                                   */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Identity Card */}
          <div className="p-4 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-court/10 border-2 border-court text-court font-display font-bold text-xl flex items-center justify-center shrink-0 shadow-sticker-sm">
                {name.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-base text-ink truncate leading-tight">
                  {name}
                </h3>
                <span className="text-xs text-mute font-medium block mt-0.5 truncate">
                  {user?.email || 'CSE Student • Placement & Badminton Prep'}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    syncStatus === 'synced'
                      ? 'bg-mint text-ink'
                      : 'bg-card border border-ink/30 text-mute'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    {syncStatus === 'synced' ? 'Cloud Synced' : 'Local Storage Mode'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-lg border-2 border-ink bg-card hover:bg-rail text-ink font-bold text-xs flex items-center gap-1 shadow-sticker-sm active:translate-y-[1px]"
            >
              <Edit2 className="w-3 h-3 text-court" />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 bg-bg rounded-xl border border-ink shadow-sticker-sm">
              <span className="text-[10px] uppercase font-bold text-mute block">Streak</span>
              <span className="font-display font-bold text-base text-court flex items-center justify-center gap-1 mt-0.5">
                <Flame className="w-4 h-4 text-smash fill-smash" />
                {streak}d
              </span>
            </div>
            <div className="p-2.5 bg-bg rounded-xl border border-ink shadow-sticker-sm">
              <span className="text-[10px] uppercase font-bold text-mute block">Week Reps</span>
              <span className="font-display font-bold text-base text-ink mt-0.5 block">
                {countingDays}/7
              </span>
            </div>
            <div className="p-2.5 bg-bg rounded-xl border border-ink shadow-sticker-sm">
              <span className="text-[10px] uppercase font-bold text-mute block">Spaced Due</span>
              <span className="font-display font-bold text-base text-court mt-0.5 block">
                {reviewItems.length}
              </span>
            </div>
            <div className="p-2.5 bg-bg rounded-xl border border-ink shadow-sticker-sm">
              <span className="text-[10px] uppercase font-bold text-mute block">Sport</span>
              <span className="font-display font-bold text-base text-mint mt-0.5 block">
                {sportLogs.length}
              </span>
            </div>
          </div>

          {/* Details & Target Settings */}
          <div className="p-4 bg-card rounded-xl border-2 border-ink space-y-3 shadow-sticker">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-court flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Personal Routine Targets
              </h4>
              {isEditing && (
                <span className="text-[10px] font-bold uppercase text-mint bg-mint/20 px-2 py-0.5 rounded-full">
                  Editing Mode
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                  Display Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-bold text-xs focus:outline-none"
                  />
                ) : (
                  <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-bold text-ink">
                    {name}
                  </div>
                )}
              </div>

              {/* Timezone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase text-mute">
                    Timezone
                  </label>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={autoDetectTimezone}
                      className="text-[10px] text-court hover:underline font-bold flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> Auto-detect
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-mono text-xs focus:outline-none"
                  />
                ) : (
                  <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-mono text-xs text-ink flex items-center justify-between">
                    <span>{timezone}</span>
                    <span className="text-[10px] text-mute font-sans font-medium">Timetable zone</span>
                  </div>
                )}
              </div>

              {/* Targets: Wake & Sleep */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                    Wake-up Target
                  </label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={wakeTarget}
                      onChange={(e) => setWakeTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-mono font-bold text-xs"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-mono font-bold text-ink flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-shuttle" />
                      {wakeTarget}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                    Sleep Target
                  </label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={sleepTarget}
                      onChange={(e) => setSleepTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-mono font-bold text-xs"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-mono font-bold text-ink flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-court" />
                      {sleepTarget}
                    </div>
                  )}
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                    Quiet Hours Start
                  </label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-mono text-xs"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-mono text-xs text-ink">
                      {quietStart}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                    Quiet Hours End
                  </label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-bg border-2 border-ink rounded-lg font-mono text-xs"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-bg border border-ink/40 rounded-lg font-mono text-xs text-ink">
                      {quietEnd}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button when Editing */}
            {isEditing && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-1.5 hover:opacity-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Profile Changes
                </button>
              </div>
            )}
          </div>

          {/* Account & Sync Section */}
          <div className="p-4 bg-bg rounded-xl border-2 border-ink space-y-3 text-xs">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-court" /> Account &amp; Sync Authentication
            </h4>

            {user ? (
              <div className="p-3 bg-card rounded-xl border border-rail space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">Logged in as:</span>
                  <span className="font-mono font-bold text-court">{user.email || user.id}</span>
                </div>
                <button
                  onClick={signOut}
                  className="w-full py-2 bg-bg hover:bg-smash/20 border-2 border-ink rounded-lg font-bold text-xs uppercase tracking-wider text-ink flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!configured ? (
                  <div className="p-3 bg-shuttle/20 border border-ink rounded-xl space-y-1">
                    <strong className="block text-ink font-bold">Offline-First Mode Active</strong>
                    <p className="text-mute text-[11px] leading-relaxed">
                      All your timetable templates, ticks, and tasks are securely stored in your local browser storage.
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={signInWithGoogle}
                      className="w-full py-2.5 px-4 bg-card hover:bg-rail border-2 border-ink rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_2px_0_#141B3D]"
                    >
                      Continue with Google
                    </button>

                    <form onSubmit={handleEmailSubmit} className="space-y-2 pt-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email for magic sign-in link"
                        className="w-full px-3 py-2 bg-card border-2 border-ink rounded-xl text-xs focus:outline-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={authLoading || !email}
                        className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] disabled:opacity-40"
                      >
                        {authLoading ? 'Sending...' : 'Send Magic Link'}
                      </button>
                    </form>

                    {authMsg && (
                      <div className={`p-2.5 rounded-lg border text-xs font-semibold ${
                        authMsg.type === 'success' ? 'bg-mint text-ink' : 'bg-smash text-white'
                      }`}>
                        {authMsg.text}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FOOTER ACTIONS                                              */}
        {/* ============================================================== */}
        <div className="p-4 border-t-2 border-rail bg-bg/50 flex items-center justify-between gap-2 shrink-0">
          {onOpenSchedule && (
            <button
              onClick={() => {
                onClose();
                onOpenSchedule();
              }}
              className="px-3 py-1.5 bg-card border-2 border-ink rounded-lg font-bold text-xs text-ink flex items-center gap-1.5 shadow-[0_2px_0_#141B3D] hover:bg-rail"
            >
              <Calendar className="w-3.5 h-3.5 text-court" />
              <span>Weekly Schedule</span>
            </button>
          )}

          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-sticker hover:opacity-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
