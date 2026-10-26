'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RotateCw,
  Activity,
  FolderKanban,
  Sparkles,
  Timer,
  Moon,
  Plus,
  Settings,
  Search,
  X,
  User,
} from 'lucide-react';
import { TabType } from '../layout/AppShell';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenNewTask: () => void;
  onOpenTimer: () => void;
  onOpenSleep: () => void;
  onOpenSettings: () => void;
  onOpenScheduleModal?: () => void;
  onOpenProfile?: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewTask,
  onOpenTimer,
  onOpenSleep,
  onOpenSettings,
  onOpenScheduleModal,
  onOpenProfile,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'tab-today',
      title: 'Go to Today View',
      category: 'Navigation',
      shortcut: '1',
      icon: <Calendar className="w-4 h-4 text-court" />,
      run: () => {
        onNavigateTab('today');
        onClose();
      },
    },
    {
      id: 'tab-review',
      title: 'Go to Spaced Review',
      category: 'Navigation',
      shortcut: '2',
      icon: <RotateCw className="w-4 h-4 text-mint" />,
      run: () => {
        onNavigateTab('review');
        onClose();
      },
    },
    {
      id: 'tab-track',
      title: 'Go to Track (DSA, Aptitude, Sleep, Sport)',
      category: 'Navigation',
      shortcut: '3',
      icon: <Activity className="w-4 h-4 text-shuttle" />,
      run: () => {
        onNavigateTab('track');
        onClose();
      },
    },
    {
      id: 'tab-plan',
      title: 'Go to Plan & Checklists',
      category: 'Navigation',
      shortcut: '4',
      icon: <FolderKanban className="w-4 h-4 text-smash" />,
      run: () => {
        onNavigateTab('plan');
        onClose();
      },
    },
    {
      id: 'tab-coach',
      title: 'Go to AI Coach',
      category: 'Navigation',
      shortcut: '5',
      icon: <Sparkles className="w-4 h-4 text-court" />,
      run: () => {
        onNavigateTab('assistant');
        onClose();
      },
    },
    {
      id: 'act-new-task',
      title: 'Add New Task (Type or Speak)',
      category: 'Action',
      shortcut: 'N',
      icon: <Plus className="w-4 h-4 text-court" />,
      run: () => {
        onOpenNewTask();
        onClose();
      },
    },
    {
      id: 'act-timer',
      title: 'Start Focus Timer (Anti-Distraction Check)',
      category: 'Action',
      shortcut: 'Space',
      icon: <Timer className="w-4 h-4 text-smash" />,
      run: () => {
        onOpenTimer();
        onClose();
      },
    },
    {
      id: 'act-sleep',
      title: 'Log Today’s Sleep (Bedtime & Wake)',
      category: 'Action',
      shortcut: 'S',
      icon: <Moon className="w-4 h-4 text-tangerine" />,
      run: () => {
        onOpenSleep();
        onClose();
      },
    },
    {
      id: 'act-settings',
      title: 'Account, Push & Template Settings',
      category: 'Settings',
      shortcut: ',',
      icon: <Settings className="w-4 h-4 text-mute" />,
      run: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'act-schedule',
      title: 'Clear or Rewrite Weekly Schedule (Planner)',
      category: 'Schedule',
      shortcut: 'W',
      icon: <Calendar className="w-4 h-4 text-court" />,
      run: () => {
        if (onOpenScheduleModal) onOpenScheduleModal();
        onClose();
      },
    },
    {
      id: 'act-profile',
      title: 'View Student Profile & Details',
      category: 'Profile',
      shortcut: 'P',
      icon: <User className="w-4 h-4 text-court" />,
      run: () => {
        if (onOpenProfile) onOpenProfile();
        onClose();
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-start justify-center p-4 pt-20"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
        className="w-full max-w-lg bg-card rounded-card border-2 border-ink shadow-sticker overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b-2 border-rail gap-2 bg-bg/50">
          <Search className="w-5 h-5 text-mute shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump anywhere..."
            className="w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-mute"
          />
          <button
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded-md text-mute hover:text-ink hover:bg-rail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-mute font-medium">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={item.run}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium hover:bg-rail active:bg-rail/80 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg border-2 border-ink/30 bg-bg flex items-center justify-center group-hover:border-ink transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <span className="font-semibold text-ink block leading-snug">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-mute uppercase font-mono">
                      {item.category}
                    </span>
                  </div>
                </div>

                <kbd className="px-2 py-0.5 text-[11px] font-mono bg-bg border-2 border-ink/40 rounded-md text-mute group-hover:text-ink group-hover:border-ink">
                  {item.shortcut}
                </kbd>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-rail/60 border-t-2 border-rail flex items-center justify-between text-[11px] text-mute font-mono">
          <span>Navigation: Arrow Keys</span>
          <span>Execute: Enter</span>
          <span>Close: Esc</span>
        </div>
      </div>
    </div>
  );
}
