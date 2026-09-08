import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import MotivationVideoBackground from "../components/MotivationVideoBackground";
import { PageHeader } from "../components/PageHeaderProps";
import { readStoredJwt } from "../utils/jwtToken";
import pushupTapSound from "../assets/sound/mixkit-correct-answer-tone-2870.wav";
import "../style/LoanPage.css";
import "../style/PushupsPage.css";

type PushupDay = {
  date: string;
  label: string;
  count: number;
  goal: number;
  completed: boolean;
};

type LeaderboardUser = {
  rank: number;
  displayName: string;
  value: number;
  currentUser: boolean;
};

type LeaderboardTab = "allTime" | "bestDay";

type PushupsSummary = {
  username: string;
  todayCount: number;
  dailyGoal: number;
  completedToday: boolean;
  progressPercent: number;
  currentStreak: number;
  totalPushups: number;
  bestDailyPushups: number;
  longestStreak: number;
  history: PushupDay[];
  leaderboards: Record<LeaderboardTab, LeaderboardUser[]>;
};

type ActiveSession = {
  sessionId: string;
  startedAt: string;
  sessionDate: string;
  sessionCount: number;
  syncedCount: number;
  lastRegisteredTouch: number;
  paused: boolean;
  completed: boolean;
  dailyGoal: number;
};

const STORAGE_KEY = "pushups.activeSession.v1";
const MOTIVATION_MODE_KEY = "pushups.motivationMode.v1";
const MOTIVATION_INTRO_SRC = "/intro/intro2.mp4";
const MOTIVATION_INTRO_FADE_MS = 2_000;
const SYNC_EVERY_COUNT = 5;
const SYNC_EVERY_MS = 25_000;
const DEFAULT_COOLDOWN_MS = 400;
const HISTORY_LIMIT = 30;
const DISPLAY_HISTORY_DAYS = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed));
  }
  return fallback;
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function extractResponseMessage(response: Response, fallback: string): Promise<string> {
  const text = (await response.text().catch(() => "")).trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      return toStringValue(parsed.message) || toStringValue(parsed.error) || fallback;
    }
  } catch {
    return text;
  }
  return fallback;
}

function localDateKey(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function weekdayLabel(dateKey: string): string {
  if (dateKey === localDateKey()) return "I DAG";
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat("nb-NO", { weekday: "short" }).format(date).toUpperCase();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function normalizeDay(raw: unknown, index: number, fallbackGoal: number): PushupDay {
  if (!isRecord(raw)) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const dateKey = localDateKey(date);
    return { date: dateKey, label: weekdayLabel(dateKey), count: 0, goal: fallbackGoal, completed: false };
  }
  const date = toStringValue(raw.date) || localDateKey();
  const count = toNumber(raw.count ?? raw.pushups ?? raw.totalPushups);
  const goal = toNumber(raw.goal ?? raw.dailyGoal, fallbackGoal);
  return {
    date,
    label: toStringValue(raw.label) || weekdayLabel(date),
    count,
    goal,
    completed: Boolean(raw.completed ?? raw.goalCompleted ?? count >= goal),
  };
}

function normalizeLeaderboard(raw: unknown): LeaderboardUser[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRecord)
    .map((entry, index) => ({
      rank: toNumber(entry.rank, index + 1),
      displayName: toStringValue(entry.displayName ?? entry.username ?? entry.name) || "Ukjent",
      value: toNumber(entry.value ?? entry.totalPushups ?? entry.bestDailyPushups),
      currentUser: Boolean(entry.currentUser ?? entry.me),
    }));
}

function normalizeSummary(raw: unknown): PushupsSummary {
  const base: PushupsSummary = {
    username: "",
    todayCount: 0,
    dailyGoal: 0,
    completedToday: false,
    progressPercent: 0,
    currentStreak: 0,
    totalPushups: 0,
    bestDailyPushups: 0,
    longestStreak: 0,
    history: [],
    leaderboards: { allTime: [], bestDay: [] },
  };
  if (!isRecord(raw)) return withFallbackHistory(base);

  const dailyGoal = toNumber(raw.dailyGoal ?? raw.goal);
  const summary: PushupsSummary = {
    username: toStringValue(raw.username ?? raw.displayName),
    todayCount: toNumber(raw.todayCount ?? raw.todayPushups),
    dailyGoal,
    completedToday: Boolean(raw.completedToday ?? raw.completed ?? raw.goalCompleted),
    progressPercent: toNumber(raw.progressPercent ?? raw.progress),
    currentStreak: toNumber(raw.currentStreak ?? raw.streak),
    totalPushups: toNumber(raw.totalPushups),
    bestDailyPushups: toNumber(raw.bestDailyPushups ?? raw.bestDay),
    longestStreak: toNumber(raw.longestStreak),
    history: Array.isArray(raw.history)
      ? raw.history.slice(0, HISTORY_LIMIT).map((day, index) => normalizeDay(day, index, dailyGoal))
      : [],
    leaderboards: {
      allTime: normalizeLeaderboard(isRecord(raw.leaderboards) ? raw.leaderboards.allTime : raw.allTime),
      bestDay: normalizeLeaderboard(isRecord(raw.leaderboards) ? raw.leaderboards.bestDay : raw.bestDay),
    },
  };

  return withFallbackHistory(summary);
}

function withFallbackHistory(summary: PushupsSummary): PushupsSummary {
  if (summary.history.length >= HISTORY_LIMIT) return summary;
  const existing = new Set(summary.history.map((day) => day.date));
  const history = [...summary.history];
  for (let index = 0; history.length < HISTORY_LIMIT; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const dateKey = localDateKey(date);
    if (existing.has(dateKey)) continue;
    const count = index === 0 ? summary.todayCount : 0;
    const goal = summary.dailyGoal;
    history.push({ date: dateKey, label: weekdayLabel(dateKey), count, goal, completed: goal > 0 && count >= goal });
  }
  return { ...summary, history };
}

function addFinishedSessionToSummary(summary: PushupsSummary, session: ActiveSession): PushupsSummary {
  const nextTodayCount = summary.todayCount + session.sessionCount;
  const nextHistory = summary.history.map((day) =>
    day.date === session.sessionDate
      ? {
          ...day,
          count: day.count + session.sessionCount,
          goal: session.dailyGoal || day.goal,
          completed: (session.dailyGoal || day.goal) > 0 && day.count + session.sessionCount >= (session.dailyGoal || day.goal),
        }
      : day
  );

  if (!nextHistory.some((day) => day.date === session.sessionDate)) {
    nextHistory.unshift({
      date: session.sessionDate,
      label: weekdayLabel(session.sessionDate),
      count: session.sessionCount,
      goal: session.dailyGoal,
      completed: session.dailyGoal > 0 && session.sessionCount >= session.dailyGoal,
    });
  }

  return withFallbackHistory({
    ...summary,
    todayCount: session.sessionDate === localDateKey() ? nextTodayCount : summary.todayCount,
    dailyGoal: session.dailyGoal || summary.dailyGoal,
    completedToday: session.sessionDate === localDateKey() ? (session.dailyGoal || summary.dailyGoal) > 0 && nextTodayCount >= (session.dailyGoal || summary.dailyGoal) : summary.completedToday,
    progressPercent: session.sessionDate === localDateKey() && (session.dailyGoal || summary.dailyGoal) > 0
      ? Math.min(100, Math.round((nextTodayCount / (session.dailyGoal || summary.dailyGoal)) * 100))
      : summary.progressPercent,
    totalPushups: summary.totalPushups + session.sessionCount,
    bestDailyPushups: Math.max(summary.bestDailyPushups, session.sessionDate === localDateKey() ? nextTodayCount : session.sessionCount),
    history: nextHistory.slice(0, 7),
  });
}

function startOfLocalWeek(date: Date): Date {
  const start = new Date(date);
  const day = (start.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day);
  return start;
}

function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKeyFromDate(date: Date): string {
  return localDateKey(date);
}

function countPeriodStreak(history: PushupDay[], startDate: Date, todayCompleted: boolean): number {
  const todayKey = localDateKey();
  const completedDates = new Set(history.filter((day) => day.completed).map((day) => day.date));
  if (todayCompleted) completedDates.add(todayKey);

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const boundary = new Date(startDate);
  boundary.setHours(0, 0, 0, 0);

  while (cursor >= boundary) {
    if (!completedDates.has(dateKeyFromDate(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function readActiveSession(): ActiveSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as unknown;
    if (!isRecord(parsed)) return null;
    const sessionId = toStringValue(parsed.sessionId);
    if (!sessionId) return null;
    return {
      sessionId,
      startedAt: toStringValue(parsed.startedAt) || new Date().toISOString(),
      sessionDate: toStringValue(parsed.sessionDate) || localDateKey(),
      sessionCount: toNumber(parsed.sessionCount),
      syncedCount: toNumber(parsed.syncedCount),
      lastRegisteredTouch: toNumber(parsed.lastRegisteredTouch),
      paused: Boolean(parsed.paused),
      completed: Boolean(parsed.completed),
      dailyGoal: toNumber(parsed.dailyGoal),
    };
  } catch {
    return null;
  }
}

function saveActiveSession(session: ActiveSession | null): void {
  if (!session || session.completed) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function readMotivationMode(): boolean {
  try {
    return localStorage.getItem(MOTIVATION_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

function playCountSound(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

const PushupsPage: React.FC = () => {
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const token = useMemo(() => readStoredJwt(), []);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [summary, setSummary] = useState<PushupsSummary>(() => normalizeSummary(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveredSession, setRecoveredSession] = useState<ActiveSession | null>(() => readActiveSession());
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [needsGoal, setNeedsGoal] = useState(false);
  const [isGoalEditorOpen, setIsGoalEditorOpen] = useState(false);
  const [customGoal, setCustomGoal] = useState("");
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("allTime");
  const [cooldownMs, setCooldownMs] = useState(DEFAULT_COOLDOWN_MS);
  const [motivationMode, setMotivationMode] = useState(() => readMotivationMode());
  const [showMotivationIntro, setShowMotivationIntro] = useState(false);
  const [motivationIntroActive, setMotivationIntroActive] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [recordShown, setRecordShown] = useState(false);
  const [showGoalCelebration, setShowGoalCelebration] = useState(false);
  const [goalCelebrationShown, setGoalCelebrationShown] = useState(false);
  const lastSyncAtRef = useRef(Date.now());
  const syncPromiseRef = useRef<Promise<unknown> | null>(null);
  const didMountPersistRef = useRef(false);
  const countAudioRef = useRef<HTMLAudioElement | null>(null);
  const motivationIntroVideoRef = useRef<HTMLVideoElement | null>(null);
  const motivationIntroTimerRef = useRef<number | null>(null);
  const goalCelebrationTimerRef = useRef<number | null>(null);

  const todayWithSession = summary.todayCount + (activeSession ? activeSession.sessionCount : 0);
  const dailyGoal = activeSession?.dailyGoal || summary.dailyGoal;
  const progressPercent = dailyGoal > 0 ? Math.min(100, Math.round((todayWithSession / dailyGoal) * 100)) : 0;
  const leftToday = Math.max(0, dailyGoal - todayWithSession);
  const isGoalComplete = dailyGoal > 0 && todayWithSession >= dailyGoal;
  const leaderboard = summary.leaderboards[leaderboardTab];
  const todayHistoryCompleted = summary.history.some((day) => day.date === localDateKey() && day.completed);
  const dailyStreak = isGoalComplete && !todayHistoryCompleted ? summary.currentStreak + 1 : summary.currentStreak;
  const longestStreak = Math.max(summary.longestStreak, dailyStreak);
  const weeklyStreak = useMemo(
    () => countPeriodStreak(summary.history, startOfLocalWeek(new Date()), isGoalComplete),
    [isGoalComplete, summary.history]
  );
  const monthlyStreak = useMemo(
    () => countPeriodStreak(summary.history, startOfLocalMonth(new Date()), isGoalComplete),
    [isGoalComplete, summary.history]
  );

  const fetchSummary = useCallback(async () => {
    if (!apiBaseUrl || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [meRes, historyRes, allTimeRes, bestDayRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/pushups/me`, { headers: authHeaders }),
        fetch(`${apiBaseUrl}/api/pushups/history?limit=${HISTORY_LIMIT}`, { headers: authHeaders }),
        fetch(`${apiBaseUrl}/api/pushups/leaderboard?type=alltime`, { headers: authHeaders }),
        fetch(`${apiBaseUrl}/api/pushups/leaderboard?type=bestday`, { headers: authHeaders }),
      ]);

      if (!meRes.ok) throw new Error(await extractResponseMessage(meRes, `Kunne ikke hente armhevinger (${meRes.status})`));
      if (!historyRes.ok) throw new Error(await extractResponseMessage(historyRes, `Kunne ikke hente historikk (${historyRes.status})`));
      if (!allTimeRes.ok) throw new Error(await extractResponseMessage(allTimeRes, `Kunne ikke hente leaderboard (${allTimeRes.status})`));
      if (!bestDayRes.ok) throw new Error(await extractResponseMessage(bestDayRes, `Kunne ikke hente leaderboard (${bestDayRes.status})`));

      const mePayload = (await meRes.json()) as unknown;
      const meSummary = normalizeSummary(mePayload);
      const historyPayload = (await historyRes.json()) as unknown;
      const allTimePayload = (await allTimeRes.json()) as unknown;
      const bestDayPayload = (await bestDayRes.json()) as unknown;
      const historySource = isRecord(historyPayload) && Array.isArray(historyPayload.history) ? historyPayload.history : historyPayload;
      const allTimeSource = isRecord(allTimePayload) && Array.isArray(allTimePayload.leaderboard) ? allTimePayload.leaderboard : allTimePayload;
      const bestDaySource = isRecord(bestDayPayload) && Array.isArray(bestDayPayload.leaderboard) ? bestDayPayload.leaderboard : bestDayPayload;

      setSummary(
        withFallbackHistory({
          ...meSummary,
          history: Array.isArray(historySource)
            ? historySource.slice(0, HISTORY_LIMIT).map((day, index) => normalizeDay(day, index, meSummary.dailyGoal))
            : meSummary.history,
          leaderboards: {
            allTime: normalizeLeaderboard(allTimeSource),
            bestDay: normalizeLeaderboard(bestDaySource),
          },
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente armhevinger.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authHeaders, token]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    try {
      localStorage.setItem(MOTIVATION_MODE_KEY, String(motivationMode));
    } catch {
    }
  }, [motivationMode]);

  useEffect(() => {
    if (!showMotivationIntro) return;
    motivationIntroTimerRef.current = window.setTimeout(() => {
      setMotivationIntroActive(true);
      const video = motivationIntroVideoRef.current;
      if (video) {
        video.currentTime = 0;
        video.muted = false;
        video.volume = 1;
        void video.play().catch(() => undefined);
      }
      motivationIntroTimerRef.current = null;
    }, MOTIVATION_INTRO_FADE_MS);

    return () => {
      if (motivationIntroTimerRef.current !== null) {
        window.clearTimeout(motivationIntroTimerRef.current);
        motivationIntroTimerRef.current = null;
      }
    };
  }, [showMotivationIntro]);

  useEffect(() => {
    if (!didMountPersistRef.current) {
      didMountPersistRef.current = true;
      return;
    }
    if (activeSession) {
      saveActiveSession(activeSession);
    } else if (!recoveredSession) {
      saveActiveSession(null);
    }
  }, [activeSession, recoveredSession]);

  useEffect(() => {
    const canStartGoalCelebration =
      Boolean(activeSession) &&
      isGoalComplete &&
      !goalCelebrationShown &&
      !showGoalCelebration &&
      goalCelebrationTimerRef.current === null;

    if (!canStartGoalCelebration) return;

    setGoalCelebrationShown(true);
    setShowGoalCelebration(true);
    goalCelebrationTimerRef.current = window.setTimeout(() => {
      setShowGoalCelebration(false);
      goalCelebrationTimerRef.current = null;
    }, 1000);
  }, [activeSession, goalCelebrationShown, isGoalComplete, showGoalCelebration]);

  useEffect(() => {
    return () => {
      if (goalCelebrationTimerRef.current !== null) {
        window.clearTimeout(goalCelebrationTimerRef.current);
      }
      if (motivationIntroTimerRef.current !== null) {
        window.clearTimeout(motivationIntroTimerRef.current);
      }
    };
  }, []);

  const syncSession = useCallback(
    async (session: ActiveSession): Promise<void> => {
      if (!apiBaseUrl || !token || session.sessionCount < session.syncedCount) return;
      if (syncPromiseRef.current) await syncPromiseRef.current;

      const run = (async () => {
        setSyncing(true);
        try {
          const res = await fetch(`${apiBaseUrl}/api/pushups/sessions/${encodeURIComponent(session.sessionId)}/sync`, {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ count: session.sessionCount }),
          });
          if (!res.ok) throw new Error(await extractResponseMessage(res, `Synk feilet (${res.status})`));
          lastSyncAtRef.current = Date.now();
          setActiveSession((current) =>
            current?.sessionId === session.sessionId
              ? { ...current, syncedCount: Math.max(current.syncedCount, session.sessionCount) }
              : current
          );
        } finally {
          setSyncing(false);
          syncPromiseRef.current = null;
        }
      })();
      syncPromiseRef.current = run;
      await run;
    },
    [apiBaseUrl, authHeaders, token]
  );

  const finishSessionRequest = useCallback(
    async (session: ActiveSession): Promise<unknown | null> => {
      if (!apiBaseUrl || !token) return null;
      if (syncPromiseRef.current) await syncPromiseRef.current;
      const finishCount = Math.max(session.sessionCount, session.syncedCount);

      const run = (async () => {
        setSyncing(true);
        try {
          const res = await fetch(`${apiBaseUrl}/api/pushups/sessions/${encodeURIComponent(session.sessionId)}/finish`, {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ count: finishCount }),
          });
          if (!res.ok) throw new Error(await extractResponseMessage(res, `Synk feilet (${res.status})`));
          lastSyncAtRef.current = Date.now();
          return (await res.json().catch(() => null)) as unknown | null;
        } finally {
          setSyncing(false);
          syncPromiseRef.current = null;
        }
      })();
      syncPromiseRef.current = run;
      await run;
    },
    [apiBaseUrl, authHeaders, token]
  );

  useEffect(() => {
    if (!activeSession || activeSession.paused || activeSession.completed) return;
    const timer = window.setInterval(() => {
      setActiveSession((current) => {
        if (!current || current.paused || current.completed) return current;
        if (current.sessionCount <= current.syncedCount) return current;
        void syncSession(current).catch(() => undefined);
        return current;
      });
    }, SYNC_EVERY_MS);

    return () => window.clearInterval(timer);
  }, [activeSession, syncSession]);

  const startSession = useCallback(
    async (goal: number) => {
      if (goal <= 0) {
        setNeedsGoal(true);
        return;
      }

      let sessionId = `pushups-${crypto.randomUUID()}`;
      let startedAt = new Date().toISOString();
      if (apiBaseUrl && token) {
        try {
          const res = await fetch(`${apiBaseUrl}/api/pushups/sessions`, {
            method: "POST",
            headers: authHeaders,
          });
          if (res.ok) {
            const payload = (await res.json()) as unknown;
            if (isRecord(payload)) {
              sessionId = toStringValue(payload.sessionId ?? payload.id) || sessionId;
              startedAt = toStringValue(payload.startedAt ?? payload.started_at) || startedAt;
            }
          }
        } catch {
          // Local session is still kept and can be synced later.
        }
      }

      setActiveSession({
        sessionId,
        startedAt,
        sessionDate: localDateKey(),
        sessionCount: 0,
        syncedCount: 0,
        lastRegisteredTouch: 0,
        paused: false,
        completed: false,
        dailyGoal: goal,
      });
      setRecoveredSession(null);
      setShowGoalCelebration(false);
      setGoalCelebrationShown(false);
      setNeedsGoal(false);
    },
    [apiBaseUrl, authHeaders, token]
  );

  const saveGoal = useCallback(
    async (goal: number) => {
      if (goal <= 0) return;
      setSummary((current) => withFallbackHistory({ ...current, dailyGoal: goal }));
      setActiveSession((current) => (current ? { ...current, dailyGoal: goal } : current));
      if (apiBaseUrl && token) {
        try {
          await fetch(`${apiBaseUrl}/api/pushups/goal`, {
            method: "PUT",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ goal }),
          });
        } catch {
        }
      }
    },
    [apiBaseUrl, authHeaders, token]
  );

  const saveGoalAndClose = useCallback(
    async (goal: number) => {
      await saveGoal(goal);
      setIsGoalEditorOpen(false);
      setCustomGoal("");
    },
    [saveGoal]
  );

  const openGoalEditor = useCallback(() => {
    setCustomGoal(dailyGoal ? String(dailyGoal) : "50");
    setIsGoalEditorOpen(true);
  }, [dailyGoal]);

  const closeGoalEditor = useCallback(() => {
    setIsGoalEditorOpen(false);
    setCustomGoal("");
  }, []);

  const stepCustomGoal = useCallback((amount: number) => {
    setCustomGoal((current) => {
      const parsed = Number(current);
      const next = Math.max(1, Math.trunc((Number.isFinite(parsed) ? parsed : dailyGoal || 50) + amount));
      return String(next);
    });
  }, [dailyGoal]);

  const handleStart = useCallback(() => {
    if (!summary.dailyGoal) {
      setCustomGoal("50");
      setNeedsGoal(true);
      return;
    }
    void startSession(summary.dailyGoal);
  }, [startSession, summary.dailyGoal]);

  const registerPushup = useCallback((options?: { force?: boolean }) => {
    setActiveSession((current) => {
      if (!current || current.paused || current.completed) return current;
      const now = Date.now();
      if (!options?.force && now - current.lastRegisteredTouch < cooldownMs) return current;
      const nextCount = current.sessionCount + 1;
      const next = { ...current, sessionCount: nextCount, lastRegisteredTouch: now };
      setPulseKey((key) => key + 1);
      playCountSound(countAudioRef.current);
      navigator.vibrate?.(35);

      const nextToday = summary.todayCount + nextCount;
      if (!recordShown && summary.bestDailyPushups > 0 && nextToday > summary.bestDailyPushups) {
        setRecordShown(true);
      }

      const shouldSyncByCount = nextCount - current.syncedCount >= SYNC_EVERY_COUNT;
      const shouldSyncByTime = now - lastSyncAtRef.current >= SYNC_EVERY_MS;
      if (shouldSyncByCount || shouldSyncByTime) {
        void syncSession(next).catch(() => undefined);
      }
      return next;
    });
  }, [cooldownMs, recordShown, summary.bestDailyPushups, summary.todayCount, syncSession]);

  const pauseSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current) return current;
      const next = { ...current, paused: true };
      void syncSession(next).catch(() => undefined);
      return next;
    });
  }, [syncSession]);

  const resumeSession = useCallback(() => {
    setActiveSession((current) => (current ? { ...current, paused: false } : current));
  }, []);

  const finishSession = useCallback(() => {
    const session = activeSession;
    if (!session) return;
    const finished = { ...session, paused: true, completed: true };
    void finishSessionRequest(finished)
      .then((payload) => {
        if (!apiBaseUrl || !token) {
          setSummary((current) => addFinishedSessionToSummary(current, session));
        } else if (isRecord(payload)) {
          setSummary((current) => ({
            ...current,
            completedToday: Boolean(payload.goalCompleted ?? payload.completedToday ?? current.completedToday),
            currentStreak: toNumber(payload.currentStreak, current.currentStreak),
            longestStreak: toNumber(payload.longestStreak, current.longestStreak),
          }));
        }
        saveActiveSession(null);
        setActiveSession(null);
        setRecoveredSession(null);
        setShowGoalCelebration(false);
        setGoalCelebrationShown(false);
        setRecordShown(false);
        if (apiBaseUrl && token) void fetchSummary();
      })
      .catch(() => {
        setActiveSession({ ...session, paused: true });
      });
  }, [activeSession, apiBaseUrl, fetchSummary, finishSessionRequest, token]);

  const resumeRecoveredSession = useCallback(() => {
    if (!recoveredSession) return;
    setActiveSession({ ...recoveredSession, paused: false, completed: false });
    setRecoveredSession(null);
    setShowGoalCelebration(false);
    setGoalCelebrationShown(false);
  }, [recoveredSession]);

  const closeMotivationIntro = useCallback(() => {
    if (motivationIntroTimerRef.current !== null) {
      window.clearTimeout(motivationIntroTimerRef.current);
      motivationIntroTimerRef.current = null;
    }
    const video = motivationIntroVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setMotivationIntroActive(false);
    setShowMotivationIntro(false);
  }, []);

  const handleMotivationModeChange = useCallback((enabled: boolean) => {
    setMotivationMode(enabled);
    if (enabled) {
      setMotivationIntroActive(false);
      setShowMotivationIntro(true);
      return;
    }
    closeMotivationIntro();
  }, [closeMotivationIntro]);

  const handleMotivationIntroEnded = useCallback(() => {
    closeMotivationIntro();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [closeMotivationIntro]);

  const exitSession = useCallback(() => {
    setActiveSession((current) => {
      if (!current) {
        navigate("/pushups");
        return current;
      }
      const next = { ...current, paused: true };
      saveActiveSession(next);
      setRecoveredSession(next);
      void syncSession(next).catch(() => undefined);
      navigate("/pushups");
      return null;
    });
  }, [navigate, syncSession]);

  const finishRecoveredSession = useCallback(() => {
    if (!recoveredSession) return;
    const finished = { ...recoveredSession, paused: true, completed: true };
    void finishSessionRequest(finished)
      .then((payload) => {
        if (!apiBaseUrl || !token) {
          setSummary((current) => addFinishedSessionToSummary(current, recoveredSession));
        } else if (isRecord(payload)) {
          setSummary((current) => ({
            ...current,
            completedToday: Boolean(payload.goalCompleted ?? payload.completedToday ?? current.completedToday),
            currentStreak: toNumber(payload.currentStreak, current.currentStreak),
            longestStreak: toNumber(payload.longestStreak, current.longestStreak),
          }));
        }
        saveActiveSession(null);
        setRecoveredSession(null);
        if (apiBaseUrl && token) void fetchSummary();
      })
      .catch(() => {
      });
  }, [apiBaseUrl, fetchSummary, finishSessionRequest, recoveredSession, token]);

  const applyCustomGoal = useCallback(() => {
    const goal = Number(customGoal);
    if (!Number.isFinite(goal) || goal <= 0) return;
    void saveGoal(Math.trunc(goal));
    void startSession(Math.trunc(goal));
    setIsGoalEditorOpen(false);
    setCustomGoal("");
  }, [customGoal, saveGoal, startSession]);

  if (activeSession && !activeSession.completed) {
    return (
      <main className={`pushupsTracker${showGoalCelebration ? " celebrating" : ""}`}>
        <audio ref={countAudioRef} src={pushupTapSound} preload="auto" />
        {motivationMode ? <MotivationVideoBackground /> : null}
        {isGoalComplete && !showGoalCelebration ? <div className="pushupsGoalReachedBadge">Dagsmål nådd</div> : null}
        <button
          type="button"
          className={`pushupsTouchArea${activeSession.paused ? " paused" : ""}`}
          onPointerDown={(event) => {
            if (!showGoalCelebration && event.isPrimary && event.pointerType !== "mouse") registerPushup();
          }}
          onClick={(event) => {
            event.preventDefault();
            if (showGoalCelebration) return;
            registerPushup();
          }}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Registrer pushup"
        >
          {showGoalCelebration ? null : (
            <>
              <span key={pulseKey} className="pushupsCounterPulse">
                {activeSession.sessionCount}
              </span>
              {activeSession.paused ? <span className="pushupsPausedText">Pause</span> : null}
            </>
          )}
        </button>

        {showGoalCelebration ? (
          <div className="pushupsGoalBurst" aria-live="polite">
            <div className="pushupsBurstRing" />
            <div className="pushupsBurstRing two" />
            <div className="pushupsConfetti">
              {Array.from({ length: 26 }).map((_, index) => (
                <span
                  key={index}
                  style={
                    {
                      "--i": index,
                      "--x": `${(index * 37) % 100}%`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        ) : null}

        {showGoalCelebration ? null : (
          <div className="pushupsTrackerControls">
            <button type="button" className="pushupsSecondaryBtn" onClick={activeSession.paused ? resumeSession : pauseSession}>
              {activeSession.paused ? "Fortsett" : "Pause"}
            </button>
            <button type="button" className="pushupsSecondaryBtn" onClick={exitSession}>
              Tilbake
            </button>
            <button type="button" className="pushupsFinishBtn" onClick={finishSession}>
              Fullfør
            </button>
          </div>
        )}
        {syncing ? <div className="pushupsTrackerSync">Synker...</div> : null}
      </main>
    );
  }

  return (
    <main className="pushupsPage">
      <div className="bgGlow" />
      <PageHeader title="Armhevinger" subtitle="Dagens økt" showBack />

      <section className="pushupsDashboard">
        {recoveredSession ? (
          <div className="pushupsResumeCard">
            <div>
              <strong>Uferdig økt</strong>
              <span>Registrerte armhevinger blir ikke kastet.</span>
            </div>
            <button type="button" onClick={resumeRecoveredSession}>
              Fortsett økt
            </button>
            <button type="button" onClick={finishRecoveredSession}>
              Fullfør økt
            </button>
          </div>
        ) : null}

        <div className={`pushupsHeroCard${isGoalComplete ? " complete" : ""}`}>
          <div className="pushupsStreak">{dailyStreak} dager på rad</div>
          <div className="pushupsToday">
            {loading ? "..." : todayWithSession} / {dailyGoal || "-"}
          </div>
          <div className="pushupsProgressBar" aria-label={`Målprogresjon ${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="pushupsLeft">
            {dailyGoal ? (isGoalComplete ? `+${todayWithSession - dailyGoal} over målet` : `${leftToday} armhevinger igjen`) : "Velg dagsmål"}
          </div>
          {isGoalComplete ? <div className="pushupsCelebration">DAGSMÅL FULLFØRT</div> : null}
          {summary.bestDailyPushups > 0 && todayWithSession > summary.bestDailyPushups ? (
            <div className="pushupsCelebration small">NY PERSONLIG REKORD</div>
          ) : null}
          <button type="button" className="pushupsStartBtn" onClick={handleStart}>
            START
          </button>
        </div>

        {error ? <div className="pushupsInlineError">{error}</div> : null}

        <section className="pushupsStatsGrid" aria-label="Statistikk for armhevinger">
          <div>
            <span>Totalt</span>
            <strong>{formatNumber(summary.totalPushups + (activeSession?.sessionCount ?? 0))}</strong>
          </div>
          <div>
            <span>Beste dag</span>
            <strong>{formatNumber(Math.max(summary.bestDailyPushups, todayWithSession))}</strong>
          </div>
          <button
            type="button"
            className="pushupsStatButton"
            onClick={openGoalEditor}
            aria-expanded={isGoalEditorOpen}
          >
            <span>Dagsmål</span>
            <strong>{dailyGoal || "-"}</strong>
          </button>
          <div>
            <span>Lengste rekke</span>
            <strong>{longestStreak}</strong>
          </div>
        </section>

        <section className="pushupsPanel pushupsStreakPanel">
          <div className="pushupsSectionTitle">Streaks</div>
          <div className="pushupsStreakGrid">
            <div>
              <span>Daglig</span>
              <strong>{dailyStreak}</strong>
              <small>dager på rad</small>
            </div>
            <div>
              <span>Denne uken</span>
              <strong>{weeklyStreak}</strong>
              <small>dager på rad</small>
            </div>
            <div>
              <span>Denne måneden</span>
              <strong>{monthlyStreak}</strong>
              <small>dager på rad</small>
            </div>
            <div>
              <span>Lengste</span>
              <strong>{longestStreak}</strong>
              <small>dager</small>
            </div>
          </div>
        </section>

        <section className="pushupsPanel">
          <div className="pushupsSectionTitle">Historikk</div>
          <div className="pushupsHistoryList">
            {summary.history.slice(0, DISPLAY_HISTORY_DAYS).map((day) => (
              <div key={day.date} className="pushupsHistoryRow">
                <span>{day.label}</span>
                <strong>
                  {day.date === localDateKey() ? todayWithSession : day.count} / {day.goal || "-"} {day.completed ? "OK" : ""}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="pushupsPanel">
          <div className="pushupsSectionTitle">Toppliste</div>
          <div className="pushupsTabs">
            <button type="button" className={leaderboardTab === "allTime" ? "active" : ""} onClick={() => setLeaderboardTab("allTime")}>
              Totalt
            </button>
            <button type="button" className={leaderboardTab === "bestDay" ? "active" : ""} onClick={() => setLeaderboardTab("bestDay")}>
              Beste dag
            </button>
            <button type="button" disabled>
              Denne uken
            </button>
            <button type="button" disabled>
              Denne måneden
            </button>
          </div>
          <div className="pushupsLeaderboard">
            {leaderboard.length === 0 ? (
              <div className="pushupsEmpty">Ingen toppliste enda.</div>
            ) : (
              leaderboard.map((entry) => (
                <div key={`${entry.rank}-${entry.displayName}`} className={entry.currentUser ? "currentUser" : ""}>
                  <span>{entry.rank}. {entry.displayName}</span>
                  <strong>{formatNumber(entry.value)}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="pushupsSettings">
          <label className="pushupsMotivationToggle">
            Motivasjonsmodus
            <input
              type="checkbox"
              checked={motivationMode}
              onChange={(event) => handleMotivationModeChange(event.target.checked)}
            />
            <span>{motivationMode ? "På" : "Av"}</span>
          </label>
          <label>
            Tellepause
            <input
              type="range"
              min="300"
              max="500"
              step="25"
              value={cooldownMs}
              onChange={(event) => setCooldownMs(Number(event.target.value))}
            />
            <span>{cooldownMs} ms</span>
          </label>
          <p>V1 legger hele økten på den lokale datoen den startet. Det hindrer delte eller doble tellinger hvis økten går over midnatt.</p>
        </section>
      </section>

      {showMotivationIntro ? (
        <div className={`pushupsMotivationIntro${motivationIntroActive ? " videoActive" : ""}`}>
          <video
            ref={motivationIntroVideoRef}
            src={MOTIVATION_INTRO_SRC}
            playsInline
            preload="auto"
            onEnded={handleMotivationIntroEnded}
            aria-hidden="true"
          />
        </div>
      ) : null}

      {needsGoal || isGoalEditorOpen ? (
        <div className="loanModalBackdrop" onClick={needsGoal ? undefined : closeGoalEditor}>
          <div className="loanModal pushupsGoalModal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">{needsGoal ? "Velg dagsmål" : "Endre dagsmål"}</div>
              <button type="button" className="loanModalClose" onClick={needsGoal ? () => setNeedsGoal(false) : closeGoalEditor} aria-label="Lukk">
                x
              </button>
            </div>
            <div className="pushupsGoalSpinner">
              <button type="button" onClick={() => stepCustomGoal(-5)} aria-label="Senk dagsmål med fem">
                -
              </button>
              <input
                value={customGoal}
                onChange={(event) => setCustomGoal(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                aria-label="Dagsmål"
              />
              <button type="button" onClick={() => stepCustomGoal(5)} aria-label="Øk dagsmål med fem">
                +
              </button>
            </div>
            <button
              type="button"
              className="pushupsGoalSaveBtn"
              onClick={() => {
                const goal = Math.max(0, Math.trunc(Number(customGoal)));
                if (needsGoal) {
                  applyCustomGoal();
                  return;
                }
                void saveGoalAndClose(goal);
              }}
            >
              {needsGoal ? "Start" : "Lagre"}
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </main>
  );
};

export default PushupsPage;
