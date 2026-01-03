// src/pages/LoginPage.tsx
import { useState } from "react";

import { useNavigate } from "react-router-dom";
import "../style/LoginPage.css"; // Ensure you have this CSS file for styling


const LoginPage: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleLogin: (e: React.FormEvent<HTMLFormElement>) => Promise<void>  = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("jwt", data.token);
        navigate("/nydash");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div>

    <div className="login-container">
      <h1 className="login-title">PorsDash</h1>
      <form onSubmit={handleLogin} className="login-form">
        <h2 className="login-heading">Log In</h2>
        {error && <p className="login-error">{error}</p>}
        <input
          type="text"
          placeholder="Username"
          className="login-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          />
        <input
          type="password"
          placeholder="Password"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: '1rem' }} /* matches Tailwind’s mb-4 */
          />
        <button type="submit" className="login-button">
          Log In
        </button>
      </form>
      
    </div>
          </div>
  );
};

export default LoginPage;
