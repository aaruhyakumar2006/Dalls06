import { TaskItem, BlockCompletion, DayLog, FocusSession } from '@/types/database';
import { getDateKey } from './time';

export interface ProductivityTrend {
  date: string;
  tasksCompleted: number;
  weeklyAvg: number;
  completionRate: number;
  currentStreak: number;
}

export interface BestTimeAnalysis {
  peakHours: number[];
  bestDayOfWeek: string;
  completionsByHour: number[]; // 0-23
  focusPatterns: { day: string; hour: number; count: number }[];
}

export interface RetentionMetrics {
  taskCompletionRate: number;
  blockCompletionRate: number;
  recurringAdherence: number;
  churnRiskDays: number;
}

export interface AnalyticsData {
  trends: ProductivityTrend[];
  bestTime: BestTimeAnalysis;
  retention: RetentionMetrics;
  lastComputed: string;
}

/**
 * Compute productivity trends for the last 30 days
 */
export function computeProductivityTrends(
  completions: Record<string, Record<string, boolean>>,
  dayLogs: Record<string, DayLog>,
  templates: any[],
  streak: number
): ProductivityTrend[] {
  const trends: ProductivityTrend[] = [];
  const dailyCompletions: Record<string, number> = {};

  // Count completed blocks per day
  Object.entries(completions).forEach(([date, blocks]) => {
    const count = Object.values(blocks).filter(Boolean).length;
    dailyCompletions[date] = count;
  });

  // Generate last 30 days
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = getDateKey(d);
    last30.push(dateKey);
  }

  // Calculate 7-day moving average
  const completionCounts = last30.map((date) => dailyCompletions[date] || 0);

  for (let i = 0; i < last30.length; i++) {
    const date = last30[i];
    const tasksCompleted = completionCounts[i];

    // 7-day moving average (centered on current day)
    let weeklySum = 0;
    let weeklyCount = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(last30.length - 1, i + 3); j++) {
      weeklySum += completionCounts[j];
      weeklyCount++;
    }
    const weeklyAvg = Math.round((weeklySum / weeklyCount) * 10) / 10;

    // Completion rate for last 30 days up to current date
    const completedUpToNow = completionCounts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const possibleUpToNow = (i + 1) * 5; // Assume 5 blocks/day on average
    const completionRate = Math.round((completedUpToNow / possibleUpToNow) * 100);

    trends.push({
      date,
      tasksCompleted,
      weeklyAvg,
      completionRate,
      currentStreak: streak,
    });
  }

  return trends;
}

/**
 * Analyze best times and patterns for task/block completions
 */
export function computeBestTimeAnalysis(
  completions: Record<string, Record<string, boolean>>,
  focusSessions: FocusSession[],
  dayLogs: Record<string, DayLog>
): BestTimeAnalysis {
  const completionsByHour = new Array(24).fill(0);
  const dayOfWeekCounts: Record<string, number> = {
    Sun: 0,
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
  };

  // Analyze block completions by hour
  Object.entries(completions).forEach(([dateStr, blocks]) => {
    const date = new Date(dateStr + 'T12:00:00Z');
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

    Object.entries(blocks).forEach(([blockKey, done]) => {
      if (done) {
        // blockKey is typically "HH:mm", extract hour
        const [hour] = blockKey.split(':').map(Number);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          completionsByHour[hour]++;
          dayOfWeekCounts[dayName]++;
        }
      }
    });
  });

  // Find peak hours (top 3)
  const peakHours = completionsByHour
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.hour);

  // Find best day of week
  let bestDayOfWeek = 'Mon';
  let maxDayCount = 0;
  Object.entries(dayOfWeekCounts).forEach(([day, count]) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      bestDayOfWeek = day;
    }
  });

  // Analyze focus session patterns
  const focusPatterns: { day: string; hour: number; count: number }[] = [];
  const focusHourDay: Record<string, number> = {};

  focusSessions.forEach((session) => {
    const date = new Date(session.started_at);
    const hour = date.getHours();
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    const key = `${dayName}-${hour}`;

    focusHourDay[key] = (focusHourDay[key] || 0) + 1;
  });

  Object.entries(focusHourDay).forEach(([key, count]) => {
    const [day, hour] = key.split('-');
    focusPatterns.push({
      day,
      hour: parseInt(hour),
      count,
    });
  });

  return {
    peakHours,
    bestDayOfWeek,
    completionsByHour,
    focusPatterns,
  };
}

/**
 * Compute retention and engagement metrics
 */
export function computeRetentionMetrics(
  tasks: TaskItem[],
  completions: Record<string, Record<string, boolean>>,
  dayLogs: Record<string, DayLog>,
  todayDateKey: string
): RetentionMetrics {
  // Task completion rate (last 30 days)
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last30Days.push(getDateKey(d));
  }

  const tasksInWindow = tasks.filter((t) => last30Days.includes(t.date));
  const completedTasks = tasksInWindow.filter((t) => t.done).length;
  const taskCompletionRate = tasksInWindow.length > 0 ? Math.round((completedTasks / tasksInWindow.length) * 100) : 0;

  // Block completion rate
  let totalBlocksScheduled = 0;
  let totalBlocksCompleted = 0;
  Object.entries(completions).forEach(([date, blocks]) => {
    if (last30Days.includes(date)) {
      totalBlocksScheduled += Object.keys(blocks).length;
      totalBlocksCompleted += Object.values(blocks).filter(Boolean).length;
    }
  });
  const blockCompletionRate = totalBlocksScheduled > 0 ? Math.round((totalBlocksCompleted / totalBlocksScheduled) * 100) : 0;

  // Recurring task adherence (tasks with recurrence_pattern !== 'none')
  const recurringTasks = tasks.filter((t) => t.recurrence_pattern && t.recurrence_pattern !== 'none');
  const completedRecurring = recurringTasks.filter((t) => t.done).length;
  const recurringAdherence = recurringTasks.length > 0 ? Math.round((completedRecurring / recurringTasks.length) * 100) : 0;

  // Churn risk: days since last activity
  let churnRiskDays = 100; // Default high value
  const sortedDates = Object.keys(completions).sort().reverse();
  if (sortedDates.length > 0) {
    const lastActivityDate = new Date(sortedDates[0]);
    const now = new Date(todayDateKey);
    const daysSinceLastActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
    churnRiskDays = daysSinceLastActivity;
  }

  return {
    taskCompletionRate,
    blockCompletionRate,
    recurringAdherence,
    churnRiskDays,
  };
}

/**
 * Generate AI-powered insights based on metrics
 */
export function generateInsights(
  trends: ProductivityTrend[],
  bestTime: BestTimeAnalysis,
  retention: RetentionMetrics
): string[] {
  const insights: string[] = [];

  // Peak hour insight
  if (bestTime.peakHours.length > 0) {
    const topHour = bestTime.peakHours[0];
    const nextHour = topHour + 1 <= 23 ? topHour + 1 : 0;
    insights.push(
      `📊 You're most productive around ${topHour}:00-${nextHour}:00. Schedule important tasks then.`
    );
  }

  // Best day insight
  if (bestTime.bestDayOfWeek) {
    insights.push(
      `🏆 Your best day is ${bestTime.bestDayOfWeek}. You tend to complete more blocks on this day.`
    );
  }

  // Trend insight
  if (trends.length >= 7) {
    const recentWeek = trends.slice(-7);
    const recentAvg = Math.round(
      recentWeek.reduce((sum, t) => sum + t.tasksCompleted, 0) / 7
    );
    const previousWeek = trends.slice(-14, -7);
    const prevAvg = previousWeek.length > 0
      ? Math.round(previousWeek.reduce((sum, t) => sum + t.tasksCompleted, 0) / 7)
      : recentAvg;

    if (recentAvg > prevAvg && prevAvg > 0) {
      const percentChange = Math.round(((recentAvg - prevAvg) / prevAvg) * 100);
      insights.push(
        `📈 You're trending up! Productivity increased by ${percentChange}% this week.`
      );
    } else if (recentAvg < prevAvg && prevAvg > 0) {
      const percentChange = Math.round(((prevAvg - recentAvg) / prevAvg) * 100);
      insights.push(
        `📉 Your productivity dipped by ${percentChange}% this week. Try adding more breaks or shorter sessions.`
      );
    }
  }

  // Block completion insight
  if (retention.blockCompletionRate < 50) {
    insights.push(
      `⚠️ Block completion rate is ${retention.blockCompletionRate}%. Try breaking tasks into smaller chunks.`
    );
  } else if (retention.blockCompletionRate > 80) {
    insights.push(
      `💯 Excellent! Block completion at ${retention.blockCompletionRate}%. You're dominating your schedule.`
    );
  }

  // Recurring task adherence
  if (retention.recurringAdherence > 0 && retention.recurringAdherence < 60) {
    insights.push(
      `🔄 Recurring tasks at ${retention.recurringAdherence}% adherence. Set specific reminders for consistency.`
    );
  } else if (retention.recurringAdherence >= 90) {
    insights.push(
      `⭐ You're crushing recurring tasks at ${retention.recurringAdherence}% adherence. Very consistent!`
    );
  }

  // Churn risk insight
  if (retention.churnRiskDays > 7) {
    insights.push(
      `🚨 No activity for ${retention.churnRiskDays} days. Time to get back on track!`
    );
  } else if (retention.churnRiskDays >= 2 && retention.churnRiskDays <= 7) {
    insights.push(
      `💪 You've maintained activity for a week. Your streak is resilient!`
    );
  }

  // Task completion insight
  if (retention.taskCompletionRate > 85) {
    insights.push(
      `✅ You're crushing it! ${retention.taskCompletionRate}% task completion. Finisher mindset.`
    );
  } else if (retention.taskCompletionRate > 70) {
    insights.push(
      `👍 Good completion rate at ${retention.taskCompletionRate}%. Keep the momentum.`
    );
  } else if (retention.taskCompletionRate < 30) {
    insights.push(
      `🎯 Only ${retention.taskCompletionRate}% tasks done. Focus on fewer, more important goals.`
    );
  }

  // Multi-week consistency
  if (trends.length >= 14) {
    const last14 = trends.slice(-14);
    const consistentDays = last14.filter((t) => t.tasksCompleted > 0).length;
    if (consistentDays >= 12) {
      insights.push(
        `🔥 Amazing consistency! Active ${consistentDays}/14 days. This is habit territory.`
      );
    }
  }

  return insights.slice(0, 3); // Return top 3 insights
}

/**
 * Calculate aggregated analytics data with caching
 */
export function computeAnalytics(
  completions: Record<string, Record<string, boolean>>,
  dayLogs: Record<string, DayLog>,
  templates: any[],
  tasks: TaskItem[],
  focusSessions: FocusSession[],
  streak: number,
  todayDateKey: string
): AnalyticsData {
  const trends = computeProductivityTrends(completions, dayLogs, templates, streak);
  const bestTime = computeBestTimeAnalysis(completions, focusSessions, dayLogs);
  const retention = computeRetentionMetrics(tasks, completions, dayLogs, todayDateKey);

  return {
    trends,
    bestTime,
    retention,
    lastComputed: new Date().toISOString(),
  };
}
