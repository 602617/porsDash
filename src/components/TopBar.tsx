// src/components/Topbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import '../style/TopBar.css';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface NotificationDto {
  id: number;
  message: string;
  url: string;
}

const Topbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<NotificationDto[]>([]);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const rawToken = localStorage.getItem('jwt') || '';
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${rawToken}` }
    })
      .then(res => res.json())
      .then((data: NotificationDto[]) => setNotes(data))
      .catch(console.error);
  }, [rawToken]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = () => setIsOpen(prev => !prev);
  const toggleNotifications = () => setMenuOpen(prev => !prev);

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/login');
  };

  const markRead = async (id: number) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rawToken}` }
      });
      setNotes(n => n.filter(x => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="topbar">
      <div className="logo">
        <Link to="/dashboard" className="logo-link">
          Porsdash
        </Link>
      </div>
      {/* Notifications */}
      <div className="notification-wrapper" ref={dropdownRef}>
        <button className="bell-button" onClick={toggleNotifications} aria-label="Notifications">
          <Bell className="bell-icon" />
          {notes.length > 0 && <span className="badge">{notes.length}</span>}
        </button>
        {menuOpen && (
          <div className="notification-dropdown">
            {notes.length > 0 ? notes.map(n => (
              <div key={n.id} className="note-item">
                <Link
                    to={n.url}
                    onClick={() => markRead(n.id)}
                    className="note-link"
                  >
                    {n.message}
                  </Link>
              </div>
            )) : (
              <div className="note-none">Ingen nye varsler</div>
            )}
          </div>
        )}
      </div>

      <nav className={`nav ${isOpen ? 'open' : ''}`}>
        <ul>
          <li><Link to="/dashboard">Home</Link></li>
          <li><Link to="/items">Items</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/myproducts">My Products</Link></li>
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
