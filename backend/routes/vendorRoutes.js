import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import requirePermission from "../middleware/permissionMiddleware.js";
import {
  createVendor,
  updateVendor,
  deleteVendor,
  getVendors,
} from "../controllers/vendorController.js";

const router = express.Router();

// Vendor routes (preserved from earlier version, now permission-protected)
router.post(
  "/",
  authMiddleware,
  requirePermission("vendor.create"),
  createVendor,
);

// Update vendor
router.put(
  "/:id",
  authMiddleware,
  requirePermission("vendor.update"),
  updateVendor,
);

// Delete vendor
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("vendor.delete"),
  deleteVendor,
);

router.get("/", authMiddleware, requirePermission("vendor.view"), getVendors);

export default router;