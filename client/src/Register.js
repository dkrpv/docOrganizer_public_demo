import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

function Register({ setIsLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
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
    setApiError("");

    const passwordRegex = /[0-9]/;
    if (!passwordRegex.test(password)) {
      setPasswordError("Password must contain at least one number.");
      return;
    } else {
      setPasswordError("");
    }

    try {
      await axios.post(
        "http://localhost:4000/register",
        { username, password },
        { headers: { "CSRF-Token": csrfToken }, withCredentials: true }
      );
      await axios.post(
        "http://localhost:4000/login",
        { username, password },
        { headers: { "CSRF-Token": csrfToken }, withCredentials: true }
      );
      setIsLoggedIn(true);
      navigate("/dashboard");
    } catch (error) {
      if (error.response && error.response.data.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div>
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="ubuntu-bold">Register</h2>
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
        {passwordError && <p className="ubuntu-regular" style={{ color: "red" }}>{passwordError}</p>}
        {apiError && <p className="ubuntu-regular" style={{ color: "red" }}>{apiError}</p>}
        <button className="ubuntu-regular" type="submit">Register</button>
        <p className="ubuntu-regular">
          Already have an account? <Link className="ubuntu-regular" to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;