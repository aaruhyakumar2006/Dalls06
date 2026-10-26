'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import { ShuttleIcon } from '../ui/Icons';
import { X, Play, Pause, RotateCcw, CheckCircle, ShieldAlert, Check } from 'lucide-react';

interface FocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBlockKey?: string | null;
  blockLabel?: string;
  blockKind?: string;
}

export default function FocusTimerModal({
  isOpen,
  onClose,
  initialBlockKey,
  blockLabel = 'Focus Block',
  blockKind = 'core',
}: FocusTimerModalProps) {
  const { logFocusSession, toggleBlock, selectedDateKey, showToast } = usePlanner();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [phoneWarningAcknowledged, setPhoneWarningAcknowledged] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timer with timestamp to survive background tab sleep
  useEffect(() => {
    if (isRunning && startTime) {
      const targetDurationMs = selectedMinutes * 60 * 1000;
      timerRef.current = setInterval(() => {
        const elapsedMs = Date.now() - startTime;
        const remainingMs = targetDurationMs - elapsedMs;

        if (remainingMs <= 0) {
          setRemainingSeconds(0);
          setIsRunning(false);
          setIsCompleted(true);
          if (timerRef.current) clearInterval(timerRef.current);

          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#2E5BFF', '#FF3B7F', '#FFD21F', '#12D6A5'],
          });

          // Fire Web notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Focus Session Complete!', {
              body: `Great job on ${blockLabel}! Writing from blank is what locks it in.`,
              icon: '/icons/icon-192.png',
            });
          }
        } else {
          setRemainingSeconds(Math.ceil(remainingMs / 1000));
        }
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, startTime, selectedMinutes, blockLabel]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (!phoneWarningAcknowledged) return;
    setIsRunning(true);
    setStartTime(Date.now() - (selectedMinutes * 60 - remainingSeconds) * 1000);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setRemainingSeconds(selectedMinutes * 60);
    setIsCompleted(false);
  };

  const handleSelectPreset = (mins: number) => {
    setSelectedMinutes(mins);
    setRemainingSeconds(mins * 60);
    setIsRunning(false);
    setStartTime(null);
    setIsCompleted(false);
  };

  const handleFinishAndMarkDone = () => {
    logFocusSession({
      block_key: initialBlockKey,
      started_at: new Date(Date.now() - selectedMinutes * 60 * 1000).toISOString(),
      planned_min: selectedMinutes,
      actual_min: selectedMinutes,
      completed: true,
    });

    if (initialBlockKey) {
      toggleBlock(selectedDateKey, initialBlockKey, blockKind, blockLabel);
    }
    showToast(`Session logged: ${selectedMinutes}m focus`, 'streak');
    onClose();
  };

  const minsDisplay = Math.floor(remainingSeconds / 60);
  const secsDisplay = remainingSeconds % 60;
  const progressPercent = ((selectedMinutes * 60 - remainingSeconds) / (selectedMinutes * 60)) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-card text-ink border-2 border-ink rounded-t-card sm:rounded-card w-full sm:max-w-sm p-4 sm:p-6 shadow-sticker relative text-center max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close focus timer"
          className="absolute top-4 right-4 text-mute hover:text-ink p-1.5 rounded-lg border border-transparent hover:border-ink hover:bg-rail min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-court/10 border border-court text-[10px] font-mono font-bold uppercase text-court mb-1">
          <ShuttleIcon className="w-3.5 h-3.5 text-court" />
          <span>Match Point Focus</span>
        </div>
        <h2 className="text-lg font-bold font-display mb-3 text-ink">{blockLabel}</h2>

        {/* Pre-start Phone Checklist */}
        {!phoneWarningAcknowledged ? (
          <div className="my-5 p-4 rounded-xl bg-shuttle/20 border-2 border-ink shadow-[0_3px_0_#141B3D] text-left space-y-2">
            <div className="flex items-center gap-2 font-display font-bold text-xs uppercase text-ink">
              <ShieldAlert className="w-4 h-4 text-smash shrink-0" />
              <span>Anti-Distraction Check</span>
            </div>
            <p className="text-xs text-ink/90 font-medium leading-relaxed">
              Is your phone in another room or placed completely off the table? High-retention learning requires unbroken focus.
            </p>
            <button
              onClick={() => {
                setPhoneWarningAcknowledged(true);
                handleStart();
              }}
              className="w-full mt-2 py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
            >
              Yes, Phone is Away - Begin Rep
            </button>
          </div>
        ) : isCompleted ? (
          <div className="my-5 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-mint/20 border-2 border-ink text-ink flex items-center justify-center shadow-[0_2px_0_#141B3D]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">Session Complete!</h3>
              <p className="text-xs text-mute mt-1 font-medium">
                Completed {selectedMinutes} minutes of active recall practice.
              </p>
            </div>

            <button
              onClick={handleFinishAndMarkDone}
              className="w-full py-2.5 bg-mint text-ink font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_3px_0_#141B3D] active:translate-y-[1px]"
            >
              Mark Block Done &amp; Save ✓
            </button>
            <button
              onClick={onClose}
              className="w-full py-1.5 text-mute text-xs hover:text-ink font-semibold"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <>
            {/* Circular Progress & Digits */}
            <div className="relative w-44 h-44 mx-auto my-5 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-rail"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-court transition-all duration-300"
                  strokeWidth="7"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-extrabold tracking-tight text-ink">
                  {String(minsDisplay).padStart(2, '0')}:{String(secsDisplay).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono uppercase font-bold text-mute mt-1">
                  {isRunning ? 'FOCUSING' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex justify-center gap-1.5 mb-5">
              {[20, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSelectPreset(mins)}
                  disabled={isRunning}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border-2 transition-all ${
                    selectedMinutes === mins
                      ? 'bg-court text-white border-ink shadow-[0_2px_0_#141B3D]'
                      : 'bg-card border-ink/30 text-mute hover:border-ink disabled:opacity-40'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleReset}
                aria-label="Reset timer"
                className="p-2.5 rounded-xl border-2 border-ink bg-bg text-mute hover:text-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {isRunning ? (
                <button
                  onClick={handlePause}
                  aria-label="Pause timer"
                  className="px-6 py-2.5 bg-shuttle text-ink font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_3px_0_#141B3D] flex items-center gap-2 active:translate-y-[1px]"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  aria-label="Resume timer"
                  className="px-6 py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_3px_0_#141B3D] flex items-center gap-2 active:translate-y-[1px]"
                >
                  <Play className="w-4 h-4" /> Start Rep
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
