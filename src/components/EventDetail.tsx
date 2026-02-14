// src/components/EventDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import RsvpForm from "./RsvpForm";
import "../style/EventDetail.css";
import "../style/LoanPage.css";
import { subscribeUser } from "./usePushNotifications";
import { PageHeader } from "./PageHeaderProps";
import BottomNav from "./BottomNav";

interface AttendanceDto {
  userId: number;
  username: string;
  status: "CAN" | "CANNOT";
  comment?: string;
  updatedAt: string;
}

interface EventDetailDto {
  id: number;
  title: string;
  description: string;
  location?: string;
  startTime: string;
  endTime: string;
  createdBy: string;
  attendees: AttendanceDto[];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("no-NO", { day: "2-digit", month: "long" }),
    time: d.toLocaleTimeString("no-NO", { hour: "2-digit", minute: "2-digit" }),
  };
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventDetailDto | null>(null);
  const [attendees, setAttendees] = useState<AttendanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rawToken = localStorage.getItem("jwt") ?? "";
        let currentUser = "";
        try {
          ({ sub: currentUser } = jwtDecode<{ sub: string }>(rawToken));
        } catch {
          currentUser = "";
        }

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/events/${id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${rawToken}`,
            },
          }
        );
        if (!res.ok) throw new Error(`Kunne ikke hente event (${res.status})`);
        const data: EventDetailDto = await res.json();
        setEvent(data);
        setAttendees(data.attendees);

        const hasAttended = data.attendees.some((a) => a.username === currentUser);
        setShowForm(!hasAttended);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ukjent feil ved lasting");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleNewRsvp = (att: AttendanceDto) => {
    setAttendees((prev) => prev.filter((a) => a.userId !== att.userId).concat(att));
    setShowForm(false);
  };

  if (loading) return <p className="eventState">Laster arrangement...</p>;
  if (error) return <p className="eventState eventError">Feil: {error}</p>;
  if (!event) return <p className="eventState">Arrangement ikke funnet.</p>;

  const { date: startDate, time: startTime } = formatDateTime(event.startTime);
  const { date: endDate, time: endTime } = formatDateTime(event.endTime);

  const canList = attendees.filter((a) => a.status === "CAN");
  const cannotList = attendees.filter((a) => a.status !== "CAN");

  return (
    <div className="eventDetailPage">
      <div className="bgGlow" />
      <main className="eventDetailMain">
        <PageHeader title={event.title} showBack />

        <section className="section card eventHero">
          <div className="chip">Arrangement</div>
          <h1 className="eventTitle">{event.title}</h1>
          <div className="eventMetaRow">
            <span className="metaPill">
              {startDate === endDate ? startDate : `${startDate} - ${endDate}`}
            </span>
            <span className="metaPill">kl. {startTime} - {endTime}</span>
            {event.location ? <span className="metaPill">{event.location}</span> : null}
          </div>
          <p className="eventDesc">{event.description}</p>
          <p className="eventCreator">Opprettet av: {event.createdBy}</p>
        </section>

        <section className="section card eventRsvp">
          <div className="sectionTitle">Din respons</div>
          {showForm ? (
            <RsvpForm eventId={event.id} onRsvpSuccess={handleNewRsvp} />
          ) : (
            <button
              onClick={() => {
                setShowForm(true);
                subscribeUser()
                  .then((s) => {
                    if (s) alert("Abonnert!");
                  })
                  .catch((err) => console.error(err));
              }}
              className="eventActionBtn"
            >
              Endre svar
            </button>
          )}
        </section>

        <section className="section card eventAttendees">
          <div className="sectionTitle">Deltakere</div>
          {attendees.length === 0 ? (
            <p className="eventEmpty">Ingen har meldt seg enn?.</p>
          ) : (
            <div className="eventGrid">
              {canList.length > 0 ? (
                <div className="attendeeGroup">
                  <div className="attendeeTitle">Kan delta</div>
                  <ul className="attendeeList">
                    {canList.map((a) => (
                      <li key={a.userId} className="attendeeItem">
                        <span>{a.username}</span>
                        {a.comment ? <span className="attendeeComment">"{a.comment}"</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {cannotList.length > 0 ? (
                <div className="attendeeGroup">
                  <div className="attendeeTitle">Kan ikke delta</div>
                  <ul className="attendeeList">
                    {cannotList.map((a) => (
                      <li key={a.userId} className="attendeeItem">
                        <span>{a.username}</span>
                        {a.comment ? <span className="attendeeComment">"{a.comment}"</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default EventDetail;
