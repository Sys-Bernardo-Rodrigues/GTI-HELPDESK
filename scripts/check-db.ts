import "dotenv/config";
import { prisma, assertDbConnection } from "../src/lib/prisma";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida no .env");
    process.exit(1);
  }
  try {
    await assertDbConnection();
    console.log("Conexão com o banco validada com sucesso.");
  } catch (err) {
    console.error("Falha ao conectar no banco:", err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();