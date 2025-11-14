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

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("[events:GET:id]", error);
    return NextResponse.json({ error: "Erro ao buscar evento" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const description = typeof body.description === "string" ? body.description.trim() : undefined;
    const startDate = body.startDate ? new Date(String(body.startDate)) : undefined;
    const endDate = body.endDate ? new Date(String(body.endDate)) : undefined;
    const location = typeof body.location === "string" ? body.location.trim() : undefined;
    const color = typeof body.color === "string" ? body.color : undefined;
    const isAllDay = typeof body.isAllDay === "boolean" ? body.isAllDay : undefined;

    if (title !== undefined && !title) {
      return NextResponse.json({ error: "Título não pode ser vazio" }, { status: 400 });
    }
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Data de início inválida" }, { status: 400 });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Data de fim inválida" }, { status: 400 });
    }
    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json({ error: "Data de fim deve ser posterior à data de início" }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (location !== undefined) updateData.location = location;
    if (color !== undefined) updateData.color = color;
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[events:PUT]", error);
    return NextResponse.json({ error: "Erro ao atualizar evento" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    if (event.userId !== user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[events:DELETE]", error);
    return NextResponse.json({ error: "Erro ao excluir evento" }, { status: 500 });
  }
}

