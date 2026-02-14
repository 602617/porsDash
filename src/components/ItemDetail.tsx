import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import '../style/ItemDetail.css';
import "../style/LoanPage.css";

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
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [bookingNotice, setBookingNotice] = useState<string>('');

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

  if (itemLoading) return <p className="itemDetailState">Laster produkt...</p>;
  if (!item) return <p className="itemDetailState">Produkt ikke funnet.</p>;
  if (loading) return <p className="itemDetailState">Laster tilgjengelighet...</p>;

  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateInput = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const startValue = startDate && startTime ? `${startDate}T${startTime}` : "";
  const endValue = endDate && endTime ? `${endDate}T${endTime}` : "";

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = toDateInput(d);
    setStartDate(dateStr);
    if (!endDate) setEndDate(dateStr);
    if (!startTime) setStartTime(toTimeInput(d));
  };

  const setQuickDuration = (minutes: number) => {
    const now = new Date();
    const start = startDate && startTime ? new Date(`${startDate}T${startTime}`) : now;
    const end = new Date(start.getTime() + minutes * 60000);
    setStartDate(toDateInput(start));
    setStartTime(toTimeInput(start));
    setEndDate(toDateInput(end));
    setEndTime(toTimeInput(end));
  };

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
    if (!startValue || !endValue) {
      alert('Velg begge tider');
      return;
    }
    const res = await fetch(`${api}/api/items/${id}/bookings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ startTime: startValue, endTime: endValue })
    });
    if (res.ok) {
      // pull JSON before calling setBookings
      const created: Booking = await res.json();
      setBookings(prev => [...prev, created]);
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setBookingNotice('Booking opprettet!');
      window.setTimeout(() => setBookingNotice(''), 2600);
    } else {
      const errMsg = await res.text();
      alert('Feil ved booking: ' + errMsg);
    }
  };

  const handleBlockClick = async (clickInfo: EventClickArg) => {
    if(!clickInfo.event.id.startsWith('block-'))return
    const blockId = clickInfo.event.id.replace('block-', '');
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
    <div className="itemDetailPage">
      <div className="bgGlow" />
      <main className="itemDetailMain">
        <section className="section card itemHeader">
          <div className="chip">Booking</div>
          <h1 className="itemTitle">{item.name}</h1>
          <p className="itemMeta">Utleier: {item.username}</p>
        </section>

        <section className="section card bookingCard">
          <div className="sectionTitle">Book tid for produktet</div>
          <div className="quickRow">
            <span className="quickLabel">Dato</span>
            <div className="quickGroup">
              <button type="button" className="quickChip" onClick={() => setQuickDate(0)}>I dag</button>
              <button type="button" className="quickChip" onClick={() => setQuickDate(1)}>I morgen</button>
            </div>
          </div>
          <div className="quickRow">
            <span className="quickLabel">Varighet</span>
            <div className="quickGroup">
              <button type="button" className="quickChip" onClick={() => setQuickDuration(24 * 60)}>1 dag</button>
              <button type="button" className="quickChip" onClick={() => setQuickDuration(3 * 24 * 60)}>3 dager</button>
              <button type="button" className="quickChip" onClick={() => setQuickDuration(7 * 24 * 60)}>1 uke</button>
            </div>
          </div>

          <div className="bookingGrid">
            <label className="field">
              <span>Startdato</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate) setEndDate(e.target.value);
                }}
              />
            </label>
            <label className="field">
              <span>Starttid</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Sluttdato</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Sluttid</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>
          <button onClick={handleAddBooking} className="primaryBtn">
            Bekreft booking
          </button>
          {bookingNotice ? <div className="bookingNotice">{bookingNotice}</div> : null}
        </section>

        <section className="section card bookingCard">
          <div className="sectionTitle">Sjekk tilgjengelighet</div>
          <div className="calendarShell">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next',
                center: 'title',
                right: 'today'
              }}
              dayHeaderFormat={{ weekday: "narrow" }}
              events={allEvents}
              selectable={false}
              eventClick={handleBlockClick}
              allDaySlot={false}
              height="auto"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default ItemDetail;
