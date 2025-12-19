import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { readdir, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

/**
 * Lista todos os backups disponíveis
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const backupsDir = path.join(process.cwd(), "backups");

    try {
      // Listar arquivos no diretório de backups
      const files = await readdir(backupsDir);

      // Filtrar apenas arquivos .sql e obter informações
      const backups = await Promise.all(
        files
          .filter((file) => file.endsWith(".sql"))
          .map(async (filename) => {
            const filePath = path.join(backupsDir, filename);
            try {
              const stats = await stat(filePath);
              return {
                filename,
                size: stats.size,
                sizeFormatted: formatBytes(stats.size),
                createdAt: stats.birthtime.toISOString(),
                modifiedAt: stats.mtime.toISOString(),
              };
            } catch {
              return null;
            }
          })
      );

      // Filtrar nulls e ordenar por data (mais recente primeiro)
      const validBackups = backups
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return NextResponse.json({
        backups: validBackups,
        total: validBackups.length,
      });
    } catch (error: any) {
      // Se o diretório não existir, retornar lista vazia
      if (error.code === "ENOENT") {
        return NextResponse.json({
          backups: [],
          total: 0,
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("[backup:list]", error);
    return NextResponse.json(
      { error: "Erro ao listar backups" },
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

