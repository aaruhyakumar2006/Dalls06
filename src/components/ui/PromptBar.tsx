'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { parseQuickTask } from '@/lib/utils/time';
import { Mic, MicOff, Send, Sparkles, Check, X, Edit3, Clock } from 'lucide-react';

interface PromptBarProps {
  onTaskScheduled?: () => void;
  autoFocus?: boolean;
}

interface DraftConfirmation {
  title: string;
  date?: string;
  at_time: string | null;
  duration_min: number | null;
  description?: string | null;
  recurrence_pattern?: 'none' | 'daily' | 'weekly' | null;
  recurrence_end_date?: string | null;
  tags?: string[] | null;
  source: 'local' | 'assistant';
  conflictWarning?: string;
}

export default function PromptBar({ onTaskScheduled, autoFocus = false }: PromptBarProps) {
  const { addTask, todayDateKey, showToast } = usePlanner();

  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [draft, setDraft] = useState<DraftConfirmation | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Web Speech API initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Default to Indian English for Chennai CSE student context

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          processPrompt(transcript);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition not supported on this browser', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const processPrompt = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;

    // 1. Try local natural language parser first
    const localParsed = parseQuickTask(text);

    // If local parser extracted a time or duration, or it's a simple phrase
    const hasExplicitTime = Boolean(localParsed.at_time || localParsed.duration_min);
    const isComplex =
      text.toLowerCase().includes('tomorrow') ||
      text.toLowerCase().includes('this week') ||
      text.toLowerCase().includes('saturday') ||
      text.split(' ').length > 8;

    if (!isComplex && (hasExplicitTime || text.split(' ').length <= 4)) {
      // Check conflict with fixed college/bus hours
      let conflictWarning: string | undefined;
      if (localParsed.at_time) {
        const [h, m] = localParsed.at_time.split(':').map(Number);
        const mins = h * 60 + m;
        // College 08:30 - 15:30 (510 to 930 mins)
        if (mins >= 510 && mins < 930) {
          conflictWarning = '⚠️ Conflicts with college hours (08:30 – 15:30). Scheduled during study gap?';
        } else if (mins >= 1020 && mins < 1140) {
          // Coaching 17:00 - 19:00 (1020 to 1140 mins)
          conflictWarning = '⚠️ Conflicts with badminton coaching (17:00 – 19:00).';
        }
      }

      setDraft({
        title: localParsed.title,
        at_time: localParsed.at_time,
        duration_min: localParsed.duration_min,
        description: null,
        recurrence_pattern: 'none',
        recurrence_end_date: null,
        tags: [],
        source: 'local',
        conflictWarning,
      });
      return;
    }

    // 2. Delegate complex sentence to AI Assistant
    setLoadingAi(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Parse into scheduled task: "${text}"` }],
          mode: 'parse_task',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDraft({
          title: data.title || text,
          at_time: data.at_time || null,
          duration_min: data.duration_min || 30,
          description: null,
          recurrence_pattern: 'none',
          recurrence_end_date: null,
          tags: [],
          source: 'assistant',
        });
      } else {
        // Fallback to local parsed
        setDraft({
          title: localParsed.title,
          at_time: localParsed.at_time,
          duration_min: localParsed.duration_min,
          description: null,
          recurrence_pattern: 'none',
          recurrence_end_date: null,
          tags: [],
          source: 'local',
        });
      }
    } catch {
      setDraft({
        title: localParsed.title,
        at_time: localParsed.at_time,
        duration_min: localParsed.duration_min,
        description: null,
        recurrence_pattern: 'none',
        recurrence_end_date: null,
        tags: [],
        source: 'local',
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingAi) return;
    processPrompt(input);
  };

  const confirmAndSave = () => {
    if (!draft) return;
    let cmd = draft.title;
    if (draft.description) cmd += ` | description: ${draft.description}`;
    if (draft.recurrence_pattern && draft.recurrence_pattern !== 'none') cmd += ` | recurring: ${draft.recurrence_pattern}`;
    if (draft.recurrence_end_date) cmd += ` | until: ${draft.recurrence_end_date}`;
    if (draft.tags && draft.tags.length > 0) cmd += ` | tags: ${draft.tags.join(', ')}`;
    if (draft.duration_min) cmd += ` ${draft.duration_min} min`;
    if (draft.at_time) cmd += ` at ${draft.at_time}`;

    addTask(cmd);
    setDraft(null);
    setInput('');
    showToast(`Task scheduled: "${draft.title}"`, 'success');
    if (onTaskScheduled) onTaskScheduled();
  };

  const discardDraft = () => {
    setDraft(null);
  };

  return (
    <div className="w-full space-y-2">
      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-card rounded-card border-2 border-ink shadow-sticker transition-all focus-within:shadow-[0_6px_0_#141B3D]"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or speak what you need to do..."
          className="flex-1 px-4 py-3 bg-transparent text-sm font-medium text-ink placeholder:text-mute focus:outline-none"
        />

        <div className="flex items-center gap-1.5 pr-2">
          {/* Speech Mic Button */}
          <button
            type="button"
            onClick={toggleSpeech}
            aria-label={isListening ? 'Stop listening' : 'Speak task'}
            className={`p-2 rounded-xl border-2 border-ink transition-all ${
              isListening
                ? 'bg-smash text-white animate-pulse'
                : 'bg-bg text-ink hover:bg-rail'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || loadingAi}
            aria-label="Process prompt"
            className="p-2 bg-court text-white rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] disabled:opacity-40 active:translate-y-[1px]"
          >
            {loadingAi ? (
              <Sparkles className="w-4 h-4 animate-spin text-shuttle" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Card (Section 6.11 requirement: Confirm Card before saving) */}
      {draft && (
        <div className="p-3.5 bg-shuttle/20 border-2 border-ink rounded-card shadow-[0_3px_0_#141B3D] animate-in fade-in zoom-in-98 text-xs text-ink space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold uppercase tracking-wider text-[11px] text-court flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Proposed Task Schedule
            </span>
            <span className="font-mono text-[10px] text-mute uppercase">
              {draft.source === 'assistant' ? 'AI Proposed Slot' : 'Parsed'}
            </span>
          </div>

          <div className="bg-card p-2.5 rounded-xl border border-ink/30 space-y-2">
            {/* Title */}
            <div>
              <label className="text-[10px] uppercase font-bold text-mute block mb-1">Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm font-medium text-ink"
              />
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-mute block mb-1">Time</label>
                <input
                  type="time"
                  value={draft.at_time || ''}
                  onChange={(e) => setDraft({ ...draft, at_time: e.target.value || null })}
                  className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-mute block mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={draft.duration_min || ''}
                  onChange={(e) => setDraft({ ...draft, duration_min: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] uppercase font-bold text-mute block mb-1">Description (optional)</label>
              <textarea
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
                placeholder="Add detailed notes..."
                rows={2}
                className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm resize-none"
              />
            </div>

            {/* Recurrence */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-mute block mb-1">Recurrence</label>
                <select
                  value={draft.recurrence_pattern || 'none'}
                  onChange={(e) => setDraft({ ...draft, recurrence_pattern: (e.target.value as any) || 'none' })}
                  className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              {draft.recurrence_pattern && draft.recurrence_pattern !== 'none' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-mute block mb-1">Stop on (optional)</label>
                  <input
                    type="date"
                    value={draft.recurrence_end_date || ''}
                    onChange={(e) => setDraft({ ...draft, recurrence_end_date: e.target.value || null })}
                    className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm"
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] uppercase font-bold text-mute block mb-1">Tags (comma-separated, optional)</label>
              <input
                type="text"
                value={draft.tags?.join(', ') || ''}
                onChange={(e) => {
                  const tags = e.target.value
                    .split(',')
                    .map((t) => t.trim().toLowerCase())
                    .filter((t) => t.length > 0);
                  const uniqueTags = Array.from(new Set(tags));
                  setDraft({ ...draft, tags: uniqueTags });
                }}
                placeholder="e.g., urgent, project-alpha"
                className="w-full px-2 py-1.5 bg-bg border border-ink/30 rounded text-sm"
              />
              {draft.tags && draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-info/20 text-info rounded text-[10px] font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {draft.conflictWarning && (
              <div className="text-[11px] font-semibold text-smash pt-1 border-t border-rail">
                {draft.conflictWarning}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={discardDraft}
              className="px-3 py-1.5 rounded-lg border border-ink/40 font-semibold text-mute hover:text-ink flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Discard
            </button>
            <button
              type="button"
              onClick={confirmAndSave}
              className="px-4 py-1.5 rounded-lg bg-court text-white font-bold uppercase tracking-wider border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center gap-1 active:translate-y-[1px]"
            >
              <Check className="w-3.5 h-3.5" /> Confirm &amp; Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
