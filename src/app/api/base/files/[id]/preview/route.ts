import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptFile } from "@/lib/encryption";
import fs from "fs";
import path from "path";

type ParamsPromise = Promise<{ id: string }>;

async function getFileId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function GET(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = await getFileId(context.params);
  if (!fileId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    // Verificar se o tipo de arquivo suporta preview
    const supportsPreview = 
      file.mimeType.startsWith("image/") ||
      file.mimeType === "application/pdf" ||
      file.mimeType.startsWith("video/") ||
      file.mimeType.startsWith("audio/") ||
      file.mimeType === "text/plain" ||
      file.mimeType === "text/csv";

    if (!supportsPreview) {
      return NextResponse.json({ error: "Tipo de arquivo não suporta preview" }, { status: 400 });
    }

    // Ler arquivo do disco
    const filePath = path.join(process.cwd(), "public", file.path);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Arquivo físico não encontrado" }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    
    // Verificar se o arquivo está criptografado
    let decryptedBuffer: Buffer;
    const isEncrypted = file.path.endsWith(".enc");
    
    if (isEncrypted) {
      try {
        decryptedBuffer = decryptFile(fileBuffer);
      } catch (error: any) {
        console.error(`Erro ao descriptografar arquivo ${fileId}:`, error?.message);
        return NextResponse.json({ 
          error: "Erro ao descriptografar arquivo",
          details: process.env.NODE_ENV === "development" ? error?.message : undefined
        }, { status: 500 });
      }
    } else {
      // Arquivo antigo não criptografado
      decryptedBuffer = fileBuffer;
    }

    // Retornar arquivo para preview (inline, não download)
    return new NextResponse(decryptedBuffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`,
        "Content-Length": decryptedBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Error previewing file:", error);
    return NextResponse.json({ 
      error: "Falha ao visualizar arquivo",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, { status: 500 });
  }
}

