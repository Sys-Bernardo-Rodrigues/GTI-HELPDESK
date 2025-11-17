import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { hasPermission } from "@/lib/permissions";

type ParamsPromise = Promise<{ id: string }>;

function sanitizeString(value: unknown, maxLength = 10000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function mapDocumentResponse(document: {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
}) {
  try {
    // Descriptografar conteúdo
    const decryptedContent = decrypt(document.content).toString("utf8");
    
    return {
      id: document.id,
      title: document.title ?? "",
      content: decryptedContent,
      category: document.category ?? null,
      tags: document.tags ?? null,
      createdAt: typeof document.createdAt === "string" ? document.createdAt : document.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof document.updatedAt === "string" ? document.updatedAt : document.updatedAt?.toISOString?.() ?? "",
      createdBy: document.createdBy ? {
        id: document.createdBy.id,
        name: document.createdBy.name,
        email: document.createdBy.email,
      } : null,
    };
  } catch (error: any) {
    // Se falhar ao descriptografar, pode ser um documento antigo não criptografado
    console.warn(`Erro ao descriptografar documento ${document.id}:`, error?.message);
    return {
      id: document.id,
      title: document.title ?? "",
      content: document.content ?? "",
      category: document.category ?? null,
      tags: document.tags ?? null,
      createdAt: typeof document.createdAt === "string" ? document.createdAt : document.createdAt?.toISOString?.() ?? "",
      updatedAt: typeof document.updatedAt === "string" ? document.updatedAt : document.updatedAt?.toISOString?.() ?? "",
      createdBy: document.createdBy ? {
        id: document.createdBy.id,
        name: document.createdBy.name,
        email: document.createdBy.email,
      } : null,
    };
  }
}

async function getDocumentId(paramsPromise: ParamsPromise) {
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

  if (!(await hasPermission(auth.id, "knowledge.documents.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documentId = await getDocumentId(context.params);
  if (!documentId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
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

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(mapDocumentResponse(document));
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar documento" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(auth.id, "knowledge.edit"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documentId = await getDocumentId(context.params);
  if (!documentId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const title = sanitizeString((payload as any).title, 500);
  const content = sanitizeString((payload as any).content, 50000);
  const category = sanitizeString((payload as any).category, 200) || null;
  const tags = sanitizeString((payload as any).tags, 500) || null;

  if (!title) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 });
  }

  try {
    // Criptografar conteúdo antes de salvar
    const encryptedContent = encrypt(content);
    
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        title,
        content: encryptedContent,
        category,
        tags,
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

    return NextResponse.json(mapDocumentResponse(updated));
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Falha ao atualizar documento" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasPermission(auth.id, "knowledge.delete"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const documentId = await getDocumentId(context.params);
  if (!documentId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2025") {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Falha ao excluir documento" }, { status: 500 });
  }
}

