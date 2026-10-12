import prisma from "../config/prisma.js";

// Permission middleware 
// Usage: router.post("/", authMiddleware, requirePermission("user.create"), controller)
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      // 1. Find the logged-in user with their role and that role's permissions
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // 2. Account deactivated or not found
      if (!user || user.status !== "ACTIVE") {
        return res.status(403).json({
          message: "Account is deactivated",
        });
      }

      // 3. Collect all permission codes from the user's role
      const permissionCodes = [];
      if (user.role) {
        for (const rp of user.role.rolePermissions) {
          permissionCodes.push(rp.permission.code);
        }
      }

      // 4. Allow if the requested permission exists
      if (permissionCodes.includes(permissionCode)) {
        return next();
      }

      // 5. Otherwise deny (logged in, but no permission)
      return res.status(403).json({
        message: "Forbidden: you do not have permission to do this",
        permission: permissionCode,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        message: "Permission check failed",
        error: error.message,
      });
    }
  };
};

export default requirePermission;