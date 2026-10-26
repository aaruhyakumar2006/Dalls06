'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { BlockKind } from '@/types/database';
import { X, Search, Filter } from 'lucide-react';

interface SearchFilter {
  status?: 'done' | 'not_done' | null;
  dateRange?: 'today' | 'this_week' | 'this_month' | null;
  blockKind?: BlockKind | null;
  category?: 'tasks' | 'blocks' | 'reviews' | 'checklists' | null;
}

interface SearchResult {
  id: string;
  type: 'task' | 'block' | 'review' | 'checklist';
  title: string;
  context: {
    date?: string;
    blockKind?: BlockKind;
    reviewStage?: number;
  };
  matchedText: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { tasks, reviewItems, checklistItems, templates, todayDateKey } = usePlanner();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter>({});
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query at 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Helper: Get date boundaries for filters
  const getDateBoundary = useCallback((range: 'today' | 'this_week' | 'this_month') => {
    const today = new Date(todayDateKey);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const rangeStart = range === 'today' ? todayDateKey : range === 'this_week' ? startOfWeek.toISOString().slice(0, 10) : startOfMonth.toISOString().slice(0, 10);
    return rangeStart;
  }, [todayDateKey]);

  // Search algorithm
  const results: SearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const query_lower = debouncedQuery.toLowerCase();
    const res: SearchResult[] = [];

    // Search tasks
    if (!filters.category || filters.category === 'tasks') {
      tasks.forEach(t => {
        if (t.title.toLowerCase().includes(query_lower)) {
          // Apply status filter
          if (filters.status === 'done' && !t.done) return;
          if (filters.status === 'not_done' && t.done) return;

          // Apply date range filter
          if (filters.dateRange) {
            const rangeStart = getDateBoundary(filters.dateRange);
            if (t.date < rangeStart) return;
          }

          res.push({
            id: t.id,
            type: 'task',
            title: t.title,
            context: { date: t.date },
            matchedText: t.title,
          });
        }
      });
    }

    // Search blocks (templates)
    if (!filters.category || filters.category === 'blocks') {
      templates.forEach(t => {
        if (t.label.toLowerCase().includes(query_lower)) {
          // Apply block kind filter
          if (filters.blockKind && t.kind !== filters.blockKind) return;

          res.push({
            id: t.id,
            type: 'block',
            title: t.label,
            context: { blockKind: t.kind },
            matchedText: t.label,
          });
        }
      });
    }

    // Search review items
    if (!filters.category || filters.category === 'reviews') {
      reviewItems.forEach(r => {
        if (r.title.toLowerCase().includes(query_lower) || (r.topic && r.topic.toLowerCase().includes(query_lower))) {
          // Apply date range filter
          if (filters.dateRange) {
            const rangeStart = getDateBoundary(filters.dateRange);
            if (r.next_review_at < rangeStart) return;
          }

          res.push({
            id: r.id,
            type: 'review',
            title: r.title,
            context: { date: r.next_review_at, reviewStage: r.stage },
            matchedText: r.title,
          });
        }
      });
    }

    // Search checklist items
    if (!filters.category || filters.category === 'checklists') {
      checklistItems.forEach(c => {
        if (c.title.toLowerCase().includes(query_lower)) {
          // Apply status filter
          if (filters.status === 'done' && !c.done) return;
          if (filters.status === 'not_done' && c.done) return;

          res.push({
            id: c.id,
            type: 'checklist',
            title: c.title,
            context: { date: c.due_date || undefined },
            matchedText: c.title,
          });
        }
      });
    }

    return res;
  }, [debouncedQuery, filters, tasks, reviewItems, checklistItems, templates, getDateBoundary]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="bg-card text-ink border-2 border-ink rounded-card w-full max-w-2xl max-h-[80vh] flex flex-col shadow-sticker relative overflow-hidden animate-in fade-in zoom-in-98"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-rail bg-bg/50 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-5 h-5 text-court" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, blocks, reviews..."
              className="bg-transparent text-ink font-medium text-base outline-none flex-1"
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 rounded-lg border border-transparent hover:border-ink hover:bg-rail text-mute hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-3 bg-rail/30 border-b border-rail flex flex-wrap gap-2 shrink-0 overflow-x-auto">
          {/* Category filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-mute">Category:</span>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: (e.target.value || null) as SearchFilter['category'] }))}
              className="text-xs px-2 py-1 bg-card border border-ink rounded font-mono"
            >
              <option value="">All</option>
              <option value="tasks">Tasks</option>
              <option value="blocks">Blocks</option>
              <option value="reviews">Reviews</option>
              <option value="checklists">Checklists</option>
            </select>
          </div>

          {/* Status filter (for tasks/checklists) */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-mute">Status:</span>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: (e.target.value || null) as SearchFilter['status'] }))}
              className="text-xs px-2 py-1 bg-card border border-ink rounded font-mono"
            >
              <option value="">All</option>
              <option value="done">Done</option>
              <option value="not_done">Pending</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-mute">Date:</span>
            <select
              value={filters.dateRange || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: (e.target.value || null) as SearchFilter['dateRange'] }))}
              className="text-xs px-2 py-1 bg-card border border-ink rounded font-mono"
            >
              <option value="">All</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          {/* Block kind filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-mute">Block Kind:</span>
            <select
              value={filters.blockKind || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, blockKind: (e.target.value || null) as BlockKind | null }))}
              className="text-xs px-2 py-1 bg-card border border-ink rounded font-mono"
            >
              <option value="">All</option>
              <option value="core">Core</option>
              <option value="heavy">Heavy</option>
              <option value="soft">Soft</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          {/* Clear filters button */}
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setFilters({})}
              className="text-xs px-2 py-1 bg-card border border-smash text-smash rounded font-semibold hover:bg-smash hover:text-white transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {debouncedQuery.trim() === '' ? (
            <p className="text-center text-mute text-sm py-8">Enter a search query to begin.</p>
          ) : results.length === 0 ? (
            <p className="text-center text-mute text-sm py-8">No results found for "{debouncedQuery}"</p>
          ) : (
            <>
              <div className="text-xs text-mute font-bold mb-2">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map(result => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="p-3 bg-bg rounded-xl border border-ink/30 hover:border-ink hover:bg-card transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-ink truncate">{result.title}</div>
                      <div className="text-xs text-mute mt-1 flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-rail rounded font-mono font-bold">{result.type}</span>
                        {result.context.date && (
                          <span className="text-[10px]">{result.context.date}</span>
                        )}
                        {result.context.blockKind && (
                          <span className="text-[10px]">{result.context.blockKind}</span>
                        )}
                        {result.context.reviewStage !== undefined && (
                          <span className="text-[10px]">Stage {result.context.reviewStage}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
