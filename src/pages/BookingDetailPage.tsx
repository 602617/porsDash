import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import { PageHeader } from "../components/PageHeaderProps";
import "../style/LoanPage.css";
import "../style/BookingDetailPage.css";

type Booking = {
  id: number;
  itemId: number;
  userId: number;
  username: string;
  startTime: string;
  endTime: string;
};

type Item = {
  id: number;
  name: string;
  username?: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nb-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const BookingDetailPage: React.FC = () => {
  const { itemId, bookingId } = useParams<{ itemId: string; bookingId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ok" | "unauthorized" | "forbidden" | "error"
  >("loading");
  const [error, setError] = useState("");

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = useMemo(() => localStorage.getItem("jwt") || "", []);

  useEffect(() => {
    let alive = true;
    if (!itemId || !bookingId) {
      setStatus("error");
      setError("Missing booking details.");
      return;
    }
    if (!token) {
      setStatus("unauthorized");
      return;
    }

    (async () => {
      setStatus("loading");
      setError("");
      try {
        const [itemRes, bookingRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/items/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiBaseUrl}/api/items/${itemId}/bookings/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!alive) return;

        if (itemRes.status === 401 || bookingRes.status === 401) {
          setStatus("unauthorized");
          return;
        }
        if (itemRes.status === 403 || bookingRes.status === 403) {
          setStatus("forbidden");
          return;
        }
        if (!itemRes.ok) {
          const text = await itemRes.text().catch(() => "");
          throw new Error(text || `Item request failed: ${itemRes.status}`);
        }
        if (!bookingRes.ok) {
          const text = await bookingRes.text().catch(() => "");
          throw new Error(text || `Booking request failed: ${bookingRes.status}`);
        }

        const itemJson = (await itemRes.json()) as Item;
        const bookingJson = (await bookingRes.json()) as Booking;

        setItem(itemJson);
        setBooking(bookingJson);
        setStatus("ok");
      } catch (err) {
        if (!alive) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [apiBaseUrl, bookingId, itemId, token]);

  if (status === "loading") {
    return (
      <div className="bookingDetailPage">
        <div className="bgGlow" />
        <main className="bookingDetailMain">
          <PageHeader title="Booking" subtitle="Laster detaljer" showBack />
          <section className="section card bookingCard">
            <div className="skeleton line" />
            <div className="skeleton line short" />
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="bookingDetailPage">
        <div className="bgGlow" />
        <main className="bookingDetailMain">
          <div className="centerCard">
            <div className="lockIcon">x</div>
            <h1>Not logged in</h1>
            <p>You need to log in to view this booking.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="bookingDetailPage">
        <div className="bgGlow" />
        <main className="bookingDetailMain">
          <div className="centerCard">
            <div className="lockIcon">x</div>
            <h1>Not allowed</h1>
            <p>You do not have access to this booking.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bookingDetailPage">
        <div className="bgGlow" />
        <main className="bookingDetailMain">
          <div className="centerCard">
            <div className="lockIcon">x</div>
            <h1>Something went wrong</h1>
            <p className="mono">{error}</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!item || !booking) {
    return null;
  }

  return (
    <div className="bookingDetailPage">
      <div className="bgGlow" />
      <main className="bookingDetailMain">
        <PageHeader title="Booking" subtitle="Detaljer" showBack />

        <section className="section card bookingCard">
          <div className="sectionTitle">Booking info</div>
          <div className="bookingSummary">
            <div className="bookingTitle">{item.name}</div>
            {item.username ? (
              <div className="bookingMeta">Utleier: {item.username}</div>
            ) : null}
          </div>
          <div className="bookingGrid">
            <div className="bookingRow">
              <span className="bookingLabel">Start</span>
              <span className="bookingValue">{formatDateTime(booking.startTime)}</span>
            </div>
            <div className="bookingRow">
              <span className="bookingLabel">Slutt</span>
              <span className="bookingValue">{formatDateTime(booking.endTime)}</span>
            </div>
          </div>
          <div className="bookingActions">
            <Link to={`/items/${itemId}`} className="loanPrimaryBtn bookingAction">
              Ga til produkt
            </Link>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default BookingDetailPage;
