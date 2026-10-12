import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requirePermission from "../middleware/permissionMiddleware.js";
import {
  getRoles,
  getPermissions,
  updateRole,
} from "../controllers/roleController.js";

const router = express.Router();

// List roles (with their permissions)
router.get("/roles", authMiddleware, requirePermission("user.view"), getRoles);

// Update a role (Master Admin only)
router.put(
  "/roles/:id",
  authMiddleware,
  requirePermission("user.assign_role"),
  updateRole,
);

// List all permissions
router.get(
  "/permissions",
  authMiddleware,
  requirePermission("user.view"),
  getPermissions,
);

export default router;