import React, { useEffect, useState } from "react";

interface Slot {
  id: number;
  startTime: string;
  endTime: string;
}

interface Props {
  itemId: number;
}

const ItemAvailabilityEditor: React.FC<Props> = ({ itemId }) => {
  const [slots, setSlots]     = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStart, setNewStart] = useState("");
  const [newEnd,   setNewEnd]   = useState("");
  const api   = import.meta.env.VITE_API_BASE_URL;
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
      setSlots(prev => [...prev, created]);
      setNewStart("");
      setNewEnd("");
    } else {
      alert("Feil ved oppretting");
    }
  };

  if (loading) return <p>Henter tilgjengelighet…</p>;

  return (
    <div className="mb-8 p-4 bg-gray-50 rounded shadow">
      <h4 className="font-semibold mb-2">Administrer ikke-ledig</h4>

      {/* Skjema for å blokkere periode */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label>Start</label>
          <input
            type="datetime-local"
            value={newStart}
            onChange={e => setNewStart(e.target.value)}
            className="block w-full p-1 border rounded"
          />
        </div>
        <div>
          <label>Slutt</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={e => setNewEnd(e.target.value)}
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

      {/* Liste over blokk-perioder */}
      <ul className="space-y-2">
        {slots.map(s => (
          <li key={s.id} className="p-2 border rounded">
            {new Date(s.startTime).toLocaleString()} —{" "}
            {new Date(s.endTime).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItemAvailabilityEditor;
