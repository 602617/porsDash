import React, {useState, useEffect} from "react";
import { Link } from "react-router-dom";
import "../style/EventList.css"

interface EventListDto {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  createdBy: string;
}

const EventList: React.FC = () => {
  const [events, setEvents]     = useState<EventListDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${api}/api/events`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          throw new Error(`Failed to load events (${res.status})`);
        }
        const data: EventListDto[] = await res.json();
        setEvents(data);
      } catch (e: unknown) {
        let message = 'Ukjent feil';
        if (e instanceof Error) {
        message = e.message;
      }
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, token]);

  if (loading) return <p className="p-4 text-center">Laster arrangementer…</p>;
  if (error)   return <p className="p-4 text-center text-red-600">Feil: {error}</p>;
  if (events.length === 0) return <p className="p-4 text-center">Ingen arrangement funnet.</p>;

  return (
    <div className="event-list-container">
  {events.map(ev => (
    <Link
      key={ev.id}
      to={`/events/${ev.id}`}
      className="event-card"
    >
      <h3 className="event-title">{ev.title}</h3>
      <p className="event-time">
        {new Date(ev.startTime).toLocaleString()} — {new Date(ev.endTime).toLocaleString()}
      </p>
      <p className="event-created">Opprettet av: {ev.createdBy}</p>
    </Link>
  ))}
</div>

  );
};

export default EventList;