import React, { useEffect, useState } from "react";
import "../style/ItemAvailabilityEditor.css";

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${api}/api/items/${itemId}/unavailability`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      return alert("Velg b?de start og slutt");
    }
    const res = await fetch(`${api}/api/items/${itemId}/unavailability`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ startTime: newStart, endTime: newEnd }),
    });
    if (res.ok) {
      const created: Slot = await res.json();
      setSlots((prev) => [...prev, created]);
      setNewStart("");
      setNewEnd("");
    } else {
      alert("Feil ved oppretting");
    }
  };

  if (loading) return <p className="availabilityState">Henter tilgjengelighet...</p>;

  return (
    <div className="availabilityCard">
      <h4 className="availabilityTitle">Administrer ikke-ledig</h4>

      <div className="availabilityGrid">
        <label className="availabilityField">
          <span>Start</span>
          <input
            type="datetime-local"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
          />
        </label>
        <label className="availabilityField">
          <span>Slutt</span>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleAddBlock} className="availabilityBtn">
        Legg til blokk
      </button>

      <ul className="availabilityList">
        {slots.map((s) => (
          <li key={s.id} className="availabilityItem">
            <span>{new Date(s.startTime).toLocaleString()}</span>
            <span className="availabilityArrow">?</span>
            <span>{new Date(s.endTime).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ItemAvailabilityEditor;
