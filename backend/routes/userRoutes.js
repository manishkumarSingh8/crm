import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requirePermission from "../middleware/permissionMiddleware.js";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  assignRole,
  deleteUser,
  viewPassword,
} from "../controllers/userController.js";

const router = express.Router();

// All user routes are protected:
// authMiddleware  -> checks JWT (401 if not logged in)
// requirePermission -> checks DB permission (403 if no permission)

// Create user (admin assigns a role during creation)
router.post("/", authMiddleware, requirePermission("user.create"), createUser);

// List all users
router.get("/", authMiddleware, requirePermission("user.view"), getUsers);

// Get single user
router.get("/:id", authMiddleware, requirePermission("user.view"), getUser);

// Update user (name, email, password, status)
router.put("/:id", authMiddleware, requirePermission("user.update"), updateUser);

// Assign/change role of a user
router.put(
  "/:id/role",
  authMiddleware,
  requirePermission("user.assign_role"),
  assignRole,
);

// Delete user (safe: deactivates the account)
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("user.delete"),
  deleteUser,
);

// View stored password (Master Admin only)
router.get(
  "/:id/password",
  authMiddleware,
  requirePermission("user.assign_role"),
  viewPassword,
);

export default router;