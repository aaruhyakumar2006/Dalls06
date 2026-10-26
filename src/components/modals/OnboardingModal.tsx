'use client';

import React, { useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage/store';
import {
  Sparkles,
  Clock,
  Bell,
  Smartphone,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Share2,
} from 'lucide-react';
import { ShuttleIcon } from '../ui/Icons';
import { subscribeUserToPush } from '@/lib/notifications/push';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { profile, showToast } = usePlanner();

  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState(profile.display_name || 'Student');
  const [timezone, setTimezone] = useState(profile.timezone || 'Asia/Kolkata');
  const [wakeTarget, setWakeTarget] = useState(profile.wake_target || '05:45');
  const [sleepTarget, setSleepTarget] = useState(profile.sleep_target || '22:45');
  const [notifState, setNotifState] = useState<'idle' | 'enabling' | 'granted' | 'denied'>('idle');

  // Auto-detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      // keep fallback
    }
  }, []);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('planner-onboarding-done', 'true');
    showToast('Setup complete! Your game plan is live.', 'streak');
    onClose();
  };

  const handleEnablePush = async () => {
    setNotifState('enabling');
    try {
      const res = await subscribeUserToPush();
      if (res.success) {
        setNotifState('granted');
        showToast('Push notifications enabled!', 'success');
      } else {
        setNotifState('denied');
        showToast(res.error || 'Permission not granted', 'info');
      }
    } catch (e: any) {
      setNotifState('denied');
      showToast(e.message || 'Notification error', 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome Onboarding"
        className="w-full sm:max-w-lg bg-white rounded-t-card-xl sm:rounded-card-xl shadow-card-hover text-text-charcoal overflow-hidden animate-in fade-in zoom-in-95 my-8 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Onboarding Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-background/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-card-soft">
              <ShuttleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold tracking-tight text-text-charcoal">
                Welcome to Match Point
              </h2>
              <span className="text-xs text-text-muted font-medium">60-second game plan setup</span>
            </div>
          </div>
          <button
            onClick={handleFinish}
            aria-label="Skip onboarding"
            className="text-xs font-semibold text-text-muted hover:text-text-charcoal px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-court' : 'bg-rail'
              }`}
            />
          ))}
        </div>

        {/* Content per step */}
        <div className="p-6">
          {/* STEP 1: Name & Timezone */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-court block mb-1">
                  Step 1 of 5
                </span>
                <h3 className="text-lg font-bold font-display">Who is playing?</h3>
                <p className="text-xs text-mute mt-1">
                  We customize focus reminders and sleep hygiene specifically for your schedule.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-mute mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aaruhya"
                  className="w-full px-3.5 py-2.5 bg-bg border-2 border-ink rounded-xl text-sm font-medium focus:outline-none shadow-[0_2px_0_#141B3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-mute mb-1">Your Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg border-2 border-ink rounded-xl text-sm font-mono font-medium focus:outline-none shadow-[0_2px_0_#141B3D]"
                />
                <span className="text-[11px] text-mute mt-1 block">
                  All timetable reminders and wake-up notifications compute in this timezone.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Sleep & Wake Targets */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-court block mb-1">
                  Step 2 of 5
                </span>
                <h3 className="text-lg font-bold font-display">Target Sleep Hygiene</h3>
                <p className="text-xs text-mute mt-1">
                  Short sleep (&lt; 7h) destroys focus blocks. Consistency starts the night before.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D]">
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">Wake-up Target</label>
                  <input
                    type="time"
                    value={wakeTarget}
                    onChange={(e) => setWakeTarget(e.target.value)}
                    className="w-full text-base font-mono font-bold bg-card border-2 border-ink rounded-lg p-2 text-center"
                  />
                  <span className="text-[10px] text-mute mt-1 block text-center">
                    Alarm across room at 05:45
                  </span>
                </div>

                <div className="p-3 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D]">
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">Sleep Target</label>
                  <input
                    type="time"
                    value={sleepTarget}
                    onChange={(e) => setSleepTarget(e.target.value)}
                    className="w-full text-base font-mono font-bold bg-card border-2 border-ink rounded-lg p-2 text-center"
                  />
                  <span className="text-[10px] text-mute mt-1 block text-center">
                    22:15 wind-down, 22:45 lights out
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Schedule Templates */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-court block mb-1">
                  Step 3 of 5
                </span>
                <h3 className="text-lg font-bold font-display">Schedule Blueprint</h3>
                <p className="text-xs text-mute mt-1">
                  Pre-configured for CSE placement prep, badminton coaching, and startups.
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto p-1 text-xs">
                <div className="p-2.5 rounded-xl border-2 border-court bg-court/10 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-court">06:00</span>
                    <strong className="ml-2 text-ink">Language practice (Python)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-court text-white text-[10px] font-bold">
                    CORE
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border-2 border-court bg-court/10 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-court">19:30</span>
                    <strong className="ml-2 text-ink">Aptitude (timed reps)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-court text-white text-[10px] font-bold">
                    CORE
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border-2 border-smash bg-smash/10 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-smash">20:30</span>
                    <strong className="ml-2 text-ink">Deep block (DSA from blank)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-smash text-white text-[10px] font-bold">
                    HEAVY
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Push Notification Accountability */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-court block mb-1">
                  Step 4 of 5
                </span>
                <h3 className="text-lg font-bold font-display">Stay Hard to Ignore</h3>
                <p className="text-xs text-mute mt-1">
                  Timely reminders 10 min before tasks, 19:15 spaced reviews, and 22:15 wind-down protect your streak.
                </p>
              </div>

              <div className="p-4 rounded-xl border-2 border-ink bg-bg text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-court/20 border-2 border-court flex items-center justify-center mx-auto text-court">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Enable Web Push Notifications</h4>
                  <p className="text-xs text-mute mt-0.5">
                    No spam. Only high-leverage reminders for your planned focus blocks.
                  </p>
                </div>

                <button
                  onClick={handleEnablePush}
                  disabled={notifState === 'enabling' || notifState === 'granted'}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border-2 border-ink transition-all ${
                    notifState === 'granted'
                      ? 'bg-mint text-ink'
                      : 'bg-shuttle text-ink hover:bg-shuttle/90 shadow-[0_3px_0_#141B3D]'
                  }`}
                >
                  {notifState === 'granted'
                    ? '✓ Notifications Enabled'
                    : notifState === 'enabling'
                    ? 'Requesting...'
                    : 'Enable Push Notifications'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Guided Install on Phone */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-court block mb-1">
                  Step 5 of 5
                </span>
                <h3 className="text-lg font-bold font-display">Install as a Phone App</h3>
                <p className="text-xs text-mute mt-1">
                  Add to your home screen for full standalone experience, instant open, and offline caching.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-bg rounded-xl border-2 border-ink">
                  <strong className="block text-ink font-bold mb-1">On iPhone (Safari):</strong>
                  <ol className="list-decimal list-inside space-y-1 text-mute">
                    <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Open from your Home Screen for full push notification support (iOS 16.4+).</li>
                  </ol>
                </div>

                <div className="p-3 bg-bg rounded-xl border-2 border-ink">
                  <strong className="block text-ink font-bold mb-1">On Android (Chrome):</strong>
                  <ol className="list-decimal list-inside space-y-1 text-mute">
                    <li>Tap the <strong>three dots menu (⋮)</strong> top-right.</li>
                    <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="p-4 border-t-2 border-rail bg-bg/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-2 text-xs font-bold text-mute hover:text-ink flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-court text-white rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-ink shadow-[0_3px_0_#141B3D] flex items-center gap-1.5 active:translate-y-[2px]"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-5 py-2.5 bg-mint text-ink rounded-xl text-xs font-bold uppercase tracking-wider border-2 border-ink shadow-[0_3px_0_#141B3D] flex items-center gap-1.5 active:translate-y-[2px]"
            >
              Start Game Plan <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
