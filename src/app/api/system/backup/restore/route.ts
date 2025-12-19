import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { readFile, stat, writeFile, unlink } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { getDatabaseUrl } from "@/lib/prisma";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export const runtime = "nodejs";

/**
 * Restaura backup do banco de dados PostgreSQL
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const filename = typeof body.filename === "string" ? body.filename : null;

    if (!filename) {
      return NextResponse.json({ error: "Nome do arquivo é obrigatório" }, { status: 400 });
    }

    // Validar nome do arquivo (prevenir path traversal)
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
    }

    // Validar extensão
    if (!filename.endsWith(".sql")) {
      return NextResponse.json({ error: "Tipo de arquivo inválido" }, { status: 400 });
    }

    const backupsDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupsDir, filename);

    // Verificar se arquivo existe
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: "Arquivo de backup não encontrado" }, { status: 404 });
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

    // Criar arquivo temporário para o SQL (mais seguro que usar stdin diretamente)
    const tempFile = path.join(tmpdir(), `restore_${Date.now()}.sql`);
    const sqlContent = await readFile(filePath, "utf8");
    await writeFile(tempFile, sqlContent, "utf8");

    // Executar restore usando psql
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword,
    };

    const psqlCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${tempFile}`;

    try {
      const { stdout, stderr } = await execAsync(psqlCmd, {
        env,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      // Remover arquivo temporário
      await unlink(tempFile).catch(() => {}); // Ignorar erro se já foi removido

      if (stderr && !stderr.includes("WARNING") && !stderr.includes("NOTICE")) {
        console.error("[backup:restore] stderr:", stderr);
      }

      return NextResponse.json({
        success: true,
        message: "Backup restaurado com sucesso",
      });
    } catch (error: any) {
      console.error("[backup:restore] Erro ao executar psql:", error);
      
      // Verificar se psql está instalado
      if (error.code === "ENOENT" || error.message.includes("psql")) {
        return NextResponse.json(
          { error: "psql não encontrado. Certifique-se de que o PostgreSQL client está instalado." },
          { status: 500 }
        );
      }

      // Tentar remover arquivo temporário em caso de erro
      await unlink(tempFile).catch(() => {});
      
      return NextResponse.json(
        { error: `Erro ao restaurar backup: ${error.message || "Erro desconhecido"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // Tentar remover arquivo temporário em caso de erro geral
    try {
      await unlink(tempFile);
    } catch {}
    console.error("[backup:restore]", error);
    return NextResponse.json(
      { error: "Erro ao processar restauração de backup" },
      { status: 500 }
    );
  }
}

