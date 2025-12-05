import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Obtém a URL de conexão do banco de dados
 * Prioridade:
 * 1. DATABASE_URL (se definida diretamente)
 * 2. Construção a partir de variáveis individuais (DB_HOST, DB_USER, etc.)
 */
function getDatabaseUrl(): string {
  // Se DATABASE_URL já estiver definida, use ela diretamente
  const directUrl = process.env.DATABASE_URL;
  if (directUrl && directUrl.trim().length > 0) {
    return directUrl;
  }

  // Caso contrário, construir a partir de variáveis individuais
  const DB_HOST = env("DB_HOST") || "localhost";
  const DB_PORT = env("DB_PORT") || "5432";
  const DB_NAME = env("DB_NAME") || "helpdesk";
  const DB_USER = env("DB_USER") || "appuser";
  const DB_PASSWORD = env("DB_PASSWORD") || "apppassword";

  // PostgreSQL é o padrão agora
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public&connection_limit=10&pool_timeout=30&connect_timeout=5`;
}

const DATABASE_URL = getDatabaseUrl();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: DATABASE_URL,
  },
});
