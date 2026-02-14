// src/components/MyProducts.tsx
import React, { useEffect, useState } from "react";
import "../style/MyProducts.css";
import EditItemForm from "./EditItemForm";
import AddItemForm from "./AddItemForm";
import ItemAvailabilityEditor from "./ItemAvailabilityEditor";

interface Item {
  id: number;
  name: string;
}

const MyProducts: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

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

  const handleDelete = async (itemId: number) => {
    const token = localStorage.getItem("jwt");
    const res = await fetch(`${apiBaseUrl}/api/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setEditItemId(null);
    } else {
      alert("Kunne ikke slette produkt");
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
          <AddItemForm />
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
                src={`https://picsum.photos/seed/${item.id}/400/200`}
                alt={item.name}
                className="myProductThumb"
              />
              <div className="myProductBody">
                <h3 className="myProductTitle">{item.name}</h3>
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
                      onDelete={() => handleDelete(item.id)}
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
