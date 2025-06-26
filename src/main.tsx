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
    </Routes>
  </BrowserRouter>
</React.StrictMode>,
)
