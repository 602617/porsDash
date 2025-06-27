// src/components/EventDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import RsvpForm from './RsvpForm';
import BackButton from './BackButton';
import Topbar from './TopBar';

interface AttendanceDto {
  userId:     number;
  username:   string;
  status:     'CAN' | 'CANNOT';
  comment?:   string;
  updatedAt:  string;  // ISO
}

interface EventDetailDto {
  id:          number;
  title:       string;
  description: string;
  location?:   string;
  startTime:   string;  // ISO
  endTime:     string;  // ISO
  createdBy:   string;
  attendees:   AttendanceDto[];
}

const EventDetail: React.FC = () => {
  // 1) Typed params
  const { id } = useParams<{ id: string }>();

  // 2) State med korrekte typer
  const [event, setEvent]     = useState<EventDetailDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<string | null>(null);

  const [attendees, setAttendees] = useState<AttendanceDto[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('jwt') ?? '';
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`,
          {
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (!res.ok) {
          throw new Error(`Kunne ikke hente event (${res.status})`);
        }
        const data: EventDetailDto = await res.json();
        setEvent(data);
        setAttendees(data.attendees);
      } catch (e: unknown) {
        // 3) Fang unknown, smaltype til Error for message
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('Ukjent feil ved lasting av arrangment');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleNewRsvp = (att: AttendanceDto) => {
  setAttendees(prev =>
    prev.filter(a => a.userId !== att.userId).concat(att)
  );
};

  // 4) Loading / feil / ikke funnet
  if (loading) return <p className="p-4 text-center">Laster arrangement…</p>;
  if (error)   return <p className="p-4 text-center text-red-600">Feil: {error}</p>;
  if (!event)  return <p className="p-4 text-center">Arrangement ikke funnet.</p>;

  // 5) Innhold
  return (
    <div>
      <Topbar />
      <BackButton />
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{event.title}</h1>
      <p className="text-sm text-gray-600">
        {new Date(event.startTime).toLocaleString()} —{' '}
        {new Date(event.endTime).toLocaleString()}
      </p>
      {event.location && <p className="text-sm">Sted: {event.location}</p>}
      <p className="mt-2">{event.description}</p>
      <p className="text-xs text-gray-500">Opprettet av: {event.createdBy}</p>

      <RsvpForm eventId={event.id} onRsvpSuccess={handleNewRsvp} />

      <h2 className="text-xl font-semibold mt-6">Påmeldinger</h2>
      {attendees.length === 0 ? (
        <p>Ingen har meldt seg på ennå.</p>
      ) : (
        <ul className="space-y-2">
          {event.attendees.map(a => (
            <li key={a.userId} className="p-2 border rounded">
              <span className="font-medium">{a.username}</span> —{' '}
              <span className={a.status === 'CAN' ? 'text-green-600' : 'text-red-600'}>
                {a.status === 'CAN' ? 'Kan' : 'Kan ikke'}
              </span>
              {a.comment && <p className="mt-1 text-sm">«{a.comment}»</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
};

export default EventDetail;
