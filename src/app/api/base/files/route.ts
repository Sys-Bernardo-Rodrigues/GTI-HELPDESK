import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptFile, encrypt, decrypt } from "@/lib/encryption";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
  // Documentos
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/csv",
  "text/plain",
  // Vídeos
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo", // .avi
  "video/webm",
  // Imagens
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Arquivos compactados
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/gzip",
];

function sanitizeString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>\"'\\]/g, "").trim().slice(0, maxLength);
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function mapFileResponse(file: {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string | null;
  tags: string | null;
  description: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
}) {
  try {
    // Descriptografar descrição se existir
    let decryptedDescription: string | null = null;
    if (file.description) {
      try {
        decryptedDescription = decrypt(file.description).toString("utf8");
      } catch (error) {
        // Se falhar, pode ser descrição antiga não criptografada
        decryptedDescription = file.description;
      }
    }
    
    return {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      category: file.category ?? null,
      tags: file.tags ?? null,
      description: decryptedDescription,
      createdAt: typeof file.createdAt === "string" ? file.createdAt : file.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof file.updatedAt === "string" ? file.updatedAt : file.updatedAt?.toISOString?.() ?? "",
      createdBy: file.createdBy ? {
        id: file.createdBy.id,
        name: file.createdBy.name,
        email: file.createdBy.email,
      } : null,
    };
  } catch (error: any) {
    console.warn(`Erro ao mapear arquivo ${file.id}:`, error?.message);
    return {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      category: file.category ?? null,
      tags: file.tags ?? null,
      description: file.description ?? null,
      createdAt: typeof file.createdAt === "string" ? file.createdAt : file.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof file.updatedAt === "string" ? file.updatedAt : file.updatedAt?.toISOString?.() ?? "",
      createdBy: file.createdBy ? {
        id: file.createdBy.id,
        name: file.createdBy.name,
        email: file.createdBy.email,
      } : null,
    };
  }
}

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await prisma.file.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ items: files.map(mapFileResponse) });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao carregar arquivos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type deve ser multipart/form-data" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = sanitizeString(formData.get("category") || "");
    const tags = sanitizeString(formData.get("tags") || "");
    const description = sanitizeString(formData.get("description") || "", 2000);

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Arquivo excede o tamanho máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Criptografar arquivo antes de salvar
    const encryptedBuffer = encryptFile(buffer);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "base");
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const ext = getFileExtension(file.name) || "bin";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    const filename = `file_${auth.id}_${timestamp}_${random}.enc`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, encryptedBuffer);

    const filePathUrl = `/uploads/base/${filename}`;

    // Criptografar descrição se fornecida
    const encryptedDescription = description ? encrypt(description) : null;
    
    const created = await prisma.file.create({
      data: {
        name: filename,
        originalName: file.name,
        mimeType: file.type,
        size: encryptedBuffer.length, // Tamanho do arquivo criptografado
        path: filePathUrl,
        category: category || null,
        tags: tags || null,
        description: encryptedDescription,
        createdById: auth.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(mapFileResponse(created), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Falha ao fazer upload do arquivo" }, { status: 500 });
  }
}

