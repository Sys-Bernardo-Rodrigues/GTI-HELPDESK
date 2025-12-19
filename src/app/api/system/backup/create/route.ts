import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getDatabaseUrl } from "@/lib/prisma";

const execAsync = promisify(exec);

export const runtime = "nodejs";

/**
 * Faz backup do banco de dados PostgreSQL
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Parsear URL do banco de dados
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      return NextResponse.json({ error: "DATABASE_URL não configurada" }, { status: 500 });
    }

    let dbHost = "localhost";
    let dbPort = "5432";
    let dbUser = "";
    let dbPassword = "";
    let dbName = "";

    try {
      const url = new URL(dbUrl);
      dbHost = url.hostname;
      dbPort = url.port || "5432";
      dbUser = url.username;
      dbPassword = url.password;
      dbName = url.pathname.replace(/^\//, "").split("?")[0];
    } catch (error) {
      return NextResponse.json({ error: "URL do banco de dados inválida" }, { status: 500 });
    }

    // Criar diretório de backups se não existir
    const backupsDir = path.join(process.cwd(), "backups");
    await mkdir(backupsDir, { recursive: true });

    // Nome do arquivo de backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] + "_" + 
                     new Date().toISOString().split("T")[1].split(".")[0].replace(/:/g, "-");
    const filename = `backup_${timestamp}.sql`;
    const filePath = path.join(backupsDir, filename);

    // Comando pg_dump
    // Usar PGPASSWORD como variável de ambiente para não aparecer no processo list
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword,
    };

    const pgDumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-owner --no-acl --clean --if-exists -F p`;

    try {
      const { stdout, stderr } = await execAsync(pgDumpCmd, {
        env,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes("WARNING")) {
        console.error("[backup] stderr:", stderr);
      }

      // Salvar backup em arquivo
      await writeFile(filePath, stdout, "utf8");

      // Obter tamanho do arquivo
      const fs = await import("fs/promises");
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      return NextResponse.json({
        success: true,
        filename,
        filePath: `/backups/${filename}`,
        size: fileSize,
        sizeFormatted: formatBytes(fileSize),
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[backup] Erro ao executar pg_dump:", error);
      
      // Verificar se pg_dump está instalado
      if (error.code === "ENOENT" || error.message.includes("pg_dump")) {
        return NextResponse.json(
          { error: "pg_dump não encontrado. Certifique-se de que o PostgreSQL client está instalado." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: `Erro ao criar backup: ${error.message || "Erro desconhecido"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[backup:create]", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação de backup" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

