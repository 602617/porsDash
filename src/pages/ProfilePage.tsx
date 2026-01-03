// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import type { User } from '../types/User';
import { useNavigate } from 'react-router-dom';
import MyProducts from '../components/MyProducts';
import { PageHeader } from '../components/PageHeaderProps';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetch(`${apiBaseUrl}/api/users/me`, {
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

  const handleLogout = async () => {
    try {
      // 1) Remove the JWT (or whatever key you used) from localStorage
      localStorage.removeItem('jwt');

      // 2) Redirect to /login
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) return <p>Loading profile…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!user) return <p>No user data available.</p>;

  return (
  <div>
    <PageHeader title="Profil" showBack/>
    <div
      style={{
        maxWidth: 400,
        margin: '2rem auto',
        padding: '2rem',
        textAlign: 'center'
      }}
    >
      

      {/* Rundt bilde */}
      <img
        src={`https://i.pravatar.cc/150?u=${user.id}`} // random avatar per ID
        alt="Profile"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          objectFit: 'cover',
          margin: '1rem auto'
        }}
      />

      {/* Brukernavn og ID */}
      <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{user.username}</p>
      <p>ID: {user.id}</p>

      {/* Logout-knapp lenger ned */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1.5rem',
          backgroundColor: '#304D6D',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
      <MyProducts />
    </div>
    
  </div>
);

};

export default ProfilePage;
