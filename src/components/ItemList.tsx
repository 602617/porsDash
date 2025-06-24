import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    
    <div>
      
      <div className="grid grid-cols-2 gap-4 w-full px-2">
      {items.length === 0 ? (
        <p className="text-center w-full">No items found or access denied.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition overflow-hidden"
          >
            <img
              src={`https://picsum.photos/seed/${item.id}/400/200`}
              alt="Random"
              className="w-full h-36 object-cover"
            />
            <div className="p-3">
              <p>{item.username}</p>
              <h3 className="text-base font-semibold">{item.name}  </h3>
              <Link
                to={`/items/${item.id}`}
                state={{ item }}
                className="mt-2 inline-block px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
