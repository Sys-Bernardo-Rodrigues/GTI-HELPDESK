import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ id: string }>;

async function parseNumericId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const raw = params?.id ?? "";
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const webhook = await prisma.webhook.findUnique({
    where: { id },
  });
  if (!webhook) return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });
  return NextResponse.json(webhook);
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name : body?.name?.toString() || undefined;
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || undefined;
  const isActive = typeof body?.isActive === "boolean" ? Boolean(body.isActive) : undefined;

  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  // Validar propriedade do webhook
  const owned = await prisma.webhook.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });

  try {
    await prisma.webhook.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao excluir webhook", detail: e?.message || String(e) }, { status: 500 });
  }
}

