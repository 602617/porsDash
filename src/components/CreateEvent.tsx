// src/components/CreateEventForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./PageHeaderProps";
import "../style/CreateEvent.css";
import "../style/LoanPage.css";

interface EventDto {
  title: string;
  description: string;
  location?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
}

const CreateEventForm: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !startTime || !endTime) {
      return setError("Vennligst fyll ut alle paakrevde felt.");
    }

    const dto: EventDto = { title, description, location, startTime, endTime };

    setLoading(true);
    try {
      const res = await fetch(`${api}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dto),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const created: { id: number } = await res.json();
      navigate(`/events/${created.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Ukjent feil ved oppretting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="createEventPage">
      <div className="bgGlow" />
      <main className="createEventMain">
        <PageHeader title="Opprett arrangement" subtitle="Enkelt og raskt" showBack />

        <section className="section card createEventCard">
          <div className="sectionTitle">Opprett nytt arrangement</div>
          <form onSubmit={handleSubmit} className="createEventForm">
            {error && <div className="formError">{error}</div>}

            <label className="field">
              <span>
                Tittel <span className="req">*</span>
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Dugnad i bakgarden"
                required
              />
            </label>

            <label className="field">
              <span>
                Beskrivelse <span className="req">*</span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Kort beskrivelse av arrangementet"
                required
              />
            </label>

            <label className="field">
              <span>Sted</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Adresse eller sted"
              />
            </label>

            <div className="createEventGrid">
              <label className="field">
                <span>
                  Starttidspunkt <span className="req">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>
                  Sluttidspunkt <span className="req">*</span>
                </span>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </label>
            </div>

            <button type="submit" disabled={loading} className="createEventSubmit">
              {loading ? "Oppretter..." : "Opprett arrangement"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default CreateEventForm;
