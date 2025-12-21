import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const page = await prisma.publicPage.findUnique({
      where: { id: pageId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      id: page.id,
      title: page.title,
      slug: page.slug,
      description: page.description,
      content: page.content,
      blocks: page.blocks,
      isPublished: page.isPublished,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      createdById: page.user?.id ?? null,
      createdByName: page.user?.name ?? null,
      createdByEmail: page.user?.email ?? null,
    });
  } catch (error) {
    console.error("Erro ao carregar página:", error);
    return NextResponse.json({ error: "Falha ao carregar página" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = typeof body?.title === "string" ? body.title : body?.title?.toString() || "";
    const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || "";
    const content = typeof body?.content === "string" ? body.content : body?.content?.toString() || "";
    const blocks = typeof body?.blocks === "string" ? body.blocks : (body?.blocks ? JSON.stringify(body.blocks) : null);
    const isPublished = typeof body?.isPublished === "boolean" ? body.isPublished : false;

    if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

    // Verificar se a página existe
    const existing = await prisma.publicPage.findUnique({
      where: { id: pageId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    const slug = slugify(title);
    
    // Verificar se já existe outra página com o mesmo slug
    if (slug !== existing.slug) {
      const slugExists = await prisma.publicPage.findUnique({
        where: { slug },
      });
      
      if (slugExists) {
        return NextResponse.json({ error: "Já existe uma página com este título" }, { status: 400 });
      }
    }

    const updated = await prisma.publicPage.update({
      where: { id: pageId },
      data: {
        title,
        description: description || null,
        content: content || "",
        blocks: blocks || null,
        slug,
        isPublished,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      slug: updated.slug,
      description: updated.description,
      isPublished: updated.isPublished,
      link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pages/${updated.slug}`,
    });
  } catch (error) {
    console.error("Erro ao atualizar página:", error);
    return NextResponse.json({ error: "Falha ao atualizar página" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const pageId = parseInt(id, 10);
    if (isNaN(pageId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se a página existe
    const existing = await prisma.publicPage.findUnique({
      where: { id: pageId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }

    await prisma.publicPage.delete({
      where: { id: pageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar página:", error);
    return NextResponse.json({ error: "Falha ao deletar página" }, { status: 500 });
  }
}

