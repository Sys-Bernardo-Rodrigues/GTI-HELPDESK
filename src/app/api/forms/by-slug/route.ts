import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "Slug ausente" }, { status: 400 });
  const form = await prisma.form.findUnique({ where: { slug }, include: { fields: true } });
  if (!form || !form.isPublic) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json({ id: form.id, title: form.title, description: form.description, fields: form.fields });
}