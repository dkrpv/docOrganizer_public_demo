import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Login({ setIsLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [loginError, setLoginError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchCsrfToken() {
      const response = await axios.get("http://localhost:4000/csrf-token", {
        withCredentials: true,
      });
      setCsrfToken(response.data.csrfToken);
    }
    fetchCsrfToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      await axios.post(
        "http://localhost:4000/login",
        { username, password },
        { headers: { "CSRF-Token": csrfToken }, withCredentials: true }
      );
      setIsLoggedIn(true);
      navigate("/dashboard");
    } catch (error) {
      if (error.response && error.response.data.message) {
        setLoginError(error.response.data.message);
      } else {
        setLoginError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="ubuntu-bold">Login</h2>
        <input
          type="text"
          className="ubuntu-regular"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="ubuntu-regular"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {loginError && <p className="ubuntu-regular" style={{ color: "red" }}>{loginError}</p>}
        <button className="ubuntu-regular" type="submit">Login</button>
        <p className="ubuntu-regular">
          Don't have an account? <Link className="ubuntu-regular" to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;