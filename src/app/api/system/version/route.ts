import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, "package.json");
    
    // Ler versão do package.json
    let packageVersion = "Desconhecida";
    let packageName = "RootDesk";
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        packageVersion = packageJson.version || "Desconhecida";
        packageName = packageJson.name || "RootDesk";
      } catch (e) {
        console.warn("[system/version] Erro ao ler package.json:", e);
      }
    }

    // Tentar obter informações do Git
    let gitInfo: {
      branch?: string;
      commit?: string;
      commitShort?: string;
      commitDate?: string;
      tag?: string;
    } = {};

    try {
      // Branch atual
      try {
        const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD", {
          cwd,
          timeout: 5000,
        });
        gitInfo.branch = branch.trim();
      } catch {}

      // Commit atual
      try {
        const { stdout: commit } = await execAsync("git rev-parse HEAD", {
          cwd,
          timeout: 5000,
        });
        gitInfo.commit = commit.trim();
        gitInfo.commitShort = commit.trim().substring(0, 7);
      } catch {}

      // Data do commit
      try {
        const { stdout: commitDate } = await execAsync("git log -1 --format=%ci", {
          cwd,
          timeout: 5000,
        });
        gitInfo.commitDate = commitDate.trim();
      } catch {}

      // Tag mais recente (se houver)
      try {
        const { stdout: tag } = await execAsync("git describe --tags --abbrev=0 2>/dev/null || echo ''", {
          cwd,
          timeout: 5000,
          shell: "/bin/bash",
        });
        if (tag.trim()) {
          gitInfo.tag = tag.trim();
        }
      } catch {}
    } catch (e) {
      // Ignora erros do Git, não é crítico
      console.warn("[system/version] Aviso ao obter informações do Git:", e);
    }

    return NextResponse.json({
      name: packageName,
      version: packageVersion,
      git: gitInfo,
    });
  } catch (error: any) {
    console.error("[system/version] Erro ao obter versão:", error);
    return NextResponse.json(
      {
        error: "Falha ao obter informações de versão",
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

