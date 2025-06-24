import React from "react";
import { useNavigate } from "react-router-dom";
import "../style/backButton.css"

const BackButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="back-button"
    >
      ←
    </button>
  );
};

export default BackButton;