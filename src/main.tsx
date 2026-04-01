
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route} from 'react-router-dom'
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
import { installAuth401Interceptor } from './utils/authFetch.ts'

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
      <Route path="/" element={<HelloPage/>} />
      <Route path="/items" element={<ItemPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<ProfilePage/>} />
      <Route path="/myproducts" element={<MyProductsPage/>} />
      <Route path='/items/:id' element={<ItemDetailPage />} />
      <Route path='/items/:itemId/bookings/:bookingId' element={<BookingDetailPage />} />
      <Route path='/dugnad' element={<DugnadPage/>} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path='/events/new' element={<CreateEventForm />} />
      <Route path='/handlelister' element={<ShoppingLists />} />
      <Route path='/nydash' element={<NewDash />} />
      <Route path='/nyevent' element={<CreateEventForm />} />
      <Route path='/loan' element={<LoanPage loanId={2} baseUrl={import.meta.env.VITE_API_BASE_URL ?? ""} />} />
      <Route path='/notifications' element={<NotificationsPage />} />
      <Route path='/testpage' element={<TestPage />} />
      <Route path='/game' element={<GamePage />} />
    </Routes>
  </BrowserRouter>
</React.StrictMode>,
)

