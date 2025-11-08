const express = require("express");
const connectDB = require("./db.js");
const cors = require("cors");
const http = require("http");
const PORT = 5000;
const { initSocket } = require("./socket/index.js");

const app = express();

// CORS Configuration - FIXED
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend requests
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token"], // Added "auth-token"
    credentials: true, // Allow cookies if needed
  })
);

// Manually Handle CORS Preflight Requests - FIXED
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, auth-token"
  );
  res.sendStatus(200);
});

app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

// Routes
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.use("/auth", require("./Routes/auth_routes.js"));
app.use("/user", require("./Routes/userRoutes.js"));
app.use("/message", require("./Routes/message_routes.js"));
app.use("/conversation", require("./Routes/conversation_routes.js"));

// Server setup
const server = http.createServer(app);

// Socket.io setup
initSocket(server);

// Connect to DB before starting the server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server started at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1); // Exit the process if DB connection fails
  });

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});
