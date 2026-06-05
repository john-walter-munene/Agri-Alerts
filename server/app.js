require("dotenv").config();
const express = require("express");
const cors = require("cors");

const farmerRoutes = require("./routes/farmer.routes");
const healthRoutes = require("./routes/health.routes");

const errorHandler = require("./errors/error.js");

const app = express();

// --- CORS ---
// Allowed origins driven by env so prod can be tight while dev stays open.
// CORS_ORIGIN can be a single origin or a comma-separated list.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser tools (curl, server-to-server) where origin is undefined.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
  })
);

app.use(express.json());

// --- Tiny request logger (no extra dep; pino lands in Phase 2 per spec) ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Routers
app.use("/api/farmers", farmerRoutes);
app.use("/api/health", healthRoutes);

// Everything else => 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 AgriAlert API running on port ${PORT}`);
});