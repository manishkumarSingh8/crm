import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Single shared Prisma client for the whole app
// (server.js, controllers, middleware and seedAdmin all reuse this)
const adapter = new PrismaMariaDb({
  host: "localhost",
  user: "root",
  password: "",
  database: "shreenath_erp",
  port: 3306,
});

const prisma = new PrismaClient({ adapter });

export default prisma;