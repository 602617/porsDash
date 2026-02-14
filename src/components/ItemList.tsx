import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import "../style/ItemList.css"

interface Item {
  id: number;
  name: string;
  username: string;
}

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchItems = async () => {
      const token = localStorage.getItem("jwt");

      if (!token) {
        console.warn("No JWT token found in localStorage");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/items`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch items: ${response.status}`);
        } else {
          const data = await response.json();
          setItems(data);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, []);

  if (loading) return <div className="itemLoading">Loading...</div>;

  return (
    
    <div className="itemList">
      <div className="itemGrid">
        {items.length === 0 ? (
          <p className="itemEmpty">No items found or access denied.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="itemCard">
              <img
                src={`https://picsum.photos/seed/${item.id}/400/200`}
                alt={item.name}
                className="itemThumb"
              />
              <div className="itemBody">
                <p className="itemOwner">{item.username}</p>
                <h3 className="itemName">{item.name}</h3>
                <Link
                  to={`/items/${item.id}`}
                  state={{ item }}
                  className="itemAction"
                >
                  View details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ItemList;
