import React, { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import { PageHeader } from "../components/PageHeaderProps";
import { isCurrentUserAdmin } from "../utils/adminAccess";
import { readStoredJwt } from "../utils/jwtToken";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import "../style/TimeRegistrationPage.css";

type TimeEntry = {
  id: number;
  startTime: string;
  endTime: string | null;
  totalMinutes: number;
  overtimeMinutes: number;
  note: string | null;
  running: boolean;
};

type TimeSummary = {
  totalMinutes: number;
  overtimeMinutes: number;
  entryCount: number;
};

type WeeklySummaryDay = TimeSummary & {
  date: string;
  dayName: string;
};

type WeeklySummary = {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  overtimeMinutes: number;
  days: WeeklySummaryDay[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function toMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return 0;
}

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown): string | null {
  const text = toCleanString(value);
  return text || null;
}

function normalizeEntry(raw: unknown): TimeEntry | null {
  if (!isRecord(raw)) return null;
  const id = toId(raw.id);
  if (id == null) return null;

  return {
    id,
    startTime: toCleanString(raw.startTime ?? raw.start_time),
    endTime: toNullableString(raw.endTime ?? raw.end_time),
    totalMinutes: toMinutes(raw.totalMinutes ?? raw.total_minutes),
    overtimeMinutes: toMinutes(raw.overtimeMinutes ?? raw.overtime_minutes),
    note: toNullableString(raw.note),
    running: Boolean(raw.running),
  };
}

function normalizeSummary(raw: unknown): TimeSummary {
  if (!isRecord(raw)) {
    return { totalMinutes: 0, overtimeMinutes: 0, entryCount: 0 };
  }

  return {
    totalMinutes: toMinutes(raw.totalMinutes ?? raw.total_minutes),
    overtimeMinutes: toMinutes(raw.overtimeMinutes ?? raw.overtime_minutes),
    entryCount: toMinutes(raw.entryCount ?? raw.entry_count),
  };
}

function normalizeWeeklySummary(raw: unknown): WeeklySummary {
  if (!isRecord(raw)) {
    return { weekStart: "", weekEnd: "", totalMinutes: 0, overtimeMinutes: 0, days: [] };
  }

  const days = Array.isArray(raw.days)
    ? raw.days
        .filter(isRecord)
        .map((day) => ({
          date: toCleanString(day.date),
          dayName: toCleanString(day.dayName ?? day.day_name),
          totalMinutes: toMinutes(day.totalMinutes ?? day.total_minutes),
          overtimeMinutes: toMinutes(day.overtimeMinutes ?? day.overtime_minutes),
          entryCount: toMinutes(day.entryCount ?? day.entry_count),
        }))
    : [];

  return {
    weekStart: toCleanString(raw.weekStart ?? raw.week_start),
    weekEnd: toCleanString(raw.weekEnd ?? raw.week_end),
    totalMinutes: toMinutes(raw.totalMinutes ?? raw.total_minutes),
    overtimeMinutes: toMinutes(raw.overtimeMinutes ?? raw.overtime_minutes),
    days,
  };
}

async function extractResponseMessage(response: Response, fallback: string): Promise<string> {
  const text = (await response.text().catch(() => "")).trim();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      const message = toCleanString(parsed.message);
      const error = toCleanString(parsed.error);
      if (message) return message;
      if (error) return error;
    }
  } catch {
    // Plain text response.
  }

  return text || fallback;
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.trunc(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} t`;
  return `${hours} t ${remainingMinutes} min`;
}

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

function endOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function localDateTimeInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

const TimeRegistrationPage: React.FC = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
  const token = useMemo(() => readStoredJwt(), []);
  const isAdmin = useMemo(() => isCurrentUserAdmin(), []);
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<TimeSummary>({
    totalMinutes: 0,
    overtimeMinutes: 0,
    entryCount: 0,
  });
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary>({
    weekStart: "",
    weekEnd: "",
    totalMinutes: 0,
    overtimeMinutes: 0,
    days: [],
  });
  const [startNote, setStartNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"start" | "stop" | "delete" | "edit" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const fetchActiveEntry = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl}/api/time-entries/active`, {
      headers: authHeaders,
    });

    if (res.status === 204) return null;
    if (!res.ok) {
      throw new Error(await extractResponseMessage(res, `Kunne ikke hente aktiv tid (${res.status})`));
    }

    return normalizeEntry((await res.json()) as unknown);
  }, [apiBaseUrl, authHeaders]);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl}/api/time-entries`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      throw new Error(await extractResponseMessage(res, `Kunne ikke hente timer (${res.status})`));
    }

    const payload = (await res.json()) as unknown;
    return Array.isArray(payload)
      ? payload.map(normalizeEntry).filter((entry): entry is TimeEntry => entry !== null)
      : [];
  }, [apiBaseUrl, authHeaders]);

  const fetchSummary = useCallback(async () => {
    const params = new URLSearchParams({
      from: startOfCurrentMonthIso(),
      to: endOfCurrentMonthIso(),
    });
    const res = await fetch(`${apiBaseUrl}/api/time-entries/summary?${params.toString()}`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      throw new Error(await extractResponseMessage(res, `Kunne ikke hente oppsummering (${res.status})`));
    }

    return normalizeSummary((await res.json()) as unknown);
  }, [apiBaseUrl, authHeaders]);

  const fetchWeeklySummary = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl}/api/time-entries/summary/weekly`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      throw new Error(await extractResponseMessage(res, `Kunne ikke hente ukeoversikt (${res.status})`));
    }

    return normalizeWeeklySummary((await res.json()) as unknown);
  }, [apiBaseUrl, authHeaders]);

  const loadTimeData = useCallback(async () => {
    if (!token) {
      setError("Ikke innlogget.");
      setLoading(false);
      return;
    }

    if (!isAdmin) {
      setError("Denne siden er bare tilgjengelig for admin.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [active, nextEntries, nextSummary, nextWeeklySummary] = await Promise.all([
        fetchActiveEntry(),
        fetchEntries(),
        fetchSummary(),
        fetchWeeklySummary(),
      ]);
      setActiveEntry(active);
      setEntries(nextEntries);
      setSummary(nextSummary);
      setWeeklySummary(nextWeeklySummary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente timeregistrering.");
      setActiveEntry(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [fetchActiveEntry, fetchEntries, fetchSummary, fetchWeeklySummary, isAdmin, token]);

  useEffect(() => {
    void loadTimeData();
  }, [loadTimeData]);

  const runAction = async (action: "start" | "stop") => {
    setActionError(null);
    setActionLoading(action);

    try {
      const res = await fetch(`${apiBaseUrl}/api/time-entries/${action}`, {
        method: "POST",
        headers:
          action === "start" && startNote.trim()
            ? { ...authHeaders, "Content-Type": "application/json" }
            : authHeaders,
        body:
          action === "start" && startNote.trim()
            ? JSON.stringify({ note: startNote.trim() })
            : undefined,
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke ${action === "start" ? "starte" : "stoppe"} tid (${res.status})`));
      }

      if (action === "start") setStartNote("");
      await loadTimeData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Handlingen feilet.");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteEntry = async (entryId: number) => {
    setActionError(null);
    setActionLoading("delete");

    try {
      const res = await fetch(`${apiBaseUrl}/api/time-entries/${entryId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke slette (${res.status})`));
      }

      await loadTimeData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Kunne ikke slette timen.");
    } finally {
      setActionLoading(null);
    }
  };

  const openEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditStartTime(toLocalDateTimeInput(entry.startTime));
    setEditEndTime(toLocalDateTimeInput(entry.endTime));
    setEditNote(entry.note ?? "");
    setEditError(null);
  };

  const closeEditEntry = () => {
    if (actionLoading === "edit") return;
    setEditingEntry(null);
    setEditError(null);
  };

  const saveEditedEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingEntry) return;

    const startIso = localDateTimeInputToIso(editStartTime);
    const endIso = localDateTimeInputToIso(editEndTime);
    if (!startIso) {
      setEditError("Starttid er ugyldig.");
      return;
    }
    if (editEndTime && !endIso) {
      setEditError("Slutttid er ugyldig.");
      return;
    }
    if (endIso && new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setEditError("Slutttid kan ikke vaere for starttid.");
      return;
    }

    const payload: Record<string, string | null> = {};
    if (startIso !== editingEntry.startTime) payload.startTime = startIso;
    if ((endIso ?? null) !== editingEntry.endTime) payload.endTime = endIso;
    if (editNote.trim() !== (editingEntry.note ?? "")) payload.note = editNote.trim() || null;

    if (Object.keys(payload).length === 0) {
      setEditingEntry(null);
      return;
    }

    setEditError(null);
    setActionLoading("edit");

    try {
      const res = await fetch(`${apiBaseUrl}/api/time-entries/${editingEntry.id}`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await extractResponseMessage(res, `Kunne ikke oppdatere (${res.status})`));
      }

      setEditingEntry(null);
      await loadTimeData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Kunne ikke oppdatere timen.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="profilePage timeRegistrationPage">
      <div className="bgGlow" />
      <main className="profileMain timeRegistrationMain">
        <PageHeader title="Timeregistrering" subtitle="Admin" showBack />

        <section className="section card timeRegistrationCard">
          {loading ? (
            <p className="timeRegistrationState">Laster timeregistrering...</p>
          ) : error ? (
            <p className="timeRegistrationState timeRegistrationError">{error}</p>
          ) : (
            <>
              <div className="timeRegistrationHero">
                <div>
                  <div className="sectionTitle timeRegistrationTitle">
                    {activeEntry ? "Arbeid pagar" : "Ingen aktiv registrering"}
                  </div>
                  <p className="timeRegistrationIntro">
                    {activeEntry
                      ? `Startet ${formatDateTime(activeEntry.startTime)}`
                      : "Start timeren nar du begynner, og stopp den nar du er ferdig."}
                  </p>
                </div>
                <div className="timeRegistrationStartControls">
                  {!activeEntry ? (
                    <label className="formField timeRegistrationStartNote">
                      <span>Notat (valgfritt)</span>
                      <input
                        type="text"
                        value={startNote}
                        onChange={(event) => setStartNote(event.target.value)}
                        placeholder="Hva jobber du med?"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className={activeEntry ? "loanDangerBtn timeRegistrationAction" : "loanPrimaryBtn timeRegistrationAction"}
                    disabled={!!actionLoading}
                    onClick={() => void runAction(activeEntry ? "stop" : "start")}
                  >
                    {activeEntry
                      ? actionLoading === "stop"
                        ? "Stopper..."
                        : "Stopp"
                      : actionLoading === "start"
                        ? "Starter..."
                        : "Start"}
                  </button>
                </div>
              </div>

              <div className="timeRegistrationStats">
                <div className="timeRegistrationStat">
                  <span>Timer denne maneden</span>
                  <strong>{formatMinutes(summary.totalMinutes)}</strong>
                </div>
                <div className="timeRegistrationStat">
                  <span>Overtid</span>
                  <strong>{formatMinutes(summary.overtimeMinutes)}</strong>
                </div>
                <div className="timeRegistrationStat">
                  <span>Registreringer</span>
                  <strong>{summary.entryCount}</strong>
                </div>
              </div>

              {actionError ? <div className="formNotice error">{actionError}</div> : null}
            </>
          )}
        </section>

        {!loading && !error ? (
          <section className="section card timeRegistrationCard">
            <div className="timeRegistrationWeeklyHeader">
              <div>
                <div className="sectionTitle timeRegistrationTitle">Denne uken</div>
                <p className="timeRegistrationIntro">
                  {weeklySummary.weekStart && weeklySummary.weekEnd
                    ? `${weeklySummary.weekStart} - ${weeklySummary.weekEnd}`
                    : "Mandag til sondag"}
                </p>
              </div>
              <strong>{formatMinutes(weeklySummary.totalMinutes)}</strong>
            </div>
            <div className="timeRegistrationWeek">
              {weeklySummary.days.map((day) => (
                <div key={day.date} className="timeRegistrationDay">
                  <div>
                    <strong>{day.dayName || day.date}</strong>
                    <span>{day.entryCount} registreringer</span>
                  </div>
                  <div className="timeRegistrationDayTotals">
                    <strong>{formatMinutes(day.totalMinutes)}</strong>
                    {day.overtimeMinutes > 0 ? <span>+ {formatMinutes(day.overtimeMinutes)} overtid</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="section card timeRegistrationCard">
            <div className="sectionTitle">Siste registreringer</div>
            {entries.length === 0 ? (
              <p className="timeRegistrationState">Ingen timer registrert enda.</p>
            ) : (
              <div className="timeRegistrationList">
                {entries.map((entry) => (
                  <article key={entry.id} className="timeRegistrationEntry">
                    <div className="timeRegistrationEntryTop">
                      <div>
                        <div className="timeRegistrationEntryTitle">
                          {entry.running ? "Pagar" : formatMinutes(entry.totalMinutes)}
                        </div>
                        <div className="timeRegistrationEntryMeta">
                          {formatDateTime(entry.startTime)}
                          {entry.endTime ? ` - ${formatDateTime(entry.endTime)}` : ""}
                        </div>
                      </div>
                      <span className={entry.running ? "timeRegistrationBadge active" : "timeRegistrationBadge"}>
                        {entry.running ? "Aktiv" : "Ferdig"}
                      </span>
                    </div>
                    {entry.overtimeMinutes > 0 ? (
                      <div className="timeRegistrationOvertime">
                        Overtid: {formatMinutes(entry.overtimeMinutes)}
                      </div>
                    ) : null}
                    {entry.note ? <p className="timeRegistrationNote">{entry.note}</p> : null}
                    <div className="timeRegistrationEntryActions">
                      <button
                        type="button"
                        className="timeRegistrationEdit"
                        disabled={!!actionLoading}
                        onClick={() => openEditEntry(entry)}
                      >
                        Endre
                      </button>
                      <button
                        type="button"
                        className="timeRegistrationDelete"
                        disabled={!!actionLoading}
                        onClick={() => void deleteEntry(entry.id)}
                      >
                        Slett
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
      <BottomNav />

      {editingEntry ? (
        <div className="loanModalBackdrop" onClick={closeEditEntry}>
          <div className="loanModal" onClick={(event) => event.stopPropagation()}>
            <div className="loanModalHeader">
              <div className="loanModalTitle">Endre timeregistrering</div>
              <button className="loanModalClose" type="button" onClick={closeEditEntry}>
                x
              </button>
            </div>

            <form className="loanForm" onSubmit={saveEditedEntry}>
              <div className="formGrid">
                <label className="formField">
                  <span>Starttid</span>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(event) => setEditStartTime(event.target.value)}
                    required
                  />
                </label>
                <label className="formField">
                  <span>Slutttid</span>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(event) => setEditEndTime(event.target.value)}
                  />
                </label>
              </div>
              <label className="formField">
                <span>Notat</span>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder="Valgfritt notat"
                />
              </label>
              <div className="formActions">
                <button type="submit" className="loanPrimaryBtn" disabled={actionLoading === "edit"}>
                  {actionLoading === "edit" ? "Lagrer..." : "Lagre"}
                </button>
                <button type="button" className="loanGhostBtn" onClick={closeEditEntry} disabled={actionLoading === "edit"}>
                  Avbryt
                </button>
              </div>
              {editError ? <div className="formNotice error">{editError}</div> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TimeRegistrationPage;
