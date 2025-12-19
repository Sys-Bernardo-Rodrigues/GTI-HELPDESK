import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";
    const isHelpful = typeof body.isHelpful === "boolean" ? body.isHelpful : null;
    const comment = typeof body.comment === "string" ? body.comment.trim() : null;
    const intent = typeof body.intent === "string" ? body.intent : null;
    const source = typeof body.source === "string" ? body.source : null;

    if (!messageId) {
      return NextResponse.json({ error: "ID da mensagem é obrigatório" }, { status: 400 });
    }

    if (isHelpful === null) {
      return NextResponse.json({ error: "isHelpful é obrigatório" }, { status: 400 });
    }

    // Verificar se já existe feedback para esta mensagem deste usuário
    const existing = await prisma.chatFeedback.findFirst({
      where: {
        userId: user.id,
        messageId,
      },
    });

    if (existing) {
      // Atualizar feedback existente
      await prisma.chatFeedback.update({
        where: { id: existing.id },
        data: {
          isHelpful,
          comment: comment || null,
          intent: intent || null,
          source: source || null,
        },
      });
    } else {
      // Criar novo feedback
      await prisma.chatFeedback.create({
        data: {
          userId: user.id,
          messageId,
          isHelpful,
          comment: comment || null,
          intent: intent || null,
          source: source || null,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Feedback registrado com sucesso" });
  } catch (error) {
    console.error("[chat:feedback:POST]", error);
    return NextResponse.json({ error: "Erro ao registrar feedback" }, { status: 500 });
  }
}












