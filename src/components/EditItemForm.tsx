import React, { useState } from "react";

interface EditItemFormProps {
  itemId: number;
  currentName: string;
  onClose: () => void;
  onUpdate: (newName: string) => void;
  onDelete: (itemId: number) => void;
}

const EditItemForm: React.FC<EditItemFormProps> = ({
  itemId,
  currentName,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState(currentName);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(name);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Er du sikker p? at du vil slette dette produktet?")) return;

    const token = localStorage.getItem("jwt");
    const res = await fetch(`${apiBaseUrl}/api/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onDelete(itemId);
      onClose();
    } else {
      alert("Kunne ikke slette produktet");
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
          required
        />
      </label>
      <div className="editActions">
        <button type="submit" className="primaryBtn">
          Lagre
        </button>
        <button type="button" onClick={onClose} className="ghostBtn">
          Avbryt
        </button>
        <button type="button" onClick={handleDelete} className="dangerBtn">
          Slett
        </button>
      </div>
    </form>
  );
};

export default EditItemForm;
