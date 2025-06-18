// src/pages/Dashboard.tsx
import React from "react";
import Topbar from "../components/TopBar";
import { Link } from "react-router-dom";
import "../style/dashboard.css"


const Dashboard: React.FC = () => {
  

  return (
    <div>
      <Topbar/>
      <main style={{ padding: '1rem' }}>
        <h1>Welcome to the Home Page</h1>
        <p>This is where your content goes.</p>
        <Link to="/items" className="product-button">Finn produkt</Link>
      </main>
    </div>
    

  );
};

export default Dashboard;
