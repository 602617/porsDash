import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import type { DateSelectArg, EventInput } from '@fullcalendar/core';
import type { EventClickArg } from '@fullcalendar/core';

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
}

interface Item {
  id: number;
  name: string;
  username: string;
}

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const item = (state as { item: Item }).item;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';

  useEffect(() => {
  const fetchBlocks = async () => {
    try {
      console.log("JWT token:", token);
      const res = await fetch(`${api}/api/items/${id}/unavailability`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Slot[] = await res.json();
        console.log("fetched slots: ", data)
        setSlots(data);

      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  fetchBlocks();
}, [api, id, token]);

  // Map tilgjengelighet til kalender-events
  const events = slots.map(s => ({
    id: String(s.id),
    title: 'Ikke ledig',
    start: s.startTime,
    end: s.endTime,
    color: '#e25858'          // lys turkis
  }));

  // Håndter bruker-select av nytt tidsrom
  const handleDateSelect = async (selectInfo: DateSelectArg) => {
    const start = selectInfo.startStr;
    const end   = selectInfo.endStr;
    if (!window.confirm(`Book from ${start} to ${end}?`)) {
      selectInfo.view.calendar.unselect();
      return;
    }

    const res = await fetch(`${api}/api/items/${id}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ startTime: start, endTime: end })
    });
   
    if (res.ok) {
    alert('Booked!');
    // ➜ bruk EventInput her, ikke EventApi
    const newEvent: EventInput = {
      id: 'booking-' + Date.now(),
      title: 'Reservert',
      start,    // string er et gyldig DateInput
      end,
      allDay: false
    };
    selectInfo.view.calendar.addEvent(newEvent);
  } else {
    const err = await res.text();
    alert('Feil ved booking: ' + err);
  }
    selectInfo.view.calendar.unselect();
  };

  const handleBlockClick = async (clickInfo: EventClickArg) => {
  // clickInfo.event.id er blokk-ID som du brukte i `id: String(s.id)`
  const blockId = clickInfo.event.id;
  const start   = clickInfo.event.startStr;
  const end     = clickInfo.event.endStr;

  if (!window.confirm(`Slett blokk-periode ${start} — ${end}?`)) return;

  const res = await fetch(
    `${api}/api/items/${id}/unavailability/${blockId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (res.status === 204) {
    clickInfo.event.remove();   // fjerner event fra kalenderen
    alert('Blokk-periode slettet');
  } else {
    const err = await res.text();
    alert('Kunne ikke slette: ' + err);
  }
};

  if (loading) return <div className="p-4">Loading availability…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{item.name}</h1>
      <p className="text-sm text-gray-600 mb-4">Utleier: {item.username}</p>

      <FullCalendar
        plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        selectable={true}
        select={handleDateSelect}
        eventClick={handleBlockClick}
        selectMirror={true}
        allDaySlot={false}
        height="auto"
      />
    </div>
  );
};

export default ItemDetail;
