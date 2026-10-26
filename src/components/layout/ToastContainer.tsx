'use client';

import React from 'react';
import { usePlanner } from '@/lib/storage/store';
import { Sparkles, CheckCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = usePlanner();

  if (toasts.length === 0) return null;

  return (
    <aside
      aria-label="Appreciation notifications"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-[92vw] sm:max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isStreak = toast.type === 'streak';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 transition-all animate-bounce-short ${
              isStreak
                ? 'bg-ink text-bg border-hi'
                : isSuccess
                ? 'bg-card text-ink border-acc shadow-acc/20'
                : 'bg-card text-ink border-line'
            }`}
            onClick={() => removeToast(toast.id)}
          >
            {isStreak && <Sparkles className="w-5 h-5 text-hi shrink-0" />}
            {isSuccess && <CheckCircle className="w-5 h-5 text-acc shrink-0" />}
            {!isStreak && !isSuccess && <Info className="w-5 h-5 text-mute shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </aside>
  );
}
