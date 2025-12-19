import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // Buscar total de registros
    const total = await prisma.ticket.count();

    // Buscar tickets com paginação
    // Otimização: não carregar todos os updates, apenas contagem se necessário
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        scheduledAt: true,
        scheduledNote: true,
        userId: true,
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        category: { select: { id: true, name: true } },
        submission: {
          select: {
            id: true,
            form: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
        // Otimização: limitar updates aos mais recentes ou apenas contagem
        _count: {
          select: {
            updates: true,
          },
        },
        // Opcional: carregar apenas últimos 5 updates por performance
        updates: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const items = tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description ?? "",
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      scheduledAt: ticket.scheduledAt,
      scheduledNote: ticket.scheduledNote,
      requester: ticket.user
        ? { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email, avatarUrl: ticket.user.avatarUrl }
        : null,
      assignedTo: ticket.assignedTo
        ? { id: ticket.assignedTo.id, name: ticket.assignedTo.name, email: ticket.assignedTo.email, avatarUrl: ticket.assignedTo.avatarUrl }
        : null,
      userId: ticket.userId,
      category: ticket.category
        ? { id: ticket.category.id, name: ticket.category.name }
        : null,
      form: ticket.submission?.form
        ? {
            id: ticket.submission.form.id,
            title: ticket.submission.form.title,
            slug: ticket.submission.form.slug,
          }
        : null,
      updates: ticket.updates.map((update) => ({
        id: update.id,
        content: update.content,
        createdAt: update.createdAt,
        author: update.user
          ? { id: update.user.id, name: update.user.name, email: update.user.email }
          : null,
      })),
      updatesCount: ticket._count.updates,
    }));

    return NextResponse.json(createPaginatedResponse(items, total, page, limit));
  } catch (error) {
    return NextResponse.json({ error: "Falha ao carregar tickets" }, { status: 500 });
  }
}

