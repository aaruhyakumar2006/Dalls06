'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { ShuttleIcon } from './Icons';

interface SkyHeaderProps {
  timezone?: string;
  isWeekend: boolean;
  matchDay: boolean;
  lowEnergy: boolean;
}

export default function SkyHeader({
  timezone = 'Asia/Kolkata',
  isWeekend,
  matchDay,
  lowEnergy,
}: SkyHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { phase, greeting, gradientClass, timeString, dateString } = useMemo(() => {
    // Determine time in user's timezone or local
    let hour = now.getHours();
    let minute = now.getMinutes();

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const h = parts.find((p) => p.type === 'hour')?.value;
      const m = parts.find((p) => p.type === 'minute')?.value;
      if (h) hour = parseInt(h, 10);
      if (m) minute = parseInt(m, 10);
    } catch {
      // fallback to system time
    }

    const currentTotalMins = hour * 60 + minute;

    // Time phase definitions:
    // Dawn: 05:00 - 07:15 (300 to 435 mins)
    // Day: 07:15 - 17:00 (435 to 1020 mins)
    // Dusk: 17:00 - 20:00 (1020 to 1200 mins)
    // Night: 20:00 - 05:00 (1200+ or < 300 mins)
    let p: 'dawn' | 'day' | 'dusk' | 'night' = 'day';
    let g = 'Court is open. Attack the morning focus blocks.';
    let grad = 'from-[#2E5BFF] via-[#3564FF] to-[#1740DE]';

    if (currentTotalMins >= 300 && currentTotalMins < 435) {
      p = 'dawn';
      g = '5:45. Feet on the floor. Your move.';
      grad = 'from-[#FF8A1F] via-[#FF3B7F] to-[#2E5BFF]';
    } else if (currentTotalMins >= 435 && currentTotalMins < 1020) {
      p = 'day';
      g = isWeekend
        ? 'Weekend session. Deep block and own training.'
        : 'Court is open. Attack the morning focus blocks.';
      grad = 'from-[#2E5BFF] via-[#3E6BFF] to-[#1B43D8]';
    } else if (currentTotalMins >= 1020 && currentTotalMins < 1200) {
      p = 'dusk';
      g = matchDay
        ? 'Match night incoming. Hydrate and stay sharp.'
        : 'Match point on today. Finish the deep work.';
      grad = 'from-[#FF8A1F] via-[#FF3B7F] to-[#141B3D]';
    } else {
      p = 'night';
      g = '22:45 shutdown. Protect the recovery.';
      grad = 'from-[#0C1030] via-[#161B47] to-[#0A0D26]';
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayH = hour % 12 === 0 ? 12 : hour % 12;
    const tStr = `${displayH}:${pad(minute)} ${ampm}`;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;

    return {
      phase: p,
      greeting: g,
      gradientClass: grad,
      timeString: tStr,
      dateString: dStr,
    };
  }, [now, timezone, isWeekend, matchDay]);

  return (
    <section
      aria-label="Daily sky and coach greeting"
      className={`relative overflow-hidden rounded-card border-2 border-ink bg-gradient-to-br ${gradientClass} text-white shadow-sticker p-4 sm:p-5 transition-colors duration-1000`}
    >
      {/* Court lines backdrop motif */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white -translate-x-1/2" />
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white -translate-y-1/2" />
        <div className="absolute inset-4 border border-white/60" />
      </div>

      {/* Night stars motif */}
      {phase === 'night' && (
        <div className="absolute inset-0 pointer-events-none opacity-80">
          <div className="absolute top-2 left-6 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-8 right-12 w-1.5 h-1.5 bg-[#FFD21F] rounded-full animate-pulse" />
          <div className="absolute top-12 left-1/3 w-1 h-1 bg-white rounded-full" />
          <div className="absolute bottom-4 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse" />
        </div>
      )}

      {/* Header Info */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ink/40 border border-white/25 text-[11px] font-mono tracking-wide text-white uppercase backdrop-blur-xs mb-2">
            <ShuttleIcon className="w-3.5 h-3.5 text-shuttle" />
            <span>{phase.toUpperCase()} SESSION</span>
            {lowEnergy && <span className="text-shuttle font-bold">• LOW ENERGY</span>}
            {matchDay && <span className="text-mint font-bold">• MATCH DAY</span>}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight leading-tight text-white drop-shadow-sm">
            {greeting}
          </h2>
        </div>

        <div className="text-right shrink-0" suppressHydrationWarning>
          <div
            className="font-mono text-sm sm:text-base font-semibold text-white/90"
            suppressHydrationWarning
          >
            {mounted ? timeString : '...'}
          </div>
          <div
            className="text-[11px] font-medium text-white/70"
            suppressHydrationWarning
          >
            {mounted ? dateString : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
