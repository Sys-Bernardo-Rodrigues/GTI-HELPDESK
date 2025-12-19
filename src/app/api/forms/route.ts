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
    const total = await prisma.form.count();

    // Retorna todos os formulários (de todos os usuários) para a tela de gestão
    const forms = await prisma.form.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { 
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        requiresApproval: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
        approvers: { 
          select: {
            user: { select: { id: true, name: true, email: true } } 
          }
        },
      },
    });
    
    const items = forms.map((f) => ({
      id: f.id,
      title: f.title,
      slug: f.slug,
      isPublic: f.isPublic,
      requiresApproval: f.requiresApproval,
      approvers: f.approvers.map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
      })),
      link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forms/${f.slug}`,
      createdAt: f.createdAt,
      createdById: f.user?.id ?? null,
      createdByName: f.user?.name ?? null,
      createdByEmail: f.user?.email ?? null,
    }));
    
    return NextResponse.json(createPaginatedResponse(items, total, page, limit));
  } catch (error) {
    return NextResponse.json({ error: "Falha ao carregar formulários" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title : body?.title?.toString() || "";
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || "";
  const fields = Array.isArray(body?.fields) ? (body.fields as unknown[]) : [];
  const requiresApproval = typeof body?.requiresApproval === "boolean" ? body.requiresApproval : false;
  const approverIdsRaw = body?.approverIds;
  let approverIds: number[] = [];
  if (Array.isArray(approverIdsRaw) && approverIdsRaw.length > 0) {
    approverIds = approverIdsRaw
      .map((id: any) => {
        const parsed = Number(id);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      })
      .filter((id): id is number => id !== null);
    // Verificar se os usuários existem
    if (approverIds.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: approverIds } },
        select: { id: true },
      });
      approverIds = existingUsers.map((u) => u.id);
    }
  }
  if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  const slug = slugify(title);
  const created = await prisma.form.create({
    data: {
      title,
      description,
      slug,
      isPublic: true,
      requiresApproval,
      userId: user.id,
      fields: {
        create: fields.map((f: any) => ({
          label: (f?.label?.toString() || "Campo").slice(0, 64),
          type: (f?.type as any) || "TEXT",
          options: f?.options ? String(f.options) : null,
          required: Boolean(f?.required),
        })),
      },
      approvers: requiresApproval && approverIds.length > 0 ? {
        create: approverIds.map((userId) => ({ userId })),
      } : undefined,
    },
    include: { 
      fields: true,
      approvers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    id: created.id,
    title: created.title,
    slug: created.slug,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forms/${created.slug}`,
  });
}