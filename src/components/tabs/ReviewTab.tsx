'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import { ReviewItem, ReviewTopicKind } from '@/types/database';
import { ShuttleIcon } from '../ui/Icons';
import {
  Plus,
  Check,
  RotateCcw,
  BookOpen,
  AlertCircle,
  Sparkles,
  Filter,
  Clock,
  ArrowRight,
  Flame,
} from 'lucide-react';

export default function ReviewTab() {
  const {
    reviewItems,
    addReviewItem,
    recordReviewResult,
    todayDateKey,
    dueReviewItemsCount,
    showToast,
  } = usePlanner();

  const [isOpenAdd, setIsOpenAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [topicKind, setTopicKind] = useState<ReviewTopicKind>('dsa');
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [filterTopic, setFilterTopic] = useState<string>('all');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addReviewItem(title, topicKind, topic, note);
    setTitle('');
    setTopic('');
    setNote('');
    setIsOpenAdd(false);
    showToast('Concept logged into spaced repetition', 'success');
  };

  const handleReviewAction = (id: string, result: 'got_it' | 'struggled') => {
    recordReviewResult(id, result);
    if (result === 'got_it') {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate([30, 40]);
      }
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.7 },
        colors: ['#12D6A5', '#2E5BFF', '#FFD21F'],
      });
      showToast('Mastered from blank! Stage promoted.', 'success');
    } else {
      showToast('Reset to 1 day. Writing from blank reveals the gaps.', 'info');
    }
  };

  const dueItems = reviewItems.filter(
    (item) => item.next_review_at <= todayDateKey && (filterTopic === 'all' || item.topic_kind === filterTopic)
  );

  const upcomingItems = reviewItems.filter(
    (item) => item.next_review_at > todayDateKey && (filterTopic === 'all' || item.topic_kind === filterTopic)
  );

  const STAGE_INTERVALS = [1, 3, 7, 14, 30];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-mono font-bold uppercase">
              Spaced Recall
            </span>
            <span className="text-xs font-mono text-text-muted">Push at 19:15</span>
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-text-charcoal">
            Spaced-Review Log
          </h1>
          <p className="text-xs text-text-muted font-medium mt-0.5 leading-snug">
            Attack recognition without recall. Test every concept from blank memory.
          </p>
        </div>

        <button
          onClick={() => setIsOpenAdd(!isOpenAdd)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-card-soft active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" /> Add Concept
        </button>
      </div>

      {/* Add Concept Form Modal/Drawer */}
      {isOpenAdd && (
        <form
          onSubmit={handleAddSubmit}
          className="p-3 sm:p-4 bg-white rounded-card-xl space-y-3 sm:space-y-3.5 shadow-card-soft animate-in fade-in zoom-in-98"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold font-display text-sm text-primary flex items-center gap-2">
              <ShuttleIcon className="w-4 h-4 text-primary" />
              Log Mistake or Concept for Recall
            </h3>
            <span className="text-[10px] font-mono text-text-muted">Stages: 1d → 3d → 7d → 14d → 30d</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
              Concept / Mistake Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g., "Two Pointer edge case when array has duplicates"'
              className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-mute uppercase mb-1">
                Domain
              </label>
              <select
                value={topicKind}
                onChange={(e) => setTopicKind(e.target.value as ReviewTopicKind)}
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="dsa">DSA</option>
                <option value="aptitude">Aptitude</option>
                <option value="other">Core CS / System</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-mute uppercase mb-1">
                Topic Tag (Optional)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Graph BFS, Percentages"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase mb-1">
              Recall Trigger or Trap To Remember
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What tripped you up? Write the exact formula or logic check that failed."
              rows={2}
              className="w-full px-3.5 py-2 bg-white border-2 border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOpenAdd(false)}
              className="px-3 py-1.5 rounded-xl border-2 border-gray-300 text-xs font-semibold text-text-muted hover:text-text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-card-soft active:scale-98"
            >
              Save Concept
            </button>
          </div>
        </form>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-text-muted shrink-0 ml-1" />
        {['all', 'dsa', 'aptitude', 'other'].map((f) => (
          <button
            key={f}
            onClick={() => setFilterTopic(f)}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border-2 transition-all shrink-0 ${
              filterTopic === f
                ? 'bg-primary text-white border-primary shadow-card-soft'
                : 'bg-white text-text-muted border-gray-300 hover:border-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* SECTION: DUE TODAY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-smash" />
            Due for Review Today ({dueItems.length})
          </h2>
          <span className="text-[11px] font-mono text-text-muted">Write from blank first</span>
        </div>

        {dueItems.length === 0 ? (
          <div className="p-6 rounded-card-xl border-2 border-dashed border-gray-300 bg-white text-center space-y-1.5">
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center mx-auto text-success">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <h3 className="font-display text-sm font-bold text-text-charcoal">Court is clear today</h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto font-medium">
              No concepts due today. When you hit a mistake in practice, add it here immediately so it never slips away.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dueItems.map((item) => (
              <div
                key={item.id}
                className="p-3 sm:p-4 rounded-card-xl bg-white shadow-card-soft hover:shadow-card-hover space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-white text-[10px] font-bold uppercase font-mono">
                        Stage {item.stage} ({STAGE_INTERVALS[item.stage - 1] || 1}d)
                      </span>
                      <span className="text-xs font-bold uppercase text-primary font-mono">
                        {item.topic_kind}
                      </span>
                      {item.topic && (
                        <span className="text-xs text-text-muted">• {item.topic}</span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-bold text-ink leading-snug">
                      {item.title}
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 bg-accent-yellow text-text-charcoal font-mono font-bold text-[10px] rounded-md border border-gray-300">
                    DUE NOW
                  </span>
                </div>

                {/* "Try this from blank" Coaching Prompt (Section 6.2 requirement) */}
                <div className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-1 text-xs">
                  <div className="font-display font-bold text-primary text-[11px] uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Try this from blank:
                  </div>
                  <p className="text-ink font-medium leading-relaxed">
                    Close your notes or editor. Write the solution, diagram, or formula on a blank sheet or empty file. Can you derive it with zero references?
                  </p>
                  {item.note && (
                    <div className="mt-2 pt-1.5 border-t border-gray-200 text-text-muted font-mono text-[11px]">
                      Hint/Trap: {item.note}
                    </div>
                  )}
                </div>

                {/* Got it from blank vs Struggled buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleReviewAction(item.id, 'struggled')}
                    className="px-3.5 py-2 rounded-xl bg-white text-text-charcoal text-xs font-bold uppercase tracking-wider hover:bg-error/10 active:scale-98 flex items-center gap-1 shadow-card-soft"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-error" /> Struggled (Reset to 1d)
                  </button>

                  <button
                    onClick={() => handleReviewAction(item.id, 'got_it')}
                    className="px-4 py-2 rounded-xl bg-success text-white text-xs font-bold uppercase tracking-wider shadow-card-soft hover:opacity-95 active:scale-98 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Got it from blank!
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: UPCOMING IN REVIEW QUEUE */}
      {upcomingItems.length > 0 && (
        <div className="pt-3 space-y-2.5">
          <h2 className="font-display text-sm font-bold text-text-muted uppercase tracking-wider">
            Upcoming In Queue ({upcomingItems.length})
          </h2>

          <div className="space-y-2">
            {upcomingItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border-2 border-gray-200 bg-white flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-text-charcoal">{item.title}</div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    Stage {item.stage} • Due: {item.next_review_at}
                  </div>
                </div>

                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      className={`w-2.5 h-2.5 rounded-full border border-gray-300 ${
                        s <= item.stage ? 'bg-success' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
