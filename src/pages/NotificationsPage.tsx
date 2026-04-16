import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeaderProps";
import BottomNav from "../components/BottomNav";
import { resolveNotificationTarget } from "../utils/notificationTarget";
import {
  refreshPersistentBookingRequests,
  seedPersistentBookingRequestsFromNotifications,
  syncPersistentBookingRequestsFromOwnerItems,
  type PersistentBookingRequest,
} from "../utils/persistentBookingRequests";
import { onNotificationsRefresh, triggerNotificationsRefresh } from "../utils/notificationsRefresh";
import "../style/LoanPage.css";
import "../style/NotificationsPage.css";

interface NotificationDto {
  id: number;
  message: string;
  url?: string | null;
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
  const [bookingRequests, setBookingRequests] = useState<PersistentBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";
  const navigate = useNavigate();

  const fetchUnreadNotifications = async (): Promise<NotificationDto[]> => {
    const res = await fetch(`${apiBaseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Kunne ikke hente varsler (${res.status})`);
    const data = (await res.json()) as NotificationDto[];
    return Array.isArray(data) ? data : [];
  };

  const fetchBookingRequests = async (
    notifications: NotificationDto[],
    options?: { includeOwnerSync?: boolean }
  ) => {
    const includeOwnerSync = options?.includeOwnerSync ?? false;
    const seeded = await seedPersistentBookingRequestsFromNotifications({
      apiBaseUrl,
      token,
      notifications,
    });
    const refreshed = await refreshPersistentBookingRequests({ apiBaseUrl, token });
    const baseline = refreshed.length > 0 ? refreshed : seeded;
    if (!includeOwnerSync) return baseline;

    try {
      const synced = await syncPersistentBookingRequestsFromOwnerItems({ apiBaseUrl, token });
      if (synced.length > 0) return synced;
    } catch {
      // Keep baseline results when owner-sync fails.
    }
    return baseline;
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

      let unreadNotifications: NotificationDto[] = [];
      try {
        unreadNotifications = await fetchUnreadNotifications();
        if (!alive) return;
        setNotes(unreadNotifications);
        setError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ukjent feil");
        if (alive && showLoading) {
          setLoading(false);
          setBookingLoading(false);
        }
        inFlight = false;
        return;
      } finally {
        if (alive && showLoading) setLoading(false);
      }

      try {
        const nextBookingRequests = await fetchBookingRequests(unreadNotifications, {
          includeOwnerSync: false,
        });
        if (!alive) return;
        setBookingRequests(nextBookingRequests);
        setBookingError(null);

        if (showLoading) {
          void syncPersistentBookingRequestsFromOwnerItems({ apiBaseUrl, token })
            .then((synced) => {
              if (!alive) return;
              if (synced.length > 0) {
                setBookingRequests(synced);
              }
            })
            .catch(() => {
              // Keep baseline results on owner-sync failure.
            });
        }
      } catch (e: unknown) {
        if (!alive) return;
        setBookingError(e instanceof Error ? e.message : "Kunne ikke hente bookingforesporsler");
      } finally {
        if (alive && showLoading) setBookingLoading(false);
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
    void seedPersistentBookingRequestsFromNotifications({
      apiBaseUrl,
      token,
      notifications: [note],
    }).then((updated) => {
      setBookingRequests(updated);
    }).catch(() => {
      // Ignore persistence errors when opening a notification.
    });

    await markRead(note.id);
    const target = resolveNotificationTarget(note.url, apiBaseUrl);
    if (!target) return;
    if (target.type === "external") {
      window.location.assign(target.to);
      return;
    }
    navigate(target.to);
  };

  const refreshBookingRequests = async () => {
    const unreadNotifications = await fetchUnreadNotifications().catch(() => notes);
    const nextBookingRequests = await fetchBookingRequests(unreadNotifications, {
      includeOwnerSync: false,
    });
    setBookingRequests(nextBookingRequests);
    void syncPersistentBookingRequestsFromOwnerItems({ apiBaseUrl, token })
      .then((synced) => {
        if (synced.length > 0) setBookingRequests(synced);
      })
      .catch(() => {
        // Keep baseline results on owner-sync failure.
      });
  };

  const handleApprove = async (entry: PersistentBookingRequest) => {
    setBookingError(null);
    setApprovingKey(entry.key);
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
      triggerNotificationsRefresh("booking:approve");
      await refreshBookingRequests();
    } catch (e: unknown) {
      setBookingError(e instanceof Error ? e.message : "Kunne ikke godkjenne booking");
    } finally {
      setApprovingKey(null);
    }
  };

  const handleCancel = async (entry: PersistentBookingRequest) => {
    const accepted = window.confirm("Avvise denne bookingen?");
    if (!accepted) return;

    setBookingError(null);
    setCancellingKey(entry.key);
    try {
      const res = await fetch(`${apiBaseUrl}/api/items/${entry.itemId}/bookings/${entry.bookingId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Kunne ikke avvise (${res.status})`);
      }
      triggerNotificationsRefresh("booking:decline");
      await refreshBookingRequests();
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
                const isApproving = approvingKey === entry.key;
                const isCancelling = cancellingKey === entry.key;
                const isBusy = isApproving || isCancelling;
                const statusClass = `persistentBookingStatus persistentBookingStatus--${entry.status.toLowerCase()}`;
                return (
                  <div key={entry.key} className="persistentBookingItem">
                    <div className="persistentBookingHeader">
                      <div className="persistentBookingTitle">{entry.itemName}</div>
                      <span className={statusClass}>{entry.status}</span>
                    </div>
                    <p className="persistentBookingMessage">{entry.message}</p>
                    <div className="persistentBookingMeta">
                      {entry.requesterUsername
                        ? `Foresporsel fra ${entry.requesterUsername}`
                        : "Foresporsel mottatt"}
                    </div>
                    <div className="persistentBookingMeta">Start: {formatDateTime(entry.startTime)}</div>
                    <div className="persistentBookingMeta">Slutt: {formatDateTime(entry.endTime)}</div>
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
