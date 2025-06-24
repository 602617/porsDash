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

  return (
    <div style={{ padding: "2rem" }}>
      <h2 className="text-center text-2xl mb-6">Mine produkter</h2>

      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="button-add"
        >
          Legg til produkt
        </button>
      </div>
      {showForm && (
        <div className="flex justify-center mb-8">
          <AddItemForm />
        </div>
      )}

      {loading ? (
        <p>Laster…</p>
      ) : items.length === 0 ? (
        <p>Ingen produkter funnet.</p>
      ) : (
        <div className="card-list">
          {items.map((item) => (
            <div key={item.id} className="card">
              <img
                src={`https://picsum.photos/seed/${item.id}/400/200`}
                alt={item.name}
                className="w-full h-36 object-cover"
              />
              <h3 className="font-semibold mt-2">{item.name}</h3>

              <button
                className="mt-2 px-3 py-1 border rounded"
                onClick={() =>
                  setEditItemId((cur) =>
                    cur === item.id ? null : item.id
                  )
                }
              >
                {editItemId === item.id ? "Avbryt" : "Edit"}
              </button>

              {editItemId === item.id && (
                <>
                  <div className="mt-4">
                    <EditItemForm
                      itemId={item.id}
                      currentName={item.name}
                      onClose={() => setEditItemId(null)}
                      onUpdate={(newName) =>
                        handleUpdate(item.id, newName)
                      }
                    />
                  </div>
                  {/* Her vises kalender + blokk-form */}
                  <ItemAvailabilityEditor itemId={item.id} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;
