import React, { useEffect, useState } from "react";
import axios from "axios";
import BackButton from "./BackButton";

function Profile() {
  const [username, setUsername] = useState("");
  const [tier, setTier] = useState(1);
  const [usageInfo, setUsageInfo] = useState({ usageCount: 0, maxUsage: 10 });
  const [tierChangeMessage, setTierChangeMessage] = useState("");
  const [memory, setMemory] = useState("");
  const [memoryUpdateMessage, setMemoryUpdateMessage] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCsrfToken() {
      const response = await axios.get("http://localhost:4000/csrf-token", {
        withCredentials: true,
      });
      setCsrfToken(response.data.csrfToken);
    }
    fetchCsrfToken();
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get("http://localhost:4000/user", {
        withCredentials: true,
      });
      setUsername(response.data.username);
      setTier(response.data.tier);
      setUsageInfo({
        usageCount: response.data.usageCount,
        maxUsage: response.data.maxUsage,
      });
      setMemory(response.data.memory);
    } catch (error) {
      console.error("Error fetching user data", error);
    }
  };

  const handleTierChange = async (newTier) => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:4000/user/tier",
        { tier: newTier },
        {
          withCredentials: true,
          headers: { "CSRF-Token": csrfToken },
        }
      );
      setTier(newTier);
      setTierChangeMessage(response.data.message);
      fetchUserData();
      setIsPopupOpen(false);
    } catch (error) {
      if (!error.response) {
        setTierChangeMessage("Network error. Please check your connection.");
      } else {
        setTierChangeMessage("Failed to update tier. Try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryChange = async (e) => {
    const newMemory = e.target.value;
  
    if (newMemory.length <= 500) {
      setMemory(newMemory);
      try {
        const response = await axios.post(
          "http://localhost:4000/user/memory",
          { memory: newMemory },
          {
            withCredentials: true,
            headers: { "CSRF-Token": csrfToken },
          }
        );
        setMemoryUpdateMessage(response.data.message);
      } catch (error) {
        console.error("Error updating memory", error);
        setMemoryUpdateMessage("Failed to update memory");
      }
    } else {
      setMemoryUpdateMessage("Memory input exceeds the limit of 500 characters.");
    }
  };

  return (
    <div className="profile-container">
      <h2 className="profile-header ubuntu-bold">
        <BackButton /> Profile
      </h2>
      <p className="profile-info ubuntu-regular">Username: {username}</p>
      <p className="profile-info ubuntu-regular">Tier: {tier}</p>
      <p className="profile-info ubuntu-regular">
        Usage left:{" "}
        <span className="usage-info ubuntu-regular">
          {usageInfo.maxUsage === Infinity
            ? "Unlimited"
            : usageInfo.maxUsage - usageInfo.usageCount}
        </span>
      </p>
      <div className="tier-popup-trigger">
        <button
          aria-label="Change Tier"
          onClick={() => setIsPopupOpen(true)}
          className="change-tier-button"
        >
          Change Tier
        </button>
      </div>
      {isPopupOpen && (
        <div
          className="tier-popup"
          role="dialog"
          aria-labelledby="tier-popup-title"
          aria-describedby="tier-popup-description"
        >
          <div className="popup-content">
            <button
              className="close-popup"
              aria-label="Close Tier Selection Popup"
              onClick={() => setIsPopupOpen(false)}
            >
              ×
            </button>
            <h3 id="tier-popup-title">Select a Tier</h3>
            <p id="tier-popup-description">Choose your preferred subscription tier.</p>
            <div className="tier-cards">
              {[1, 2, 3].map((tierOption) => (
                <div
                  key={tierOption}
                  className={`tier-card ${tier === tierOption ? "selected" : ""}`}
                  onClick={() => handleTierChange(tierOption)}
                >
                  <h4>Tier {tierOption}</h4>
                  <p>
                    {tierOption === 1 ? "10 usages" : tierOption === 2 ? "100 usages" : "Unlimited"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {tierChangeMessage && (
        <p
          className={`ubuntu-regular tier-message ${
            tierChangeMessage.includes("Failed") ? "error" : ""
          }`}
        >
          {tierChangeMessage}
        </p>
      )}
      <div className="memory-container">
        <label className="ubuntu-regular" htmlFor="memory-input">
          Memory:
        </label>
        <textarea
          id="memory-input"
          className="memory-textarea ubuntu-regular"
          value={memory}
          onChange={handleMemoryChange}
          rows="4"
          cols="50"
          maxLength="500"
        />
        <p className="character-count">{memory.length} / 500</p>
      </div>
      {memoryUpdateMessage && (
        <p
          className={`ubuntu-regular memory-update-message ${
            memoryUpdateMessage.includes("Failed") ? "error" : ""
          }`}
        >
          {memoryUpdateMessage}
        </p>
      )}
    </div>
  );
}

export default Profile;