import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Retorna todos os webhooks (de todos os usuários) para a tela de gestão
  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const items = webhooks.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    token: w.token,
    isActive: w.isActive,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/receive/${w.token}`,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    createdById: w.user?.id ?? null,
    createdByName: w.user?.name ?? null,
    createdByEmail: w.user?.email ?? null,
  }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name : body?.name?.toString() || "";
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || null;
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  // Gerar token único
  const token = crypto.randomBytes(32).toString("hex");

  const created = await prisma.webhook.create({
    data: {
      name,
      description,
      token,
      isActive: true,
      userId: user.id,
    },
  });

  return NextResponse.json({
    id: created.id,
    name: created.name,
    description: created.description,
    token: created.token,
    isActive: created.isActive,
    link: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/receive/${created.token}`,
  });
}

