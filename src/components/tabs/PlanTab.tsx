'use client';

import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import { ChecklistItem, Startup, ChecklistList } from '@/types/database';
import { ShuttleIcon } from '../ui/Icons';
import {
  FolderKanban,
  CheckSquare,
  Building,
  Code2,
  Trophy,
  History,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ArrowRight,
  Check,
  Flame,
} from 'lucide-react';

export default function PlanTab() {
  const {
    checklistItems,
    toggleChecklistItem,
    addChecklistItem,
    startups,
    saveStartup,
    weeklyReviews,
    saveWeeklyReview,
    weekDayCounts,
    sleepLogs,
    focusSessions,
    reviewItems,
    aptitudeLogs,
    sportLogs,
    todayDateKey,
    showToast,
    templates,
    openScheduleModal,
  } = usePlanner();

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'checklists' | 'startups' | 'weeklyReview'>('schedule');
  const [selectedList, setSelectedList] = useState<ChecklistList>('placement');

  // Weekly Review Form State
  const [oneChangeInput, setOneChangeInput] = useState('');

  // Startup Audit State (Preloaded with megsyra.in context)
  const [editingStartup, setEditingStartup] = useState<Startup>(
    startups[0] || {
      id: `startup-megsyra`,
      name: 'megsyra.in',
      role: 'Founder & Tech Lead',
      owned_last_30_days: 'Production release, user onboarding flow, database migration',
      users_or_customers: '120 active student users',
      key_metric: '72% retention on daily study logs',
      next_milestone: 'Launch campus campus-ambassador program',
      milestone_date: '2026-11-01',
      hours_per_week: 10,
      status: 'active',
    }
  );

  // New Checklist Item State
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');

  // Calculate live weekly metrics for review (Section 6.3)
  const weeklyMetrics = useMemo(() => {
    const countingDays = weekDayCounts.filter((w) => w.counts).length;
    const totalCoreDone = weekDayCounts.reduce((a, b) => a + b.count, 0);
    const possibleCore = weekDayCounts.length * 3;

    const sleepEntries = Object.values(sleepLogs).slice(-7);
    const avgBed = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1].bedtime : '22:45';
    const avgWake = sleepEntries.length > 0 ? sleepEntries[sleepEntries.length - 1].wake_time : '05:45';

    let best = weekDayCounts[0]?.dayName || 'Mon';
    let worst = weekDayCounts[0]?.dayName || 'Mon';
    let maxC = -1;
    let minC = 99;
    weekDayCounts.forEach((w) => {
      if (w.count > maxC) {
        maxC = w.count;
        best = w.dayName;
      }
      if (w.count < minC) {
        minC = w.count;
        worst = w.dayName;
      }
    });

    const focusMins = focusSessions.reduce((acc, s) => acc + (s.actual_min || 0), 0);
    const clearedReviews = reviewItems.filter((r) => r.stage >= 2).length;

    const totalQ = aptitudeLogs.reduce((a, b) => a + b.questions, 0);
    const totalCorr = aptitudeLogs.reduce((a, b) => a + b.correct, 0);
    const aptAcc = totalQ > 0 ? Math.round((totalCorr / totalQ) * 100) : 0;

    const sportCount = sportLogs.length;

    return {
      countingDays,
      totalCoreDone,
      possibleCore,
      avgBed,
      avgWake,
      best,
      worst,
      focusMins,
      clearedReviews,
      aptAcc,
      sportCount,
    };
  }, [weekDayCounts, sleepLogs, focusSessions, reviewItems, aptitudeLogs, sportLogs]);

  const handleWeeklyReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oneChangeInput.trim()) return;

    saveWeeklyReview({
      week_start_date: todayDateKey,
      counting_days: weeklyMetrics.countingDays,
      core_done: weeklyMetrics.totalCoreDone,
      possible_core: weeklyMetrics.possibleCore,
      avg_bedtime: weeklyMetrics.avgBed,
      avg_waketime: weeklyMetrics.avgWake,
      best_day: weeklyMetrics.best,
      worst_day: weeklyMetrics.worst,
      focus_minutes: weeklyMetrics.focusMins,
      review_items_cleared: weeklyMetrics.clearedReviews,
      aptitude_accuracy: weeklyMetrics.aptAcc,
      sport_sessions: weeklyMetrics.sportCount,
      one_change: oneChangeInput.trim(),
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#2E5BFF', '#FF3B7F', '#12D6A5'],
    });

    setOneChangeInput('');
    showToast('Sunday review saved! Commitment locked in.', 'streak');
  };

  const handleAddChecklistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    addChecklistItem({
      list: selectedList,
      group: 'general',
      title: newItemTitle.trim(),
      done: false,
      due_date: newItemDueDate || undefined,
    });

    setNewItemTitle('');
    setNewItemDueDate('');
    showToast(`Item added to ${selectedList} roadmap`, 'success');
  };

  const handleStartupSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveStartup(editingStartup);
    showToast(`Startup audit saved for ${editingStartup.name}`, 'success');
  };

  const currentListItems = checklistItems.filter((item) => item.list === selectedList);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold font-display tracking-tight text-ink">
          Roadmaps &amp; Strategy
        </h1>
        <p className="text-xs text-mute font-medium mt-0.5">
          Placement milestones, startup audits (megsyra.in), flagship projects, and Sunday weekly reviews.
        </p>
      </div>

      {/* Main Sub Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-rail/60 rounded-xl border-2 border-ink">
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeSubTab === 'schedule'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Weekly Schedule
        </button>
        <button
          onClick={() => setActiveSubTab('checklists')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeSubTab === 'checklists'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Roadmaps
        </button>
        <button
          onClick={() => setActiveSubTab('startups')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeSubTab === 'startups'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Startup Audit
        </button>
        <button
          onClick={() => setActiveSubTab('weeklyReview')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeSubTab === 'weeklyReview'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Sunday Review
        </button>
      </div>

      {/* ============================================================== */}
      {/* 0. WEEKLY SCHEDULE MANAGEMENT TAB                              */}
      {/* ============================================================== */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="p-3 sm:p-4 bg-card rounded-card border-2 border-ink shadow-sticker flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Calendar className="w-5 h-5 text-court" />
                Weekly Schedule Blueprint ({templates.length} blocks total)
              </h3>
              <p className="text-xs text-mute font-medium mt-0.5">
                Configure your baseline court timetable for Monday through Sunday.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openScheduleModal}
                className="px-4 py-2 bg-court text-white font-bold text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center gap-1.5 hover:opacity-95 active:translate-y-[1px]"
              >
                <Calendar className="w-3.5 h-3.5" />
                Rewrite Whole Schedule
              </button>
            </div>
          </div>

          {/* Empty schedule state */}
          {templates.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-ink/40 rounded-card text-center bg-card shadow-sticker space-y-2">
              <div className="w-10 h-10 rounded-full bg-smash/10 border border-smash text-smash flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-sm text-ink">
                Your Schedule is Currently Empty
              </h3>
              <p className="text-xs text-mute max-w-sm mx-auto">
                All timetable blocks have been cleared. Click below to rewrite your weekly schedule, use quick text paste, or load a blueprint.
              </p>
              <div className="pt-2">
                <button
                  onClick={openScheduleModal}
                  className="px-4 py-2 bg-court text-white font-bold text-xs rounded-xl border-2 border-ink shadow-sticker-sm inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" /> Rewrite Week Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Weekday Column */}
              <div className="p-3 sm:p-4 bg-bg rounded-card border-2 border-ink shadow-[0_2px_0_#141B3D] space-y-3">
                <div className="flex items-center justify-between border-b border-rail pb-2">
                  <h4 className="font-display font-bold text-sm text-ink">
                    Weekday Routine (Mon – Fri)
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-court">
                    {templates.filter((t) => t.day_type === 'weekday').length} blocks
                  </span>
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {templates
                    .filter((t) => t.day_type === 'weekday')
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-2 bg-card rounded-lg border border-rail flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-mute w-12">{t.start_time}</span>
                          <span className="font-semibold text-ink">{t.label}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            t.kind === 'core'
                              ? 'bg-court text-white'
                              : t.kind === 'heavy'
                              ? 'bg-smash text-white'
                              : t.kind === 'soft'
                              ? 'bg-mint text-ink'
                              : 'bg-rail text-mute'
                          }`}
                        >
                          {t.kind}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Weekend Column */}
              <div className="p-3 sm:p-4 bg-bg rounded-card border-2 border-ink shadow-[0_2px_0_#141B3D] space-y-3">
                <div className="flex items-center justify-between border-b border-rail pb-2">
                  <h4 className="font-display font-bold text-sm text-ink">
                    Weekend Routine (Sat – Sun)
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-court">
                    {templates.filter((t) => t.day_type === 'weekend').length} blocks
                  </span>
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {templates
                    .filter((t) => t.day_type === 'weekend')
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-2 bg-card rounded-lg border border-rail flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-mute w-12">{t.start_time}</span>
                          <span className="font-semibold text-ink">{t.label}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            t.kind === 'core'
                              ? 'bg-court text-white'
                              : t.kind === 'heavy'
                              ? 'bg-smash text-white'
                              : t.kind === 'soft'
                              ? 'bg-mint text-ink'
                              : 'bg-rail text-mute'
                          }`}
                        >
                          {t.kind}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. CHECKLISTS TAB (Section 6.9)                                */}
      {/* ============================================================== */}
      {activeSubTab === 'checklists' && (
        <div className="space-y-4">
          {/* Sub-selection: Placement / Startup / Projects / Hackathons */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: 'placement', label: 'Placement' },
              { id: 'startup', label: 'Startup' },
              { id: 'projects', label: 'Projects' },
              { id: 'hackathons', label: 'Hackathons' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedList(cat.id as ChecklistList)}
                className={`py-1.5 rounded-xl text-xs font-bold font-display uppercase border-2 transition-all ${
                  selectedList === cat.id
                    ? 'bg-court text-white border-ink shadow-[0_2px_0_#141B3D]'
                    : 'bg-card text-mute border-ink/30 hover:border-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Add Item form */}
          <form
            onSubmit={handleAddChecklistSubmit}
            className="flex gap-2 p-2 bg-card rounded-xl border-2 border-ink shadow-sticker text-xs"
          >
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder={`Add milestone to ${selectedList}...`}
              className="flex-1 px-3 py-1.5 bg-transparent font-medium focus:outline-none"
            />
            <input
              type="date"
              value={newItemDueDate}
              onChange={(e) => setNewItemDueDate(e.target.value)}
              className="px-2 py-1 bg-bg border border-ink/40 rounded-lg font-mono text-[11px]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-court text-white font-bold rounded-lg border-2 border-ink uppercase shadow-[0_2px_0_#141B3D]"
            >
              Add
            </button>
          </form>

          {/* Checklist Items Display */}
          <div className="space-y-2">
            {currentListItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`p-3.5 rounded-xl border-2 border-ink flex items-start gap-3 cursor-pointer transition-all ${
                  item.done
                    ? 'bg-rail/50 border-ink/40 opacity-70'
                    : 'bg-card shadow-[0_2px_0_#141B3D] hover:translate-y-[-1px]'
                }`}
              >
                <button
                  type="button"
                  className={`w-5 h-5 rounded-md border-2 border-ink flex items-center justify-center shrink-0 mt-0.5 ${
                    item.done ? 'bg-mint text-ink font-bold' : 'bg-card'
                  }`}
                >
                  {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-semibold leading-snug ${
                      item.done ? 'line-through text-mute' : 'text-ink'
                    }`}
                  >
                    {item.title}
                  </div>
                  {item.due_date && (
                    <span className="text-[10px] font-mono font-semibold text-court block mt-0.5">
                      Due: {item.due_date}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. STARTUP AUDIT (Section 6.9 megsyra.in PM story guidance)    */}
      {/* ============================================================== */}
      {activeSubTab === 'startups' && (
        <form
          onSubmit={handleStartupSaveSubmit}
          className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-3.5 text-xs text-ink"
        >
          <div className="flex items-center justify-between border-b border-rail pb-2">
            <div>
              <h3 className="font-display text-sm font-bold text-ink">
                Startup Ownership Audit: {editingStartup.name}
              </h3>
              <span className="text-[11px] text-mute font-medium">
                Frame achievements as quantifiable Product &amp; Engineering stories for placements.
              </span>
            </div>
            <span className="px-2 py-0.5 bg-mint text-ink font-bold uppercase rounded-md border border-ink text-[10px]">
              {editingStartup.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Role &amp; Title</label>
              <input
                type="text"
                value={editingStartup.role}
                onChange={(e) => setEditingStartup({ ...editingStartup, role: e.target.value })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Hours / Week</label>
              <input
                type="number"
                value={editingStartup.hours_per_week}
                onChange={(e) => setEditingStartup({ ...editingStartup, hours_per_week: Number(e.target.value) })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-mute mb-1">
              What I Shipped / Owned In The Last 30 Days
            </label>
            <textarea
              rows={2}
              value={editingStartup.owned_last_30_days}
              onChange={(e) => setEditingStartup({ ...editingStartup, owned_last_30_days: e.target.value })}
              className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Users or Customers</label>
              <input
                type="text"
                value={editingStartup.users_or_customers}
                onChange={(e) => setEditingStartup({ ...editingStartup, users_or_customers: e.target.value })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Key Measurable Metric</label>
              <input
                type="text"
                value={editingStartup.key_metric}
                onChange={(e) => setEditingStartup({ ...editingStartup, key_metric: e.target.value })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Next Milestone</label>
              <input
                type="text"
                value={editingStartup.next_milestone}
                onChange={(e) => setEditingStartup({ ...editingStartup, next_milestone: e.target.value })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-mute mb-1">Milestone Target Date</label>
              <input
                type="date"
                value={editingStartup.milestone_date || ''}
                onChange={(e) => setEditingStartup({ ...editingStartup, milestone_date: e.target.value })}
                className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-mono text-xs"
              />
            </div>
          </div>

          {/* Coaching story tip */}
          <div className="p-3 bg-court/10 rounded-xl border border-court text-[11px] font-medium text-ink leading-relaxed">
            <strong>Placement HR / PM Story Angle:</strong> Highlight how you validated requirements with real users, overcame infrastructure bottlenecks, and iterated based on metrics rather than intuition.
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
          >
            Save Startup Audit Record
          </button>
        </form>
      )}

      {/* ============================================================== */}
      {/* 3. SUNDAY WEEKLY REVIEW (Section 6.3)                         */}
      {/* ============================================================== */}
      {activeSubTab === 'weeklyReview' && (
        <div className="space-y-4">
          <div className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink">
                Live 7-Day Performance Summary
              </h3>
              <span className="text-[10px] font-mono text-mute">
                Prompted Sunday 20:30
              </span>
            </div>

            {/* Scoreboard metrics grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-bg rounded-xl border-2 border-ink">
                <span className="text-[10px] font-mono text-mute uppercase block">Counting Days</span>
                <span className="font-display text-lg font-bold text-mint">
                  {weeklyMetrics.countingDays}/7
                </span>
              </div>
              <div className="p-2.5 bg-bg rounded-xl border-2 border-ink">
                <span className="text-[10px] font-mono text-mute uppercase block">Focus Blocks</span>
                <span className="font-display text-lg font-bold text-court">
                  {weeklyMetrics.totalCoreDone}
                </span>
              </div>
              <div className="p-2.5 bg-bg rounded-xl border-2 border-ink">
                <span className="text-[10px] font-mono text-mute uppercase block">Aptitude Acc</span>
                <span className="font-display text-lg font-bold text-shuttle">
                  {weeklyMetrics.aptAcc}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2 bg-bg rounded-xl border border-rail">
                <span className="text-mute block text-[10px] uppercase font-mono">Sleep Hygiene</span>
                <span className="font-semibold text-ink">Bed: {weeklyMetrics.avgBed} • Wake: {weeklyMetrics.avgWake}</span>
              </div>
              <div className="p-2 bg-bg rounded-xl border border-rail">
                <span className="text-mute block text-[10px] uppercase font-mono">Best / Worst Day</span>
                <span className="font-semibold text-ink">{weeklyMetrics.best} (Best) • {weeklyMetrics.worst}</span>
              </div>
            </div>

            {/* Required "My One Change Next Week" form */}
            <form onSubmit={handleWeeklyReviewSubmit} className="pt-2 border-t border-rail space-y-2">
              {/* Show last week's commitment if it exists */}
              {weeklyReviews.length > 0 && (
                <div className="p-2.5 bg-shuttle/20 border-2 border-shuttle rounded-lg space-y-1">
                  <span className="text-[10px] font-mono text-mute uppercase block">Last Week's Commitment:</span>
                  <p className="text-xs font-semibold text-ink">"{weeklyReviews[0].one_change}"</p>
                  <p className="text-[10px] text-mute mt-1">
                    💡 How well did you stick to it? Use that insight for this week's commitment.
                  </p>
                </div>
              )}

              <label className="block text-xs font-bold uppercase tracking-wide text-court">
                My One Change Next Week (Required):
              </label>
              <textarea
                required
                rows={2}
                value={oneChangeInput}
                onChange={(e) => setOneChangeInput(e.target.value)}
                placeholder='e.g., "Phone in the hall before 22:30 so I hit the 06:00 Python block without snoozing."'
                className="w-full p-2.5 bg-bg border-2 border-ink rounded-xl text-xs font-medium focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
              >
                Lock In Sunday Commitment ✓
              </button>
            </form>
          </div>

          {/* Past reviews */}
          {weeklyReviews.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-mute">
                Past Weekly Reviews
              </h4>
              {weeklyReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 bg-card rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-mute">{rev.week_start_date}</span>
                    <span className="font-bold text-mint">{rev.counting_days}/7 Days Counted</span>
                  </div>
                  <div className="font-semibold text-ink">
                    &quot;{rev.one_change}&quot;
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
