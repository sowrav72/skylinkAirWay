require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const flightRoutes = require("./routes/flights");
const bookingRoutes = require("./routes/bookings");
const seatRoutes = require("./routes/seats");
const { ticketRouter, receiptRouter } = require("./routes/tickets");
const notificationRoutes = require("./routes/notifications");
const userRoutes = require("./routes/users");
const analyticsRoutes = require("./routes/analytics");

const app = express();

// CORS — allow deployed frontends (comma-separated in env)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ status: "Airline API running ✈" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/tickets", ticketRouter);
app.use("/api/receipts", receiptRouter);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
