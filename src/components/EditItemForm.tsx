import React, { useState } from "react";

interface EditItemFormProps {
  itemId: number;
  currentName: string;
  onClose: () => void;
  onUpdate: (newName: string) => void;
  onDelete: (itemId: number) => Promise<boolean> | boolean;
}

const EditItemForm: React.FC<EditItemFormProps> = ({
  itemId,
  currentName,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage("");

    const token = localStorage.getItem("jwt");
    if (!token) {
      setFormMessage("Du maa vaere logget inn.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormMessage("Produktnavn mangler.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/items/${itemId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        if (res.status === 403) {
          setFormMessage(message || "Du eier ikke dette produktet.");
        } else {
          setFormMessage(message || "Kunne ikke oppdatere produktet.");
        }
        return;
      }

      onUpdate(trimmedName);
      onClose();
    } catch (err) {
      console.error(err);
      setFormMessage("Noe gikk galt.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Er du sikker paa at du vil slette dette produktet?")) return;
    const deleted = await onDelete(itemId);
    if (deleted) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="editItemForm">
      <label className="field">
        <span>Nytt navn</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          required
        />
      </label>
      <div className="editActions">
        <button type="submit" className="primaryBtn" disabled={saving}>
          {saving ? "Lagrer..." : "Lagre"}
        </button>
        <button type="button" onClick={onClose} className="ghostBtn" disabled={saving}>
          Avbryt
        </button>
        <button type="button" onClick={handleDelete} className="dangerBtn" disabled={saving}>
          Slett
        </button>
      </div>
      {formMessage ? <p className="addItemMessage">{formMessage}</p> : null}
    </form>
  );
};

export default EditItemForm;
