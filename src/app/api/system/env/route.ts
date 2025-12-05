import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

const ALLOWED_KEYS = [
  "EMAIL_ENABLED",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "EMAIL_FROM",
  "EMAIL_FROM_NAME",
  "APP_URL",
  "LOCAL_AI_ENABLED",
  "LOCAL_AI_URL",
  "LOCAL_AI_MODEL",
  "LOCAL_AI_TIMEOUT_MS",
  "LOCAL_AI_PORT",
  "DATABASE_URL",
  "SHADOW_DATABASE_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_ROOT_PASSWORD",
  "AUTH_SECRET",
  "DEFAULT_USER_EMAIL",
  "DEFAULT_USER_PASSWORD",
  "DEFAULT_USER_NAME",
  "DEFAULT_USER_TWO_FACTOR",
  "USE_DOCKER_DB",
  "USE_DOCKER_OLLAMA",
  "ALLOW_GIT_UPDATE",
  "ALLOWED_REPO_URL",
  "ALLOW_ENV_EDIT",
  "NEXT_PUBLIC_APP_URL",
  "PUBLIC_APP_URL",
  "NODE_ENV",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

function getEnvSnapshot() {
  const result: Partial<Record<AllowedKey, string>> = {};
  for (const key of ALLOWED_KEYS) {
    const val = process.env[key];
    if (typeof val === "string") {
      result[key] = val;
    }
  }
  return result;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json(getEnvSnapshot());
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (process.env.ALLOW_ENV_EDIT !== "true") {
    return NextResponse.json(
      { error: "Edição de .env desabilitada neste servidor (ALLOW_ENV_EDIT != true)" },
      { status: 403 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const envPath = path.join(process.cwd(), ".env");
  let current = "";
  if (fs.existsSync(envPath)) {
    current = fs.readFileSync(envPath, "utf8");
  }

  const lines = current.split(/\r?\n/);
  const updatedKeys = new Set<AllowedKey>();

  const newLines = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!match) return line;
    const key = match[1] as AllowedKey;
    if (!ALLOWED_KEYS.includes(key)) return line;
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const value = String(body[key] ?? "");
      updatedKeys.add(key);
      return `${key}=${value}`;
    }
    return line;
  });

  for (const key of ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    if (updatedKeys.has(key)) continue;
    const value = String(body[key] ?? "");
    newLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envPath, newLines.join("\n"), "utf8");

  return NextResponse.json({
    success: true,
    message: "Arquivo .env atualizado com sucesso. Reinicie o servidor para aplicar as mudanças.",
    updated: ALLOWED_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(body, k)),
  });
}


