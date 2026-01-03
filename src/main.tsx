
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route} from 'react-router-dom'
import HelloPage from './pages/HelloPage.tsx'
import LoginPage from "../src/pages/LoginPage.tsx"
import Dashboard from './pages/Dashboard.tsx'
import "./index.css";
import ProfilePage from './pages/ProfilePage.tsx'
import './style/variables.css'
import ItemPage from './pages/ItemPage.tsx'
import MyProductsPage from './pages/MyProductsPage.tsx'
import ItemDetailPage from './pages/ItemDetailPage.tsx'
import DugnadPage from './pages/Dugnad.tsx'
import EventDetail from './components/EventDetail.tsx'
import NewDash from './components/newDash.tsx'

import { registerSW } from 'virtual:pwa-register';
import CreateEventForm from './components/CreateEvent.tsx'
import ShoppingLists from './pages/ShoppingLists.tsx'



registerSW({
  onRegistered(r: ServiceWorkerRegistration | undefined) {
    // r is the service worker registration object
    // you could hold onto it to force an update later
    console.log('Service worker registered:', r);
  },
  onNeedRefresh() {
    // called when a new version of the SW + assets is available
    // you might show a “New version available” banner here
    console.log('New version available – please refresh');
  },
  onOfflineReady() {
    // called when the app is fully cached for offline use
    console.log('App ready for offline use');
  }
});

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
      <Route path='/dugnad' element={<DugnadPage/>} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path='/events/new' element={<CreateEventForm />} />
      <Route path='/handlelister' element={<ShoppingLists />} />
      <Route path='/nydash' element={<NewDash />} />
      <Route path='/nyevent' element={<CreateEventForm />} />
    </Routes>
  </BrowserRouter>
</React.StrictMode>,
)
