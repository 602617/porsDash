import React from 'react';
import { Link } from 'react-router-dom';
import "../style/HelloPage.css"

const HelloPage: React.FC = () => {



return (
    <div className="login-container">
    <div className="login-hero">
      <h1 className="login-title">PorsDash</h1>

      <Link to="/login" className="login-cta">
        Log In
      </Link>
    </div>
  </div>
)
};

export default HelloPage;