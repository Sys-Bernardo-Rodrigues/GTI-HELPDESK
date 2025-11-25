import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const action = typeof body.action === "string" ? body.action : "";
    const ticketId = typeof body.ticketId === "number" ? body.ticketId : null;
    const status = typeof body.status === "string" ? body.status : null;
    const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle.trim() : "";
    const documentContent = typeof body.documentContent === "string" ? body.documentContent.trim() : "";

    switch (action) {
      case "close_ticket":
      case "update_ticket_status": {
        if (!ticketId) {
          return NextResponse.json({ error: "ID do ticket é obrigatório" }, { status: 400 });
        }

        // Verificar se o ticket existe e se o usuário tem permissão
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          include: {
            user: true,
            assignedTo: true,
          },
        });

        if (!ticket) {
          return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
        }

        // Verificar permissão: usuário deve ser o criador, atribuído ou admin
        const canModify =
          ticket.userId === user.id ||
          ticket.assignedToId === user.id ||
          user.email?.toLowerCase().includes("admin") ||
          user.email?.toLowerCase().includes("administrador");

        if (!canModify) {
          return NextResponse.json(
            { error: "Você não tem permissão para modificar este ticket" },
            { status: 403 }
          );
        }

        // Atualizar status do ticket
        const newStatus = status || (action === "close_ticket" ? "CLOSED" : ticket.status);
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: newStatus as any },
          include: {
            user: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
          },
        });

        // Criar atualização no histórico
        await prisma.ticketUpdate.create({
          data: {
            ticketId,
            userId: user.id,
            content: `Status alterado para ${newStatus} via Dobby`,
          },
        });

        return NextResponse.json({
          success: true,
          message: `Ticket #${ticketId} ${action === "close_ticket" ? "fechado" : "atualizado"} com sucesso`,
          ticket: updatedTicket,
        });
      }

      case "create_document": {
        if (!documentTitle) {
          return NextResponse.json({ error: "Título do documento é obrigatório" }, { status: 400 });
        }

        // Criar documento
        const encryptedContent = encrypt(Buffer.from(documentContent || "Conteúdo a ser preenchido", "utf8"));
        const document = await prisma.document.create({
          data: {
            title: documentTitle,
            content: encryptedContent.toString("base64"),
            createdById: user.id,
            category: "Base de Conhecimento",
          },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });

        return NextResponse.json({
          success: true,
          message: `Documento "${documentTitle}" criado com sucesso`,
          document: {
            id: document.id,
            title: document.title,
            category: document.category,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 });
    }
  } catch (error) {
    console.error("[chat:actions:POST]", error);
    return NextResponse.json({ error: "Erro ao executar ação" }, { status: 500 });
  }
}

