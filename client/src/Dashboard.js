import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Header from "./Header";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faRedo, faTrash, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

function Dashboard() {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [files, setFiles] = useState([]);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [showMemoryPopup, setShowMemoryPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [usageInfo, setUsageInfo] = useState({ usageCount: 0, maxUsage: 10 });
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    async function fetchCsrfToken() {
      const response = await axios.get("http://localhost:4000/csrf-token", { withCredentials: true });
      setCsrfToken(response.data.csrfToken);
    }
    fetchCsrfToken();

    axios.get("http://localhost:4000/dashboard", { withCredentials: true })
      .then(response => {
        setMessage(response.data.message);
        setIsAuthorized(true);
        fetchFiles();
        fetchUsageInfo();
      })
      .catch(() => {
        setMessage("Unauthorized access");
        setIsAuthorized(false);
      });
  }, []);

  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchFiles = async () => {
    try {
      const response = await axios.get("http://localhost:4000/uploads", { withCredentials: true });
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== "application/pdf") {
      setStatusMessage({ text: "Please select a PDF file only.", type: "error" });
      setFile(null);
      e.target.value = null;
    } else {
      setFile(selectedFile);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return setStatusMessage({ text: "Please select a PDF file to upload.", type: "error" });

    setIsUploading(true);
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await axios.post("http://localhost:4000/upload", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data", "CSRF-Token": csrfToken },
      });
      setStatusMessage({ text: response.data.message, type: "success" });
      setFile(null);
      fetchFiles();
    } catch (error) {
      setStatusMessage({ text: "File upload failed.", type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileDelete = async (filename) => {
    try {
      await axios.delete(`http://localhost:4000/uploads/${filename}`, { withCredentials: true, headers: { "CSRF-Token": csrfToken },});
      setStatusMessage({ text: "File deleted successfully.", type: "success" });
      fetchFiles();
    } catch (error) {
      setStatusMessage({ text: "Failed to delete the file.", type: "error" });
    }
  };  

  const fetchUsageInfo = async () => {
    try {
      const response = await axios.get("http://localhost:4000/user", { withCredentials: true });
      setUsageInfo({ usageCount: response.data.usageCount, maxUsage: response.data.maxUsage });
    } catch (error) {
      console.error("Error fetching usage info", error);
    }
  };

  const handleChatMessageSubmit = async (e) => {
    e.preventDefault();
    if (newChatMessage.trim()) {
      const updatedMessages = [...chatMessages, `You: ${newChatMessage}`];
      setChatMessages(updatedMessages);
      const userMessage = newChatMessage;
      setNewChatMessage("");
  
      const sessionMessages = updatedMessages.map((msg) => msg.replace(/^You: |^Bot: /, "").trim());
  
      try {
        const response = await axios.post(
          "http://localhost:4000/send-message",
          { message: userMessage, history: sessionMessages },
          { withCredentials: true, headers: { "CSRF-Token": csrfToken } }
        );
  
        setChatMessages([...updatedMessages, `Bot: ${response.data.response}`]);
  
        if (response.data.memoryUpdated) {
          setShowMemoryPopup(true);
          setTimeout(() => setShowMemoryPopup(false), 3000);
        }
  
        fetchUsageInfo();
      } catch (error) {
        const errorMessage =
          error.response && error.response.data && error.response.data.message
            ? error.response.data.message
            : "Failed to fetch response.";
        setChatMessages([...updatedMessages, `Bot: ${errorMessage}`]);
      }
    }
  };

  return (
    <div className="container">
      <Header />
      {isAuthorized && (
        <div className="dashboard-content">
          <div className="files-section section">
            <h2 className="ubuntu-bold">Your Uploaded Files:</h2>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  <a
                    className="ubuntu-light"
                    href={`http://localhost:4000${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.name}
                  </a>
                  <button
                    className="remove-button ubuntu-light"
                    onClick={() => handleFileDelete(file.name)}
                    disabled={isUploading}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleFileUpload}>
              <div className="file-input-wrapper">
                <label htmlFor="file-input" className="file-input-label ubuntu-regular">
                  Choose File
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <span className="file-name ubuntu-regular-italic">
                  {file ? file.name : "No file chosen"}
                </span>
              </div>
              <button className="ubuntu-light" type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload PDF"}
              </button>
            </form>
            {statusMessage.text && (
              <div className={`status-message ${statusMessage.type}`}>{statusMessage.text}</div>
            )}
          </div>

          <div className="chat-section section">
            <h2 className="ubuntu-bold">Chat</h2>
            <h4 className="ubuntu-regular">
              Requests left: {usageInfo.maxUsage === Infinity ? "Unlimited" : usageInfo.maxUsage - usageInfo.usageCount}
            </h4>
            <ul ref={chatContainerRef}>
              {chatMessages.map((msg, index) => (
                <div key={index} className="chat-message-wrapper">
                  <p className="ubuntu-light chat-message">{msg}</p>
                  {msg.startsWith("You:") && (
                    <button
                      className="copy-button ubuntu-light"
                      onClick={() => {
                        setNewChatMessage(msg.replace("You: ", "").trim());
                      }}
                      disabled={isUploading}
                    >
                      <FontAwesomeIcon icon={faRedo} />
                    </button>
                  )}
                  {msg.startsWith("Bot:") && (
                    <button
                      className="copy-button ubuntu-light"
                      onClick={() => navigator.clipboard.writeText(msg.replace("Bot: ", ""))}
                      disabled={isUploading}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  )}
                </div>
              ))}
            </ul>
            <form onSubmit={handleChatMessageSubmit} className="chat-form">
              <p className="chat-p">
                <input
                  type="text"
                  className="ubuntu-regular"
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type your message here..."
                  disabled={isUploading}
                />
                <button className="ubuntu-light icon-button" type="submit" disabled={isUploading}>
                  <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </p>
            </form>
            {showMemoryPopup && (
              <div className="memory-popup fade-in-out">
                Memory updated
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;