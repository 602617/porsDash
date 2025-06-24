// src/components/Topbar.tsx (or wherever you keep it)
import React, { useState } from 'react';
import '../style/TopBar.css';         // <-- Make sure this path actually points to your CSS
import { Link, useNavigate } from 'react-router-dom';

const Topbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsOpen(prev => !prev);
  };

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

  return (
    <header className="topbar">
      <div className="logo">
        <Link to="/dashboard" className="logo-link">
          Porsdash
        </Link>
      </div>

      <nav className={`nav ${isOpen ? 'open' : ''}`}>
        <ul>
          <li>
            <Link to="/dashboard">Home</Link>
          </li>
          <li>
            <Link to="/items">Items</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
          <li>
            <Link to="/myproducts">My Products</Link>
          </li>
          <li>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <button
        className={`hamburger ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>
    </header>
  );
};

export default Topbar;
