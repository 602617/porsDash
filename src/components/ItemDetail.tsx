import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import type { EventInput } from '@fullcalendar/core';
import type { EventClickArg } from '@fullcalendar/core';
import "../style/ItemDetail.css"

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
}
interface Booking {
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  useEffect(() => {
     const fetchAll = async () => {
       // 1) fetch blocks
       const [blocksRes, bookingsRes] = await Promise.all([
         fetch(`${api}/api/items/${id}/unavailability`, {
           headers: { Authorization: `Bearer ${token}` }
         }),
         fetch(`${api}/api/items/${id}/bookings`, {
           headers: { Authorization: `Bearer ${token}` }
         })
       ]);

       if (blocksRes.ok) {
         setSlots(await blocksRes.json());
       }
       if (bookingsRes.ok) {
         setBookings(await bookingsRes.json());
       }
       setLoading(false);
     };

     fetchAll().catch(e => {
       console.error(e);
       setLoading(false);
     });
   }, [api, id, token]);
    
     const blockEvents: EventInput[] = slots.map(s => ({
     id:    `block-${s.id}`,
     title: 'Ikke ledig',
     start: s.startTime,
     end:   s.endTime,
     color: '#e25858'
   }));

   const bookingEvents: EventInput[] = bookings.map(b => ({
     id:    `booking-${b.id}`,
     title: 'Reservert',
     start: b.startTime,
     end:   b.endTime,
     color: '#6AC2B8'
   }));

   const allEvents = [ ...blockEvents, ...bookingEvents ];
  
 


 


  const handleAddBooking = async () => {
    if (!newStart || !newEnd) {
      return alert('Velg både start og slutt');
    }
    const res = await fetch(`${api}/api/items/${id}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ startTime: newStart, endTime: newEnd })
    });
    if (res.ok) {
      const created: Booking = await res.json();
      setBookings(prev => [...prev, created]);
      setNewStart(''); setNewEnd('');
      alert('Booking opprettet!');
    } else {
      const err = await res.text();
      alert('Kunne ikke booke: ' + err);
    }
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
    alert('Kunne ikke slette: Du eier ikke denne' + err);
  }
};

  if (loading) return <div className="p-4">Loading availability…</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{item.name}</h1>
      <p className="text-sm text-gray-600 mb-4">Utleier: {item.username}</p>

  <div className="item-detail-container">
  <h2 className="item-detail-header">Book tid for produktet</h2>

  <div className="booking-form">
    {/* flytt overskriften inn i booking-form om du vil style den der */}
    {/* <h2 className="item-detail-header">Book tid for produktet</h2> */}

    {/* grid wrapper for to-kolonne på større skjermer */}
    <div className="form-grid">
      <div>
        <label>Start</label>
        <input
          type="datetime-local"
          value={newStart}
          onChange={e => setNewStart(e.target.value)}
          className="mt-1 p-2 w-full border rounded"
        />
      </div>
      <div>
        <label>Slutt</label>
        <input
          type="datetime-local"
          value={newEnd}
          onChange={e => setNewEnd(e.target.value)}
          className="mt-1 p-2 w-full border rounded"
        />
      </div>
    </div>
    <button
      onClick={handleAddBooking}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Bekreft booking
    </button>
  </div>
</div>

      <h2 className="item-detail-header">Sjekk tilgjenglihet</h2>

      <FullCalendar
        plugins={[ dayGridPlugin, timeGridPlugin, interactionPlugin ]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={allEvents}
        selectable={false}
        eventClick={handleBlockClick}
        selectMirror={true}
        allDaySlot={false}
        height="auto"
      />
    </div>
  );
};

export default ItemDetail;
