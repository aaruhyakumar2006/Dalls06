'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import {
  formatTime12h,
  timeToMins,
  getCurrentTimeMins,
  getGoogleCalendarLink,
} from '@/lib/utils/time';
import { detectPullToRefresh, debounce } from '@/lib/utils/gestures';
import { BlockTemplate, TaskItem } from '@/types/database';
import FocusTimerModal from '../modals/FocusTimerModal';
import SkyHeader from '../ui/SkyHeader';
import RallyCounter from '../ui/RallyCounter';
import PromptBar from '../ui/PromptBar';
import { ShuttleIcon, RacketIcon, CourtCornerIcon, FlameIcon } from '../ui/Icons';
import {
  Check,
  Timer,
  CalendarPlus,
  ArrowUp,
  ArrowDown,
  Trash2,
  GripVertical,
  Plus,
  RefreshCw,
  Clock,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskRowProps {
  task: TaskItem;
  index: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onScheduleSlot: (id: string, timeStr: string) => void;
  isFirst: boolean;
  isLast: boolean;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAddTag?: (id: string) => void;
}

function SortableTaskRow({
  task,
  index,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onScheduleSlot,
  isFirst,
  isLast,
  onEdit,
  onDuplicate,
  onAddTag,
}: SortableTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickTime, setPickTime] = useState(task.at_time || '20:00');

  // Long-press context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const swipeStartX = useRef(0);

  // Auto-hide delete confirmation after 5 seconds
  useEffect(() => {
    if (swipeOffset <= -60) {
      const t = setTimeout(() => setSwipeOffset(0), 5000);
      return () => clearTimeout(t);
    }
  }, [swipeOffset]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Long-press handlers
  const handlePressStart = () => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      setShowContextMenu(true);
    }, 500);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Swipe-to-delete handlers
  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeStartX.current;
    if (dx < -10) {
      // Left swipe
      setSwipeOffset(Math.max(dx, -80));
    } else if (dx > 10) {
      // Right swipe / dismiss
      setSwipeOffset(0);
    }
  };

  const handleSwipeEnd = () => {
    if (swipeOffset <= -60) {
      setSwipeOffset(-80);
    } else {
      setSwipeOffset(0);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden flex flex-col p-3 rounded-xl transition-all ${
        task.done
          ? 'bg-gray-100 shadow-none'
          : 'bg-white shadow-card-soft hover:shadow-card-hover hover:translate-y-[-1px]'
      }`}
    >
      {/* Swipe-to-delete backdrop */}
        <div
        className="absolute inset-y-0 right-0 w-20 bg-secondary flex items-center justify-center rounded-r-xl"
        style={{ opacity: swipeOffset < 0 ? Math.min(Math.abs(swipeOffset) / 80, 1) : 0 }}
      >
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-white font-bold text-xs flex flex-col items-center gap-1"
        >
          <Trash2 className="w-5 h-5" />
          Delete
        </button>
      </div>

      {/* Main content - swipeable */}
      <div
        onTouchStart={(e) => {
          handleSwipeStart(e);
          handlePressStart();
        }}
        onTouchMove={(e) => {
          handleSwipeMove(e);
        }}
        onTouchEnd={() => {
          handleSwipeEnd();
          handlePressEnd();
        }}
        className={`flex items-center gap-2 transition-transform ${
          isPressed ? 'ring-2 ring-primary scale-[0.99]' : ''
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transitionDuration: '0.15s',
          transitionTimingFunction: 'ease',
        }}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-text-muted hover:text-text-charcoal cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Tactile Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          aria-label={`Mark task ${index + 1} done`}
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 active:scale-95 ${
            task.done ? 'bg-success text-white font-bold' : 'bg-white border-2 border-gray-300 hover:border-success hover:bg-success/10'
          }`}
        >
          {task.done && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        {/* Title & metadata */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-semibold truncate ${
              task.done ? 'line-through text-text-muted' : 'text-text-charcoal'
            }`}
          >
            {task.title}
          </div>
          
          {/* Description preview */}
          {task.description && (
            <div className="text-[11px] text-text-muted mt-0.5 truncate">
              {task.description.length > 100 ? task.description.substring(0, 100) + '...' : task.description}
            </div>
          )}

          {/* Recurrence badge & Tags */}
          <div className="flex items-center flex-wrap gap-1.5 mt-1">
            {task.recurrence_pattern && task.recurrence_pattern !== 'none' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-info/20 text-info rounded">
                🔄 {task.recurrence_pattern === 'daily' ? 'Daily' : 'Weekly'}
              </span>
            )}
            {task.tags && task.tags.length > 0 && (
              task.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] font-semibold px-1.5 py-0.5 bg-info/20 text-info rounded">
                  {tag}
                </span>
              ))
            )}
            {task.tags && task.tags.length > 3 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-info/20 text-info rounded">
                +{task.tags.length - 3} more
              </span>
            )}
          </div>

          {(task.at_time || task.duration_min) && (
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-text-muted mt-1.5">
              {task.at_time && (
                <span className="flex items-center gap-1 text-primary font-semibold">
                  <Clock className="w-3 h-3" /> {formatTime12h(task.at_time)}
                </span>
              )}
              {task.duration_min && <span>⏳ {task.duration_min}m</span>}
              {task.at_time && (
                <a
                  href={getGoogleCalendarLink(task)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-0.5 font-sans font-bold"
                  title="Add to Google Calendar"
                >
                  <CalendarPlus className="w-3 h-3" /> GCal
                </a>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Schedule button */}
          <button
            onClick={() => setShowTimePicker(!showTimePicker)}
            title="Schedule in timetable slot"
            className="p-1.5 rounded-lg border border-gray-300 text-text-muted hover:text-text-charcoal hover:bg-gray-50 text-[11px] font-bold"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveUp(task.id)}
            disabled={isFirst}
            aria-label="Move up"
            className="p-1 text-text-muted hover:text-text-charcoal disabled:opacity-20"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown(task.id)}
            disabled={isLast}
            aria-label="Move down"
            className="p-1 text-text-muted hover:text-text-charcoal disabled:opacity-20"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
            className="p-1 text-text-muted hover:text-error"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Long-press context menu overlay */}
      {showContextMenu && (
        <div
          className="absolute inset-0 z-50 rounded-xl bg-black/80 flex items-center justify-center gap-2 flex-wrap p-3"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
          }}
        >
          {[
            { label: 'Edit', icon: '✏️', action: () => onEdit?.(task.id) },
            {
              label: task.done ? 'Mark Incomplete' : 'Mark Done',
              icon: task.done ? '↩️' : '✅',
              action: () => {
                onToggle(task.id);
                setShowContextMenu(false);
              },
            },
            {
              label: 'Delete',
              icon: '🗑️',
              action: () => {
                onDelete(task.id);
                setShowContextMenu(false);
              },
            },
            { label: 'Duplicate', icon: '📋', action: () => onDuplicate?.(task.id) },
            { label: 'Add Tag', icon: '🏷️', action: () => onAddTag?.(task.id) },
          ].map(({ label, icon, action }) => (
            <button
              key={label}
              onClick={(e) => {
                e.stopPropagation();
                action();
              }}
              className="flex flex-col items-center gap-1 px-3 py-2 bg-white rounded-xl text-xs font-bold text-text-charcoal shadow-card-soft active:scale-98 min-w-[60px]"
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Swipe-to-delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 bg-black/90 rounded-xl flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-white font-bold text-sm text-center">Delete this task?</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setSwipeOffset(0);
              }}
              className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-text-charcoal"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete(task.id);
                setShowDeleteConfirm(false);
              }}
              className="px-4 py-2 bg-error rounded-xl text-xs font-bold text-white shadow-card-soft"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Inline time picker */}
      {showTimePicker && (
        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted font-medium">Slot time:</span>
            <input
              type="time"
              value={pickTime}
              onChange={(e) => setPickTime(e.target.value)}
              className="px-2 py-1 bg-white border border-gray-300 rounded-lg font-mono text-xs"
            />
          </div>
          <button
            onClick={() => {
              onScheduleSlot(task.id, pickTime);
              setShowTimePicker(false);
            }}
            className="px-3 py-1 bg-primary text-white font-bold rounded-lg text-xs uppercase shadow-card-soft active:scale-98"
          >
            Set Slot
          </button>
        </div>
      )}
    </div>
  );
}

export default function TodayTab() {
  const {
    todayDateKey,
    selectedDateKey,
    dayLogs,
    completions,
    templates,
    toggleBlock,
    toggleLowEnergy,
    toggleMatchDay,
    resetToday,
    streak,
    weekDayCounts,
    tasks,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderTasks,
    profile,
    showToast,
    openScheduleModal,
    manualSync,
    syncInProgress,
    lastSyncTime,
  } = usePlanner();

  const [activeTimerBlock, setActiveTimerBlock] = useState<{
    key: string;
    label: string;
    kind: string;
  } | null>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [pullPhase, setPullPhase] = useState<'idle' | 'pulling' | 'release' | 'syncing' | 'synced'>(
    'idle'
  );
  const pullStartY = useRef(0);
  const lastSyncTrigger = useRef(0);

  // Debounced sync trigger
  const debouncedSync = useMemo(() => debounce(() => manualSync(), 3000), []);

  // Auto-refresh minute counter for "Right now" card and timeline marker
  const [currentTimeMins, setCurrentTimeMins] = useState(getCurrentTimeMins());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMins(getCurrentTimeMins()), 20000);
    return () => clearInterval(timer);
  }, []);

  const dKey = selectedDateKey;
  const currentDayLog = dayLogs[dKey] || {
    date: dKey,
    low_energy: false,
    match_day: false,
    core_done: 0,
  };
  const currentCompletions = completions[dKey] || {};

  const todayObj = useMemo(() => new Date(), []);
  const dow = todayObj.getDay();
  const isWeekend = dow === 0 || dow === 6;

  // Schedule blocks with match day insertion
  const scheduleBlocks: BlockTemplate[] = useMemo(() => {
    const base = templates.filter((t) => {
      if (t.days && t.days.length > 0) {
        return t.days.includes(dow);
      }
      return isWeekend ? t.day_type === 'weekend' : t.day_type === 'weekday';
    });

    let list = [...base];

    // If match day: add match block (Fri 21:30 or Weekend 17:00)
    if (currentDayLog.match_day) {
      const matchTime = isWeekend ? '17:00' : '21:30';
      const matchExists = list.some((b) => b.start_time === matchTime && b.label.includes('match'));
      if (!matchExists) {
        list.push({
          id: 'temp-match-block',
          day_type: isWeekend ? 'weekend' : 'weekday',
          start_time: matchTime,
          label: 'Badminton match',
          kind: 'fixed',
          note: isWeekend ? 'Eat well and hydrate' : 'Late night. Keep Saturday morning light.',
          sort: 99,
        });
      }
    }

    return list.sort((a, b) => timeToMins(a.start_time) - timeToMins(b.start_time));
  }, [templates, isWeekend, currentDayLog.match_day]);

  // Is block skipped by match day?
  const isBlockSkipped = (b: BlockTemplate) => {
    return Boolean(currentDayLog.match_day && b.kind === 'heavy');
  };

  // Counting core blocks
  const coreBlocks = useMemo(() => {
    return scheduleBlocks.filter((b) => (b.kind === 'core' || b.kind === 'heavy') && !isBlockSkipped(b));
  }, [scheduleBlocks, currentDayLog.match_day]);

  const coreDoneCount = useMemo(() => {
    return coreBlocks.filter((b) => currentCompletions[b.start_time]).length;
  }, [coreBlocks, currentCompletions]);

  // Current active block index calculation
  const currentBlockIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < scheduleBlocks.length; i++) {
      if (timeToMins(scheduleBlocks[i].start_time) <= currentTimeMins) {
        idx = i;
      }
    }
    return idx;
  }, [scheduleBlocks, currentTimeMins]);

  // Right now card data with live countdown
  const rightNowCardData = useMemo(() => {
    if (scheduleBlocks.length === 0) return null;
    if (currentBlockIndex < 0) {
      const first = scheduleBlocks[0];
      const startM = timeToMins(first.start_time);
      const diffM = Math.max(0, startM - currentTimeMins);
      return {
        prefix: `Next up at ${formatTime12h(first.start_time)} (${diffM}m away)`,
        block: first,
        note: first.note,
        nextBlock: null,
        remainingMins: diffM,
      };
    }
    const curr = scheduleBlocks[currentBlockIndex];
    const nxt = scheduleBlocks[currentBlockIndex + 1] || null;
    const note =
      currentDayLog.low_energy && curr.minimum_text
        ? `${curr.minimum_text} is enough today`
        : isBlockSkipped(curr)
        ? 'Skipped today because of the match'
        : curr.note;

    // Calculate remaining minutes in current block until next block
    let remainingMins = 0;
    if (nxt) {
      remainingMins = Math.max(0, timeToMins(nxt.start_time) - currentTimeMins);
    } else {
      // Until midnight
      remainingMins = Math.max(0, 1440 - currentTimeMins);
    }

    return {
      prefix: `Right now, since ${formatTime12h(curr.start_time)}`,
      block: curr,
      note,
      nextBlock: nxt,
      remainingMins,
    };
  }, [scheduleBlocks, currentBlockIndex, currentTimeMins, currentDayLog.low_energy]);

  // Handle block completion with celebratory feedback
  const handleToggleBlockWithCelebration = (
    dateKey: string,
    startTime: string,
    kind: string,
    label: string
  ) => {
    const isAlreadyDone = !!currentCompletions[startTime];
    toggleBlock(dateKey, startTime, kind, label);

    // If transitioning to done: fire celebratory effects
    if (!isAlreadyDone) {
      // Haptics on mobile
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate([40, 30, 60]);
      }

      // Check if this makes today count (second core done)
      const willBeCounted = (kind === 'core' || kind === 'heavy') && coreDoneCount + 1 >= 2;
      confetti({
        particleCount: willBeCounted ? 90 : 35,
        spread: willBeCounted ? 75 : 45,
        origin: { y: 0.65 },
        colors: ['#2E5BFF', '#FF3B7F', '#FFD21F', '#12D6A5'],
      });
    }
  };

  // Schedule task into a slot
  const handleScheduleTaskInSlot = (taskId: string, slotTime: string) => {
    updateTask(taskId, { at_time: slotTime });
    showToast(`Task assigned to ${formatTime12h(slotTime)}`, 'success');
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const copy = [...tasks];
        const [moved] = copy.splice(oldIndex, 1);
        copy.splice(newIndex, 0, moved);
        reorderTasks(copy);
      }
    }
  };

  // Pull-to-refresh handlers
  const handlePullStart = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };

  const handlePullMove = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop === 0 && pullStartY.current > 0) {
      const distance = detectPullToRefresh(pullStartY.current, e.touches[0].clientY, 80);
      setPullDistance(distance);

      if (distance < 80) {
        setPullPhase('pulling');
      } else {
        setPullPhase('release');
      }
    }
  };

  const handlePullEnd = () => {
    if (pullPhase === 'release' && Date.now() - lastSyncTrigger.current > 3000) {
      setPullPhase('syncing');
      debouncedSync();
      lastSyncTrigger.current = Date.now();

      const syncTimer = setTimeout(() => {
        setPullPhase('synced');
        const resetTimer = setTimeout(() => {
          setPullDistance(0);
          setPullPhase('idle');
        }, 1500);
        return () => clearTimeout(resetTimer);
      }, 0);

      return () => clearTimeout(syncTimer);
    }

    setPullDistance(0);
    setPullPhase('idle');
    pullStartY.current = 0;
  };

  return (
    <div
      className="space-y-4"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullPhase !== 'idle' && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-text-muted transition-all">
          <RefreshCw
            className={`w-4 h-4 ${
              pullPhase === 'syncing' ? 'animate-spin text-primary' : 'text-text-muted'
            }`}
          />
          <span>
            {pullPhase === 'pulling' && 'Pull to refresh'}
            {pullPhase === 'release' && 'Release to sync'}
            {pullPhase === 'syncing' && 'Syncing...'}
            {pullPhase === 'synced' && 'Synced ✓'}
          </span>
        </div>
      )}
      {/* 1. SKY HEADER (Dawn / Day / Dusk / Night) */}
      <SkyHeader
        timezone={profile.timezone}
        isWeekend={isWeekend}
        matchDay={currentDayLog.match_day}
        lowEnergy={currentDayLog.low_energy}
      />

      {/* 2. MOBILE RALLY SCOREBOARD (Visible on phones; hidden on desktop where right-panel shows it) */}
      <div className="md:hidden">
        <RallyCounter streak={streak} weekDayCounts={weekDayCounts} />
      </div>

      {/* 3. SIGNATURE ELEMENT: RIGHT NOW CARD */}
      {rightNowCardData && (
        <section
          role="region"
          aria-label="Current activity card"
          suppressHydrationWarning
          className="relative bg-primary text-white rounded-card-xl p-4 sm:p-5 shadow-card-hover overflow-hidden"
        >
          {/* Subtle gradient motif */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-accent-yellow/10 skew-x-12 pointer-events-none" />

          <div
            className="flex items-center justify-between text-xs font-mono text-accent-yellow mb-1"
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>{rightNowCardData.prefix}</span>
            {rightNowCardData.remainingMins > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-accent-yellow text-text-charcoal font-bold" suppressHydrationWarning>
                {rightNowCardData.remainingMins}m left
              </span>
            )}
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            {rightNowCardData.block.label}
          </h3>

          {rightNowCardData.note && (
            <p className="text-sm text-white/80 mt-1 mb-4 leading-normal font-medium">
              {rightNowCardData.note}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-white/20 text-xs">
            <div className="text-white/70">
              {rightNowCardData.nextBlock ? (
                <span>
                  Next:{' '}
                  <strong className="text-white font-semibold">
                    {rightNowCardData.nextBlock.label}
                  </strong>{' '}
                  at {formatTime12h(rightNowCardData.nextBlock.start_time)}
                </span>
              ) : (
                <span>Final scheduled block today</span>
              )}
            </div>

            {(rightNowCardData.block.kind === 'core' || rightNowCardData.block.kind === 'heavy') &&
              !isBlockSkipped(rightNowCardData.block) && (
                <button
                  onClick={() =>
                    setActiveTimerBlock({
                      key: rightNowCardData.block.start_time,
                      label: rightNowCardData.block.label,
                      kind: rightNowCardData.block.kind,
                    })
                  }
                  className="px-3 py-1.5 bg-accent-yellow text-text-charcoal font-bold uppercase tracking-wider rounded-xl text-xs flex items-center gap-1.5 shadow-card-soft active:scale-98"
                >
                  <Timer className="w-3.5 h-3.5" /> Start Timer
                </button>
              )}
          </div>
        </section>
      )}

      {/* 4. MODE TOGGLES (Low-Energy & Match Day) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => toggleLowEnergy(selectedDateKey)}
          aria-pressed={currentDayLog.low_energy}
          className={`p-3 rounded-card-xl text-left transition-all ${
            currentDayLog.low_energy
              ? 'bg-accent-yellow text-text-charcoal shadow-card-soft'
              : 'bg-white text-text-charcoal shadow-card-soft hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <b className="font-display text-xs font-bold uppercase tracking-wide">Low-Energy</b>
            <span className="text-xs">⚡</span>
          </div>
          <p className="text-[11px] text-text-muted font-medium mt-0.5 leading-snug">
            Switches blocks to minimum 20 min reps
          </p>
        </button>

        <button
          onClick={() => toggleMatchDay(selectedDateKey)}
          aria-pressed={currentDayLog.match_day}
          className={`p-3 rounded-card-xl text-left transition-all ${
            currentDayLog.match_day
              ? 'bg-success text-white shadow-card-soft'
              : 'bg-white text-text-charcoal shadow-card-soft hover:shadow-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <b className="font-display text-xs font-bold uppercase tracking-wide">Match Day</b>
            <span className="text-xs">🏸</span>
          </div>
          <p className="text-[11px] text-text-muted font-medium mt-0.5 leading-snug">
            Greys deep work, adds tournament match
          </p>
        </button>
      </div>

      {/* 5. COURT-RAIL TIMELINE */}
      <section aria-label="Today court timetable" className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold font-display tracking-tight text-text-charcoal flex items-center gap-2">
              <RacketIcon className="w-5 h-5 text-primary" />
              Court-Rail Timetable
            </h2>
            <span className="text-[11px] text-text-muted font-medium">
              Slide shuttle to current time • Swipe to check
            </span>
          </div>

          <div className="flex items-center gap-2" suppressHydrationWarning>
            <span
              className="text-xs font-mono font-bold text-primary hidden sm:inline"
              suppressHydrationWarning
            >
              {coreDoneCount}/{coreBlocks.length} Focus Blocks
            </span>
            <button
              onClick={openScheduleModal}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-text-charcoal font-bold text-xs flex items-center gap-1.5 shadow-card-soft active:scale-98"
              title="Clear or rewrite weekly schedule"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Rewrite Schedule</span>
            </button>
          </div>
        </div>

        {/* Timetable Rail Container */}
        {scheduleBlocks.length === 0 ? (
          <div className="p-6 border-2 border-dashed border-gray-300 rounded-card-xl text-center bg-white shadow-card-soft space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-sm text-text-charcoal">
              Schedule is Currently Clear
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              You cleared your timetable blocks. You can design your routine for this week or load a blueprint preset anytime.
            </p>
            <div className="pt-2">
              <button
                onClick={openScheduleModal}
                className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow-card-soft inline-flex items-center gap-1.5 hover:opacity-95 active:scale-98"
              >
                <Calendar className="w-3.5 h-3.5" /> Rewrite Weekly Schedule
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-3">
            {/* Vertical Court Rail Line */}
            <div className="absolute left-2.5 sm:left-3.5 top-2 bottom-2 w-1 bg-gray-300 rounded-full" />

          {scheduleBlocks.map((b, i) => {
            const skipped = isBlockSkipped(b);
            const isTickable = (b.kind === 'core' || b.kind === 'heavy' || b.kind === 'soft') && !skipped;
            const isDone = !!currentCompletions[b.start_time];
            const isCurrent = i === currentBlockIndex;
            const isFixed = b.kind === 'fixed';

            // Tasks scheduled during this block's timeframe
            const tasksInSlot = tasks.filter((t) => t.at_time === b.start_time);

            const noteText = skipped
              ? 'Skipped today because of the match'
              : currentDayLog.low_energy && b.minimum_text
              ? ''
              : b.note;

            // Card kind colors
            let badgeBg = 'bg-gray-200 text-text-muted';
            let cardBorder = 'border-gray-300';
            let cardBg = 'bg-white';

            if (b.kind === 'core') {
              badgeBg = 'bg-primary text-white';
            } else if (b.kind === 'heavy') {
              badgeBg = 'bg-secondary text-white';
            } else if (b.kind === 'soft') {
              badgeBg = 'bg-success text-white';
            }

            if (skipped) {
              cardBg = 'bg-gray-100 opacity-60';
              cardBorder = 'border-dashed border-gray-300';
            } else if (isCurrent) {
              cardBorder = 'border-primary ring-4 ring-primary/20 shadow-card-hover';
            }

            return (
              <div key={b.id || b.start_time} className="relative group">
                {/* Court Rail Node / Shuttle Marker */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-accent-yellow ring-4 ring-accent-yellow/40 scale-125 z-10'
                      : isDone
                      ? 'bg-success border-2 border-white'
                      : 'bg-white border-2 border-gray-300'
                  }`}
                >
                  {isCurrent && <ShuttleIcon className="w-2.5 h-2.5 text-text-charcoal" />}
                </div>

                {/* Block Card */}
                <div
                  className={`rounded-card-xl border-2 p-3 sm:p-3.5 shadow-card-soft transition-all ${cardBorder} ${cardBg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-text-muted">
                          {formatTime12h(b.start_time)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeBg}`}>
                          {skipped ? 'SKIPPED' : b.kind}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-yellow text-text-charcoal text-[10px] font-bold animate-pulse">
                            NOW PLAYING
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-sm sm:text-base font-bold font-display leading-snug ${
                          isDone ? 'line-through text-text-muted' : 'text-text-charcoal'
                        }`}
                      >
                        {b.label}
                      </h4>

                      {noteText && (
                        <p className="text-xs text-text-muted mt-0.5 font-medium leading-snug">
                          {noteText}
                        </p>
                      )}

                      {currentDayLog.low_energy && b.minimum_text && !skipped && (
                        <p className="text-xs text-primary font-bold mt-1">
                          ⚡ {b.minimum_text} is enough today
                        </p>
                      )}

                      {/* Display scheduled tasks under this slot */}
                      {tasksInSlot.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                          <span className="text-[10px] uppercase font-mono font-bold text-text-muted block">
                            Tasks Scheduled In This Slot:
                          </span>
                          {tasksInSlot.map((t) => (
                            <div
                              key={t.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-300 text-xs font-semibold mr-1.5 mb-1"
                            >
                              <span className={t.done ? 'line-through text-text-muted' : 'text-text-charcoal'}>
                                {t.title}
                              </span>
                              {t.duration_min && (
                                <span className="text-text-muted font-mono text-[10px]">
                                  ({t.duration_min}m)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions on card */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(b.kind === 'core' || b.kind === 'heavy') && !skipped && (
                        <button
                          onClick={() =>
                            setActiveTimerBlock({
                              key: b.start_time,
                              label: b.label,
                              kind: b.kind,
                            })
                          }
                          title="Start focus timer"
                          className="p-1.5 rounded-lg bg-white hover:bg-gray-50 text-text-charcoal shadow-card-soft active:scale-98"
                        >
                          <Timer className="w-4 h-4" />
                        </button>
                      )}

                      {isTickable ? (
                        <button
                          onClick={() =>
                            handleToggleBlockWithCelebration(
                              selectedDateKey,
                              b.start_time,
                              b.kind,
                              b.label
                            )
                          }
                          aria-label={`Mark ${b.label} done`}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-card-soft active:scale-98 ${
                            isDone ? 'bg-success text-white font-bold' : 'bg-white border-2 border-gray-300 hover:border-success hover:bg-success/10'
                          }`}
                        >
                          {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* 6. NATURAL LANGUAGE PROMPT BAR */}
      <section aria-label="Task prompt input" className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm font-bold tracking-tight text-text-charcoal">
            Prompt to Schedule
          </h3>
          <span className="text-xs font-mono text-text-muted">Voice or Type</span>
        </div>
        <PromptBar />
      </section>

      {/* 7. TOP TASKS LIST WITH TOUCH DRAG & REORDER */}
      <section aria-label="Top tasks list" className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm font-bold tracking-tight text-text-charcoal">
            Top Tasks For Today ({tasks.length})
          </h3>
          <span className="text-xs text-text-muted font-medium">Reorder or drag onto court</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-card-xl text-center text-xs text-text-muted font-medium bg-white">
                  No pending tasks for today. Speak or type above to queue your priorities.
                </div>
              ) : (
                tasks.map((task, idx) => (
                  <SortableTaskRow
                    key={task.id}
                    task={task}
                    index={idx}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onMoveUp={(id) => moveTask(id, 'up')}
                    onMoveDown={(id) => moveTask(id, 'down')}
                    onScheduleSlot={handleScheduleTaskInSlot}
                    isFirst={idx === 0}
                    isLast={idx === tasks.length - 1}
                    onEdit={(id) => showToast('Coming soon', 'info')}
                    onDuplicate={(id) => showToast('Coming soon', 'info')}
                    onAddTag={(id) => showToast('Coming soon', 'info')}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </section>

      {/* 8. RESET TODAY & SCHEDULE OPTIONS */}
      <div className="pt-4 text-center space-y-2">
        <button
          onClick={resetToday}
          className="text-xs font-mono text-text-muted hover:text-text-charcoal underline flex items-center justify-center gap-1 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Reset today&apos;s ticks and tasks
        </button>
        <button
          onClick={openScheduleModal}
          className="text-xs font-mono text-primary hover:underline flex items-center justify-center gap-1 mx-auto font-bold"
        >
          <Calendar className="w-3 h-3" /> Clear or rewrite weekly schedule
        </button>
      </div>

      {/* FOCUS TIMER MODAL */}
      <FocusTimerModal
        isOpen={Boolean(activeTimerBlock)}
        onClose={() => setActiveTimerBlock(null)}
        initialBlockKey={activeTimerBlock?.key}
        blockLabel={activeTimerBlock?.label}
        blockKind={activeTimerBlock?.kind}
      />
    </div>
  );
}
