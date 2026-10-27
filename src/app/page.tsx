'use client';

import React, { useContext, useState, useEffect } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { AppTabContext } from '@/components/layout/AppShell';
import TodayTab from '@/components/tabs/TodayTab';
import ReviewTab from '@/components/tabs/ReviewTab';
import TrackTab from '@/components/tabs/TrackTab';
import PlanTab from '@/components/tabs/PlanTab';
import AnalyticsTab from '@/components/tabs/AnalyticsTab';
import AssistantTab from '@/components/tabs/AssistantTab';
import AuthModal from '@/components/modals/AuthModal';
import { ShuttleIcon } from '@/components/ui/Icons';

export default function HomePage() {
  const { currentTab } = useContext(AppTabContext);
  const { user, isLoaded, isAuthChecked } = usePlanner();
  const [showAuthPrompt, setShowAuthPrompt] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Ensure client-only rendering after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading screen while localStorage or auth state is being checked
  // suppressHydrationWarning prevents hydration mismatch for intentional loading state
  if (!mounted || !isLoaded || !isAuthChecked) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4" suppressHydrationWarning>
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-court border-2 border-ink flex items-center justify-center text-white shadow-sticker animate-pulse">
              <ShuttleIcon className="w-8 h-8 text-shuttle" />
            </div>
          </div>
          <p className="text-lg font-medium text-ink">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Show auth gate if not authenticated (unless local-only mode)
  // Allow user to skip and use locally
  if (isLoaded && isAuthChecked && !user && showAuthPrompt) {
    return (
      <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center p-4" suppressHydrationWarning>
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-court border-2 border-ink flex items-center justify-center text-white shadow-sticker">
              <ShuttleIcon className="w-8 h-8 text-shuttle" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold font-display text-ink mb-2">Match Point Planner</h1>
            <p className="text-sm text-mute font-medium">
              Sign in to sync your progress across devices and unlock cloud persistence.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <p className="text-xs text-mute font-mono uppercase tracking-wide">
              You're currently using local storage. Sign in to enable:
            </p>
            <ul className="text-left space-y-2 text-xs font-medium text-ink bg-card rounded-card p-4 border-2 border-ink">
              <li>✓ Sync across your phone & laptop</li>
              <li>✓ Cloud backup of your data</li>
              <li>✓ Real-time updates (1-2 seconds)</li>
              <li>✓ Access from any device</li>
            </ul>
          </div>

          <AuthModal isOpen={true} onClose={() => {}} />
        </div>
      </div>
    );
  }

  switch (currentTab) {
    case 'review':
      return <ReviewTab />;
    case 'track':
      return <TrackTab />;
    case 'plan':
      return <PlanTab />;
    case 'analytics':
      return <AnalyticsTab />;
    case 'assistant':
      return <AssistantTab />;
    case 'today':
    default:
      return <TodayTab />;
  }
}
