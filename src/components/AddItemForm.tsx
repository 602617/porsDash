import React, { useRef, useState } from "react";
import type { FormEvent } from "react";
import { readStoredJwt } from "../utils/jwtToken";

interface ItemSummary {
  id: number;
  name: string;
  imageUrl?: string | null;
}

interface AddItemFormProps {
  onItemsUpdated?: (items: ItemSummary[]) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onItemsUpdated }) => {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchMyProducts = async (token: string, suppressError = false): Promise<ItemSummary[]> => {
    const res = await fetch(`${apiBaseUrl}/api/items/myproducts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      if (suppressError) return [];
      throw new Error(`Kunne ikke hente produkter (${res.status})`);
    }
    const data = (await res.json()) as ItemSummary[];
    return Array.isArray(data) ? data : [];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");

    const token = readStoredJwt();
    if (!token) {
      setMessage("Du maa vaere logget inn");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("Produktnavn mangler");
      return;
    }

    setSubmitting(true);

    try {
      const beforeItems = await fetchMyProducts(token, true).catch(() => []);
      const beforeIds = new Set(beforeItems.map((item) => item.id));

      const response = await fetch(`${apiBaseUrl}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (response.ok) {
        const createdItems = await fetchMyProducts(token);
        let createdItem =
          createdItems
            .filter((item) => !beforeIds.has(item.id))
            .sort((a, b) => b.id - a.id)[0] || null;

        if (!createdItem) {
          createdItem =
            createdItems
              .filter((item) => item.name === trimmedName)
              .sort((a, b) => b.id - a.id)[0] || null;
        }

        if (file && createdItem) {
          const formData = new FormData();
          formData.append("file", file);

          const uploadRes = await fetch(`${apiBaseUrl}/api/items/${createdItem.id}/image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            const uploadError = await uploadRes.text().catch(() => "");
            setMessage(uploadError || `Produkt opprettet, men bildeopplasting feilet (${uploadRes.status}).`);
            onItemsUpdated?.(createdItems);
            return;
          }

          const itemsAfterUpload = await fetchMyProducts(token);
          onItemsUpdated?.(itemsAfterUpload);
          setMessage("Produkt og bilde lagt til!");
        } else if (file && !createdItem) {
          setMessage("Produkt lagt til, men fant ikke produkt-ID for bildeopplasting.");
          onItemsUpdated?.(createdItems);
        } else {
          onItemsUpdated?.(createdItems);
          setMessage("Produkt lagt til!");
        }

        setName("");
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        const errorText = await response.text();
        setMessage(`Feil: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("Noe gikk galt");
    } finally {
      setSubmitting(false);
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
          disabled={submitting}
          required
        />
      </label>
      <label className="field">
        <span>Bilde (valgfritt)</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={submitting}
        />
      </label>
      <button type="submit" className="primaryBtn">
        {submitting ? "Lagrer..." : "Legg til"}
      </button>
      {message && <p className="addItemMessage">{message}</p>}
    </form>
  );
};

export default AddItemForm;
