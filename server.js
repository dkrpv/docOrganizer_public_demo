const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("./models/User");
const ChatSession = require("./models/ChatSession");
const { spawn } = require("child_process");
const Joi = require("joi");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");

const app = express();

mongoose.connect("mongodb://localhost:27017/login-app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB connected"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "Strict",
    },
  })
);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(csrf());

const getUserUploadFolder = (userId) => `uploads/${userId}`;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userFolder = getUserUploadFolder(req.session.userId);
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    const userFolder = getUserUploadFolder(req.session.userId);
    const originalName = file.originalname;
    let filename = originalName;
    let counter = 1;
    while (fs.existsSync(path.join(userFolder, filename))) {
      filename = `${path.parse(originalName).name}-${counter}${path.extname(originalName)}`;
      counter += 1;
    }
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function validateUserSession(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await User.findById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Invalid session" });
  }
  req.user = user;
  next();
}

app.post("/register", async (req, res) => {
  // Register a new user
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Username already exists. Please choose a different one." });
    } else {
      console.error(error);
      res.status(500).json({ message: "An error occurred while registering the user." });
    }
  }
});

app.post("/login", async (req, res) => {
  // Login an existing user
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    req.session.userId = user._id;
    res.json({ message: "Login successful" });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.get("/csrf-token", (req, res) => {
  // Retrieve CSRF token for security
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/user", isAuthenticated, async (req, res) => {
  // Get the current authenticated user's details
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.memory === undefined) {
    user.memory = "";
    await user.save();
  }
  const maxUsage = user.getMaxUsage();
  res.json({
    username: user.username,
    tier: user.tier,
    usageCount: user.usageCount,
    maxUsage,
    memory: user.memory,
  });
});

const tierSchema = Joi.object({
  tier: Joi.number().valid(1, 2, 3).required(),
});

app.post("/user/tier", validateUserSession, async (req, res) => {
  // Update the user's subscription tier
  const { error } = tierSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  if (req.user.tier !== req.body.tier) {
    req.user.usageCount = 0;
  }

  req.user.tier = req.body.tier;
  await req.user.save();
  res.json({ message: "Tier updated successfully" });
});

app.post("/user/memory", validateUserSession, async (req, res) => {
  // Update the user's memory with new data
  req.user.memory = req.body.memory;
  await req.user.save();
  res.json({ message: "Memory updated successfully" });
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  // Access the dashboard (authentication required)
  res.json({ message: "Welcome to the dashboard" });
});

app.post("/upload", isAuthenticated, upload.single("document"), (req, res) => {
  // Upload a PDF file and if big vectorize its content
  if (req.file) {
    const filePath = path.join(__dirname, req.file.path);

    const runVectorization = (filePath) =>
      new Promise((resolve, reject) => {
        const process = spawn("python", ["vectorize_pdf.py", filePath]);
        let output = "";
        process.stdout.on("data", (data) => {
          output += data.toString();
        });
        process.stderr.on("data", (err) => {
          console.error(`Error: ${err.toString()}`);
          reject(`Vectorization failed: ${err.toString()}`);
        });
        process.on("close", (code) => {
          if (code === 0 && output.trim() === "0") {
            resolve(null);
          } else if (code === 0) {
            resolve(output.trim());
          } else {
            reject("Vectorization process failed.");
          }
        });
      });

    runVectorization(filePath)
      .then((vectorizedData) => {
        if (vectorizedData === null) {
          res.json({
            message: "File uploaded successfully but not vectorized (too short)",
            file: {
              name: req.file.originalname,
              path: `/uploads/${req.session.userId}/${req.file.filename}`,
            },
          });
        } else {
          const vectorFilePath = filePath + ".vec.json";
          fs.writeFileSync(vectorFilePath, vectorizedData, "utf8");
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`Error deleting original file: ${err}`);
            }
          });

          res.json({
            message: "File uploaded and vectorized successfully",
            file: {
              name: req.file.originalname,
              vectorPath: vectorFilePath,
            },
          });
        }
      })
      .catch((error) => {
        console.error(`Upload Error: ${error}`);
        res.status(500).json({ message: error });
      });
  } else {
    res.status(400).json({ message: "File upload failed" });
  }
});

app.get("/uploads", isAuthenticated, (req, res) => {
  // List all uploaded files for the authenticated user
  const userFolder = getUserUploadFolder(req.session.userId);
  if (fs.existsSync(userFolder)) {
    const files = fs.readdirSync(userFolder).map(file => ({
      name: file,
      path: `/uploads/${req.session.userId}/${file}`,
    }));
    res.json(files);
  } else {
    res.json([]);
  }
});

app.delete("/uploads/:filename", isAuthenticated, (req, res) => {
  // Delete a specific uploaded file
  const userFolder = getUserUploadFolder(req.session.userId);
  const filePath = path.join(userFolder, req.params.filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to delete file" });
      }
      res.json({ message: "File deleted successfully" });
    });
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

const FIVE_MINUTES = 5 * 60 * 1000;

app.post("/send-message", validateUserSession, async (req, res) => {
  // Send a message and receive chatbot response
  const { message } = req.body;

  if (!message) return res.status(400).json({ message: "Message is required" });

  const maxUsage = req.user.getMaxUsage();

  if (req.user.tier !== 3 && req.user.usageCount >= maxUsage) {
    return res.status(403).json({ message: "Usage limit reached for your tier" });
  }

  if (req.user.tier !== 3) {
    req.user.usageCount += 1;
    await req.user.save();
  }

  try {
    
    let chatSession = await ChatSession.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    const now = new Date();

    if (!chatSession || now - chatSession.lastMessageAt > FIVE_MINUTES) {
      chatSession = new ChatSession({
        userId: req.user._id,
        messages: [],
        createdAt: now,
        lastMessageAt: now,
      });
    }

    const runScript = (script, args) =>
      new Promise((resolve, reject) => {
        const process = spawn("python", [script, ...args]);
        let output = "";
        process.stdout.on("data", (data) => {
          output += data.toString();
        });
        process.stderr.on("data", (err) => {
          console.error(`Error in ${script}: ${err.toString()}`);
          reject(`Error processing script ${script}: ${err.toString()}`);
        });
        process.on("close", () => {
          resolve(output.trim());
        });
      });

    const [response, memoryResponse] = await Promise.all([
      runScript("answer.py", [message, req.user._id, req.user.memory || "", ""]),
      runScript("memory.py", [message]),
    ]);

    chatSession.messages.push({ sender: "User", text: message });
    chatSession.messages.push({ sender: "Bot", text: response });
    chatSession.lastMessageAt = now;

    await chatSession.save();

    if (memoryResponse && memoryResponse !== "0") {
      req.user.memory = req.user.memory
        ? `${req.user.memory}\n${memoryResponse}`
        : memoryResponse;
      await req.user.save();
      return res.json({ response, memoryUpdated: true });
    }

    res.json({ response, memoryUpdated: false });
  } catch (error) {
    console.error(`Message Processing Error: ${error.message || error}`);
    res.status(500).json({
      message: "An error occurred while processing the message",
      error: error.message || error,
    });
  }
});

app.get("/chat-sessions", validateUserSession, async (req, res) => {
  // Retrieve chat sessions for the authenticated user
  try {
    const sessions = await ChatSession.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const formattedSessions = sessions.map(session => ({
      firstMessage: session.messages[0]?.text || "",
      createdAt: session.createdAt,
      messages: session.messages,
    }));
    res.json(formattedSessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json({ message: "Failed to fetch chat sessions" });
  }
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});