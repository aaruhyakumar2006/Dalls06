'use client';

import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { usePlanner } from '@/lib/storage/store';
import { DsaStatus, SportKind } from '@/types/database';
import { SEED_APTITUDE_TOPICS } from '@/lib/constants/defaults';
import { timeToMins, formatTime12h } from '@/lib/utils/time';
import { ShuttleIcon, RacketIcon, CourtCornerIcon } from '../ui/Icons';
import {
  Code,
  Calculator,
  Moon,
  Trophy,
  CheckCircle,
  AlertTriangle,
  Plus,
  Flame,
  Clock,
  TrendingUp,
  RotateCcw,
  Check,
} from 'lucide-react';

export default function TrackTab() {
  const {
    dsaTopics,
    recordDsaPractice,
    updateDsaTopic,
    aptitudeLogs,
    addAptitudeLog,
    sleepLogs,
    saveSleepLog,
    sportLogs,
    addSportLog,
    profile,
    todayDateKey,
    dayLogs,
    addReviewItem,
    showToast,
  } = usePlanner();

  const [subTab, setSubTab] = useState<'dsa' | 'aptitude' | 'sleep' | 'sport'>('dsa');

  // Sleep Log Inputs
  const todaySleep = sleepLogs[todayDateKey] || {
    date: todayDateKey,
    bedtime: profile.sleep_target || '22:45',
    wake_time: profile.wake_target || '05:45',
  };
  const [bedtimeInput, setBedtimeInput] = useState(todaySleep.bedtime);
  const [wakeTimeInput, setWakeTimeInput] = useState(todaySleep.wake_time);

  // Aptitude Input
  const [aptTopic, setAptTopic] = useState(SEED_APTITUDE_TOPICS[0]);
  const [aptQuestions, setAptQuestions] = useState('15');
  const [aptCorrect, setAptCorrect] = useState('12');
  const [aptMinutes, setAptMinutes] = useState('20');

  // Sport Input
  const [sportKind, setSportKind] = useState<SportKind>('match');
  const [sportOpponent, setSportOpponent] = useState('');
  const [sportResult, setSportResult] = useState<'win' | 'loss' | 'draw'>('win');
  const [sportScore, setSportScore] = useState('');
  const [sportDuration, setSportDuration] = useState('60');
  const [sportNotes, setSportNotes] = useState('');

  // 1. Sleep Analytics
  const last7DaysSleep = useMemo(() => {
    const list = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      const log = sleepLogs[k] || { date: k, bedtime: '22:45', wake_time: '05:45' };

      let bM = timeToMins(log.bedtime);
      let wM = timeToMins(log.wake_time);
      if (wM < bM) wM += 24 * 60; // crossed midnight
      const sleepHours = (wM - bM) / 60;

      const dLog = dayLogs[k];
      const coreDone = dLog?.core_done || 0;

      list.push({
        date: k,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        bedtime: log.bedtime,
        wakeTime: log.wake_time,
        hours: Math.round(sleepHours * 10) / 10,
        coreDone,
      });
    }
    return list;
  }, [sleepLogs, dayLogs]);

  // Average core blocks on short sleep (< 7h) vs enough sleep (>= 7h)
  const sleepCorrelation = useMemo(() => {
    const shortDays = last7DaysSleep.filter((d) => d.hours < 7);
    const goodDays = last7DaysSleep.filter((d) => d.hours >= 7);

    const avgCoreShort =
      shortDays.length > 0
        ? (shortDays.reduce((a, b) => a + b.coreDone, 0) / shortDays.length).toFixed(1)
        : '0.0';
    const avgCoreGood =
      goodDays.length > 0
        ? (goodDays.reduce((a, b) => a + b.coreDone, 0) / goodDays.length).toFixed(1)
        : '0.0';

    return { avgCoreShort, avgCoreGood, shortCount: shortDays.length, goodCount: goodDays.length };
  }, [last7DaysSleep]);

  // 2. Badminton & Training Analytics
  const badmintonStats = useMemo(() => {
    const matches = sportLogs.filter((s) => s.kind === 'match');
    const trainings = sportLogs.filter((s) => s.kind === 'training');

    const wins = matches.filter((m) => m.result === 'win').length;
    const losses = matches.filter((m) => m.result === 'loss').length;

    const lastTraining = trainings[0];
    let daysSinceTraining = 99;
    if (lastTraining) {
      const diffMs = Date.now() - new Date(lastTraining.date).getTime();
      daysSinceTraining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    return {
      wins,
      losses,
      trainingsCount: trainings.length,
      daysSinceTraining,
      needsAlert: daysSinceTraining >= 7,
    };
  }, [sportLogs]);

  // Handle DSA Practice
  const handleDsaPractice = (topicId: string, topicName: string) => {
    recordDsaPractice(topicId, true);
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 30]);
    confetti({
      particleCount: 25,
      spread: 40,
      origin: { y: 0.7 },
      colors: ['#2E5BFF', '#FFD21F'],
    });
    showToast(`Practiced "${topicName}" from blank!`, 'success');
  };

  // Handle Sleep Save
  const handleSleepSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSleepLog(todayDateKey, bedtimeInput, wakeTimeInput);
    showToast('Sleep log saved for today', 'success');
  };

  // Handle Aptitude Save
  const handleAptitudeSave = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseInt(aptQuestions, 10) || 0;
    const c = parseInt(aptCorrect, 10) || 0;
    const m = parseInt(aptMinutes, 10) || 0;
    if (q === 0) return;

    addAptitudeLog({
      date: todayDateKey,
      topic: aptTopic,
      questions: q,
      correct: c,
      minutes: m,
    });
    showToast(`Logged ${c}/${q} in ${aptTopic}`, 'success');
  };

  // Handle Sport Save
  const handleSportSave = (e: React.FormEvent) => {
    e.preventDefault();
    addSportLog({
      date: todayDateKey,
      kind: sportKind,
      event_or_opponent: sportOpponent || (sportKind === 'training' ? 'Drills & Fitness' : 'Friendly'),
      result: sportKind === 'match' ? sportResult : undefined,
      score: sportScore || undefined,
      duration_min: parseInt(sportDuration, 10) || 60,
      notes: sportNotes || undefined,
    });
    setSportOpponent('');
    setSportScore('');
    setSportNotes('');
    showToast(`Sport session logged (${sportKind})`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold font-display tracking-tight text-ink">
          Performance Trackers
        </h1>
        <p className="text-xs text-mute font-medium mt-0.5">
          Quantifiable mastery: DSA from blank, aptitude metrics, sleep correlation, badminton log.
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-rail/60 rounded-xl border-2 border-ink">
        <button
          onClick={() => setSubTab('dsa')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === 'dsa'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          DSA
        </button>
        <button
          onClick={() => setSubTab('aptitude')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === 'aptitude'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Aptitude
        </button>
        <button
          onClick={() => setSubTab('sleep')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === 'sleep'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Sleep
        </button>
        <button
          onClick={() => setSubTab('sport')}
          className={`py-2 px-1 text-center font-display text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            subTab === 'sport'
              ? 'bg-court text-white border-2 border-ink shadow-[0_2px_0_#141B3D]'
              : 'text-mute hover:text-ink'
          }`}
        >
          Sport
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. DSA TRACKER (Section 6.6)                                   */}
      {/* ============================================================== */}
      {subTab === 'dsa' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-court">
              Core DSA Topics ({dsaTopics.length})
            </span>
            <span className="text-[11px] font-mono text-mute">
              7-Day Due Threshold
            </span>
          </div>

          <div className="space-y-2.5">
            {dsaTopics.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-card border-2 border-ink bg-card shadow-sticker space-y-2.5 transition-all ${
                  item.due ? 'ring-2 ring-smash/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono border border-ink ${
                          item.status === 'solid'
                            ? 'bg-mint text-ink'
                            : item.status === 'learning'
                            ? 'bg-shuttle text-ink'
                            : 'bg-rail text-mute'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.due && (
                        <span className="px-2 py-0.5 rounded-full bg-smash text-white text-[10px] font-bold animate-pulse">
                          DUE FOR RECALL
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-sm font-bold text-ink">{item.topic}</h3>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-display text-lg font-bold text-court">
                      {item.from_blank_successes}
                    </span>
                    <span className="text-[10px] text-mute block font-mono">from blank reps</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-rail text-xs">
                  <span className="text-[11px] font-mono text-mute">
                    Last practiced: {item.last_practiced_at || 'Never'}
                  </span>

                  <button
                    onClick={() => handleDsaPractice(item.id, item.topic)}
                    className="px-3 py-1.5 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
                  >
                    Practiced from blank ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. APTITUDE TRACKER (Section 6.7)                              */}
      {/* ============================================================== */}
      {subTab === 'aptitude' && (
        <div className="space-y-4">
          {/* Quick Log Form */}
          <form
            onSubmit={handleAptitudeSave}
            className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink">Log Timed Aptitude Rep</h3>
              <span className="text-[10px] font-mono text-mute">Target: &lt;60s per question</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Topic</label>
                <select
                  value={aptTopic}
                  onChange={(e) => setAptTopic(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-bold"
                >
                  {SEED_APTITUDE_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Time (Minutes)</label>
                <input
                  type="number"
                  value={aptMinutes}
                  onChange={(e) => setAptMinutes(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Questions Attempted</label>
                <input
                  type="number"
                  value={aptQuestions}
                  onChange={(e) => setAptQuestions(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Correct Answers</label>
                <input
                  type="number"
                  value={aptCorrect}
                  onChange={(e) => setAptCorrect(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
            >
              Log Aptitude Session
            </button>
          </form>

          {/* Logs & Accuracy Stats */}
          <div className="space-y-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mute">
              Past Practice Sessions ({aptitudeLogs.length})
            </h3>
            {aptitudeLogs.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-ink/40 rounded-card text-center text-xs text-mute bg-card">
                No aptitude logs yet. Time 15 questions during your 19:30 focus block.
              </div>
            ) : (
              aptitudeLogs.map((log) => {
                const acc = Math.round((log.correct / log.questions) * 100);
                const secPerQ = Math.round((log.minutes * 60) / log.questions);
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-card rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="text-ink font-display block">{log.topic}</strong>
                      <span className="text-[11px] font-mono text-mute">
                        {log.correct}/{log.questions} correct • {log.minutes} min ({secPerQ}s/q)
                      </span>
                    </div>

                    <span
                      className={`font-mono text-sm font-bold px-2 py-0.5 rounded-lg border border-ink ${
                        acc >= 80 ? 'bg-mint text-ink' : acc >= 60 ? 'bg-shuttle text-ink' : 'bg-smash text-white'
                      }`}
                    >
                      {acc}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SLEEP LOG & CORRELATION (Section 6.5)                       */}
      {/* ============================================================== */}
      {subTab === 'sleep' && (
        <div className="space-y-4">
          {/* 2-Tap Morning Log */}
          <form
            onSubmit={handleSleepSave}
            className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink">2-Tap Morning Sleep Log</h3>
              <span className="text-[10px] font-mono text-mute">Targets: 22:45 / 05:45</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Bedtime</label>
                <input
                  type="time"
                  value={bedtimeInput}
                  onChange={(e) => setBedtimeInput(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-mono text-sm font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Wake Time</label>
                <input
                  type="time"
                  value={wakeTimeInput}
                  onChange={(e) => setWakeTimeInput(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl font-mono text-sm font-bold text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-mint text-ink font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
            >
              Save Morning Log ✓
            </button>
          </form>

          {/* Sleep & Focus Correlation Callout (Section 6.5) */}
          <div className="p-3 sm:p-4 rounded-card border-2 border-ink bg-court/10 shadow-sticker space-y-2">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-court flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Sleep &amp; Focus Correlation
            </h4>
            <div className="grid grid-cols-2 gap-3 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-card border-2 border-ink">
                <span className="text-[10px] font-mono text-mute uppercase block">Short Sleep (&lt;7h)</span>
                <span className="font-display text-xl font-bold text-smash">
                  {sleepCorrelation.avgCoreShort}
                </span>
                <span className="text-[10px] text-mute block font-mono">avg focus blocks</span>
              </div>

              <div className="p-2.5 rounded-xl bg-card border-2 border-ink">
                <span className="text-[10px] font-mono text-mute uppercase block">Adequate Sleep (&gt;=7h)</span>
                <span className="font-display text-xl font-bold text-mint">
                  {sleepCorrelation.avgCoreGood}
                </span>
                <span className="text-[10px] text-mute block font-mono">avg focus blocks</span>
              </div>
            </div>
            <p className="text-[11px] text-ink font-medium leading-snug pt-1">
              {Number(sleepCorrelation.avgCoreGood) > Number(sleepCorrelation.avgCoreShort)
                ? 'Data proves it: Sleeping on time directly increases your chances of hitting the 2-block counting day threshold.'
                : 'Log at least 3 more mornings to calibrate your personalized focus drop curve.'}
            </p>
          </div>

          {/* 7-Day Sleep Duration Chart */}
          <div className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>7-Day Sleep Duration</span>
              <span className="font-mono text-[10px] text-mute">Target: 7.0 Hours</span>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-3 items-end h-32">
              {last7DaysSleep.map((d) => {
                const heightPct = Math.min(100, Math.max(15, (d.hours / 9) * 100));
                const isAdequate = d.hours >= 7;
                return (
                  <div key={d.date} className="flex flex-col items-center h-full justify-end">
                    <span className="text-[10px] font-mono font-bold text-ink mb-1">
                      {d.hours}h
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg border-2 border-ink transition-all ${
                        isAdequate ? 'bg-mint' : 'bg-smash'
                      }`}
                    />
                    <span className="text-[10px] font-mono text-mute mt-1">{d.dayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SPORT & BADMINTON LOG (Section 6.8)                         */}
      {/* ============================================================== */}
      {subTab === 'sport' && (
        <div className="space-y-4">
          {/* Badminton Summary Banner */}
          <div className="p-3 sm:p-4 rounded-card border-2 border-ink bg-shuttle/20 shadow-sticker flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-shuttle border-2 border-ink flex items-center justify-center text-ink shadow-[0_2px_0_#141B3D]">
                <ShuttleIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-ink">Badminton Record</h4>
                <span className="text-[11px] font-mono text-mute">
                  {badmintonStats.wins} Wins • {badmintonStats.losses} Losses
                </span>
              </div>
            </div>

            {badmintonStats.needsAlert && (
              <span className="px-2.5 py-1 rounded-full bg-smash text-white font-mono font-bold text-[10px]">
                No drills in 7d!
              </span>
            )}
          </div>

          {/* Log New Match / Training */}
          <form
            onSubmit={handleSportSave}
            className="p-3 sm:p-4 rounded-card border-2 border-ink bg-card shadow-sticker space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-ink">Log Match or Training</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSportKind('match')}
                  className={`px-2.5 py-1 rounded-lg border-2 border-ink text-xs font-bold uppercase ${
                    sportKind === 'match' ? 'bg-court text-white' : 'bg-bg text-mute'
                  }`}
                >
                  Match
                </button>
                <button
                  type="button"
                  onClick={() => setSportKind('training')}
                  className={`px-2.5 py-1 rounded-lg border-2 border-ink text-xs font-bold uppercase ${
                    sportKind === 'training' ? 'bg-court text-white' : 'bg-bg text-mute'
                  }`}
                >
                  Training
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">
                  {sportKind === 'match' ? 'Opponent / Tournament' : 'Drills / Focus'}
                </label>
                <input
                  type="text"
                  value={sportOpponent}
                  onChange={(e) => setSportOpponent(e.target.value)}
                  placeholder={sportKind === 'match' ? 'e.g. Club Finals' : 'Footwork & Smashes'}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-mute mb-1">Duration (Min)</label>
                <input
                  type="number"
                  value={sportDuration}
                  onChange={(e) => setSportDuration(e.target.value)}
                  className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            {sportKind === 'match' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">Result</label>
                  <select
                    value={sportResult}
                    onChange={(e) => setSportResult(e.target.value as any)}
                    className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-bold"
                  >
                    <option value="win">Win ✓</option>
                    <option value="loss">Loss ✗</option>
                    <option value="draw">Draw</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-mute mb-1">Score</label>
                  <input
                    type="text"
                    value={sportScore}
                    onChange={(e) => setSportScore(e.target.value)}
                    placeholder="21-18, 21-19"
                    className="w-full p-2 bg-bg border-2 border-ink rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2 bg-court text-white font-bold uppercase tracking-wider text-xs rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] active:translate-y-[1px]"
            >
              Record Sport Session
            </button>
          </form>

          {/* Past sport logs list */}
          <div className="space-y-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mute">
              Recent Activity ({sportLogs.length})
            </h3>
            {sportLogs.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-ink/40 rounded-card text-center text-xs text-mute bg-card">
                No sport logs yet. Record Friday match or morning badminton training.
              </div>
            ) : (
              sportLogs.map((s) => (
                <div
                  key={s.id}
                  className="p-3 bg-card rounded-xl border-2 border-ink shadow-[0_2px_0_#141B3D] flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-ink font-display block">
                      {s.event_or_opponent}
                    </strong>
                    <span className="text-[11px] font-mono text-mute">
                      {s.kind.toUpperCase()} • {s.duration_min} min {s.score && `• ${s.score}`}
                    </span>
                  </div>

                  {s.result && (
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg border border-ink ${
                        s.result === 'win' ? 'bg-mint text-ink' : 'bg-smash text-white'
                      }`}
                    >
                      {s.result.toUpperCase()}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
