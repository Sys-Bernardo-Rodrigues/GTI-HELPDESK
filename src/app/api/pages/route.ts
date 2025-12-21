import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // Buscar total de registros
    const total = await prisma.publicPage.count();

    // Retorna todas as páginas (de todos os usuários) para a tela de gestão
    const pages = await prisma.publicPage.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { 
        id: true,
        title: true,
        slug: true,
        description: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    
    const items = pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      isPublished: p.isPublished,
      link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pages/${p.slug}`,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdById: p.user?.id ?? null,
      createdByName: p.user?.name ?? null,
      createdByEmail: p.user?.email ?? null,
    }));
    
    return NextResponse.json(createPaginatedResponse(items, total, page, limit));
  } catch (error) {
    console.error("Erro ao carregar páginas:", error);
    return NextResponse.json({ error: "Falha ao carregar páginas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title : body?.title?.toString() || "";
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || "";
  const content = typeof body?.content === "string" ? body.content : body?.content?.toString() || "";
  const blocks = typeof body?.blocks === "string" ? body.blocks : (body?.blocks ? JSON.stringify(body.blocks) : null);
  const isPublished = typeof body?.isPublished === "boolean" ? body.isPublished : false;

  if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  const slug = slugify(title);
  
  // Verificar se já existe uma página com o mesmo slug
  const existing = await prisma.publicPage.findUnique({
    where: { slug },
  });
  
  if (existing) {
    return NextResponse.json({ error: "Já existe uma página com este título" }, { status: 400 });
  }

  try {
    const created = await prisma.publicPage.create({
      data: {
        title,
        description: description || null,
        content: content || "",
        blocks: blocks || null,
        slug,
        isPublished,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      id: created.id,
      title: created.title,
      slug: created.slug,
      description: created.description,
      isPublished: created.isPublished,
      link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pages/${created.slug}`,
    });
  } catch (error) {
    console.error("Erro ao criar página:", error);
    return NextResponse.json({ error: "Falha ao criar página" }, { status: 500 });
  }
}

