import React from 'react';
import { Link } from 'react-router-dom';
import "../style/HelloPage.css"

const HelloPage: React.FC = () => {



return (
    <div className="login-screen">
    
    <Link to="/login" className="login-link">
      Log In
    </Link>
  </div>
)
};

export default HelloPage;