import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
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
        updates: {
          orderBy: { createdAt: "asc" },
          include: {
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
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao carregar tickets" }, { status: 500 });
  }
}

