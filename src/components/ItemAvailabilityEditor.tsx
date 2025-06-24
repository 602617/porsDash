// src/components/ItemAvailabilityEditor.tsx
import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventInput, EventClickArg } from "@fullcalendar/core";

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
}

interface Props {
  itemId: number;
}

const ItemAvailabilityEditor: React.FC<Props> = ({ itemId }) => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const api = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("jwt") || "";

  // Hent eksisterende blokker
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${api}/api/items/${itemId}/unavailability`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) setSlots(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, itemId, token]);

  const handleAddBlock = async () => {
    if (!newStart || !newEnd) {
      return alert("Velg både start og slutt");
    }
    const res = await fetch(
      `${api}/api/items/${itemId}/unavailability`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startTime: newStart, endTime: newEnd }),
      }
    );
    if (res.ok) {
      const created: Slot = await res.json();
      setSlots((prev) => [...prev, created]);
      setNewStart("");
      setNewEnd("");
    } else {
      alert("Feil ved oppretting");
    }
  };

  const handleBlockClick = async (clickInfo: EventClickArg) => {
    const blockId = clickInfo.event.id;
    if (
      !window.confirm(
        `Slett blokk-periode ${clickInfo.event.startStr} — ${clickInfo.event.endStr}?`
      )
    )
      return;
    const res = await fetch(
      `${api}/api/items/${itemId}/unavailability/${blockId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.status === 204) {
      clickInfo.event.remove();
    } else {
      alert("Kunne ikke slette");
    }
  };

  const events: EventInput[] = slots.map((s) => ({
    id: String(s.id),
    title: "Ikke ledig",
    start: s.startTime,
    end: s.endTime,
    color: "#e25858",
  }));

  if (loading) return <p>Henter tilgjengelighet…</p>;

  return (
    <div className="mb-8 p-4 bg-gray-50 rounded shadow">
      <h4 className="font-semibold mb-2">Administrer ikke-ledig</h4>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label>Start</label>
          <input
            type="datetime-local"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="block w-full p-1 border rounded"
          />
        </div>
        <div>
          <label>Slutt</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="block w-full p-1 border rounded"
          />
        </div>
      </div>
      <button
        onClick={handleAddBlock}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Legg til blokk
      </button>
    </div>
  );
};

export default ItemAvailabilityEditor;
