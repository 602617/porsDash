import React, { useState } from 'react';
import type { FormEvent } from 'react';

const AddItemForm: React.FC = () => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('jwt');
    if (!token) {
      setMessage('You must be logged in');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        setMessage('Item added!');
        setName('');
      } else {
        const errorText = await response.text();
        setMessage(`Error: ${errorText}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Add Product</h2>
      <input
        type="text"
        value={name}
        placeholder="Product name"
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
        required
      />
      <button type="submit" style={{ padding: '0.5rem 1rem' }}>
        Add
      </button>
      {message && <p style={{ marginTop: '1rem' }}>{message}</p>}
    </form>
  );
};

export default AddItemForm;
