// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import type { User } from "../types/User";
import { useNavigate } from "react-router-dom";
import MyProducts from "../components/MyProducts";
import { PageHeader } from "../components/PageHeaderProps";
import "../style/ProfilePage.css";
import "../style/LoanPage.css";
import BottomNav from "../components/BottomNav";

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    fetch(`${apiBaseUrl}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data: User) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load profile.");
        setLoading(false);
      });
  }, [apiBaseUrl]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("jwt");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return <p className="profileState">Laster profil...</p>;
  if (error) return <p className="profileState profileError">{error}</p>;
  if (!user) return <p className="profileState">Ingen brukerdata tilgjengelig.</p>;

  return (
    <div className="profilePage">
      <div className="bgGlow" />
      <main className="profileMain">
        <PageHeader title="Profil" subtitle="Din konto" showBack />
        <section className="section card profileCard">
          <div className="profileAvatarWrap">
            <img
              src={`https://i.pravatar.cc/150?u=${user.id}`}
              alt="Profile"
              className="profileAvatar"
            />
            <div className="rolePill">
              <span className="roleIcon">U</span>
              <span className="roleLabel">Bruker</span>
              <span className="roleName">{user.username}</span>
            </div>
          </div>
          
          
        </section>

        <section className="section card profileProducts">
          <div className="sectionTitle">Mine produkter</div>
          <MyProducts />
        </section>
        <button onClick={handleLogout} className="profileLogout">
            Logg ut
          </button>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
