import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const DB_HOST = env("DB_HOST");
const DB_PORT = env("DB_PORT");
const DB_NAME = env("DB_NAME");
const DB_USER = env("DB_USER");
const DB_PASSWORD = env("DB_PASSWORD");

const DATABASE_URL = `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?connection_limit=10&pool_timeout=30&socket_timeout=30&connect_timeout=5`;

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
