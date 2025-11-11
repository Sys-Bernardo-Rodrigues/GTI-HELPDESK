import { NextRequest, NextResponse } from "next/server";
import type { TicketStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ id: string }>;

const VALID_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

async function parseId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params?.id ?? "");
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseId(context.params);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const statusRaw = body?.status;
  const statusProvided = typeof statusRaw === "string";
  const status = statusProvided ? statusRaw.toString().toUpperCase() : undefined;

  const hasAssignedKey = Object.prototype.hasOwnProperty.call(body ?? {}, "assignedToId");
  const assignedToRaw = hasAssignedKey ? body?.assignedToId : undefined;
  let assignedToId: number | null | undefined = undefined;

  if (!statusProvided && !hasAssignedKey) {
    return NextResponse.json({ error: "Nenhuma alteração enviada" }, { status: 400 });
  }

  if (statusProvided) {
    if (!VALID_STATUSES.includes(status as TicketStatus)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
  }

  if (hasAssignedKey) {
    if (assignedToRaw === null || assignedToRaw === "") {
      assignedToId = null;
    } else {
      const parsed = Number(assignedToRaw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
      }
      assignedToId = parsed;
      const exists = await prisma.user.findUnique({ where: { id: parsed }, select: { id: true } });
      if (!exists) {
        return NextResponse.json({ error: "Responsável não encontrado" }, { status: 404 });
      }
    }
  }

  try {
    const data: Record<string, any> = { updatedAt: new Date() };
    if (statusProvided) data.status = status as TicketStatus;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;

    const updated = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        submission: {
          select: {
            id: true,
            form: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description ?? "",
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      category: updated.category
        ? { id: updated.category.id, name: updated.category.name }
        : null,
      requester: updated.user
        ? { id: updated.user.id, name: updated.user.name, email: updated.user.email }
        : null,
      assignedTo: updated.assignedTo
        ? { id: updated.assignedTo.id, name: updated.assignedTo.name, email: updated.assignedTo.email }
        : null,
      form: updated.submission?.form
        ? {
            id: updated.submission.form.id,
            title: updated.submission.form.title,
            slug: updated.submission.form.slug,
          }
        : null,
    });
  } catch (error) {
    console.error("[tickets:update]", error);
    const message = error instanceof Error ? error.message : "Falha ao atualizar ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

