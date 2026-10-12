import "dotenv/config";

import prisma from "../config/prisma.js";
import { hashPassword } from "../utils/password.js";
import { encryptPassword } from "../utils/passwordCrypto.js";

// This file is ONLY for initial/bootstrap setup.
// Normal users must be created through the protected API.

// All permissions in the system
const PERMISSIONS = [
  // user module
  { code: "user.view", name: "View Users", module: "user", action: "view" },
  { code: "user.create", name: "Create User", module: "user", action: "create" },
  { code: "user.update", name: "Update User", module: "user", action: "update" },
  { code: "user.delete", name: "Delete User", module: "user", action: "delete" },
  { code: "user.assign_role", name: "Assign Role", module: "user", action: "assign_role" },

  // vendor module
  { code: "vendor.view", name: "View Vendors", module: "vendor", action: "view" },
  { code: "vendor.create", name: "Create Vendor", module: "vendor", action: "create" },
  { code: "vendor.update", name: "Update Vendor", module: "vendor", action: "update" },
  { code: "vendor.delete", name: "Delete Vendor", module: "vendor", action: "delete" },

  // purchase module
  { code: "purchase.view", name: "View Purchases", module: "purchase", action: "view" },
  { code: "purchase.create", name: "Create Purchase", module: "purchase", action: "create" },
  { code: "purchase.update", name: "Update Purchase", module: "purchase", action: "update" },
  { code: "purchase.approve", name: "Approve Purchase", module: "purchase", action: "approve" },

  // grn module
  { code: "grn.view", name: "View GRNs", module: "grn", action: "view" },
  { code: "grn.create", name: "Create GRN", module: "grn", action: "create" },
  { code: "grn.update", name: "Update GRN", module: "grn", action: "update" },
  { code: "grn.approve", name: "Approve GRN", module: "grn", action: "approve" },

  // inventory module
  { code: "inventory.view", name: "View Inventory", module: "inventory", action: "view" },
  { code: "inventory.create", name: "Create Inventory", module: "inventory", action: "create" },
  { code: "inventory.update", name: "Update Inventory", module: "inventory", action: "update" },

  // sales module
  { code: "sales.view", name: "View Sales", module: "sales", action: "view" },
  { code: "sales.create", name: "Create Sale", module: "sales", action: "create" },
  { code: "sales.update", name: "Update Sale", module: "sales", action: "update" },
  { code: "sales.approve", name: "Approve Sale", module: "sales", action: "approve" },

  // production module
  { code: "production.view", name: "View Production", module: "production", action: "view" },
  { code: "production.create", name: "Create Production", module: "production", action: "create" },
  { code: "production.update", name: "Update Production", module: "production", action: "update" },

  // dispatch module
  { code: "dispatch.view", name: "View Dispatch", module: "dispatch", action: "view" },
  { code: "dispatch.create", name: "Create Dispatch", module: "dispatch", action: "create" },
  { code: "dispatch.update", name: "Update Dispatch", module: "dispatch", action: "update" },

  // accounts module
  { code: "accounts.view", name: "View Accounts", module: "accounts", action: "view" },
  { code: "accounts.create", name: "Create Account", module: "accounts", action: "create" },
  { code: "accounts.update", name: "Update Account", module: "accounts", action: "update" },
];

// Which permissions each role gets
// MASTER_ADMIN : full system access (all permissions)
// SUPER_ADMIN  : admin + business access (everything except user.assign_role)
// USER         : normal view-only access
const ROLE_PERMISSIONS = {
  MASTER_ADMIN: PERMISSIONS.map((p) => p.code),

  SUPER_ADMIN: PERMISSIONS.filter((p) => p.code !== "user.assign_role").map(
    (p) => p.code,
  ),

  USER: [
    "vendor.view",
    "purchase.view",
    "grn.view",
    "inventory.view",
    "sales.view",
    "production.view",
    "dispatch.view",
    "accounts.view",
  ],
};

async function main() {
  // 1. Create roles (only 3 roles now)
  const roles = [
    { name: "MASTER_ADMIN", description: "Full system access" },
    { name: "SUPER_ADMIN", description: "Administrative and business access" },
    { name: "USER", description: "Normal user access" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  // 2. Create permissions
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }

  // 3. Attach permissions to roles (RolePermission table)
  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });

    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUnique({
        where: { code },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  // 4. Create the initial Master Admin
  const masterRole = await prisma.role.findUnique({
    where: { name: "MASTER_ADMIN" },
  });

  const masterAdmin = await prisma.user.upsert({
    where: { email: "admin@shreenath.com" },
    update: {},
    create: {
      name: "Master Admin",
      email: "admin@shreenath.com",
      passwordHash: await hashPassword("Admin@123"),
      passwordEncrypted: encryptPassword("Admin@123"),
      status: "ACTIVE",
      phoneNumber: "9999999999",
      roleName: masterRole.name,
      roleId: masterRole.id,
    },
  });

  console.log("Seed completed successfully");
  console.log("Roles: MASTER_ADMIN, SUPER_ADMIN, USER");
  console.log("Permissions created:", PERMISSIONS.length);
  console.log("Master Admin -> admin@shreenath.com / Admin@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });