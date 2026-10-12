import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Shared Prisma client (Prisma 7 + MariaDB adapter)
import prisma from "../config/prisma.js";

// Route files
import authRoutes from "../routes/authRoutes.js";
import userRoutes from "../routes/userRoutes.js";
import adminRoutes from "../routes/adminRoutes.js";
import vendorRoutes from "../routes/vendorRoutes.js";

const app = express();

// Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "SHREE NATH ERP Backend is running",
  });
});

// Routes (separated into route files)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api", adminRoutes); // /api/roles, /api/permissions
app.use("/api/vendors", vendorRoutes);

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
