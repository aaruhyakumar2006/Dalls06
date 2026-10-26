'use client';

import React, { useMemo } from 'react';
import { usePlanner } from '@/lib/storage/store';
import { computeAnalytics, generateInsights } from '@/lib/utils/analytics';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  Calendar,
  Award,
  Flame,
  Download,
} from 'lucide-react';

export default function AnalyticsTab() {
  const {
    completions,
    dayLogs,
    templates,
    tasks,
    focusSessions,
    streak,
    todayDateKey,
  } = usePlanner();

  const analytics = useMemo(() => {
    return computeAnalytics(completions, dayLogs, templates, tasks, focusSessions, streak, todayDateKey);
  }, [completions, dayLogs, templates, tasks, focusSessions, streak, todayDateKey]);

  const insights = useMemo(() => {
    return generateInsights(analytics.trends, analytics.bestTime, analytics.retention);
  }, [analytics]);

  // Calculate this week's metrics
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const thisWeekMetrics = useMemo(() => {
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(thisWeekStart);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      weekDates.push(dateKey);
    }

    let weekTasksDone = 0;
    let weekBlocksDone = 0;
    let weekFocusHours = 0;

    tasks.forEach((t) => {
      if (t.done && weekDates.includes(t.date)) weekTasksDone++;
    });

    weekDates.forEach((date) => {
      const blocks = completions[date] || {};
      weekBlocksDone += Object.values(blocks).filter(Boolean).length;
    });

    focusSessions.forEach((session) => {
      const sessionDate = new Date(session.started_at).toISOString().slice(0, 10);
      if (weekDates.includes(sessionDate)) {
        weekFocusHours += session.actual_min / 60;
      }
    });

    return {
      tasksDone: weekTasksDone,
      blocksDone: weekBlocksDone,
      focusHours: Math.round(weekFocusHours * 10) / 10,
    };
  }, [tasks, completions, focusSessions, thisWeekStart]);

  // Find best and worst days
  const dayOfWeekStats = useMemo(() => {
    const stats: Record<string, { completions: number; tasksDone: number }> = {
      Sun: { completions: 0, tasksDone: 0 },
      Mon: { completions: 0, tasksDone: 0 },
      Tue: { completions: 0, tasksDone: 0 },
      Wed: { completions: 0, tasksDone: 0 },
      Thu: { completions: 0, tasksDone: 0 },
      Fri: { completions: 0, tasksDone: 0 },
      Sat: { completions: 0, tasksDone: 0 },
    };

    Object.entries(completions).forEach(([dateStr, blocks]) => {
      const date = new Date(dateStr + 'T12:00:00Z');
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      stats[dayName].completions += Object.values(blocks).filter(Boolean).length;
    });

    tasks.forEach((t) => {
      if (t.done) {
        const date = new Date(t.date + 'T12:00:00Z');
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        stats[dayName].tasksDone++;
      }
    });

    return stats;
  }, [completions, tasks]);

  const bestDay = Object.entries(dayOfWeekStats).sort((a, b) => b[1].completions - a[1].completions)[0];
  const worstDay = Object.entries(dayOfWeekStats).sort((a, b) => a[1].completions - b[1].completions)[0];

  // Generate CSV export data
  const handleExportAnalytics = () => {
    const csvContent = [
      ['Analytics Export', new Date().toLocaleDateString()],
      [''],
      ['Productivity Metrics'],
      ['Date', 'Tasks Completed', '7-Day Avg', 'Completion Rate %', 'Streak'],
      ...analytics.trends.map((t) => [
        t.date,
        t.tasksCompleted,
        t.weeklyAvg,
        t.completionRate,
        t.currentStreak,
      ]),
      [''],
      ['Retention Metrics'],
      ['Metric', 'Value'],
      ['Task Completion Rate %', analytics.retention.taskCompletionRate],
      ['Block Completion Rate %', analytics.retention.blockCompletionRate],
      ['Recurring Adherence %', analytics.retention.recurringAdherence],
      ['Days Since Last Activity', analytics.retention.churnRiskDays],
      [''],
      ['Peak Hours', analytics.bestTime.peakHours.join(', ')],
      ['Best Day of Week', analytics.bestTime.bestDayOfWeek],
    ];

    const csvString = csvContent.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-charcoal flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics & Insights
          </h1>
          <p className="text-sm text-text-muted font-medium mt-1">
            Last 30 days of productivity data
          </p>
        </div>
        <button
          onClick={handleExportAnalytics}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-text-charcoal font-semibold text-sm hover:bg-gray-50 transition-colors shadow-card-soft"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* A. Productivity Trends Section */}
      <section className="p-3 sm:p-4 rounded-card-xl bg-white shadow-card-soft space-y-3 sm:space-y-4">
        <h2 className="text-lg font-bold font-display text-text-charcoal flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Productivity Trends
        </h2>

        {/* Line Chart (simplified: bars using Tailwind) */}
        <div className="space-y-3">
          <div className="text-xs text-mute font-mono uppercase font-semibold">
            Daily Completions (Last 14 Days)
          </div>
          <div className="space-y-2">
            {analytics.trends.slice(-14).map((trend) => (
              <div key={trend.date} className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-text-muted w-20">{trend.date}</span>
                <div className="flex-1 h-6 bg-gray-50 rounded border border-gray-200 relative overflow-hidden">
                  {trend.tasksCompleted > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded"
                      style={{ width: `${Math.min((trend.tasksCompleted / 10) * 100, 100)}%` }}
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-text-charcoal/70">
                    {trend.tasksCompleted} blocks
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-primary w-12 text-right">
                  {trend.weeklyAvg.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-[11px] text-text-muted uppercase font-mono font-semibold">
              Completion Rate
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {analytics.retention.blockCompletionRate}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-[11px] text-text-muted uppercase font-mono font-semibold">
              Current Streak
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {streak} days
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1.5">
          <div className="font-semibold text-text-charcoal flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            This Week
          </div>
          <div className="text-xs text-text-muted space-y-1">
            <div>✓ {thisWeekMetrics.tasksDone} tasks completed</div>
            <div>✓ {thisWeekMetrics.blocksDone} blocks done</div>
            <div>✓ {thisWeekMetrics.focusHours} hours focused</div>
          </div>
        </div>
      </section>

      {/* B. Best Time Analysis Section */}
      <section className="p-3 sm:p-4 rounded-card-xl bg-white shadow-card-soft space-y-3 sm:space-y-4">
        <h2 className="text-lg font-bold font-display text-text-charcoal flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          When You're Most Productive
        </h2>

        {/* Peak Hours */}
        <div>
          <div className="text-xs text-text-muted uppercase font-mono font-semibold mb-2">
            Peak Hours
          </div>
          <div className="flex gap-2 flex-wrap">
            {analytics.bestTime.peakHours.length > 0 ? (
              analytics.bestTime.peakHours.map((hour) => (
                <div
                  key={hour}
                  className="px-3 py-2 bg-primary/20 border border-primary rounded-lg font-semibold text-sm text-primary"
                >
                  {hour}:00-{hour + 1}:00
                </div>
              ))
            ) : (
              <span className="text-sm text-text-muted">No peak hours recorded yet</span>
            )}
          </div>
        </div>

        {/* Best & Worst Days */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-success/10 rounded-lg border border-success">
            <div className="text-[11px] text-success uppercase font-mono font-semibold">
              Best Day
            </div>
            <div className="text-xl font-bold text-success mt-1">
              {bestDay ? bestDay[0] : '—'}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {bestDay ? `${bestDay[1].completions} completions` : 'No data'}
            </div>
          </div>
          <div className="p-3 bg-error/10 rounded-lg border border-error">
            <div className="text-[11px] text-error uppercase font-mono font-semibold">
              Least Productive
            </div>
            <div className="text-xl font-bold text-error mt-1">
              {worstDay ? worstDay[0] : '—'}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {worstDay ? `${worstDay[1].completions} completions` : 'No data'}
            </div>
          </div>
        </div>

        {/* Hourly Distribution Heatmap (simplified) */}
        <div>
          <div className="text-xs text-text-muted uppercase font-mono font-semibold mb-2">
            Completions by Hour (Last 30 Days)
          </div>
          <div className="grid grid-cols-6 gap-1">
            {analytics.bestTime.completionsByHour.map((count, hour) => {
              const maxCount = Math.max(...analytics.bestTime.completionsByHour);
              const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full h-12 rounded border border-ink/20"
                    style={{
                      backgroundColor: intensity > 0 
                        ? `rgba(30, 50, 100, ${Math.min(intensity / 100 + 0.1, 1)})`
                        : 'rgb(241, 245, 249)',
                    }}
                    title={`${hour}:00 - ${count} completions`}
                  />
                  <span className="text-[9px] font-mono text-text-muted">{hour}h</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* C. Retention Metrics Section */}
      <section className="p-3 sm:p-4 rounded-card-xl bg-white shadow-card-soft space-y-3 sm:space-y-4">
        <h2 className="text-lg font-bold font-display text-text-charcoal flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Engagement & Retention
        </h2>

        {/* Progress Bars */}
        <div className="space-y-4">
          {/* Task Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-charcoal flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Task Completion
              </label>
              <span className="text-sm font-bold text-primary">
                {analytics.retention.taskCompletionRate}%
              </span>
            </div>
            <div className="w-full h-3 bg-bg rounded-full border border-ink/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-court to-court/70 rounded-full transition-all"
                style={{ width: `${analytics.retention.taskCompletionRate}%` }}
              />
            </div>
          </div>

          {/* Block Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-charcoal flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Block Completion
              </label>
              <span className="text-sm font-bold text-primary">
                {analytics.retention.blockCompletionRate}%
              </span>
            </div>
            <div className="w-full h-3 bg-bg rounded-full border border-ink/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-court to-court/70 rounded-full transition-all"
                style={{ width: `${analytics.retention.blockCompletionRate}%` }}
              />
            </div>
          </div>

          {/* Recurring Adherence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-charcoal flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                Recurring Tasks
              </label>
              <span className="text-sm font-bold text-primary">
                {analytics.retention.recurringAdherence}%
              </span>
            </div>
            <div className="w-full h-3 bg-bg rounded-full border border-ink/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-court to-court/70 rounded-full transition-all"
                style={{ width: `${analytics.retention.recurringAdherence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Churn Risk Alert */}
        {analytics.retention.churnRiskDays > 7 && (
          <div className="p-3 bg-error/10 border-l-4 border-error rounded space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error" />
              <span className="font-semibold text-error">Churn Risk Alert</span>
            </div>
            <p className="text-xs text-error/80 font-medium">
              No activity for {analytics.retention.churnRiskDays} days. Time to get back on track!
            </p>
          </div>
        )}
      </section>

      {/* D. Insights & Recommendations */}
      <section className="p-3 sm:p-4 rounded-card-xl bg-white shadow-card-soft space-y-3 sm:space-y-4">
        <h2 className="text-lg font-bold font-display text-text-charcoal flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          AI Insights
        </h2>

        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((insight, idx) => {
              // Determine insight category based on emoji
              let bgColor = 'bg-gray-50';
              let borderColor = 'border-primary/30';
              let accentColor = 'text-primary';

              if (insight.includes('📈')) {
                bgColor = 'bg-success/10';
                borderColor = 'border-success/50';
                accentColor = 'text-success';
              } else if (insight.includes('📉')) {
                bgColor = 'bg-error/10';
                borderColor = 'border-error/50';
                accentColor = 'text-error';
              } else if (insight.includes('🚨') || insight.includes('⚠️')) {
                bgColor = 'bg-error/10';
                borderColor = 'border-error/50';
                accentColor = 'text-error';
              } else if (insight.includes('💪') || insight.includes('✅') || insight.includes('💯') || insight.includes('⭐') || insight.includes('🔥')) {
                bgColor = 'bg-success/10';
                borderColor = 'border-success/50';
                accentColor = 'text-success';
              }

              return (
                <div key={idx} className={`p-3 ${bgColor} rounded-lg border ${borderColor} text-sm`}>
                  <p className="text-text-charcoal font-medium">{insight}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted font-medium">
            Not enough data yet. Keep tracking to unlock insights!
          </p>
        )}

        {/* Insight Tips */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
          <div className="font-semibold text-text-charcoal flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            How to Use These Insights
          </div>
          <ul className="text-text-muted space-y-1 list-disc list-inside">
            <li>Schedule important tasks during peak hours</li>
            <li>Increase focus block frequency on your best days</li>
            <li>Adjust task difficulty based on completion rates</li>
            <li>Use trends to refine your daily schedule</li>
          </ul>
        </div>
      </section>

      {/* Empty state for no data */}
      {analytics.trends.length === 0 && (
        <div className="p-6 text-center rounded-card-xl border-2 border-dashed border-gray-300 bg-white space-y-2">
          <BarChart3 className="w-8 h-8 text-text-muted mx-auto opacity-50" />
          <p className="text-sm text-text-muted font-medium">
            No analytics data yet. Start logging blocks and tasks to see trends!
          </p>
        </div>
      )}
    </div>
  );
}
