// Audit service: simple helper to write audit log entries.
// Safe to import from any controller without changing existing logic.

import prisma from "../config/prisma.js";

// Log an action performed by a user.
// userId is optional: if not provided, the record is still written with userId = null.
const logAudit = async ({ userId, action, module, description }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        module,
        description: description ?? null,
      },
    });
  } catch (error) {
    // Never let audit logging break the main request
    console.error("Audit log failed:", error.message);
  }
};

export default logAudit;
