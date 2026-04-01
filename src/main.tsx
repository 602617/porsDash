
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HelloPage from './pages/HelloPage.tsx'
import LoginPage from "../src/pages/LoginPage.tsx"
import Dashboard from './pages/Dashboard.tsx'
import "./index.css";
import ProfilePage from './pages/ProfilePage.tsx'
import './style/theme.css'
import ItemPage from './pages/ItemPage.tsx'
import MyProductsPage from './pages/MyProductsPage.tsx'
import ItemDetailPage from './pages/ItemDetailPage.tsx'
import DugnadPage from './pages/Dugnad.tsx'
import EventDetail from './components/EventDetail.tsx'
import NewDash from './components/newDash.tsx'
import TestPage from './pages/testPage.tsx'
import CreateEventForm from './components/CreateEvent.tsx'
import ShoppingLists from './pages/ShoppingLists.tsx'
import LoanPage from './pages/LoanPage.tsx'
import NotificationsPage from './pages/NotificationsPage.tsx'
import GamePage from './pages/GamePage.tsx'
import BookingDetailPage from './pages/BookingDetailPage.tsx'
import MyBookingsPage from './pages/MyBookingsPage.tsx'
import { installAuth401Interceptor } from './utils/authFetch.ts'

function readStoredJwt(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('jwt') || ''
}

function RequireAuth({ children }: { children: React.ReactElement }) {
  const location = useLocation()
  if (!readStoredJwt()) {
    const redirect = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }
  return children
}

function RedirectIfAuthed({ children }: { children: React.ReactElement }) {
  if (readStoredJwt()) {
    return <Navigate to="/nydash" replace />
  }
  return children
}

installAuth401Interceptor()

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        const scriptUrl = registration.active?.scriptURL || ''
        if (!scriptUrl.endsWith('/sw.js')) {
          console.log('[sw] Unregistering non-/sw.js worker:', scriptUrl)
          registration.unregister()
        }
      })
    })
    .catch((err) => console.error('[sw] Failed to list registrations:', err))

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('[sw] Service worker registered:', registration)
    })
    .catch((err) => console.error('[sw] Registration failed:', err))
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<RedirectIfAuthed><HelloPage/></RedirectIfAuthed>} />
      <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />

      <Route path="/items" element={<RequireAuth><ItemPage /></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage/></RequireAuth>} />
      <Route path="/myproducts" element={<RequireAuth><MyProductsPage/></RequireAuth>} />
      <Route path="/mybookings" element={<RequireAuth><MyBookingsPage/></RequireAuth>} />
      <Route path='/items/:id' element={<RequireAuth><ItemDetailPage /></RequireAuth>} />
      <Route path='/items/:itemId/bookings/:bookingId' element={<RequireAuth><BookingDetailPage /></RequireAuth>} />
      <Route path='/dugnad' element={<RequireAuth><DugnadPage/></RequireAuth>} />
      <Route path="/events/:id" element={<RequireAuth><EventDetail /></RequireAuth>} />
      <Route path='/events/new' element={<RequireAuth><CreateEventForm /></RequireAuth>} />
      <Route path='/handlelister' element={<RequireAuth><ShoppingLists /></RequireAuth>} />
      <Route path='/nydash' element={<RequireAuth><NewDash /></RequireAuth>} />
      <Route path='/nyevent' element={<RequireAuth><CreateEventForm /></RequireAuth>} />
      <Route path='/loan' element={<RequireAuth><LoanPage loanId={2} baseUrl={import.meta.env.VITE_API_BASE_URL ?? ""} /></RequireAuth>} />
      <Route path='/notifications' element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path='/testpage' element={<RequireAuth><TestPage /></RequireAuth>} />
      <Route path='/game' element={<RequireAuth><GamePage /></RequireAuth>} />
    </Routes>
  </BrowserRouter>
</React.StrictMode>,
)

