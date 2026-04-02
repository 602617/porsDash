// src/components/MyProducts.tsx
import React, { useEffect, useState } from "react";
import "../style/MyProducts.css";
import EditItemForm from "./EditItemForm";
import AddItemForm from "./AddItemForm";
import ItemAvailabilityEditor from "./ItemAvailabilityEditor";
import { resolveItemImageUrl } from "../utils/itemImage";

interface Item {
  id: number;
  name: string;
  imageUrl?: string | null;
}

const MyProducts: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [imageVersionById, setImageVersionById] = useState<Record<number, number>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
  const [uploadMessages, setUploadMessages] = useState<Record<number, string>>({});
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleItemsUpdated = (nextItems: Item[]) => {
    setItems(nextItems);
    setImageVersionById((prev) => {
      const next: Record<number, number> = {};
      nextItems.forEach((item) => {
        if (prev[item.id]) next[item.id] = prev[item.id];
      });
      return next;
    });
    setShowForm(false);
  };

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("jwt");
      try {
        const res = await fetch(`${apiBaseUrl}/api/items/myproducts`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) setItems(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBaseUrl]);

  const handleUpdate = (itemId: number, newName: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, name: newName } : it))
    );
    setEditItemId(null);
  };

  const handleDelete = async (itemId: number): Promise<boolean> => {
    const token = localStorage.getItem("jwt") || "";
    if (!token) {
      alert("Du maa vaere logget inn.");
      return false;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setImageVersionById((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        setEditItemId(null);
        return true;
      }

      const message = await res.text().catch(() => "");
      if (res.status === 403) {
        alert(message || "Du eier ikke dette produktet.");
      } else {
        alert(message || "Kunne ikke slette produkt.");
      }
    } catch (err) {
      console.error(err);
      alert("Noe gikk galt ved sletting av produkt.");
    }

    return false;
  };

  const handleChooseImage = (itemId: number, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [itemId]: file }));
    setUploadMessages((prev) => ({ ...prev, [itemId]: "" }));
  };

  const handleUploadImage = async (itemId: number) => {
    const file = selectedFiles[itemId];
    if (!file) {
      setUploadMessages((prev) => ({ ...prev, [itemId]: "Velg en bildefil foerst." }));
      return;
    }

    const token = localStorage.getItem("jwt") || "";
    if (!token) {
      setUploadMessages((prev) => ({ ...prev, [itemId]: "Du maa vaere logget inn." }));
      return;
    }

    setUploadingItemId(itemId);
    setUploadMessages((prev) => ({ ...prev, [itemId]: "" }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBaseUrl}/api/items/${itemId}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        if (res.status === 403) {
          throw new Error(message || "Du eier ikke dette produktet.");
        }
        throw new Error(message || `Upload feilet (${res.status})`);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, imageUrl: item.imageUrl || `/api/items/${itemId}/image` }
            : item
        )
      );
      setImageVersionById((prev) => ({ ...prev, [itemId]: Date.now() }));
      setSelectedFiles((prev) => ({ ...prev, [itemId]: null }));
      setUploadMessages((prev) => ({ ...prev, [itemId]: "Bilde lastet opp." }));
    } catch (err) {
      setUploadMessages((prev) => ({
        ...prev,
        [itemId]: err instanceof Error ? err.message : "Kunne ikke laste opp bilde.",
      }));
    } finally {
      setUploadingItemId(null);
    }
  };

  return (
    <div className="myProductsWrap">
      <div className="myProductsActions">
        <button onClick={() => setShowForm((s) => !s)} className="primaryBtn">
          {showForm ? "Skjul skjema" : "Legg til produkt"}
        </button>
      </div>

      {showForm && (
        <div className="myProductsForm">
          <AddItemForm onItemsUpdated={handleItemsUpdated} />
        </div>
      )}

      {loading ? (
        <p className="myProductsState">Laster...</p>
      ) : items.length === 0 ? (
        <p className="myProductsState">Ingen produkter funnet.</p>
      ) : (
        <div className="myProductsGrid">
          {items.map((item) => (
            <div key={item.id} className="myProductCard">
              <img
                src={
                  resolveItemImageUrl(apiBaseUrl, item.imageUrl, imageVersionById[item.id]) ||
                  `https://picsum.photos/seed/${item.id}/400/200`
                }
                alt={item.name}
                className="myProductThumb"
              />
              <div className="myProductBody">
                <h3 className="myProductTitle">{item.name}</h3>
                <div className="myImageUploadRow">
                  <input
                    className="myImageInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleChooseImage(item.id, e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() => handleUploadImage(item.id)}
                    disabled={uploadingItemId === item.id}
                  >
                    {uploadingItemId === item.id ? "Laster opp..." : "Last opp bilde"}
                  </button>
                </div>
                {uploadMessages[item.id] ? (
                  <p className="myUploadMessage">{uploadMessages[item.id]}</p>
                ) : null}
                <button
                  className="ghostBtn"
                  onClick={() =>
                    setEditItemId((cur) => (cur === item.id ? null : item.id))
                  }
                >
                  {editItemId === item.id ? "Avbryt" : "Rediger"}
                </button>

                {editItemId === item.id && (
                  <div className="myProductEditor">
                    <EditItemForm
                      itemId={item.id}
                      currentName={item.name}
                      onClose={() => setEditItemId(null)}
                      onUpdate={(newName) => handleUpdate(item.id, newName)}
                      onDelete={handleDelete}
                    />
                    <ItemAvailabilityEditor itemId={item.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;
