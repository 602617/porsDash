// src/components/EventDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams }              from 'react-router-dom';
import { jwtDecode }                  from 'jwt-decode';
import RsvpForm                   from './RsvpForm';
import BackButton                 from './BackButton';
import Topbar                     from './TopBar';

interface AttendanceDto {
  userId:    number;
  username:  string;
  status:    'CAN' | 'CANNOT';
  comment?:  string;
  updatedAt: string;
}

interface EventDetailDto {
  id:          number;
  title:       string;
  description: string;
  location?:   string;
  startTime:   string;
  endTime:     string;
  createdBy:   string;
  attendees:   AttendanceDto[];
}

// Splits ISO → { date: "dd. måned", time: "tt:mm" }
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('no-NO', { day: '2-digit', month: 'long' }),
    time: d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
  };
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [event,     setEvent]     = useState<EventDetailDto | null>(null);
  const [attendees, setAttendees] = useState<AttendanceDto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showForm,  setShowForm]  = useState(false);

  

  // Fetch event + attendees
  useEffect(() => {
    (async () => {
      try {
        const rawToken = localStorage.getItem('jwt') ?? '';
        let currentUser = '';
        try {
        ( { sub: currentUser } = jwtDecode<{ sub: string }>(rawToken));
        
      } catch {
        currentUser = '';
      }
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`,
          {
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${rawToken}`
            }
          }
        );
        if (!res.ok) throw new Error(`Kunne ikke hente event (${res.status})`);
        const data: EventDetailDto = await res.json();
        setEvent(data);
        setAttendees(data.attendees);

        // hide form if current user already RSVPed
        const hasAttended = data.attendees.some(a => a.username === currentUser);
        
      setShowForm(!hasAttended);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Ukjent feil ved lasting');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // handle a new/updated RSVP
  const handleNewRsvp = (att: AttendanceDto) => {
    setAttendees(prev =>
      prev.filter(a => a.userId !== att.userId).concat(att)
    );
    setShowForm(false);
  };

  if (loading) return <p className="p-4 text-center">Laster arrangement…</p>;
  if (error)   return <p className="p-4 text-center text-red-600">Feil: {error}</p>;
  if (!event)  return <p className="p-4 text-center">Arrangement ikke funnet.</p>;

  const { date: startDate, time: startTime } = formatDateTime(event.startTime);
  const { date: endDate,   time: endTime   } = formatDateTime(event.endTime);

  return (
    <div>
      <Topbar />
      <BackButton />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">{event.title}</h1>

        {/* Date + Time */}
        <div className="text-gray-600 text-sm space-y-1">
          <div>
            <strong>Dato:</strong>{' '}
            {startDate === endDate
              ? startDate
              : `${startDate} — ${endDate}`}
          </div>
          <div>
            <strong>Tid:</strong>{' '}
            {startTime} — {endTime}
          </div>
        </div>

        {event.location && (
          <p className="text-sm">Sted: {event.location}</p>
        )}

        <p className="mt-2">{event.description}</p>
        <p className="text-xs text-gray-500">
          Opprettet av: {event.createdBy}
        </p>

       

        <h2 className="text-xl font-semibold mt-6">Påmeldinger</h2>
        {attendees.length === 0 ? (
          <p>Ingen har meldt seg på ennå.</p>
        ) : (
          <ul className="space-y-2">
            {attendees.map(a => (
              <li key={a.userId} className="p-2 border rounded">
                <span className="font-medium">{a.username}</span> —{' '}
                <span className={
                  a.status === 'CAN'
                    ? 'text-green-600'
                    : 'text-red-600'
                }>
                  {a.status === 'CAN' ? 'Kan' : 'Kan ikke'}
                </span>
                {a.comment && (
                  <p className="mt-1 text-sm">«{a.comment}»</p>
                )}
              </li>
            ))}
          </ul>
        )}
         {/* RSVP form / Endre-knapp */}
        {showForm ? (
          <RsvpForm
            eventId={event.id}
            onRsvpSuccess={handleNewRsvp}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Endre
          </button>
        )}
      </div>
    </div>
  );
};

export default EventDetail;
