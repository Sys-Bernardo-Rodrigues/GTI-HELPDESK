import { PrismaClient } from "../generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getDatabaseUrl() {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER || "appuser";
  const pass = process.env.DB_PASSWORD || "apppassword";
  const db   = process.env.DB_NAME || "helpdesk";
  return `mysql://${user}:${pass}@${host}:${port}/${db}?connection_limit=10&pool_timeout=30&socket_timeout=30&connect_timeout=5`;
}

export const prisma = global.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export async function assertDbConnection() {
  await prisma.$queryRaw`SELECT 1`;
}