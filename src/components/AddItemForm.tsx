import React, { useState } from "react";
import type { FormEvent } from "react";

const AddItemForm: React.FC = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");

    const token = localStorage.getItem("jwt");
    if (!token) {
      setMessage("Du m?? v??re logget inn");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        setMessage("Produkt lagt til!");
        setName("");
      } else {
        const errorText = await response.text();
        setMessage(`Feil: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Noe gikk galt");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="addItemForm">
      <h3 className="addItemTitle">Legg til produkt</h3>
      <label className="field">
        <span>Produktnavn</span>
        <input
          type="text"
          value={name}
          placeholder="F.eks. Drill, stige, henger"
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <button type="submit" className="primaryBtn">
        Legg til
      </button>
      {message && <p className="addItemMessage">{message}</p>}
    </form>
  );
};

export default AddItemForm;
