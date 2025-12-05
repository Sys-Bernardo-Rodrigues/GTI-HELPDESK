import { PrismaClient } from "../generated/prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getDatabaseUrl() {
  // Se DATABASE_URL já estiver definida, use ela diretamente
  const directUrl = process.env.DATABASE_URL;
  if (directUrl && directUrl.trim().length > 0) {
    return directUrl;
  }

  // Caso contrário, construir a partir de variáveis individuais
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const user = process.env.DB_USER || "appuser";
  const pass = process.env.DB_PASSWORD || "apppassword";
  const db   = process.env.DB_NAME || "helpdesk";

  // Detectar tipo de banco pela porta ou variável de ambiente
  // Porta 5432 = PostgreSQL, outras = MySQL/MariaDB
  const isPostgreSQL = port === "5432" || process.env.DB_TYPE === "postgresql";

  if (isPostgreSQL) {
    // URL para PostgreSQL
    return `postgresql://${user}:${pass}@${host}:${port}/${db}?schema=public&connection_limit=10&pool_timeout=30&connect_timeout=5`;
  } else {
    // URL para MySQL/MariaDB
    return `mysql://${user}:${pass}@${host}:${port}/${db}?connection_limit=10&pool_timeout=30&socket_timeout=30&connect_timeout=5`;
  }
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