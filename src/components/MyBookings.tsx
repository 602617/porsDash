import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../style/MyBookings.css";
import AuthenticatedItemImage from "./AuthenticatedItemImage";
import { triggerNotificationsRefresh } from "../utils/notificationsRefresh";

type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DECLINED";

interface BookingDto {
  id: number;
  itemId: number;
  startTime: string;
  endTime: string;
  status: BookingStatus | string;
  bookingName?: string;
  name?: string;
  itemName?: string;
  itemTitle?: string;
  imageUrl?: string;
  itemImageUrl?: string;
  item?: {
    name?: string;
    imageUrl?: string;
  };
}

function normalizeStatus(status: unknown): BookingStatus {
  if (status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED" || status === "DECLINED") {
    return status;
  }
  return "PENDING";
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("nb-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function itemLabelFor(booking: BookingDto): string {
  return (
    booking.itemName ||
    booking.itemTitle ||
    booking.item?.name ||
    "Produkt"
  );
}

function bookingLabelFor(booking: BookingDto): string {
  return booking.bookingName || booking.name || "Booking";
}

function bookingImagePathFor(booking: BookingDto): string {
  return booking.itemImageUrl || booking.imageUrl || booking.item?.imageUrl || `/api/items/${booking.itemId}/image`;
}

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("jwt");
      if (!token) {
        setError("Not authenticated.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiBaseUrl}/api/users/me/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Failed to load bookings (${res.status})`);
        }

        const data = (await res.json()) as BookingDto[];
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke hente bookinger.");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl]);

  const handleCancel = async (booking: BookingDto) => {
    const status = normalizeStatus(booking.status);
    if (status === "CANCELLED" || status === "DECLINED") return;

    const accepted = window.confirm("Avbryte denne bookingen?");
    if (!accepted) return;

    const token = localStorage.getItem("jwt") || "";
    setCancellingId(booking.id);
    setError(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/items/${booking.itemId}/bookings/${booking.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Cancel failed (${res.status})`);
      }

      let updatedStatus: BookingStatus = "CANCELLED";
      if (res.status !== 204) {
        try {
          const updated = (await res.json()) as Partial<BookingDto>;
          updatedStatus = normalizeStatus(updated.status);
        } catch {
          updatedStatus = "CANCELLED";
        }
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, status: updatedStatus } : b
        )
      );
      triggerNotificationsRefresh("booking:cancel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke avbryte booking.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="myBookingsWrap">
      {loading ? (
        <p className="myBookingsState">Laster bookinger...</p>
      ) : error ? (
        <p className="myBookingsState myBookingsError">{error}</p>
      ) : bookings.length === 0 ? (
        <p className="myBookingsState">Ingen bookinger funnet.</p>
      ) : (
        <div className="myBookingsList">
          {bookings.map((booking) => {
            const status = normalizeStatus(booking.status);
            const statusClass = `myBookingStatus myBookingStatus--${status.toLowerCase()}`;
            const fallbackImage = `https://picsum.photos/seed/${booking.itemId}/480/240`;
            return (
              <div key={booking.id} className="myBookingCard">
                <AuthenticatedItemImage
                  apiBaseUrl={apiBaseUrl}
                  imageUrl={bookingImagePathFor(booking)}
                  fallbackSrc={fallbackImage}
                  alt={itemLabelFor(booking)}
                  className="myBookingThumb"
                />
                <div className="myBookingTop">
                  <h3 className="myBookingTitle">{itemLabelFor(booking)}</h3>
                  <span className={statusClass}>{status}</span>
                </div>
                <div className="myBookingMeta">{bookingLabelFor(booking)}</div>
                <div className="myBookingRows">
                  <div className="myBookingRow">
                    <span className="myBookingLabel">Start</span>
                    <span className="myBookingValue">{formatDateTime(booking.startTime)}</span>
                  </div>
                  <div className="myBookingRow">
                    <span className="myBookingLabel">Slutt</span>
                    <span className="myBookingValue">{formatDateTime(booking.endTime)}</span>
                  </div>
                </div>
                <div className="myBookingActions">
                  <Link
                    to={`/items/${booking.itemId}/bookings/${booking.id}`}
                    className="loanGhostBtn myBookingActionBtn"
                  >
                    Aapne detaljer
                  </Link>
                  {status !== "CANCELLED" && status !== "DECLINED" ? (
                    <button
                      type="button"
                      className="loanDangerBtn myBookingActionBtn"
                      onClick={() => handleCancel(booking)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? "Avbryter..." : "Avbryt booking"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
