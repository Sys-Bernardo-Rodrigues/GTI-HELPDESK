import "dotenv/config";
import { prisma, assertDbConnection } from "../src/lib/prisma";

/**
 * Script de verificação pré-produção
 * Verifica se o ambiente está pronto para rodar em produção
 */

interface CheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
}

const checks: CheckResult[] = [];

function addCheck(name: string, status: "ok" | "warning" | "error", message: string) {
  checks.push({ name, status, message });
}

async function checkEnvironment() {
  console.log("🔍 Verificando ambiente de produção...\n");

  // 1. Verificar NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    addCheck("NODE_ENV", "ok", `Ambiente configurado como: ${nodeEnv}`);
  } else {
    addCheck("NODE_ENV", "warning", `Ambiente atual: ${nodeEnv || "não definido"}. Recomendado: production`);
  }

  // 2. Verificar variáveis essenciais
  const requiredVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "ENCRYPTION_KEY",
  ];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim().length === 0) {
      addCheck(varName, "error", `Variável não definida ou vazia`);
    } else if (varName === "AUTH_SECRET" && value.length < 32) {
      addCheck(varName, "warning", `Chave muito curta (${value.length} caracteres). Mínimo recomendado: 32`);
    } else if (varName === "ENCRYPTION_KEY" && value.length !== 64) {
      addCheck(varName, "warning", `Chave deve ter 64 caracteres hexadecimais. Atual: ${value.length}`);
    } else {
      addCheck(varName, "ok", "Configurada corretamente");
    }
  }

  // 3. Verificar URLs
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    addCheck("APP_URL", "warning", "URL da aplicação não configurada");
  } else if (appUrl.includes("localhost")) {
    addCheck("APP_URL", "warning", `URL aponta para localhost: ${appUrl}`);
  } else {
    addCheck("APP_URL", "ok", `URL configurada: ${appUrl}`);
  }

  // 4. Verificar configurações de segurança
  const allowGitUpdate = process.env.ALLOW_GIT_UPDATE === "true";
  const allowEnvEdit = process.env.ALLOW_ENV_EDIT === "true";
  
  if (allowGitUpdate) {
    addCheck("ALLOW_GIT_UPDATE", "warning", "Atualização via Git habilitada (desabilitar em produção)");
  } else {
    addCheck("ALLOW_GIT_UPDATE", "ok", "Desabilitado (recomendado)");
  }

  if (allowEnvEdit) {
    addCheck("ALLOW_ENV_EDIT", "warning", "Edição de .env habilitada (desabilitar em produção)");
  } else {
    addCheck("ALLOW_ENV_EDIT", "ok", "Desabilitado (recomendado)");
  }

  // 5. Verificar conexão com banco de dados
  try {
    await assertDbConnection();
    addCheck("Database Connection", "ok", "Conexão com banco de dados estabelecida");
  } catch (err: any) {
    addCheck("Database Connection", "error", `Falha na conexão: ${err?.message || err}`);
  }

  // 6. Verificar se o build existe
  try {
    const fs = await import("fs");
    const path = await import("path");
    const buildPath = path.join(process.cwd(), ".next");
    if (fs.existsSync(buildPath)) {
      addCheck("Build", "ok", "Diretório .next encontrado (build realizado)");
    } else {
      addCheck("Build", "warning", "Diretório .next não encontrado. Execute 'npm run build' primeiro");
    }
  } catch (err) {
    addCheck("Build", "warning", "Não foi possível verificar o build");
  }

  // Exibir resultados
  console.log("📊 Resultados da Verificação:\n");
  
  let hasErrors = false;
  let hasWarnings = false;

  for (const check of checks) {
    const icon = check.status === "ok" ? "✅" : check.status === "warning" ? "⚠️ " : "❌";
    console.log(`${icon} ${check.name}: ${check.message}`);
    
    if (check.status === "error") hasErrors = true;
    if (check.status === "warning") hasWarnings = true;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  if (hasErrors) {
    console.error("❌ Erros encontrados! Corrija antes de iniciar em produção.\n");
    process.exit(1);
  } else if (hasWarnings) {
    console.warn("⚠️  Avisos encontrados. Revise as configurações.\n");
    console.log("💡 Você pode continuar, mas é recomendado corrigir os avisos.\n");
    process.exit(0);
  } else {
    console.log("✅ Todas as verificações passaram! Ambiente pronto para produção.\n");
    process.exit(0);
  }
}

async function main() {
  try {
    await checkEnvironment();
  } catch (e) {
    console.error("❌ Erro durante verificação:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

