// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import type { User } from '../types/User';
import Topbar from '../components/TopBar';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetch('http://localhost:8080/api/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // only if you switch to cookie‐based JWT; otherwise it can be omitted
    })
      .then(res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: User) => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load profile.');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading profile…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!user) return <p>No user data available.</p>;

  return (
    <div>
<Topbar />
<div style={{ maxWidth: 400, margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: 8 }}>
        
      <h2>Your Profile</h2>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Username:</strong> {user.username}</p>
      {user.email && <p><strong>Email:</strong> {user.email}</p>}
      {/* Render any other fields UserDto provides */}
    </div>
    </div>
    
  );
};

export default ProfilePage;
