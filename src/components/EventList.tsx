// src/components/EventList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/EventList.css";

interface EventListDto {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  createdBy: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "long",
  });
  const time = d.toLocaleTimeString("no-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<EventListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${api}/api/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to load events (${res.status})`);
        }
        const data = (await res.json()) as EventListDto[];
        const sorted = [...data].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setEvents(sorted);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, token]);

  useEffect(() => {
    if (openMenuId == null) return;
    const handleWindowClick = () => setOpenMenuId(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    window.addEventListener("click", handleWindowClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuId]);

  const openEvent = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const handleDelete = async (event: EventListDto) => {
    if (!window.confirm("Slette dette arrangementet?")) return;
    setActionError(null);
    setDeletingId(event.id);
    try {
      const res = await fetch(`${api}/api/events/${event.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        throw new Error("Du eier ikke dette arrangementet.");
      }
      if (res.status === 404) {
        throw new Error("Arrangement finnes ikke.");
      }
      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Kunne ikke slette arrangement (${res.status})`);
      }

      setEvents((prev) => prev.filter((entry) => entry.id !== event.id));
      setOpenMenuId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Kunne ikke slette arrangement.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <p className="eventState">Laster arrangementer...</p>;
  if (error) return <p className="eventState eventError">Feil: {error}</p>;
  if (events.length === 0) {
    return <p className="eventState">Ingen arrangementer der du er oppretter eller invitert.</p>;
  }

  return (
    <div className="event-list-container">
      {actionError ? <p className="eventState eventError">{actionError}</p> : null}
      {events.map((event) => {
        const { date: startDate, time: startTime } = formatDateTime(event.startTime);
        const { date: endDate, time: endTime } = formatDateTime(event.endTime);
        const menuOpen = openMenuId === event.id;

        return (
          <article
            key={event.id}
            className="event-card event-card--interactive"
            role="button"
            tabIndex={0}
            onClick={() => openEvent(event.id)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                keyEvent.preventDefault();
                openEvent(event.id);
              }
            }}
          >
            <div className="event-cardHeader">
              <div className="event-top">
                <h3 className="event-title">{event.title}</h3>
                <div className="event-time">
                  <span>{startDate === endDate ? startDate : `${startDate} - ${endDate}`}</span>
                  <span className="dot">{"\u2022"}</span>
                  <span>kl. {startTime} - {endTime}</span>
                </div>
              </div>

              <div className="eventMenuWrap">
                <button
                  type="button"
                  className="eventMenuBtn"
                  aria-label="Aapne handlinger"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    setActionError(null);
                    setOpenMenuId(menuOpen ? null : event.id);
                  }}
                >
                  ...
                </button>
                {menuOpen ? (
                  <div
                    className="eventMenu"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="eventMenuItem"
                      onClick={() => {
                        setOpenMenuId(null);
                        openEvent(event.id);
                      }}
                    >
                      Vis detaljer
                    </button>
                    <button
                      type="button"
                      className="eventMenuItem"
                      onClick={() => {
                        setOpenMenuId(null);
                        navigate(`/events/${event.id}?edit=1`);
                      }}
                    >
                      Rediger arrangement
                    </button>
                    <button
                      type="button"
                      className="eventMenuItem eventMenuItemDanger"
                      onClick={() => {
                        void handleDelete(event);
                      }}
                      disabled={deletingId === event.id}
                    >
                      {deletingId === event.id ? "Sletter..." : "Slett arrangement"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="event-created">Opprettet av: {event.createdBy}</p>
          </article>
        );
      })}
    </div>
  );
};

export default EventList;
