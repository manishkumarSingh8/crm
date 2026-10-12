import express from "express";
import { login, me, logout } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: login
router.post("/login", login);

// Protected: get logged-in user
router.get("/me", authMiddleware, me);

// Logout (clears cookie)
router.post("/logout", logout);

export default router;