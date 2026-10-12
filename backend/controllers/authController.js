import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import logAudit from "../services/auditService.js";
import { verifyPassword } from "../utils/password.js";

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email (with role)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });

    // 2. Check user exists
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 2b. Check account is active
    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Your account is deactivated. Contact your admin.",
      });
    }

    // 3. Check password with scrypt
    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 4. Create JWT (secret comes from .env)
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // 5. Save JWT in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // local development
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 6. Return user info (never return passwordHash)
    // Audit: record the login action before responding
    await logAudit({
      userId: user.id,
      action: "LOGIN",
      module: "Auth",
      description: `User "${user.email}" logged in`,
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role
          ? { id: user.role.id, name: user.role.name }
          : null,
        // roles: user.role ? [user.role.name] : [],
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// GET /api/auth/me (protected by authMiddleware)
const me = async (req, res) => {
  try {
    // req.userId was set by authMiddleware
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      message: "Authenticated user",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role
          ? { id: user.role.id, name: user.role.name }
          : null,
        // roles: user.role ? [user.role.name] : [],
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get user",
      error: error.message,
    });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    // Clear the JWT cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Logout failed",
      error: error.message,
    });
  }
};

export { login, me, logout };