import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import '../style/ItemDetail.css';

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
  const location = useLocation();
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';

  // Try to get item from Link-state, otherwise fetch it
  const initialItem = (location.state as { item?: Item })?.item;
  const [item, setItem] = useState<Item | null>(initialItem ?? null);
  const [itemLoading, setItemLoading] = useState<boolean>(initialItem ? false : true);

  // fetch item if not provided via state
  useEffect(() => {
    if (item) return;
    (async () => {
      try {
        const res = await fetch(`${api}/api/items/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 404) {
          navigate('/items');
          return;
        }
        if (!res.ok) throw new Error('Kunne ikke hente produkt');
        const data: Item = await res.json();
        setItem(data);
      } catch (e) {
        console.error(e);
      } finally {
        setItemLoading(false);
      }
    })();
  }, [id, item]);

  // availability + bookings
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newStart, setNewStart] = useState<string>('');
  const [newEnd, setNewEnd] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const [blocksRes, bookingsRes] = await Promise.all([
          fetch(`${api}/api/items/${id}/unavailability`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${api}/api/items/${id}/bookings`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (blocksRes.ok) setSlots(await blocksRes.json());
        if (bookingsRes.ok) setBookings(await bookingsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, id, token]);

  if (itemLoading) return <p className="p-4">Laster produkt...</p>;
  if (!item) return <p className="p-4">Produkt ikke funnet.</p>;
  if (loading) return <p className="p-4">Laster tilgjengelighet...</p>;

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
  const allEvents = [...blockEvents, ...bookingEvents];

  const handleAddBooking = async () => {
    if (!newStart || !newEnd) {
      alert('Velg begge tider');
      return;
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
      // pull JSON before calling setBookings
      const created: Booking = await res.json();
      setBookings(prev => [...prev, created]);
      setNewStart('');
      setNewEnd('');
      alert('Booking opprettet!');
    } else {
      const errMsg = await res.text();
      alert('Feil ved booking: ' + errMsg);
    }
  };

  const handleBlockClick = async (clickInfo: EventClickArg) => {
    const blockId = clickInfo.event.id;
    if (!confirm(`Slett ${clickInfo.event.startStr} — ${clickInfo.event.endStr}?`)) return;
    const res = await fetch(`${api}/api/items/${id}/unavailability/${blockId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 204) {
      clickInfo.event.remove();
      alert('Slettet.');
    } else {
      const errMsg = await res.text();
      alert('Kunne ikke slette: ' + errMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{item.name}</h1>
      <p className="text-sm text-gray-600 mb-4">Utleier: {item.username}</p>

      <div className="item-detail-container">
        <h2 className="item-detail-header">Book tid for produktet</h2>
        <div className="booking-form">
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

      <h2 className="item-detail-header mt-8">Sjekk tilgjengelighet</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={allEvents}
        selectable={false}
        eventClick={handleBlockClick}
        allDaySlot={false}
        height="auto"
      />
    </div>
  );
};

export default ItemDetail;
