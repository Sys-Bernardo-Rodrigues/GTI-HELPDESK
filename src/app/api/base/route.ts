import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

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
    // Tentar retornar como texto simples (para compatibilidade com dados antigos)
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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // Buscar total de registros
    const total = await prisma.document.count();

    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });

    const items = documents.map(mapDocumentResponse);
    return NextResponse.json(createPaginatedResponse(items, total, page, limit));
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    const errorMessage = error?.message || String(error);
    return NextResponse.json({ 
      error: "Falha ao carregar documentos",
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    
    const created = await prisma.document.create({
      data: {
        title,
        content: encryptedContent,
        category,
        tags,
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

    return NextResponse.json(mapDocumentResponse(created), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Falha ao criar documento" }, { status: 500 });
  }
}

