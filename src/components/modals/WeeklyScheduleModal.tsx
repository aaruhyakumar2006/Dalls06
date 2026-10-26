'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { BlockTemplate, BlockKind, DayType } from '@/types/database';
import {
  SCHEDULE_PRESETS,
  parseScheduleText,
  templatesToScheduleText,
  SchedulePreset,
} from '@/lib/constants/schedulePresets';
import { formatTime12h, timeToMins } from '@/lib/utils/time';
import { ShuttleIcon, RacketIcon } from '../ui/Icons';
import {
  Calendar,
  Trash2,
  Plus,
  Sparkles,
  RotateCcw,
  Check,
  X,
  FileText,
  SlidersHorizontal,
  Wand2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Copy,
  Clock,
  Flame,
  Info,
} from 'lucide-react';

interface WeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAY_LABELS = [
  { day: 1, label: 'Mon', short: 'M' },
  { day: 2, label: 'Tue', short: 'T' },
  { day: 3, label: 'Wed', short: 'W' },
  { day: 4, label: 'Thu', short: 'T' },
  { day: 5, label: 'Fri', short: 'F' },
  { day: 6, label: 'Sat', short: 'S' },
  { day: 0, label: 'Sun', short: 'S' },
];

export default function WeeklyScheduleModal({ isOpen, onClose }: WeeklyScheduleModalProps) {
  const {
    templates,
    setAllTemplates,
    clearTemplates,
    resetTemplatesToDefault,
    resetToday,
    showToast,
  } = usePlanner();

  // Active view tab: 'builder' | 'bulk_text' | 'ai_generator'
  const [activeTab, setActiveTab] = useState<'builder' | 'bulk_text' | 'ai_generator'>('builder');

  // Day filter in builder: 'weekday' | 'weekend' | 'all'
  const [selectedDayType, setSelectedDayType] = useState<DayType | 'all'>('weekday');

  // Working copy of templates during editing
  const [workingTemplates, setWorkingTemplates] = useState<BlockTemplate[]>([]);

  // Confirmation dialog state for clearing schedule
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearScope, setClearScope] = useState<'all' | 'weekday' | 'weekend'>('all');
  const [alsoResetCompletions, setAlsoResetCompletions] = useState(true);

  // Bulk text state
  const [bulkText, setBulkText] = useState('');
  const [bulkDayType, setBulkDayType] = useState<DayType>('weekday');

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGeneratedText, setAiGeneratedText] = useState('');

  // Sync working copy whenever modal opens or templates change
  useEffect(() => {
    if (isOpen) {
      setWorkingTemplates(templates);
      setBulkText(templatesToScheduleText(templates, 'weekday'));
    }
  }, [isOpen, templates]);

  // Filtered blocks based on current sub-tab
  const displayedBlocks = useMemo(() => {
    return workingTemplates
      .filter((t) => (selectedDayType === 'all' ? true : t.day_type === selectedDayType))
      .sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
  }, [workingTemplates, selectedDayType]);

  if (!isOpen) return null;

  // Handle saving the edited schedule
  const handleSaveSchedule = async () => {
    await setAllTemplates(workingTemplates);
    onClose();
  };

  // Add block to working copy
  const handleAddBlock = () => {
    const targetDayType: DayType = selectedDayType === 'weekend' ? 'weekend' : 'weekday';
    const newBlock: BlockTemplate = {
      id: `custom-${targetDayType}-${Date.now()}`,
      day_type: targetDayType,
      start_time: '12:00',
      label: 'New Focus Block',
      kind: 'core',
      note: '',
      minimum_text: 'Just 20 minutes',
      sort: workingTemplates.length + 1,
      days: targetDayType === 'weekday' ? [1, 2, 3, 4, 5] : [6, 0],
    };
    setWorkingTemplates((prev) => [...prev, newBlock]);
  };

  // Update a single block
  const handleUpdateBlock = (id: string, updates: Partial<BlockTemplate>) => {
    setWorkingTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Delete a block
  const handleDeleteBlock = (id: string) => {
    setWorkingTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // Duplicate a block
  const handleDuplicateBlock = (b: BlockTemplate) => {
    const dup: BlockTemplate = {
      ...b,
      id: `dup-${Date.now()}`,
      label: `${b.label} (Copy)`,
    };
    setWorkingTemplates((prev) => [...prev, dup]);
  };

  // Toggle specific day in days array
  const handleToggleDay = (id: string, dayNum: number) => {
    setWorkingTemplates((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const currentDays = t.days ? [...t.days] : t.day_type === 'weekday' ? [1, 2, 3, 4, 5] : [6, 0];
        const hasDay = currentDays.includes(dayNum);
        const newDays = hasDay
          ? currentDays.filter((d) => d !== dayNum)
          : [...currentDays, dayNum].sort((a, b) => a - b);
        return { ...t, days: newDays };
      })
    );
  };

  // Execute Clear Schedule
  const handleConfirmClear = async () => {
    if (clearScope === 'all') {
      await clearTemplates('all');
      setWorkingTemplates([]);
      setBulkText('');
    } else {
      await clearTemplates(clearScope);
      setWorkingTemplates((prev) => prev.filter((t) => t.day_type !== clearScope));
      setBulkText('');
    }

    if (alsoResetCompletions) {
      resetToday();
    }

    setShowClearConfirm(false);
    showToast(`Schedule cleared (${clearScope === 'all' ? 'Entire week' : clearScope})!`, 'info');
  };

  // Load a preset
  const handleLoadPreset = (preset: SchedulePreset) => {
    const loaded: BlockTemplate[] = preset.templates.map((t, idx) => ({
      ...t,
      id: `preset-${preset.id}-${Date.now()}-${idx + 1}`,
      days: t.day_type === 'weekday' ? [1, 2, 3, 4, 5] : [6, 0],
    }));
    setWorkingTemplates(loaded);
    setBulkText(templatesToScheduleText(loaded, 'weekday'));
    showToast(`Loaded "${preset.name}" preset!`, 'success');
  };

  // Bulk text apply
  const handleApplyBulkText = (targetDayType: DayType | 'both') => {
    if (!bulkText.trim()) {
      showToast('Please enter some schedule text first.', 'info');
      return;
    }

    if (targetDayType === 'both') {
      const wdBlocks = parseScheduleText(bulkText, 'weekday').map((t, i) => ({
        ...t,
        id: `bulk-wd-${Date.now()}-${i}`,
        days: [1, 2, 3, 4, 5],
      }));
      const weBlocks = parseScheduleText(bulkText, 'weekend').map((t, i) => ({
        ...t,
        id: `bulk-we-${Date.now()}-${i}`,
        days: [6, 0],
      }));
      setWorkingTemplates([...wdBlocks, ...weBlocks]);
      showToast(`Parsed & applied ${wdBlocks.length} blocks to entire week!`, 'success');
    } else {
      const parsed = parseScheduleText(bulkText, targetDayType).map((t, i) => ({
        ...t,
        id: `bulk-${targetDayType}-${Date.now()}-${i}`,
        days: targetDayType === 'weekday' ? [1, 2, 3, 4, 5] : [6, 0],
      }));

      // Keep other day type blocks intact
      setWorkingTemplates((prev) => [
        ...prev.filter((t) => t.day_type !== targetDayType),
        ...parsed,
      ]);
      showToast(`Parsed & applied ${parsed.length} blocks to ${targetDayType}s!`, 'success');
    }

    setActiveTab('builder');
  };

  // AI schedule generator trigger
  const handleGenerateAISchedule = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiGeneratedText('');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiPrompt }],
          mode: 'generate_schedule',
        }),
      });

      if (!res.ok) throw new Error('AI generation failed');
      const text = await res.text();
      setAiGeneratedText(text.trim());
    } catch (e: any) {
      showToast(e.message || 'Failed to generate schedule', 'info');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiGenerated = (targetDayType: DayType | 'both') => {
    if (!aiGeneratedText.trim()) return;
    setBulkText(aiGeneratedText);
    if (targetDayType === 'both') {
      const wd = parseScheduleText(aiGeneratedText, 'weekday');
      const we = parseScheduleText(aiGeneratedText, 'weekend');
      setWorkingTemplates([...wd, ...we]);
    } else {
      const parsed = parseScheduleText(aiGeneratedText, targetDayType);
      setWorkingTemplates((prev) => [
        ...prev.filter((t) => t.day_type !== targetDayType),
        ...parsed,
      ]);
    }
    showToast('AI Schedule applied to your weekly routine!', 'success');
    setActiveTab('builder');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Weekly Schedule and Timetable Planner"
        className="w-full sm:max-w-3xl bg-card rounded-t-card sm:rounded-card border-2 border-ink shadow-sticker text-ink overflow-hidden animate-in fade-in zoom-in-95 my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* 1. MODAL HEADER                                                */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-rail bg-bg/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-court text-white flex items-center justify-center border-2 border-ink shadow-[0_2px_0_#141B3D]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                Weekly Schedule Planner
              </h2>
              <p className="text-[11px] sm:text-xs text-mute font-medium">
                Clear existing schedule, rewrite your week, or load custom blueprints.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-lg border-2 border-ink bg-smash text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_2px_0_#141B3D] hover:opacity-95 active:translate-y-[1px]"
              title="Clear current schedule"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Schedule</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg border-2 border-ink bg-bg text-mute hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. PRESETS BAR                                                 */}
        {/* ============================================================== */}
        <div className="px-4 py-2.5 bg-rail/30 border-b border-rail flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] uppercase font-mono font-bold text-mute shrink-0">
            Quick Blueprints:
          </span>
          {SCHEDULE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLoadPreset(p)}
              className="px-2.5 py-1 rounded-lg border border-ink/40 bg-card hover:bg-rail text-[11px] font-semibold text-ink whitespace-nowrap flex items-center gap-1.5 shrink-0 transition-all hover:scale-[1.02]"
              title={p.description}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* ============================================================== */}
        {/* 3. NAVIGATION TABS                                             */}
        {/* ============================================================== */}
        <div className="grid grid-cols-3 p-1.5 m-3 sm:mx-5 bg-bg rounded-xl border-2 border-ink text-xs font-bold uppercase tracking-wider shrink-0">
          <button
            onClick={() => setActiveTab('builder')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'builder'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Interactive Week</span>
          </button>
          <button
            onClick={() => {
              setBulkText(templatesToScheduleText(workingTemplates, selectedDayType === 'weekend' ? 'weekend' : 'weekday'));
              setActiveTab('bulk_text');
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'bulk_text'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Quick Text / Paste</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_generator')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ai_generator'
                ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
                : 'text-mute hover:text-ink'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Generator</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 4. TAB CONTENTS (SCROLLABLE BODY)                               */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4 space-y-4">
          {/* TAB 1: INTERACTIVE TIMELINE BUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-3">
              {/* Day filter selector and Add Block button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-ink text-xs">
                  <button
                    onClick={() => setSelectedDayType('weekday')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedDayType === 'weekday'
                        ? 'bg-court text-white shadow-sticker-sm'
                        : 'text-mute hover:text-ink'
                    }`}
                  >
                    Weekdays ({workingTemplates.filter((t) => t.day_type === 'weekday').length})
                  </button>
                  <button
                    onClick={() => setSelectedDayType('weekend')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedDayType === 'weekend'
                        ? 'bg-court text-white shadow-sticker-sm'
                        : 'text-mute hover:text-ink'
                    }`}
                  >
                    Weekends ({workingTemplates.filter((t) => t.day_type === 'weekend').length})
                  </button>
                  <button
                    onClick={() => setSelectedDayType('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedDayType === 'all'
                        ? 'bg-court text-white shadow-sticker-sm'
                        : 'text-mute hover:text-ink'
                    }`}
                  >
                    All ({workingTemplates.length})
                  </button>
                </div>

                <button
                  onClick={handleAddBlock}
                  className="px-3 py-1.5 bg-mint text-ink font-bold text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center gap-1.5 hover:bg-mint/90 active:translate-y-[1px]"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> Add Block
                </button>
              </div>

              {/* Block List */}
              {displayedBlocks.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-ink/40 rounded-card text-center bg-bg/50 space-y-2">
                  <Clock className="w-8 h-8 text-mute mx-auto" />
                  <h4 className="font-display font-bold text-sm text-ink">
                    No schedule blocks for {selectedDayType === 'all' ? 'this week' : selectedDayType + 's'}.
                  </h4>
                  <p className="text-xs text-mute max-w-sm mx-auto">
                    Your timetable is currently clean. Click &quot;Add Block&quot;, load a blueprint above, or paste a routine in the text editor.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      onClick={handleAddBlock}
                      className="px-4 py-2 bg-court text-white font-bold text-xs rounded-xl border-2 border-ink shadow-sticker-sm"
                    >
                      + Create First Block
                    </button>
                    <button
                      onClick={() => handleLoadPreset(SCHEDULE_PRESETS[0])}
                      className="px-4 py-2 bg-card border-2 border-ink font-bold text-xs rounded-xl shadow-sticker-sm"
                    >
                      Load CSE Preset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-bg rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] space-y-2 text-xs"
                    >
                      {/* Row 1: Time, Title, Kind, and Actions */}
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={b.start_time}
                          onChange={(e) => handleUpdateBlock(b.id, { start_time: e.target.value })}
                          className="px-2 py-1.5 bg-card border-2 border-ink rounded-lg font-mono font-bold text-xs"
                        />

                        <input
                          type="text"
                          value={b.label}
                          onChange={(e) => handleUpdateBlock(b.id, { label: e.target.value })}
                          placeholder="Activity name (e.g. Python practice)"
                          className="flex-1 px-3 py-1.5 bg-card border-2 border-ink rounded-lg font-bold text-xs"
                        />

                        <select
                          value={b.kind}
                          onChange={(e) => handleUpdateBlock(b.id, { kind: e.target.value as BlockKind })}
                          className={`px-2 py-1.5 rounded-lg border-2 border-ink font-bold text-xs ${
                            b.kind === 'core'
                              ? 'bg-court text-white'
                              : b.kind === 'heavy'
                              ? 'bg-smash text-white'
                              : b.kind === 'soft'
                              ? 'bg-mint text-ink'
                              : 'bg-card text-ink'
                          }`}
                        >
                          <option value="core">Core (Counts Focus)</option>
                          <option value="heavy">Heavy (Deep Work)</option>
                          <option value="soft">Soft (Habit / Routine)</option>
                          <option value="fixed">Fixed (Commute / Class)</option>
                        </select>

                        <button
                          onClick={() => handleDuplicateBlock(b)}
                          title="Duplicate block"
                          className="p-1.5 rounded-lg border border-ink/40 bg-card text-mute hover:text-ink"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(b.id)}
                          title="Delete block"
                          className="p-1.5 rounded-lg border border-ink/40 bg-card text-mute hover:text-smash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Row 2: Notes & Minimum text */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={b.note || ''}
                          onChange={(e) => handleUpdateBlock(b.id, { note: e.target.value })}
                          placeholder="Guidance note (e.g. Write from blank, no notes)"
                          className="px-2.5 py-1 bg-card border border-ink rounded-lg text-[11px]"
                        />
                        <input
                          type="text"
                          value={b.minimum_text || ''}
                          onChange={(e) => handleUpdateBlock(b.id, { minimum_text: e.target.value })}
                          placeholder="Low-energy fallback (e.g. Just 20 minutes)"
                          className="px-2.5 py-1 bg-card border border-ink rounded-lg text-[11px]"
                        />
                      </div>

                      {/* Row 3: Day of Week Pills (M, T, W, T, F, S, S) */}
                      <div className="flex items-center justify-between pt-1 border-t border-rail/60 text-[11px]">
                        <span className="text-mute font-medium">Apply to days:</span>
                        <div className="flex items-center gap-1">
                          {DAY_LABELS.map(({ day, short, label }) => {
                            const isSelected = b.days ? b.days.includes(day) : (
                              b.day_type === 'weekday' ? [1, 2, 3, 4, 5].includes(day) : [6, 0].includes(day)
                            );
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => handleToggleDay(b.id, day)}
                                title={label}
                                className={`w-6 h-6 rounded-md font-mono text-[10px] font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-court text-white border-ink'
                                    : 'bg-card text-mute border-ink/20 hover:border-ink'
                                }`}
                              >
                                {short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK BULK TEXT / PASTE EDITOR */}
          {activeTab === 'bulk_text' && (
            <div className="space-y-3">
              <div className="p-3 bg-bg rounded-xl border border-ink text-xs space-y-1">
                <span className="font-bold font-display text-ink flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-court" /> Fast Bulk Schedule Importer
                </span>
                <p className="text-mute text-[11px]">
                  Type or paste one block per line. Format: <code className="font-mono bg-card px-1 py-0.5 rounded border border-ink/20">HH:mm - Activity title (core/heavy/soft/fixed) // guidance note</code>
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink">Schedule Lines:</span>
                <button
                  onClick={() => setBulkText(templatesToScheduleText(workingTemplates, 'weekday'))}
                  className="text-court font-bold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Load current weekday schedule as text
                </button>
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                placeholder={`06:00 - Morning DSA practice (core) // write from blank\n07:15 - Breakfast and get ready\n08:30 - College lectures (fixed)\n16:30 - Sport drills / gym (fixed)\n19:30 - Aptitude timed reps (core)\n20:30 - Deep block Project (heavy)\n22:00 - Wind down (soft)\n22:45 - Sleep (fixed)`}
                className="w-full p-3 bg-bg border-2 border-ink rounded-xl font-mono text-xs focus:outline-none shadow-[0_2px_0_#141B3D]"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-mute font-mono">
                  {bulkText.split('\n').filter((l) => l.trim()).length} lines detected
                </span>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApplyBulkText('weekday')}
                    className="px-3 py-2 bg-court text-white font-bold text-xs rounded-xl border-2 border-ink shadow-sticker-sm hover:opacity-95"
                  >
                    Apply to Weekdays (Mon-Fri)
                  </button>
                  <button
                    onClick={() => handleApplyBulkText('weekend')}
                    className="px-3 py-2 bg-court text-white font-bold text-xs rounded-xl border-2 border-ink shadow-sticker-sm hover:opacity-95"
                  >
                    Apply to Weekends (Sat-Sun)
                  </button>
                  <button
                    onClick={() => handleApplyBulkText('both')}
                    className="px-3.5 py-2 bg-mint text-ink font-bold text-xs rounded-xl border-2 border-ink shadow-sticker-sm hover:opacity-95"
                  >
                    Apply to All 7 Days
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI SCHEDULE GENERATOR */}
          {activeTab === 'ai_generator' && (
            <div className="space-y-3">
              <div className="p-3 bg-bg rounded-xl border border-ink text-xs space-y-1">
                <span className="font-bold font-display text-ink flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-court" /> AI Weekly Schedule Architect
                </span>
                <p className="text-mute text-[11px]">
                  Tell the coach your constraints, college hours, study goals, or bedtime, and it will rewrite a high-performance timetable.
                </p>
              </div>

              {/* Idea Prompt Chips */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  onClick={() =>
                    setAiPrompt('I have college from 08:30 to 16:00. I need 1 hour of morning DSA at 6am, 1 hour of badminton at 5pm, 20 min aptitude at night, and sleep at 22:45.')
                  }
                  className="px-2.5 py-1 bg-bg border border-ink rounded-lg text-mute hover:text-ink"
                >
                  🏫 College + 2 Study Blocks
                </button>
                <button
                  onClick={() =>
                    setAiPrompt('Exam sprint week: I have no classes. Need 4 focused study blocks of 90 minutes each with spaced recall breaks, daily walk, and 8 hours sleep.')
                  }
                  className="px-2.5 py-1 bg-bg border border-ink rounded-lg text-mute hover:text-ink"
                >
                  ⚡ Intense Exam Sprint
                </button>
                <button
                  onClick={() =>
                    setAiPrompt('Internship routine: Working 9am to 6pm. Need early morning coding 6:30am, evening side project 8pm, and 10:30pm wind down.')
                  }
                  className="px-2.5 py-1 bg-bg border border-ink rounded-lg text-mute hover:text-ink"
                >
                  💼 9-to-5 Work & Switch Prep
                </button>
              </div>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="Describe your ideal schedule or daily routine here..."
                className="w-full p-3 bg-bg border-2 border-ink rounded-xl text-xs font-medium focus:outline-none shadow-[0_2px_0_#141B3D]"
              />

              <button
                onClick={handleGenerateAISchedule}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-2.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {aiLoading ? (
                  <>
                    <ShuttleIcon className="w-4 h-4 animate-spin" />
                    Generating Week Schedule...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Week Blueprint
                  </>
                )}
              </button>

              {aiGeneratedText && (
                <div className="p-3 bg-bg rounded-xl border-2 border-ink space-y-2 mt-3 animate-in fade-in">
                  <span className="text-[11px] font-bold uppercase text-court block">
                    AI Generated Schedule Preview:
                  </span>
                  <pre className="p-2.5 bg-card border border-ink rounded-lg font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {aiGeneratedText}
                  </pre>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleApplyAiGenerated('weekday')}
                      className="px-3 py-1.5 bg-court text-white font-bold text-xs rounded-lg border border-ink shadow-sticker-sm"
                    >
                      Apply to Weekdays
                    </button>
                    <button
                      onClick={() => handleApplyAiGenerated('both')}
                      className="px-3.5 py-1.5 bg-mint text-ink font-bold text-xs rounded-lg border border-ink shadow-sticker-sm"
                    >
                      Apply to Whole Week
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 5. FOOTER ACTIONS                                              */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-t-2 border-rail bg-bg/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-mute font-medium">
            <span>
              Total: <strong>{workingTemplates.length} blocks</strong> configured
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border-2 border-ink bg-card text-ink font-bold text-xs uppercase shadow-[0_2px_0_#141B3D]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSchedule}
              className="px-5 py-2 rounded-xl border-2 border-ink bg-court text-white font-bold text-xs uppercase tracking-wider shadow-sticker hover:opacity-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Save &amp; Apply Schedule
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. CLEAR SCHEDULE CONFIRMATION OVERLAY                         */}
        {/* ============================================================== */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 bg-ink/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card rounded-card border-2 border-ink shadow-sticker p-5 space-y-4 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-smash/20 border-2 border-smash text-smash flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    Clear Current Schedule?
                  </h3>
                  <p className="text-xs text-mute font-medium mt-1 leading-relaxed">
                    This will wipe the schedule blocks so you can rewrite your routine from scratch. You can always reload a preset later.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="block text-mute font-bold uppercase text-[10px]">
                  What would you like to clear?
                </label>
                <div className="grid grid-cols-3 gap-2 font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setClearScope('all')}
                    className={`p-2 rounded-lg border-2 border-ink ${
                      clearScope === 'all' ? 'bg-smash text-white' : 'bg-bg text-ink'
                    }`}
                  >
                    Entire Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearScope('weekday')}
                    className={`p-2 rounded-lg border-2 border-ink ${
                      clearScope === 'weekday' ? 'bg-smash text-white' : 'bg-bg text-ink'
                    }`}
                  >
                    Weekdays Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearScope('weekend')}
                    className={`p-2 rounded-lg border-2 border-ink ${
                      clearScope === 'weekend' ? 'bg-smash text-white' : 'bg-bg text-ink'
                    }`}
                  >
                    Weekends Only
                  </button>
                </div>

                <label className="flex items-center gap-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoResetCompletions}
                    onChange={(e) => setAlsoResetCompletions(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-ink text-court"
                  />
                  <span className="text-xs text-mute font-medium">
                    Also reset today&apos;s checked ticks and day log
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rail">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl border-2 border-ink bg-bg text-ink font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-4 py-2 rounded-xl border-2 border-ink bg-smash text-white font-bold text-xs uppercase shadow-[0_2px_0_#141B3D] flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirm Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
