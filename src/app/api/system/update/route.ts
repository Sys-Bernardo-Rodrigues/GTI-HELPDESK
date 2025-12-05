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

  // Obtém a URL do repositório do .env ou do body (body tem prioridade se fornecido)
  let repoUrl = process.env.ALLOWED_REPO_URL?.trim() || "";
  
  // Se fornecido no body, usa o do body (mas valida contra o .env)
  let body: any = null;
  try {
    body = await req.json().catch(() => ({}));
    if (body && typeof body.repoUrl === "string" && body.repoUrl.trim()) {
      repoUrl = body.repoUrl.trim();
    }
  } catch {
    // Ignora erro de parsing, usa apenas o .env
  }

  // Se não há URL configurada nem no .env nem no body, retorna erro
  if (!repoUrl) {
    return NextResponse.json(
      { 
        error: "URL do repositório não configurada. Configure ALLOWED_REPO_URL no .env ou forneça no corpo da requisição.",
        hint: "Configure ALLOWED_REPO_URL no arquivo .env com a URL do seu repositório GitHub"
      },
      { status: 400 }
    );
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

  // Validação de segurança: se ALLOWED_REPO_URL está definido no .env, o repoUrl deve corresponder
  const allowedRepoFromEnv = process.env.ALLOWED_REPO_URL?.trim();
  if (allowedRepoFromEnv && allowedRepoFromEnv !== repoUrl) {
    return NextResponse.json(
      { 
        error: "Repositório não autorizado para atualização neste servidor",
        detail: `O repositório configurado no .env (ALLOWED_REPO_URL) é diferente do fornecido.`
      },
      { status: 403 }
    );
  }

  try {
    const cwd = process.cwd();
    const outputs: string[] = [];
    const errors: string[] = [];

    // 1. Busca as atualizações do repositório remoto
    try {
      const { stdout, stderr } = await execAsync("git fetch origin", {
        cwd,
        timeout: 60 * 1000, // 1 minuto
      });
      if (stdout) outputs.push(`[fetch] ${stdout}`);
      if (stderr) errors.push(`[fetch] ${stderr}`);
    } catch (fetchError: any) {
      console.warn("[system/update] Aviso ao fazer fetch:", fetchError?.message);
      errors.push(`[fetch] ${fetchError?.message}`);
    }

    // 2. Descarta TODAS as mudanças locais e força sincronização com origin/main
    // Primeiro tenta descobrir o branch atual
    let currentBranch = "main";
    try {
      const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
        cwd,
        timeout: 10 * 1000,
      });
      currentBranch = stdout.trim() || "main";
    } catch {
      // Usa main como padrão
    }

    try {
      // Força reset para o branch remoto correspondente
      const { stdout, stderr } = await execAsync(`git reset --hard origin/${currentBranch}`, {
        cwd,
        timeout: 30 * 1000, // 30 segundos
      });
      if (stdout) outputs.push(`[reset] ${stdout}`);
      if (stderr && !stderr.includes("HEAD is now at")) {
        errors.push(`[reset] ${stderr}`);
      }
    } catch (resetError: any) {
      console.warn("[system/update] Aviso ao fazer reset:", resetError?.message);
      // Tenta alternativa: descarta mudanças específicas nos arquivos problemáticos
      try {
        // Descarta mudanças em arquivos específicos que causam problema
        await execAsync("git checkout HEAD -- .next/ next-env.d.ts", {
          cwd,
          timeout: 30 * 1000,
        });
        outputs.push(`[reset-alt] Mudanças descartadas em .next/ e next-env.d.ts`);
      } catch (altError: any) {
        console.warn("[system/update] Aviso na alternativa de reset:", altError?.message);
        errors.push(`[reset-alt] ${altError?.message}`);
      }
    }

    // 3. Limpa arquivos não rastreados (incluindo os que estão no .gitignore)
    try {
      const { stdout, stderr } = await execAsync("git clean -fd", {
        cwd,
        timeout: 30 * 1000, // 30 segundos
      });
      if (stdout) outputs.push(`[clean] ${stdout}`);
      if (stderr) errors.push(`[clean] ${stderr}`);
    } catch (cleanError: any) {
      console.warn("[system/update] Aviso ao limpar arquivos:", cleanError?.message);
      errors.push(`[clean] ${cleanError?.message}`);
    }

    // 4. Descarta mudanças em arquivos problemáticos antes do pull
    // Isso garante que arquivos gerados não bloqueiem o pull
    try {
      await execAsync("git checkout HEAD -- .next/ next-env.d.ts 2>&1 || true", {
        cwd,
        timeout: 10 * 1000,
        shell: "/bin/bash",
      });
    } catch {
      // Ignora erros, continua
    }

    // 5. Tenta fazer pull
    try {
      const { stdout, stderr } = await execAsync(`git pull origin ${currentBranch}`, {
        cwd,
        timeout: 5 * 60 * 1000, // 5 minutos
      });
      if (stdout) outputs.push(`[pull] ${stdout}`);
      if (stderr && !stderr.includes("Already up to date") && !stderr.includes("Updating")) {
        errors.push(`[pull] ${stderr}`);
      }
    } catch (pullError: any) {
      const errorMsg = pullError?.message || String(pullError);
      // Se o erro for sobre mudanças locais, tenta forçar o merge
      if (errorMsg.includes("Your local changes")) {
        try {
          // Força o merge descartando mudanças locais
          await execAsync(`git reset --hard origin/${currentBranch}`, {
            cwd,
            timeout: 30 * 1000,
          });
          outputs.push(`[pull-fix] Merge forçado com sucesso`);
        } catch (forceError: any) {
          console.warn("[system/update] Erro ao forçar merge:", forceError?.message);
          errors.push(`[pull-fix] ${forceError?.message}`);
        }
      } else if (!errorMsg.includes("Already up to date")) {
        console.warn("[system/update] Aviso ao fazer pull:", errorMsg);
        errors.push(`[pull] ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Atualização concluída com sucesso.",
      stdout: outputs.join("\n"),
      stderr: errors.length > 0 ? errors.join("\n") : undefined,
    });
  } catch (error: any) {
    console.error("[system/update] Erro ao executar atualização:", error);
    return NextResponse.json(
      {
        error: "Falha ao executar atualização via git.",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}






