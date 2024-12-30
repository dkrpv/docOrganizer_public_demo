import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import BackButton from "./BackButton";

function Header() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    axios.get("http://localhost:4000/user", { withCredentials: true })
      .then(response => setUsername(response.data.username))
      .catch(() => setUsername(""));
  }, []);

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px",
        background: "#f5f5f5",
        border: "1px solid rgba(0, 0, 0, 0.5)",
        borderRadius: "12px"
      }}
    >
      <h2 className="ubuntu-bold"><BackButton />docOrganizer</h2>
      {username && (
        <p className="ubuntu-light">
          Logged in as: <Link to="/profile" style={{ textDecoration: "underline", color: "blue" }}>{username}</Link>!
        </p>
      )}
      <p className="ubuntu-light">
          <Link to="/chat-sessions" style={{ color: "blue" }}>Chat History</Link>
        </p>
    </header>
  );
}

export default Header;