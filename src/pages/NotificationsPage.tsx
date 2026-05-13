import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeaderProps";
import BottomNav from "../components/BottomNav";
import { resolveNotificationTarget } from "../utils/notificationTarget";
import { onNotificationsRefresh, triggerNotificationsRefresh } from "../utils/notificationsRefresh";
import { readStoredJwt } from "../utils/jwtToken";
import "../style/LoanPage.css";
import "../style/NotificationsPage.css";

interface NotificationDto {
  id: number;
  message: string;
  url?: string | null;
}

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DECLINED";

interface ActiveBookingRequestDto {
  bookingId: number;
  itemId: number;
  itemName: string;
  requesterUserId: number;
  requesterUsername: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  updatedAt: string;
}

function formatDateTime(iso: string): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("nb-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const NotificationsPage: React.FC = () => {
  const [notes, setNotes] = useState<NotificationDto[]>([]);
  const [bookingRequests, setBookingRequests] = useState<ActiveBookingRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = readStoredJwt();
  const navigate = useNavigate();

  const fetchUnreadNotifications = async (): Promise<NotificationDto[]> => {
    if (!apiBaseUrl || !token) return [];
    const res = await fetch(`${apiBaseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Kunne ikke hente varsler (${res.status})`);
    const data = (await res.json()) as NotificationDto[];
    return Array.isArray(data) ? data : [];
  };

  const fetchActiveBookingRequests = async (): Promise<ActiveBookingRequestDto[]> => {
    if (!apiBaseUrl || !token) return [];
    const res = await fetch(`${apiBaseUrl}/api/bookings/active-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || `Kunne ikke hente bookingforesporsler (${res.status})`);
    }
    const data = (await res.json()) as ActiveBookingRequestDto[];
    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    let alive = true;
    let inFlight = false;

    const loadPageData = async (showLoading: boolean) => {
      if (inFlight) return;
      inFlight = true;
      if (showLoading) {
        setLoading(true);
        setBookingLoading(true);
      }

      try {
        const [notificationsResult, bookingRequestsResult] = await Promise.allSettled([
          fetchUnreadNotifications(),
          fetchActiveBookingRequests(),
        ]);

        if (!alive) return;

        if (notificationsResult.status === "fulfilled") {
          setNotes(notificationsResult.value);
          setError(null);
        } else {
          setError(
            notificationsResult.reason instanceof Error
              ? notificationsResult.reason.message
              : "Ukjent feil"
          );
        }

        if (bookingRequestsResult.status === "fulfilled") {
          setBookingRequests(bookingRequestsResult.value);
          setBookingError(null);
        } else {
          setBookingError(
            bookingRequestsResult.reason instanceof Error
              ? bookingRequestsResult.reason.message
              : "Kunne ikke hente bookingforesporsler"
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
          setBookingLoading(false);
        }
        inFlight = false;
      }
    };

    void loadPageData(true);
    const unsubscribeRefresh = onNotificationsRefresh(() => {
      if (document.hidden) return;
      void loadPageData(false);
    });
    const pollId = window.setInterval(() => {
      if (document.hidden) return;
      void loadPageData(false);
    }, 120000);

    return () => {
      alive = false;
      unsubscribeRefresh();
      window.clearInterval(pollId);
    };
  }, [apiBaseUrl, token]);

  const markRead = async (id: number) => {
    try {
      await fetch(`${apiBaseUrl}/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpen = async (note: NotificationDto) => {
    const target = resolveNotificationTarget(note.url, apiBaseUrl);
    if (!target) return;
    if (target.type === "external") {
      window.location.assign(target.to);
      return;
    }
    navigate(target.to);
  };

  const bookingRequestKey = (entry: ActiveBookingRequestDto) => `${entry.itemId}:${entry.bookingId}`;

  const handleApprove = async (entry: ActiveBookingRequestDto) => {
    setBookingError(null);
    const entryKey = bookingRequestKey(entry);
    setApprovingKey(entryKey);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/items/${entry.itemId}/bookings/${entry.bookingId}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Kunne ikke godkjenne (${res.status})`);
      }
      setBookingRequests((prev) =>
        prev.map((current) =>
          bookingRequestKey(current) === entryKey
            ? { ...current, status: "CONFIRMED", updatedAt: new Date().toISOString() }
            : current
        )
      );
      triggerNotificationsRefresh("booking:approve");
    } catch (e: unknown) {
      setBookingError(e instanceof Error ? e.message : "Kunne ikke godkjenne booking");
    } finally {
      setApprovingKey(null);
    }
  };

  const handleCancel = async (entry: ActiveBookingRequestDto) => {
    const accepted = window.confirm("Avvise denne bookingen?");
    if (!accepted) return;

    setBookingError(null);
    const entryKey = bookingRequestKey(entry);
    setCancellingKey(entryKey);
    try {
      const res = await fetch(`${apiBaseUrl}/api/items/${entry.itemId}/bookings/${entry.bookingId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Kunne ikke avvise (${res.status})`);
      }
      setBookingRequests((prev) =>
        prev.filter((current) => bookingRequestKey(current) !== entryKey)
      );
      triggerNotificationsRefresh("booking:decline");
    } catch (e: unknown) {
      setBookingError(e instanceof Error ? e.message : "Kunne ikke avvise booking");
    } finally {
      setCancellingKey(null);
    }
  };

  return (
    <div className="notificationsPage">
      <div className="bgGlow" />
      <main className="notificationsMain">
        <PageHeader title="Varsler" subtitle="Oppdateringer og booking" showBack />

        <section className="section card notificationsCard">
          <div className="sectionTitle">Aktive bookingforesporsler</div>
          {bookingLoading ? (
            <p className="notificationsState">Laster bookingforesporsler...</p>
          ) : bookingError ? (
            <p className="notificationsState notificationsError">{bookingError}</p>
          ) : bookingRequests.length === 0 ? (
            <p className="notificationsState">
              Ingen aktive bookingforesporsler. Foresporsler blir liggende her til sluttdato.
            </p>
          ) : (
            <div className="persistentBookingList">
              {bookingRequests.map((entry) => {
                const entryKey = bookingRequestKey(entry);
                const isApproving = approvingKey === entryKey;
                const isCancelling = cancellingKey === entryKey;
                const isBusy = isApproving || isCancelling;
                const statusClass = `persistentBookingStatus persistentBookingStatus--${entry.status.toLowerCase()}`;
                return (
                  <div key={entryKey} className="persistentBookingItem">
                    <div className="persistentBookingHeader">
                      <div className="persistentBookingTitle">{entry.itemName}</div>
                      <span className={statusClass}>{entry.status}</span>
                    </div>
                    <div className="persistentBookingMeta">
                      {entry.requesterUsername
                        ? `Foresporsel fra ${entry.requesterUsername}`
                        : "Foresporsel mottatt"}
                    </div>
                    <div className="persistentBookingMeta">Start: {formatDateTime(entry.startTime)}</div>
                    <div className="persistentBookingMeta">Slutt: {formatDateTime(entry.endTime)}</div>
                    <div className="persistentBookingMeta">Oppdatert: {formatDateTime(entry.updatedAt)}</div>
                    <div className="persistentBookingActions">
                      <button
                        type="button"
                        onClick={() => navigate(`/items/${entry.itemId}/bookings/${entry.bookingId}`)}
                        className="notificationLink"
                      >
                        Aapne detaljer
                      </button>
                      {entry.status === "PENDING" ? (
                        <button
                          type="button"
                          className="notificationApprove"
                          onClick={() => handleApprove(entry)}
                          disabled={isBusy}
                        >
                          {isApproving ? "Godkjenner..." : "Godkjenn"}
                        </button>
                      ) : null}
                      {entry.status === "PENDING" ? (
                        <button
                          type="button"
                          className="notificationCancel"
                          onClick={() => handleCancel(entry)}
                          disabled={isBusy}
                        >
                          {isCancelling ? "Avviser..." : "Avvis"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section card notificationsCard">
          <div className="sectionTitle">Dine varsler</div>
          {loading ? (
            <p className="notificationsState">Laster varsler...</p>
          ) : error ? (
            <p className="notificationsState notificationsError">Feil: {error}</p>
          ) : notes.length === 0 ? (
            <p className="notificationsState">Ingen nye varsler.</p>
          ) : (
            <div className="notificationsList">
              {notes.map((n) => (
                <div key={n.id} className="notificationItem">
                  <div className="notificationMessage">{n.message}</div>
                  <div className="notificationActions">
                    <button
                      type="button"
                      onClick={() => handleOpen(n)}
                      className="notificationLink"
                    >
                      Aapne
                    </button>
                    <button onClick={() => markRead(n.id)} className="notificationMute">
                      Marker lest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
