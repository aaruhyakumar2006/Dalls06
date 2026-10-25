'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import { ShuttleIcon } from '../ui/Icons';
import {
  Sparkles,
  Send,
  CheckCircle,
  HelpCircle,
  Briefcase,
  TrendingUp,
  Plus,
  Clock,
  RotateCcw,
  Check,
  X,
  Trash2,
} from 'lucide-react';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantTab() {
  const {
    streak,
    weekDayCounts,
    dsaTopics,
    aptitudeLogs,
    sleepLogs,
    tasks,
    addTask,
    addReviewItem,
    showToast,
    aiMessages,
    saveAiMessage,
    clearAiMessages,
  } = usePlanner();

  // Transform store messages to component format
  const messages = useMemo(() => {
    if (aiMessages.length === 0) {
      // Default welcome message
      return [{
        role: 'assistant' as const,
        content: 'Ready. I am your placement & focus coach. I can turn messy thoughts into scheduled tasks, quiz you on due concepts from blank memory, run short mock interviews, or audit your consistency. What are we working on?',
      }];
    }
    return aiMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }, [aiMessages]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedTaskDraft, setParsedTaskDraft] = useState<{
    title: string;
    at_time: string | null;
    duration_min: number | null;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, parsedTaskDraft]);

  // Build compact user context summary
  const userSummary = useMemo(() => {
    const dueDsa = dsaTopics.filter((d) => d.due).map((d) => d.topic);
    const countingDays = weekDayCounts.filter((w) => w.counts).length;
    return {
      currentStreak: streak,
      countingDaysLast7: countingDays,
      dueDsaTopics: dueDsa,
      recentAptitudeLogsCount: aptitudeLogs.length,
      currentTasksCount: tasks.length,
    };
  }, [streak, weekDayCounts, dsaTopics, aptitudeLogs, tasks]);

  // Stream assistant message
  const sendMessage = async (
    userText: string,
    mode: 'general' | 'parse_task' | 'question' | 'mock_interview' | 'coaching' = 'general'
  ) => {
    if (!userText.trim() || loading) return;

    // Save user message
    saveAiMessage('user', userText);
    const newMsgs: ChatMsg[] = [...messages, { role: 'user', content: userText }];
    
    setInput('');
    setLoading(true);
    setParsedTaskDraft(null);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMsgs,
          userSummary,
          mode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.error || 'Assistant API error. Please try again.';
        throw new Error(errorMsg);
      }

      if (mode === 'parse_task') {
        const text = await res.text();
        try {
          const parsed = JSON.parse(text);
          setParsedTaskDraft(parsed);
          const assistantMsg = `I've proposed a slot for "${parsed.title}". Review the card below to confirm or edit.`;
          saveAiMessage('assistant', assistantMsg);
        } catch {
          saveAiMessage('assistant', text);
        }
      } else {
        const text = await res.text();
        saveAiMessage('assistant', text);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reach AI Coach. Check your connection and API configuration.';
      const errMsg = `⚠️ ${errorMessage}`;
      saveAiMessage('assistant', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTask = () => {
    if (!parsedTaskDraft) return;
    let cmd = parsedTaskDraft.title;
    if (parsedTaskDraft.duration_min) cmd += ` ${parsedTaskDraft.duration_min} min`;
    if (parsedTaskDraft.at_time) cmd += ` at ${parsedTaskDraft.at_time}`;
    addTask(cmd);
    setParsedTaskDraft(null);
    showToast(`Task added to timetable: "${parsedTaskDraft.title}"`, 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[820px]">
      {/* Coach Header */}
      <div className="p-4 bg-card rounded-t-card border-2 border-ink border-b-0 shadow-sticker flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-court border-2 border-ink flex items-center justify-center text-white shadow-[0_2px_0_#141B3D]">
            <ShuttleIcon className="w-5 h-5 text-shuttle" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-ink">AI Focus &amp; Placement Coach</h2>
            <span className="text-[11px] font-mono text-mute">
              Groq / NVIDIA Swappable • Direct &amp; Honest
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-mint text-ink font-mono font-bold text-[10px] border border-ink">
            {streak}d STREAK
          </span>
          <button
            onClick={() => {
              if (confirm('Clear all chat history?')) {
                clearAiMessages();
              }
            }}
            className="p-1.5 rounded-lg border border-ink text-mute hover:text-smash hover:bg-rail min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Action Chips */}
      <div className="px-4 py-2 bg-rail/60 border-2 border-ink border-b-0 flex gap-1.5 overflow-x-auto shrink-0">
        <button
          onClick={() =>
            sendMessage(
              'Give me one high-yield from-blank coding problem on recursion or trees.',
              'question'
            )
          }
          className="px-2.5 py-1 bg-card hover:bg-bg border-2 border-ink rounded-lg text-xs font-bold whitespace-nowrap active:translate-y-[1px]"
        >
          🎯 Quiz Me From Blank
        </button>

        <button
          onClick={() =>
            sendMessage(
              'Run a short mock interview question about project architecture or HR.',
              'mock_interview'
            )
          }
          className="px-2.5 py-1 bg-card hover:bg-bg border-2 border-ink rounded-lg text-xs font-bold whitespace-nowrap active:translate-y-[1px]"
        >
          💼 Mock Interview
        </button>

        <button
          onClick={() =>
            sendMessage(
              'Audit my consistency this week and tell me my single biggest vulnerability.',
              'coaching'
            )
          }
          className="px-2.5 py-1 bg-card hover:bg-bg border-2 border-ink rounded-lg text-xs font-bold whitespace-nowrap active:translate-y-[1px]"
        >
          📊 Audit Consistency
        </button>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 bg-bg border-2 border-ink space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-card border-2 border-ink text-xs leading-relaxed font-medium ${
                m.role === 'user'
                  ? 'bg-court text-white shadow-[0_3px_0_#141B3D]'
                  : 'bg-card text-ink shadow-sticker'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}

        {/* Task draft card if assistant parsed task */}
        {parsedTaskDraft && (
          <div className="p-3.5 bg-shuttle/20 border-2 border-ink rounded-card shadow-[0_3px_0_#141B3D] text-xs space-y-2 animate-in fade-in">
            <span className="font-display font-bold uppercase tracking-wider text-[11px] text-court flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Proposed Task Schedule
            </span>
            <div className="bg-card p-2.5 rounded-xl border border-ink/30 space-y-1">
              <div className="font-bold text-sm text-ink">{parsedTaskDraft.title}</div>
              <div className="text-mute font-mono text-[11px]">
                {parsedTaskDraft.at_time && <span>⏰ {parsedTaskDraft.at_time} </span>}
                {parsedTaskDraft.duration_min && <span>⏳ {parsedTaskDraft.duration_min}m</span>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setParsedTaskDraft(null)}
                className="px-3 py-1 rounded-lg border border-ink font-semibold"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmTask}
                className="px-4 py-1 rounded-lg bg-court text-white font-bold uppercase border-2 border-ink shadow-[0_2px_0_#141B3D]"
              >
                Add To Schedule ✓
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="p-3 bg-card rounded-card border-2 border-ink text-xs font-mono text-mute animate-pulse">
              Coach is calculating advice...
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="p-3 bg-card rounded-b-card border-2 border-ink border-t-0 shadow-sticker flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask coach or describe tasks..."
          className="flex-1 px-3.5 py-2.5 bg-bg border-2 border-ink rounded-xl text-xs font-medium focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-court text-white font-bold rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] disabled:opacity-40 active:translate-y-[1px]"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
