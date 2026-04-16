import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import FullCalendar from '@fullcalendar/react';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import { jwtDecode } from 'jwt-decode';
import '../style/ItemDetail.css';
import "../style/LoanPage.css";
import { resolveItemImageUrl } from '../utils/itemImage';
import { triggerNotificationsRefresh } from '../utils/notificationsRefresh';

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
}

type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DECLINED';

interface Booking {
  id: number;
  startTime: string;
  endTime: string;
  status?: BookingStatus | string;
  username?: string;
}

interface Item {
  id: number;
  name: string;
  username: string;
  imageUrl?: string | null;
}

type JwtClaims = {
  sub?: string;
  username?: string;
  preferred_username?: string;
};

function normalizeBookingStatus(status: unknown): BookingStatus {
  if (status === 'PENDING' || status === 'CONFIRMED' || status === 'CANCELLED' || status === 'DECLINED') {
    return status;
  }
  return 'CONFIRMED';
}

function bookingStatusColor(status: BookingStatus): string {
  if (status === 'PENDING') return '#e7a83f';
  if (status === 'CANCELLED') return '#8a8f9e';
  if (status === 'DECLINED') return '#e96aa6';
  return '#6AC2B8';
}

function bookingStatusLabel(status: BookingStatus): string {
  if (status === 'PENDING') return 'Venter';
  if (status === 'CONFIRMED') return 'Godkjent';
  if (status === 'CANCELLED') return 'Kansellert';
  return 'Avvist';
}

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('jwt') || '';
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentUsername = useMemo(() => {
    if (!token) return '';
    try {
      const decoded = jwtDecode<JwtClaims>(token);
      return decoded.sub || decoded.username || decoded.preferred_username || '';
    } catch {
      return '';
    }
  }, [token]);

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
  }, [api, id, item, navigate, token]);

  // availability + bookings
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [bookingNotice, setBookingNotice] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

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

  const selectedBooking = useMemo(
    () => (selectedBookingId == null ? null : bookings.find((booking) => booking.id === selectedBookingId) || null),
    [bookings, selectedBookingId]
  );

  useEffect(() => {
    if (selectedBookingId == null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedBookingId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedBookingId]);

  if (itemLoading) return <p className="itemDetailState">Laster produkt...</p>;
  if (!item) return <p className="itemDetailState">Produkt ikke funnet.</p>;
  if (loading) return <p className="itemDetailState">Laster tilgjengelighet...</p>;

  const imageSrc = resolveItemImageUrl(api, item.imageUrl) || `https://picsum.photos/seed/${item.id}/800/300`;
  const isOwner =
    Boolean(item.username) &&
    Boolean(currentUsername) &&
    item.username.toLowerCase() === currentUsername.toLowerCase();

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
    id: `block-${s.id}`,
    title: 'Ikke ledig',
    start: s.startTime,
    end: s.endTime,
    color: '#e25858'
  }));

  const bookingEvents: EventInput[] = bookings.map(b => {
    const status = normalizeBookingStatus(b.status);
    return {
      id: `booking-${b.id}`,
      title: isOwner && b.username
        ? `${b.username} (${bookingStatusLabel(status)})`
        : bookingStatusLabel(status),
      start: b.startTime,
      end: b.endTime,
      color: bookingStatusColor(status)
    };
  });

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
      triggerNotificationsRefresh('booking:create');
      window.setTimeout(() => setBookingNotice(''), 2600);
    } else {
      const errMsg = await res.text();
      alert('Feil ved booking: ' + errMsg);
    }
  };

  const handleEventClick = async (clickInfo: EventClickArg) => {
    if (clickInfo.event.id.startsWith('booking-')) {
      const clickedBookingId = clickInfo.event.id.replace('booking-', '');
      const parsedBookingId = Number.parseInt(clickedBookingId, 10);
      if (!Number.isFinite(parsedBookingId)) return;

      const booking = bookings.find((entry) => entry.id === parsedBookingId);
      if (!booking) {
        navigate(`/items/${id}/bookings/${parsedBookingId}`);
        return;
      }
      setSelectedBookingId(parsedBookingId);
      return;
    }

    if (!clickInfo.event.id.startsWith('block-')) return;
    if (!isOwner) return;

    const blockId = clickInfo.event.id.replace('block-', '');
    if (!window.confirm(`Slett ${clickInfo.event.startStr} - ${clickInfo.event.endStr}?`)) return;
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

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat('nb-NO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso));

  return (
    <div className="itemDetailPage">
      <div className="bgGlow" />
      <main className="itemDetailMain">
        <section className="section card itemHeader">
          <img
            src={imageSrc}
            alt={item.name}
            className="itemHeroImage"
          />
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
              key={isMobile ? 'mobile' : 'desktop'}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? 'dayGridWeek' : 'dayGridMonth'}
              headerToolbar={isMobile
                ? {
                    left: 'prev,next',
                    center: 'title',
                    right: 'today'
                  }
                : {
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
              buttonText={{ today: 'I dag' }}
              dayHeaderFormat={{ weekday: isMobile ? 'short' : 'narrow' }}
              events={allEvents}
              selectable={false}
              eventClick={handleEventClick}
              dayMaxEvents={isMobile ? 2 : true}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              allDaySlot={false}
              height="auto"
            />
          </div>
          <p className="calendarHint">Trykk pa en booking i kalenderen for a se detaljer i popup.</p>
          <div className="calendarLegend">
            <span className="calendarLegendItem">
              <i className="calendarLegendDot calendarLegendDot--pending" />
              Venter
            </span>
            <span className="calendarLegendItem">
              <i className="calendarLegendDot calendarLegendDot--confirmed" />
              Godkjent
            </span>
            <span className="calendarLegendItem">
              <i className="calendarLegendDot calendarLegendDot--declined" />
              Avvist
            </span>
            <span className="calendarLegendItem">
              <i className="calendarLegendDot calendarLegendDot--cancelled" />
              Kansellert
            </span>
          </div>
        </section>
      </main>
      {selectedBooking ? (
        <div
          className="calendarModalBackdrop"
          onClick={() => setSelectedBookingId(null)}
        >
          <section
            className="calendarModal"
            role="dialog"
            aria-modal="true"
            aria-label="Bookingdetaljer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendarModalHeader">
              <h3 className="calendarModalTitle">Bookingdetaljer</h3>
              <button
                type="button"
                className="calendarModalClose"
                onClick={() => setSelectedBookingId(null)}
              >
                Lukk
              </button>
            </div>
            <div className="calendarModalItem">{item.name}</div>
            <div className="calendarModalRows">
              <div className="calendarModalRow">
                <span className="calendarModalLabel">Status</span>
                <span className={`calendarModalStatus calendarModalStatus--${normalizeBookingStatus(selectedBooking.status).toLowerCase()}`}>
                  {bookingStatusLabel(normalizeBookingStatus(selectedBooking.status))}
                </span>
              </div>
              <div className="calendarModalRow">
                <span className="calendarModalLabel">Start</span>
                <span className="calendarModalValue">{formatDateTime(selectedBooking.startTime)}</span>
              </div>
              <div className="calendarModalRow">
                <span className="calendarModalLabel">Slutt</span>
                <span className="calendarModalValue">{formatDateTime(selectedBooking.endTime)}</span>
              </div>
              {isOwner && selectedBooking.username ? (
                <div className="calendarModalRow">
                  <span className="calendarModalLabel">Booket av</span>
                  <span className="calendarModalValue">{selectedBooking.username}</span>
                </div>
              ) : null}
            </div>
            <div className="calendarModalActions">
              <button
                type="button"
                className="loanGhostBtn calendarModalAction"
                onClick={() => navigate(`/items/${id}/bookings/${selectedBooking.id}`)}
              >
                Apne fullside
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default ItemDetail;
