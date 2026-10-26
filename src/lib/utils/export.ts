import { TaskItem, BlockTemplate, DayLog, DsaTopic, ChecklistItem, SleepLog, AptitudeLog, Startup, WeeklyReview, ReviewItem } from '@/types/database';

export interface ExportPayload {
  timestamp: string;
  timezone: string;
  appVersion: string;
  dayLogs: Record<string, DayLog>;
  tasks: TaskItem[];
  reviewItems: ReviewItem[];
  dsaTopics: DsaTopic[];
  checklistItems: ChecklistItem[];
  sleepLogs: Record<string, SleepLog>;
  aptitudeLogs: AptitudeLog[];
  startups: Startup[];
  weeklyReviews: WeeklyReview[];
}

export function getExportFilename(format: 'json' | 'csv' | 'pdf'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `daily-planner-export-${date}.${format}`;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsJSON(payload: ExportPayload): void {
  const json = JSON.stringify(payload, null, 2);
  downloadFile(json, getExportFilename('json'), 'application/json');
}

export function exportAsCSV(tasks: TaskItem[]): void {
  const headers = ['Date', 'Title', 'Time', 'Duration (min)', 'Status'];
  const rows = tasks.map(t => [
    t.date,
    t.title,
    t.at_time || '—',
    t.duration_min?.toString() || '—',
    t.done ? 'Done' : 'Pending',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  downloadFile(csv, getExportFilename('csv'), 'text/csv');
}

export function exportBlockCompletionsCSV(
  completions: Record<string, Record<string, boolean>>,
  templates: BlockTemplate[]
): void {
  const headers = ['Date', 'Block Time', 'Block Label', 'Block Kind', 'Status'];
  const rows: string[][] = [];

  Object.entries(completions).forEach(([date, blocks]) => {
    Object.entries(blocks).forEach(([blockTime, done]) => {
      const template = templates.find(t => t.start_time === blockTime);
      rows.push([
        date,
        blockTime,
        template?.label || 'Unknown',
        template?.kind || '—',
        done ? 'Done' : 'Not Done',
      ]);
    });
  });

  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  downloadFile(csv, getExportFilename('csv'), 'text/csv');
}

export function exportAsPDF(payload: ExportPayload): void {
  const html = generatePDFHTML(payload);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getExportFilename('pdf');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generatePDFHTML(payload: ExportPayload): string {
  const tasksTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead><tr style="background:#141B3D;color:white;">
        <th style="padding:8px;text-align:left;">Date</th>
        <th style="padding:8px;text-align:left;">Task</th>
        <th style="padding:8px;text-align:left;">Time</th>
        <th style="padding:8px;text-align:left;">Status</th>
      </tr></thead>
      <tbody>
        ${payload.tasks
          .slice(0, 20)
          .map(t => `
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:8px;">${t.date}</td>
            <td style="padding:8px;">${t.title}</td>
            <td style="padding:8px;">${t.at_time || '—'}</td>
            <td style="padding:8px;">${t.done ? '✓' : '○'}</td>
          </tr>
        `)
          .join('')}
      </tbody>
    </table>
  `;

  const sleepTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead><tr style="background:#141B3D;color:white;">
        <th style="padding:8px;text-align:left;">Date</th>
        <th style="padding:8px;text-align:left;">Bedtime</th>
        <th style="padding:8px;text-align:left;">Wake Time</th>
      </tr></thead>
      <tbody>
        ${Object.values(payload.sleepLogs)
          .slice(0, 14)
          .map(s => `
          <tr style="border-bottom:1px solid #ddd;">
            <td style="padding:8px;">${s.date}</td>
            <td style="padding:8px;">${s.bedtime}</td>
            <td style="padding:8px;">${s.wake_time}</td>
          </tr>
        `)
          .join('')}
      </tbody>
    </table>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Daily Planner Export</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          h1 { color: #141B3D; }
          .metadata { color: #666; font-size: 12px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Daily Planner Export</h1>
        <div class="metadata">
          <p><strong>Export Date:</strong> ${payload.timestamp}</p>
          <p><strong>Timezone:</strong> ${payload.timezone}</p>
          <p><strong>App Version:</strong> ${payload.appVersion}</p>
        </div>
        <h2>Recent Tasks</h2>
        ${tasksTable}
        <h2>Sleep Log (Last 14 Days)</h2>
        ${sleepTable}
        <p style="margin-top:40px;font-size:12px;color:#999;">This is a summary export. For a complete data backup, use JSON export.</p>
      </body>
    </html>
  `;
}
