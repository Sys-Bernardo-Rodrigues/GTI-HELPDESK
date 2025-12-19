import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type ParamsPromise = Promise<{ filename: string }>;

/**
 * Download de arquivo de backup
 */
export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const filename = params.filename;

    // Validar nome do arquivo (prevenir path traversal)
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Nome de arquivo inválido" }, { status: 400 });
    }

    // Validar extensão
    if (!filename.endsWith(".sql")) {
      return NextResponse.json({ error: "Tipo de arquivo inválido" }, { status: 400 });
    }

    const backupsDir = path.join(process.cwd(), "backups");
    const filePath = path.join(backupsDir, filename);

    try {
      // Verificar se arquivo existe
      await stat(filePath);

      // Ler arquivo
      const fileContent = await readFile(filePath, "utf8");

      // Retornar como download
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return NextResponse.json({ error: "Arquivo de backup não encontrado" }, { status: 404 });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("[backup:download]", error);
    return NextResponse.json(
      { error: "Erro ao processar download do backup" },
      { status: 500 }
    );
  }
}

