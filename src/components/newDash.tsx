import { useEffect } from "react";
import React from "react";
import "../style/LoanPage.css";
import "../style/newDash.css";
import BottomNav from "./BottomNav";
import { Link } from "react-router-dom";

import notifyBell from "../assets/NotificationBell.png";

const NewDash: React.FC = () => {
  useEffect(() => {
    document.body.style.backgroundImage = "none";
    return () => {
      document.body.style.backgroundImage = ""; // tilbakestill når du forlater siden
    };
  }, []);

  return (
    <div>
      <div className="bgGlow" />
      <section className="top">
        <div className="split">
          <div className="left">
            
            

            {/* eller Welcome navnet p? brukeren*/}
            <h1 className="app-title">Porsdash</h1>
            <div className="ownerLine">
              <span className="rolePill">
                <span className="roleIcon">P</span>
                <span className="roleLabel">Poeng</span>
                <span className="roleName">100</span>
              </span>
            
            </div>
          </div>
          <div className="right">
            <img src={notifyBell} alt="Notifications" style={{ width: "48px", height: "48px" }} />
          </div>
        </div>

        <svg className="wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,90 C240,50 480,0 720,40 C960,80 1200,120 1440,60 L1440,120 L0,120 Z" fill="#ffffff"></path>
        </svg>
      </section>

      <section className="bottom">
        <div className="column">
          <Link to="/items" className="dashboard-btn" style={{ animationDelay: "80ms" }}>
            <p>Booking</p>
            <span className="dashIcon roleIcon" aria-hidden="true">B</span>
          </Link>
          <Link to="/dugnad" className="dashboard-btn" style={{ animationDelay: "160ms" }}>
            <p>Arrangement</p>
            <span className="dashIcon roleIcon" aria-hidden="true">A</span>
          </Link>
        </div>
        <div className="column">
          <Link to="/myproducts" className="dashboard-btn" style={{ animationDelay: "240ms" }}>
            <p>Mine produkter</p>
            <span className="dashIcon roleIcon" aria-hidden="true">M</span>
          </Link>
          <Link to="/loan" className="dashboard-btn" style={{ animationDelay: "320ms" }}>
            <p>Lån</p>
            <span className="dashIcon roleIcon" aria-hidden="true">L</span>
          </Link>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default NewDash;
