// src/components/Topbar.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../style/TopBar.css';
import { Link, useNavigate } from 'react-router-dom';
import { unsubscribeUser } from './usePushNotifications';
import { Bell } from 'lucide-react';
import { resolveNotificationTarget } from '../utils/notificationTarget';
import {
  clearAllPersistentBookingRequests,
  seedPersistentBookingRequestsFromNotifications,
} from '../utils/persistentBookingRequests';
import { onNotificationsRefresh } from '../utils/notificationsRefresh';

interface NotificationDto {
  id: number;
  message: string;
  url?: string | null;
}

const Topbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notes, setNotes] = useState<NotificationDto[]>([]);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const rawToken = localStorage.getItem('jwt') || '';
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!rawToken) {
      setNotes([]);
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/notifications`, {
        headers: { Authorization: `Bearer ${rawToken}` }
      });
      if (!res.ok) {
        throw new Error(`Could not load notifications (${res.status})`);
      }
      const data = (await res.json()) as NotificationDto[];
      setNotes(Array.isArray(data) ? data : []);
      void seedPersistentBookingRequestsFromNotifications({
        apiBaseUrl,
        token: rawToken,
        notifications: data,
      }).catch(console.error);
    } catch (error) {
      console.error(error);
    }
  }, [apiBaseUrl, rawToken]);

  // Fetch unread notifications on mount
  useEffect(() => {
    void fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  // Re-fetch bell/feed notifications after event/booking mutations.
  useEffect(() => onNotificationsRefresh(() => {
    void fetchUnreadNotifications();
  }), [fetchUnreadNotifications]);

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
  const toggleNotifications = () => {
    setMenuOpen(prev => {
      const next = !prev;
      if (next) {
        void fetchUnreadNotifications();
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await unsubscribeUser();
    } catch (err) {
      console.warn('Push unsubscribe failed:', err);
    } finally {
      clearAllPersistentBookingRequests();
      localStorage.removeItem('jwt');
      navigate('/login');
    }
  };

  const markRead = async (id: number) => {
    try {
      await fetch(`${apiBaseUrl}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rawToken}` }
      });
      setNotes(n => n.filter(x => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const openNotification = async (note: NotificationDto) => {
    void seedPersistentBookingRequestsFromNotifications({
      apiBaseUrl,
      token: rawToken,
      notifications: [note],
    }).catch(console.error);
    await markRead(note.id);
    setMenuOpen(false);

    const target = resolveNotificationTarget(note.url, apiBaseUrl);
    if (!target) return;

    if (target.type === 'external') {
      window.location.assign(target.to);
      return;
    }

    navigate(target.to);
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
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className="note-link"
                >
                  {n.message}
                </button>
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
