import "dotenv/config";
import { prisma, assertDbConnection } from "../src/lib/prisma";

async function main() {
  // Obter a URL que será usada (pode vir de DATABASE_URL ou ser construída)
  const directUrl = process.env.DATABASE_URL;
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const dbName = process.env.DB_NAME || "helpdesk";
  
  const dbUrl = directUrl || `mysql://${process.env.DB_USER || "appuser"}@${host}:${port}/${dbName}`;
  
  console.log("Verificando conexão com o banco de dados...");
  console.log(`Host: ${host}:${port}`);
  console.log(`Banco: ${dbName}`);
  
  if (!directUrl && !process.env.DB_USER) {
    console.warn("⚠️  DATABASE_URL ou variáveis DB_* não configuradas no .env");
    console.warn("   Configure DATABASE_URL ou DB_HOST, DB_USER, DB_PASSWORD, DB_NAME");
  }
  
  try {
    await assertDbConnection();
    console.log("✅ Conexão com o banco validada com sucesso.");
  } catch (err: any) {
    console.error("❌ Falha ao conectar no banco:", err?.message || err);
    console.error("\n📋 Verifique:");
    console.error("   1. O banco de dados está rodando?");
    console.error("   2. As credenciais no .env estão corretas?");
    console.error("   3. A porta está correta? (3306 para MySQL/MariaDB, 5432 para PostgreSQL)");
    
    if (port === "5432") {
      console.error("\n⚠️  Detectado PostgreSQL (porta 5432).");
      console.error("   Se você quer usar MySQL/MariaDB, configure DB_PORT=3306 no .env");
    } else if (port === "3306") {
      console.error("\n⚠️  Detectado MySQL/MariaDB (porta 3306).");
      console.error("   Se você quer usar PostgreSQL, configure DB_PORT=5432 no .env");
    }
    
    console.error("\n💡 Para usar Docker (MariaDB):");
    console.error("   npm run docker:up");
    
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();