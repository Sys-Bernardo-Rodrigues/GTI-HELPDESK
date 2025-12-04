import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Flag de segurança para habilitar essa funcionalidade
  if (process.env.ALLOW_GIT_UPDATE !== "true") {
    return NextResponse.json(
      { error: "Atualização via Git desabilitada no servidor (ALLOW_GIT_UPDATE != true)" },
      { status: 403 }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const repoUrl = typeof body?.repoUrl === "string" ? body.repoUrl.trim() : "";
  if (!repoUrl) {
    return NextResponse.json({ error: "Informe a URL do repositório GitHub" }, { status: 400 });
  }

  // Validação simples de URL GitHub
  try {
    const parsed = new URL(repoUrl);
    if (!parsed.hostname.endsWith("github.com")) {
      return NextResponse.json({ error: "Apenas URLs do GitHub são permitidas" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "URL do repositório inválida" }, { status: 400 });
  }

  const allowedRepo = process.env.ALLOWED_REPO_URL;
  if (allowedRepo && allowedRepo !== repoUrl) {
    return NextResponse.json(
      { error: "Repositório não autorizado para atualização neste servidor" },
      { status: 403 }
    );
  }

  try {
    const cwd = process.cwd();

    // Executa git pull no diretório atual
    const { stdout, stderr } = await execAsync("git pull", {
      cwd,
      timeout: 5 * 60 * 1000, // 5 minutos
    });

    return NextResponse.json({
      success: true,
      message: "Atualização disparada com sucesso.",
      stdout,
      stderr,
    });
  } catch (error: any) {
    console.error("[system/update] Erro ao executar git pull:", error);
    return NextResponse.json(
      {
        error: "Falha ao executar atualização via git.",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}


