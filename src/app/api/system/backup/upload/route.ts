import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

/**
 * Upload de arquivo de backup
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!file.name.endsWith(".sql")) {
      return NextResponse.json({ error: "Apenas arquivos .sql são permitidos" }, { status: 400 });
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo: 100MB" }, { status: 400 });
    }

    // Criar diretório de backups se não existir
    const backupsDir = path.join(process.cwd(), "backups");
    await mkdir(backupsDir, { recursive: true });

    // Gerar nome único se já existir
    let filename = file.name;
    let filePath = path.join(backupsDir, filename);
    
    const fs = await import("fs/promises");
    let counter = 1;
    while (true) {
      try {
        await fs.access(filePath);
        // Arquivo já existe, adicionar número
        const nameWithoutExt = path.basename(file.name, ".sql");
        filename = `${nameWithoutExt}_${counter}.sql`;
        filePath = path.join(backupsDir, filename);
        counter++;
      } catch {
        // Arquivo não existe, podemos usar este nome
        break;
      }
    }

    // Salvar arquivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const stats = await fs.stat(filePath);

    return NextResponse.json({
      success: true,
      filename,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime.toISOString(),
    });
  } catch (error: any) {
    console.error("[backup:upload]", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do backup" },
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

