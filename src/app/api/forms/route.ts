import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Retorna todos os formulários (de todos os usuários) para a tela de gestão
  const forms = await prisma.form.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const items = forms.map((f) => ({
    id: f.id,
    title: f.title,
    slug: f.slug,
    isPublic: f.isPublic,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forms/${f.slug}`,
    createdAt: f.createdAt,
    createdById: f.user?.id ?? null,
    createdByName: f.user?.name ?? null,
    createdByEmail: f.user?.email ?? null,
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title : body?.title?.toString() || "";
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || "";
  const fields = Array.isArray(body?.fields) ? (body.fields as unknown[]) : [];
  if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  const slug = slugify(title);
  const created = await prisma.form.create({
    data: {
      title,
      description,
      slug,
      isPublic: true,
      userId: user.id,
      fields: {
        create: fields.map((f: any) => ({
          label: (f?.label?.toString() || "Campo").slice(0, 64),
          type: (f?.type as any) || "TEXT",
          options: f?.options ? String(f.options) : null,
          required: Boolean(f?.required),
        })),
      },
    },
    include: { fields: true },
  });

  return NextResponse.json({
    id: created.id,
    title: created.title,
    slug: created.slug,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forms/${created.slug}`,
  });
}