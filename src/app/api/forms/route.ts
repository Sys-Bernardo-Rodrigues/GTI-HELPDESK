import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const forms = await prisma.form.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const items = forms.map((f) => ({
    id: f.id,
    title: f.title,
    slug: f.slug,
    isPublic: f.isPublic,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forms/${f.slug}`,
    createdAt: f.createdAt,
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = body?.title?.toString() || "";
  const description = body?.description?.toString() || "";
  const fields = Array.isArray(body?.fields) ? body.fields : [];
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