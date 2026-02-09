// src/pages/Dashboard.tsx
import React from "react";
import Topbar from "../components/TopBar";
import { Link } from "react-router-dom";
import "../style/dashboard.css";        // ✅ Import CSS her
import ProfileIcon from "../assets/ProfileIcon.png"
import ItemsIcon from "../assets/Itemsicon.png"
import MyProductsIcon from "../assets/MyProductsIcon.png"
import DugnadIcon from "../assets/DugnadIcon.png"
import ShoppingIcon from "../assets/ShoppingIcon.png"

const Dashboard: React.FC = () => {
  return (
    <div>
      <Topbar />

      <main style={{ padding: "1rem" }}>
        <div className="dashboard-buttons-container">
      <h2 className="dashboard-title">Mitt Dashboard</h2>
      <div className="dashboard-buttons">
        <Link to="/items" className="dashboard-button">
        <img src={ItemsIcon} alt="Items" className="icon"/>
        Items
        </Link>
        <Link to="/profile" className="dashboard-button">
        <img src={ProfileIcon} alt="Items" className="icon"/>
        Profile
        </Link>
        <Link to="/myproducts" className="dashboard-button">
        <img src={MyProductsIcon} alt="Items" className="icon"/>
        My Products
        </Link>
        <Link to="/dugnad" className="dashboard-button">
        <img src={DugnadIcon} alt="Items" className="icon" />
        Arrangement
        </Link>
        <Link to="/handlelister" className="dashboard-button">
        <img src={ShoppingIcon} alt="Items" className="icon" />
        Handleliste
        </Link>
        <Link to="/loan" className="dashboard-button">
        <img src={ShoppingIcon} alt="Items" className="icon" />
        Lån
        </Link>
      </div>
    </div>
      </main>
    </div>
  );
};

export default Dashboard;
