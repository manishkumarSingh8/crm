import prisma from "../config/prisma.js";
import logAudit from "../services/auditService.js";
import { hashPassword } from "../utils/password.js";
import { encryptPassword, decryptPassword } from "../utils/passwordCrypto.js";

// Light include for list endpoints (no permissions/audit history)
const userListInclude = {
  role: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
};

// Ye sab data har query me chahiye (role with permissions, kisne banaya, kisne update kiya, audit history)
const userInclude = {
  role: {
    select: {
      id: true,
      name: true,
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  },
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  auditLogs: {
    select: { id: true, action: true, module: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  },
};

// Helper: user data without passwordHash
function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    roleName: user.roleName,
    status: user.status,
    roleId: user.role ? user.role.id : null,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.rolePermissions
            ? user.role.rolePermissions.map((rp) => rp.permission.code)
            : [],
        }
      : null,
    createdBy: user.createdBy,
    updatedBy: user.updatedBy,
    auditHistory: user.auditLogs || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Helper: kya ye user MASTER_ADMIN hai?
async function isMasterAdmin(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: { name: "MASTER_ADMIN" } },
  });
  return Boolean(user);
}

// POST /api/users  (permission: user.create)
const createUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, roleId } = req.body;

    if (!name || !email || !password || !phoneNumber || !roleId) {
      return res.status(400).json({
        message: "Name, email, password, phone number and role are required",
      });
    }

    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const phoneTaken = await prisma.user.findUnique({ where: { phoneNumber } });
    if (phoneTaken) {
      return res.status(409).json({ message: "Phone number already exists" });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "MASTER_ADMIN" && !(await isMasterAdmin(req.userId))) {
      return res.status(403).json({
        message: "Only Master Admin can assign the MASTER_ADMIN role",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phoneNumber,
        passwordHash,
        passwordEncrypted: encryptPassword(password),
        status: "ACTIVE",
        roleName: role.name,
        roleId: role.id,
        createdById: req.userId,
      },
      include: userInclude,
    });

    // Audit: who created this user
    await logAudit({
      userId: req.userId,
      action: "CREATE",
      module: "User",
      description: `User "${user.email}" created with role "${role.name}"`,
    });

    res.status(201).json({
      message: "User created successfully",
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// GET /api/users  (permission: user.view)
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: userListInclude,
      orderBy: { id: "asc" },
    });

    res.json({
      message: "Users list",
      users: users.map(formatUser),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to get users",
      error: error.message,
    });
  }
};

// GET /api/users/:id  (permission: user.view)
const getUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: userInclude,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User details",
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to get user",
      error: error.message,
    });
  }
};

// PUT /api/users/:id  (permission: user.update)
const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, password, phoneNumber, status } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      (await isMasterAdmin(existingUser.id)) &&
      !(await isMasterAdmin(req.userId))
    ) {
      return res.status(403).json({
        message: "Only Master Admin can modify Master Admin accounts",
      });
    }

    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      const phoneTaken = await prisma.user.findUnique({
        where: { phoneNumber },
      });
      if (phoneTaken) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    const data = { updatedById: req.userId };
    if (name) data.name = name;
    if (email) data.email = email;
    if (phoneNumber) data.phoneNumber = phoneNumber;
    if (status) data.status = status;
    if (password) {
      data.passwordHash = await hashPassword(password);
      data.passwordEncrypted = encryptPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });

    // Audit: who updated this user
    await logAudit({
      userId: req.userId,
      action: "UPDATE",
      module: "User",
      description: `User "${user.email}" updated by admin`,
    });

    res.json({
      message: "User updated successfully",
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// PUT /api/users/:id/role  (permission: user.assign_role)
const assignRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: "Role is required" });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "MASTER_ADMIN" && !(await isMasterAdmin(req.userId))) {
      return res.status(403).json({
        message: "Only Master Admin can assign the MASTER_ADMIN role",
      });
    }

    if ((await isMasterAdmin(user.id)) && !(await isMasterAdmin(req.userId))) {
      return res.status(403).json({
        message: "Only Master Admin can change Master Admin roles",
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleName: role.name, roleId: role.id, updatedById: req.userId },
      include: userInclude,
    });

    // Audit: who assigned this role
    await logAudit({
      userId: req.userId,
      action: "ASSIGN_ROLE",
      module: "User",
      description: `Role "${role.name}" assigned to user "${updated.email}"`,
    });

    res.json({
      message: "Role assigned successfully",
      user: formatUser(updated),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to assign role",
      error: error.message,
    });
  }
};

// DELETE /api/users/:id  (permission: user.delete)
// Safe delete: user ko INACTIVE kar deta hai
const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.id === req.userId) {
      return res.status(403).json({
        message: "You cannot deactivate your own account",
      });
    }

    if ((await isMasterAdmin(user.id)) && !(await isMasterAdmin(req.userId))) {
      return res.status(403).json({
        message: "Only Master Admin can deactivate Master Admin accounts",
      });
    }

    await prisma.user.update({
      where: { id },
      data: { status: "INACTIVE", updatedById: req.userId },
    });

    // Audit: who deactivated this user
    await logAudit({
      userId: req.userId,
      action: "DEACTIVATE",
      module: "User",
      description: `User "${user.email}" deactivated by admin`,
    });

    res.json({ message: "User deactivated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// GET /api/users/:id/password  (permission: user.assign_role)
// Only Master Admin may view a stored password.
const viewPassword = async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Only Master Admin may access this endpoint
    if (!(await isMasterAdmin(req.userId))) {
      return res.status(403).json({
        message: "Only Master Admin can view passwords",
      });
    }

    // 2. User must exist
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3. Password must be available
    if (!user.passwordEncrypted) {
      return res.status(404).json({
        message: "Password not available for this user",
      });
    }

    // 4. Decrypt and return the password
    const password = decryptPassword(user.passwordEncrypted);

    await logAudit({
      userId: req.userId,
      action: "VIEW_PASSWORD",
      module: "User",
      description: `Password of "${user.email}" viewed`,
    });

    res.json({
      message: "Password retrieved",
      email: user.email,
      password,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to retrieve password",
      error: error.message,
    });
  }
};

export { createUser, getUsers, getUser, updateUser, assignRole, deleteUser, viewPassword };