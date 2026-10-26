'use client';

import React from 'react';
import { ShuttleIcon, FlameIcon } from './Icons';

interface RallyCounterProps {
  streak: number;
  weekDayCounts: Array<{ date: string; dayName: string; count: number; counts: boolean }>;
  className?: string;
}

export default function RallyCounter({
  streak,
  weekDayCounts,
  className = '',
}: RallyCounterProps) {
  // Pad streak to at least 2 digits for scoreboard look
  const streakDigits = streak.toString().padStart(2, '0');

  return (
    <div
      role="region"
      aria-label="Rally streak scoreboard"
      className={`rounded-card border-2 border-ink bg-card text-ink shadow-sticker p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-shuttle border-2 border-ink flex items-center justify-center text-ink">
            <ShuttleIcon className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-display text-xs font-bold uppercase tracking-wider text-ink block">
              Rally Counter
            </span>
            <span className="text-[10px] text-mute font-medium">Consecutive counting days</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-mute bg-bg px-2 py-0.5 rounded-full border border-ink/20">
          <FlameIcon className="w-3 h-3 text-tangerine fill-tangerine" />
          <span>Chain active</span>
        </div>
      </div>

      {/* Flip Scoreboard Display */}
      <div className="flex items-center justify-center gap-2 py-1">
        {streakDigits.split('').map((digit, idx) => (
          <div
            key={idx}
            className="relative w-16 h-20 bg-ink text-shuttle rounded-xl border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#070A1E] overflow-hidden"
          >
            {/* Split scoreboard line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#070A1E] z-10" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-r-full bg-card z-20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-l-full bg-card z-20" />

            <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tighter select-none">
              {digit}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center mt-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-mute">
          Days Unbroken
        </span>
      </div>

      {/* 7-Day Scoreboard Pips */}
      <div className="pt-2 border-t-2 border-rail">
        <div className="flex items-center justify-between mb-1.5 text-[11px] text-mute font-semibold">
          <span>7-Day Pips</span>
          <span>Target: &gt;= 2 Focus Blocks</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDayCounts.map((wd, i) => {
            const isToday = i === 6;
            return (
              <div key={wd.date} className="flex flex-col items-center">
                <div
                  title={`${wd.dayName}: ${wd.count} focus blocks ${wd.counts ? '(Counted)' : ''}`}
                  className={`w-full h-8 rounded-lg border-2 border-ink flex items-center justify-center transition-all ${
                    wd.counts
                      ? 'bg-mint text-ink font-bold shadow-[0_2px_0_#141B3D]'
                      : wd.count === 1
                      ? 'bg-shuttle/30 text-ink border-dashed'
                      : 'bg-rail text-mute'
                  } ${isToday ? 'ring-2 ring-court ring-offset-1' : ''}`}
                >
                  {wd.counts ? (
                    <span className="text-xs">✓</span>
                  ) : wd.count === 1 ? (
                    <span className="text-[10px] font-mono">1</span>
                  ) : (
                    <span className="text-[10px] text-mute/50">•</span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 font-mono ${
                    isToday ? 'font-bold text-ink' : 'text-mute'
                  }`}
                >
                  {wd.dayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
