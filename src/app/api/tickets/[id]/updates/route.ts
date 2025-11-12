import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

type ParamsPromise = Promise<{ id: string }>;

async function parseId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params?.id ?? "");
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ticketId = await parseId(context.params);
  if (!ticketId) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

  const updates = await prisma.ticketUpdate.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    items: updates.map((update) => ({
      id: update.id,
      content: update.content,
      createdAt: update.createdAt,
      author: update.user
        ? { id: update.user.id, name: update.user.name, email: update.user.email }
        : null,
    })),
  });
}

export async function POST(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ticketId = await parseId(context.params);
  if (!ticketId) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const contentRaw = typeof body?.content === "string" ? body.content.trim() : "";
  if (!contentRaw) {
    return NextResponse.json({ error: "Informe um texto para registrar no ticket." }, { status: 400 });
  }

  const created = await prisma.ticketUpdate.create({
    data: {
      ticketId,
      userId: user.id,
      content: contentRaw,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({
    id: created.id,
    content: created.content,
    createdAt: created.createdAt,
    author: created.user ? { id: created.user.id, name: created.user.name, email: created.user.email } : null,
  });
}
