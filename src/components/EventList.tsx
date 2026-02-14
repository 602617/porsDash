// src/components/EventList.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";

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
        setEvents(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, token]);

  if (loading) return <p className="eventState">Laster arrangementer...</p>;
  if (error) return <p className="eventState eventError">Feil: {error}</p>;
  if (events.length === 0) return <p className="eventState">Ingen arrangement funnet.</p>;

  return (
    <div className="event-list-container">
      {events.map((ev) => {
        const { date: startDate, time: startTime } = formatDateTime(ev.startTime);
        const { date: endDate, time: endTime } = formatDateTime(ev.endTime);

        return (
          <Link key={ev.id} to={`/events/${ev.id}`} className="event-card">
            <div className="event-top">
              <h3 className="event-title">{ev.title}</h3>
              <div className="event-time">
                <span>{startDate === endDate ? startDate : `${startDate} - ${endDate}`}</span>
                <span className="dot">?</span>
                <span>kl. {startTime} - {endTime}</span>
              </div>
            </div>
            <p className="event-created">Opprettet av: {ev.createdBy}</p>
          </Link>
        );
      })}
    </div>
  );
};

export default EventList;
