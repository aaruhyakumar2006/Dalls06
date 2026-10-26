'use client';

import React, { useState } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ShuttleIcon } from '../ui/Icons';
import { X, Mail, ShieldCheck, Laptop, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { user, signInWithGoogle, signInWithEmail, signOut, showToast } = usePlanner();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const configured = isSupabaseConfigured();

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMsg(null);
    const res = await signInWithEmail(email);
    setLoading(false);
    if (res?.error) {
      setMsg({ text: res.error, type: 'error' });
    } else {
      setMsg({ text: 'Check your inbox! Magic link sent with a 30s confirmation window.', type: 'success' });
      setEmail('');
      showToast('Magic link sent to your email', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account and Sync"
        className="bg-white text-text-charcoal rounded-t-card-xl sm:rounded-card-xl w-full sm:max-w-md p-6 shadow-card-hover relative animate-in fade-in zoom-in-98 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close auth modal"
          className="absolute top-4 right-4 text-text-muted hover:text-text-charcoal p-2 rounded-full hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-card-xl bg-primary flex items-center justify-center text-white shadow-card-soft">
            <ShuttleIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-text-charcoal leading-tight">
              Account &amp; Live Sync
            </h2>
            <span className="text-xs font-mono text-text-muted">Phone ↔ Laptop Sync</span>
          </div>
        </div>

        <p className="text-text-muted text-sm mb-6 leading-relaxed">
          Sign in to sync your timetable ticks, tasks, and spaced repetition progress across devices within 1-2 seconds.
        </p>

        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 text-text-charcoal rounded-xl space-y-2 text-sm border border-success/30">
              <div className="font-bold font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-success" /> Active Session
              </div>
              <div className="font-mono text-sm text-text-charcoal font-semibold">{user.email || user.id}</div>
              <p className="text-xs text-text-muted leading-relaxed pt-1">
                Supabase Realtime subscriptions are active. Your phone and laptop stay in lockstep.
              </p>
            </div>

            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-text-charcoal border-2 border-gray-300 hover:bg-gray-50 active:scale-98 min-h-[44px] transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!configured ? (
              <div className="p-4 bg-warning/10 rounded-xl text-sm text-text-charcoal space-y-2 border border-warning/30">
                <strong className="font-display font-bold block">Offline-First Local Storage Active</strong>
                <p className="text-sm text-text-muted leading-relaxed">
                  The app is currently storing all timetable blocks, tasks, and logs in your local browser storage. To enable cross-device cloud sync, add your Supabase project keys to <code className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">. env.local</code>.
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 border-2 border-gray-300 rounded-xl text-sm font-bold flex items-center justify-center gap-3 transition-all shadow-card-soft hover:shadow-card-hover active:scale-98 min-h-[44px]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-text-muted uppercase font-mono font-semibold">
                    or email magic link
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter student email (e.g., student@college.edu)"
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[44px] transition-all"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-card-soft hover:shadow-card-hover disabled:opacity-40 active:scale-98 flex items-center justify-center gap-2 min-h-[44px] transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    {loading ? 'Sending link...' : 'Send Magic Link'}
                  </button>
                </form>

                {msg && (
                  <div
                    className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                      msg.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-error/10 text-error border border-error/30'
                    }`}
                  >
                    {msg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{msg.text}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
