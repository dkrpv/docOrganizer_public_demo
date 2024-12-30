const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tier: { type: Number, default: 1, min: 1, max: 3 },
  usageCount: { type: Number, default: 0 },
  memory: { type: String, default: "" },
});

userSchema.methods.getMaxUsage = function() {
  return this.tier === 1 ? 10 : this.tier === 2 ? 100 : Infinity;
};

module.exports = mongoose.model("User", userSchema);