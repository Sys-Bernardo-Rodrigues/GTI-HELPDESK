import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import fs from "fs";
import path from "path";

type ParamsPromise = Promise<{ id: string }>;

function sanitizeString(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>\"'\\]/g, "").trim().slice(0, maxLength);
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

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    return NextResponse.json(mapFileResponse(file));
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar arquivo" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = await getFileId(context.params);
  if (!fileId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const category = sanitizeString((payload as any).category) || null;
  const tags = sanitizeString((payload as any).tags) || null;
  const descriptionRaw = sanitizeString((payload as any).description, 2000) || null;
  
  // Criptografar descrição se fornecida
  const description = descriptionRaw ? encrypt(descriptionRaw) : null;

  try {
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: {
        category,
        tags,
        description,
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

    return NextResponse.json(mapFileResponse(updated));
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Falha ao atualizar arquivo" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: ParamsPromise }) {
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

    // Deletar arquivo físico
    const filePath = path.join(process.cwd(), "public", file.path);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // Ignorar erro se arquivo não existir
    }

    // Deletar registro no banco
    await prisma.file.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Falha ao excluir arquivo" }, { status: 500 });
  }
}

