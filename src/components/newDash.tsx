import { useEffect } from "react";
import React from "react";
import '../style/newDash.css'
import BottomNav from "./BottomNav";
import { Link } from "react-router-dom";

import notifyBell from '../assets/NotificationBell.png'
import itemIcon from '../assets/Itemsicon.png'

const NewDash: React.FC = () => {

    useEffect(() => {
  document.body.style.backgroundImage = 'none';
  return () => {
    document.body.style.backgroundImage = ''; // tilbakestill når du forlater siden
  };
}, []);

    return (
      <div>
        <section className="top">
            <div className="split">
            <div className="left">
                    <h3 className="welcome-text">Welcome</h3>

                    {/* eller Welcome navnet på brukeren*/}
                    <h1 className="app-title">Porsdash</h1>
                </div>
                <div className="right">
                    <img src={notifyBell} alt="notification bell" style={{ width: '48px', height: '48px' }} />
                </div>
                            </div>
                

                <svg className="wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
                    <path d="M0,90 C240,50 480,0 720,40 C960,80 1200,120 1440,60 L1440,120 L0,120 Z" fill="#ffffff"></path>
                </svg>
                
                </section>

                

                <section className="bottom">
                <div className="column">
                        <Link to="/items" className="dashboard-btn">
                            <p>Booking</p>
                            <img src={itemIcon} alt="item icon" />
                        </Link>
                        <Link to="/dugnad" className="dashboard-btn">
                            <p>Arrangement</p>
                            <img src={itemIcon} alt="item icon" />
                        </Link>
                    

                </div>
                <div className="column">
                    <Link to="/myproducts" className="dashboard-btn">
                        <p>Mine produkter</p>
                        <img src={itemIcon} alt="item icon" />
                        </Link>
                        <Link to="/loan" className="dashboard-btn">
                        <p>Lån</p>
                        <img src={itemIcon} alt="item icon" />
                        </Link>
                    
                </div>
                </section>

            <BottomNav/>
    </div>


    )
};

export default NewDash;