import prisma from "../config/prisma.js";
import logAudit from "../services/auditService.js";

// GET /api/roles
// Returns all roles with their permission codes
const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    res.json({
      message: "Roles list",
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        usersCount: role._count.users,
        permissions: role.rolePermissions.map((rp) => rp.permission.code),
      })),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get roles",
      error: error.message,
    });
  }
};

// GET /api/permissions
// Returns all permissions in the system
const getPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    res.json({
      message: "Permissions list",
      permissions,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get permissions",
      error: error.message,
    });
  }
};

// PUT /api/roles/:id
// Updates a role's name and/or description.
// Name is always stored UPPERCASE with underscores (e.g. "super admin" -> "SUPER_ADMIN").
const updateRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description } = req.body;

    // 1. Role must exist
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 2. Normalize the new name: uppercase + underscores
    const newName = name
      ? name.trim().toUpperCase().replace(/\s+/g, "_")
      : role.name;

    // 3. If the name changed, ensure it is not already taken by another role
    if (newName !== role.name) {
      const nameTaken = await prisma.role.findUnique({
        where: { name: newName },
      });
      if (nameTaken) {
        return res.status(409).json({
          message: "Role name already exists",
        });
      }
    }

    // 4. Update role + sync roleName on all users assigned to this role
    const updated = await prisma.$transaction(async (tx) => {
      const updatedRole = await tx.role.update({
        where: { id },
        data: {
          name: newName,
          description:
            description !== undefined ? description : role.description,
        },
      });
      if (newName !== role.name) {
        await tx.user.updateMany({
          where: { roleId: id },
          data: { roleName: newName, updatedById: req.userId },
        });
      }

      return updatedRole;
    });

    // 5. Audit log
    await logAudit({
      userId: req.userId,
      action: "UPDATE",
      module: "Role",
      description: `Role renamed from "${role.name}" to "${updated.name}"`,
    });

    res.json({
      message: "Role updated successfully",
      role: updated,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update role",
      error: error.message,
    });
  }
};

export { getRoles, getPermissions, updateRole };
