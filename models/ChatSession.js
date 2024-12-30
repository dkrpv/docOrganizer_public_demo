const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  messages: [{ sender: String, text: String }],
  createdAt: { type: Date, default: Date.now },
  lastMessageAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);