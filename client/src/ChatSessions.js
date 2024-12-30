import React, { useEffect, useState } from "react";
import Header from "./Header";
import axios from "axios";

function ChatSessions() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await axios.get("http://localhost:4000/chat-sessions", { withCredentials: true });
        setSessions(response.data);
      } catch (error) {
        console.error("Error fetching chat sessions:", error);
      }
    }
    fetchSessions();
  }, []);

  function openPopup(session) {
    setSelectedSession(session);
    setPopupVisible(true);
  }

  return (
    <div className="chat-container">
      <Header />
      <br />
      <h2 className="chat-header">Your Chat Sessions</h2>
      <ul className="chat-list">
        {sessions.map((session, index) => (
          <li key={index} className="chat-item" onClick={() => openPopup(session)}>
            <div className="chat-details">
              <p className="chat-first-message">
                <strong>First Message:</strong> {session.firstMessage}
              </p>
              <p className="chat-created-at">
                <strong>Created At:</strong> {new Date(session.createdAt).toLocaleString()}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {popupVisible && (
        <div className="chat-popup">
          <div className="popup-content">
            <h3 className="popup-header">Chat History</h3>
            <div className="chat-history">
              {selectedSession ? (
                <ul className="history-list">
                  {selectedSession.messages.map((message, index) => (
                    <li key={index} className="history-item">
                      <strong className="message-sender">{message.sender}:</strong> {message.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No messages available.</p>
              )}
            </div>
            <button className="close-popup" onClick={() => setPopupVisible(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatSessions;