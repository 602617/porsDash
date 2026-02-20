import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeaderProps";
import BottomNav from "../components/BottomNav";
import "../style/LoanPage.css";
import "../style/NotificationsPage.css";

interface NotificationDto {
  id: number;
  message: string;
  url: string;
}

const NotificationsPage: React.FC = () => {
  const [notes, setNotes] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Kunne ikke hente varsler (${res.status})`);
        setNotes(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    })();
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

  return (
    <div className="notificationsPage">
      <div className="bgGlow" />
      <main className="notificationsMain">
        <PageHeader title="Varsler" subtitle="Oppdateringer og booking" showBack />
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
                    <Link to={n.url} onClick={() => markRead(n.id)} className="notificationLink">
                      Åpne
                    </Link>
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
