import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import axios from "axios";
import Dashboard from "./Dashboard";
import Register from "./Register";
import Login from "./Login";
import Profile from "./Profile";
import Introduction from "./Introduction";
import ThreeBackground from "./ThreeBackground";
import ChatSessions from "./ChatSessions";
import './css/App.css';
import './css/Typography.css';
import './css/Container.css';
import './css/Overlay.css';
import './css/Forms.css';
import './css/Chat.css';
import './css/Profile.css';
import './css/Buttons.css';
import "./css//ChatSessions.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const checkLoginStatus = async () => {
    try {
      await axios.get("http://localhost:4000/user", { withCredentials: true });
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <div className="App">
      <ThreeBackground />
      <Router>
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Register setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/dashboard" element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/chat-sessions" element={isLoggedIn ? <ChatSessions /> : <Navigate to="/login" />} />
          <Route path="/" element={<Introduction />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;