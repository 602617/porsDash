// src/components/EventDetail.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import RsvpForm from "./RsvpForm";
import "../style/EventDetail.css";
import "../style/LoanPage.css";
import { subscribeUser } from "./usePushNotifications";
import { PageHeader } from "./PageHeaderProps";
import BottomNav from "./BottomNav";
import { triggerNotificationsRefresh } from "../utils/notificationsRefresh";

interface AttendanceDto {
  userId: number;
  username: string;
  status: "INVITED" | "CAN" | "CANNOT";
  comment?: string;
  updatedAt: string;
}

interface EventDetailDto {
  id: number;
  title: string;
  description: string;
  location?: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  invitedUserIds?: number[];
  attendees: AttendanceDto[];
}

interface EventUpdateDto {
  title: string;
  description: string;
  location?: string;
  startTime: string;
  endTime: string;
}

type JwtClaims = {
  sub?: string;
  username?: string;
  preferred_username?: string;
};

type MeDto = {
  id?: number;
  username?: string;
};

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 16);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("no-NO", { day: "2-digit", month: "long" }),
    time: d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
  };
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const rawToken = localStorage.getItem("jwt") ?? "";
  const currentUser = useMemo(() => {
    try {
      const decoded = jwtDecode<JwtClaims>(rawToken);
      const identity =
        decoded.sub ||
        decoded.username ||
        decoded.preferred_username ||
        "";
      return identity.toLowerCase();
    } catch {
      return "";
    }
  }, [rawToken]);
  const [currentUserFromApi, setCurrentUserFromApi] = useState("");

  const [event, setEvent] = useState<EventDetailDto | null>(null);
  const [attendees, setAttendees] = useState<AttendanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const forceOpenEdit = useMemo(
    () => new URLSearchParams(location.search).get("edit") === "1",
    [location.search]
  );

  const fetchEventDetail = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl}/api/events/${id}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rawToken}`,
      },
    });
    if (res.status === 404) {
      throw new Error("Arrangement finnes ikke.");
    }
    if (!res.ok) {
      throw new Error(`Kunne ikke hente event (${res.status})`);
    }
    const data: EventDetailDto = await res.json();
    setEvent(data);
    setAttendees(data.attendees);
    const myAttendance = data.attendees.find((a) => a.username.toLowerCase() === currentUser);
    const hasResponded = myAttendance?.status === "CAN" || myAttendance?.status === "CANNOT";
    setShowForm(!hasResponded);
    return data;
  }, [apiBaseUrl, currentUser, id, rawToken]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchEventDetail();
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ukjent feil ved lasting");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchEventDetail]);

  useEffect(() => {
    let alive = true;
    if (!rawToken) return;

    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${rawToken}`,
          },
        });
        if (!res.ok) return;
        const me = (await res.json()) as MeDto;
        if (!alive) return;
        setCurrentUserFromApi((me.username || "").toLowerCase());
      } catch {
        // Keep JWT-based fallback.
      }
    })();

    return () => {
      alive = false;
    };
  }, [apiBaseUrl, rawToken]);

  const resolvedCurrentUser = currentUserFromApi || currentUser;
  const isOwner = (event?.createdBy || "").trim().toLowerCase() === resolvedCurrentUser;

  useEffect(() => {
    if (!forceOpenEdit || !event || isEditOpen) return;
    setActionMessage(null);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditLocation(event.location || "");
    setEditStartTime(toLocalDateTimeInput(event.startTime));
    setEditEndTime(toLocalDateTimeInput(event.endTime));
    setIsEditOpen(true);
  }, [event, forceOpenEdit, isEditOpen]);

  const handleNewRsvp = (att: AttendanceDto) => {
    setAttendees((prev) => prev.filter((a) => a.userId !== att.userId).concat(att));
    setShowForm(false);
  };

  if (loading) return <p className="eventState">Laster arrangement...</p>;
  if (error) return <p className="eventState eventError">Feil: {error}</p>;
  if (!event) return <p className="eventState">Arrangement ikke funnet.</p>;

  const { date: startDate, time: startTime } = formatDateTime(event.startTime);
  const { date: endDate, time: endTime } = formatDateTime(event.endTime);

  const canList = attendees.filter((a) => a.status === "CAN");
  const invitedList = attendees.filter((a) => a.status === "INVITED");
  const cannotList = attendees.filter((a) => a.status === "CANNOT");

  const openEdit = () => {
    setActionMessage(null);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditLocation(event.location || "");
    setEditStartTime(toLocalDateTimeInput(event.startTime));
    setEditEndTime(toLocalDateTimeInput(event.endTime));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    if (!editTitle || !editDescription || !editStartTime || !editEndTime) {
      setActionMessage("Fyll ut alle paakrevde felt.");
      return;
    }
    const startDate = new Date(editStartTime);
    const endDate = new Date(editEndTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setActionMessage("Ugyldig dato/tid.");
      return;
    }
    if (endDate.getTime() <= startDate.getTime()) {
      setActionMessage("Sluttidspunkt maa vaere etter starttidspunkt.");
      return;
    }

    const dto: EventUpdateDto = {
      title: editTitle,
      description: editDescription,
      location: editLocation || undefined,
      startTime: editStartTime,
      endTime: editEndTime,
    };

    setSavingEdit(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/events/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rawToken}`,
        },
        body: JSON.stringify(dto),
      });

      if (res.status === 403) {
        throw new Error("Du eier ikke dette eventet");
      }
      if (res.status === 404) {
        throw new Error("Arrangement finnes ikke.");
      }
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Kunne ikke oppdatere event (${res.status})`);
      }

      await fetchEventDetail();
      setIsEditOpen(false);
      setActionMessage("Arrangement oppdatert.");
      triggerNotificationsRefresh("event:update");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Kunne ikke oppdatere event.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Slette dette arrangementet?")) return;
    setActionMessage(null);
    setDeleting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/events/${event.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${rawToken}`,
        },
      });
      if (res.status === 403) {
        throw new Error("Du eier ikke dette eventet");
      }
      if (res.status === 404) {
        throw new Error("Arrangement finnes ikke.");
      }
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Kunne ikke slette event (${res.status})`);
      }

      triggerNotificationsRefresh("event:delete");
      navigate("/dugnad", { replace: true });
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Kunne ikke slette event.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="eventDetailPage">
      <div className="bgGlow" />
      <main className="eventDetailMain">
        <PageHeader title={event.title} showBack />

        <section className="section card eventHero">
          <div className="chip">Arrangement</div>
          <h1 className="eventTitle">{event.title}</h1>
          <div className="eventMetaRow">
            <span className="metaPill">
              {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
            </span>
            <span className="metaPill">kl. {startTime} - {endTime}</span>
            {event.location ? <span className="metaPill">{event.location}</span> : null}
          </div>
          <p className="eventDesc">{event.description}</p>
          <p className="eventCreator">Opprettet av: {event.createdBy}</p>
          <div className="eventOwnerActions">
            <button type="button" className="loanGhostBtn eventOwnerActionBtn" onClick={openEdit}>
              Rediger arrangement
            </button>
            <button
              type="button"
              className="loanDangerBtn eventOwnerActionBtn"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Sletter..." : "Slett arrangement"}
            </button>
          </div>
          {!isOwner ? (
            <div className="eventActionNotice">Kun oppretter kan lagre endringer eller slette.</div>
          ) : null}
          {actionMessage ? <div className="eventActionNotice">{actionMessage}</div> : null}
        </section>

        {isEditOpen ? (
          <section className="section card eventEditCard">
            <div className="sectionTitle">Rediger arrangement</div>
            <form onSubmit={handleSaveEdit} className="eventEditForm">
              <label className="field">
                <span>Tittel</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Beskrivelse</span>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Sted</span>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </label>
              <div className="eventEditGrid">
                <label className="field">
                  <span>Starttidspunkt</span>
                  <input
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Sluttidspunkt</span>
                  <input
                    type="datetime-local"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    min={editStartTime || undefined}
                    required
                  />
                </label>
              </div>
              <div className="eventEditActions">
                <button type="submit" className="eventOwnerBtn" disabled={savingEdit}>
                  {savingEdit ? "Lagrer..." : "Lagre endringer"}
                </button>
                <button
                  type="button"
                  className="eventOwnerBtn eventOwnerBtnGhost"
                  onClick={() => setIsEditOpen(false)}
                  disabled={savingEdit}
                >
                  Avbryt
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="section card eventRsvp">
          <div className="sectionTitle">Din respons</div>
          {showForm ? (
            <RsvpForm eventId={event.id} onRsvpSuccess={handleNewRsvp} />
          ) : (
            <button
              onClick={() => {
                setShowForm(true);
                subscribeUser()
                  .then((s) => {
                    if (s) alert("Abonnert!");
                  })
                  .catch((err) => console.error(err));
              }}
              className="eventActionBtn"
            >
              Endre svar
            </button>
          )}
        </section>

        <section className="section card eventAttendees">
          <div className="sectionTitle">Deltakere</div>
          {attendees.length === 0 ? (
            <p className="eventEmpty">Ingen har meldt seg enn?.</p>
          ) : (
            <div className="eventGrid">
              {canList.length > 0 ? (
                <div className="attendeeGroup">
                  <div className="attendeeTitle">Kan delta</div>
                  <ul className="attendeeList">
                    {canList.map((a) => (
                      <li key={a.userId} className="attendeeItem">
                        <span>{a.username}</span>
                        {a.comment ? <span className="attendeeComment">"{a.comment}"</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {cannotList.length > 0 ? (
                <div className="attendeeGroup">
                  <div className="attendeeTitle">Kan ikke delta</div>
                  <ul className="attendeeList">
                    {cannotList.map((a) => (
                      <li key={a.userId} className="attendeeItem">
                        <span>{a.username}</span>
                        {a.comment ? <span className="attendeeComment">"{a.comment}"</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {invitedList.length > 0 ? (
                <div className="attendeeGroup attendeeGroupInvited">
                  <div className="attendeeTitle">Invitert</div>
                  <ul className="attendeeList">
                    {invitedList.map((a) => (
                      <li key={a.userId} className="attendeeItem">
                        <span>{a.username}</span>
                        <span className="attendeeComment">Venter paa svar</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default EventDetail;
