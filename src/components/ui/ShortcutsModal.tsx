'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '/', desc: 'Focus the natural language prompt bar' },
    { key: 'N', desc: 'Add a new task' },
    { key: 'Space', desc: 'Start or pause focus timer' },
    { key: '1 - 5', desc: 'Switch navigation tabs (Today, Review, Track, Plan, Coach)' },
    { key: 'Cmd/Ctrl + K', desc: 'Open Command Palette' },
    { key: '?', desc: 'Open this keyboard shortcuts cheatsheet' },
    { key: 'Esc', desc: 'Close open dialogs and modals' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
        className="w-full max-w-md bg-card rounded-card border-2 border-ink shadow-sticker text-ink overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-rail bg-bg/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-court text-white flex items-center justify-center border-2 border-ink">
              <Keyboard className="w-4 h-4" />
            </div>
            <h2 className="font-display text-sm font-bold tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="p-1 rounded-md text-mute hover:text-ink hover:bg-rail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2 rounded-xl bg-bg/70 border border-rail text-xs"
            >
              <span className="font-medium text-ink">{s.desc}</span>
              <kbd className="px-2.5 py-1 bg-card border-2 border-ink rounded-lg font-mono font-bold text-ink shadow-[0_2px_0_#141B3D]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="p-3 bg-rail/40 border-t-2 border-rail text-center text-[11px] text-mute font-mono">
          Press <kbd className="px-1 border border-ink/40 rounded">?</kbd> anytime to toggle this helper
        </div>
      </div>
    </div>
  );
}
