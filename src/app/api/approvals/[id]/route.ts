import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalNotificationEmail, sendTicketNotificationEmail } from "@/lib/email";

type ParamsPromise = Promise<{ id: string }>;

async function parseId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const raw = params?.id ?? "";
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

function buildSummary(payload: Record<string, any>, formTitle: string, fields: { id: number; label: string; type: string }[]) {
  const lines: string[] = [];
  lines.push(`Formulário: ${formTitle}`);
  lines.push(`Enviado em: ${new Date().toLocaleString("pt-BR")}`);
  lines.push("");

  const fieldMap = new Map<string, { label: string; type: string }>();
  for (const field of fields) {
    fieldMap.set(`field_${field.id}`, { label: field.label, type: field.type });
  }

  for (const [key, info] of fieldMap.entries()) {
    const rawValue = payload[key];
    let value: string;
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      value = "-";
    } else if (Array.isArray(rawValue)) {
      value = rawValue.join(", ");
    } else if (typeof rawValue === "boolean") {
      value = rawValue ? "Sim" : "Não";
    } else {
      value = String(rawValue);
    }
    lines.push(`${info.label}: ${value}`);
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = await parseId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : null;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ação inválida. Use 'approve' ou 'reject'" }, { status: 400 });
  }

  const approval = await prisma.formApproval.findUnique({
    where: { id },
    include: {
      submission: true,
      form: {
        include: {
          fields: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              newsletter: true,
            },
          },
        },
      },
    },
  });

  if (!approval) {
    return NextResponse.json({ error: "Aprovação não encontrada" }, { status: 404 });
  }

  if (approval.status !== "PENDING") {
    return NextResponse.json({ error: "Esta aprovação já foi processada" }, { status: 400 });
  }

  const status = action === "approve" ? "APPROVED" : "REJECTED";

  if (action === "approve") {
    // Criar ticket quando aprovado
    const adminEmail = process.env.DEFAULT_USER_EMAIL || "admin@example.com";
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    const fallbackUser = admin ?? (await prisma.user.findFirst());
    const userId = fallbackUser?.id ?? approval.form.userId ?? null;

    if (!userId) {
      return NextResponse.json({ error: "Não foi possível determinar o usuário para criar o ticket" }, { status: 500 });
    }

    const payload = JSON.parse(approval.submission.data);
    const summary = buildSummary(payload, approval.form.title, approval.form.fields);

    let createdTicket: { id: number; title: string; user: { email: string; name: string | null; newsletter: boolean } } | null = null;

    await prisma.$transaction(async (tx) => {
      // Atualizar aprovação
      await tx.formApproval.update({
        where: { id },
        data: {
          status,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      // Criar ticket
      const ticket = await tx.ticket.create({
        data: {
          title: `Resposta: ${approval.form.title}`,
          description: summary,
          userId,
          submissionId: approval.submissionId,
        },
        include: {
          user: {
            select: {
              email: true,
              name: true,
              newsletter: true,
            },
          },
        },
      });
      createdTicket = ticket;
    });

    // Enviar email para o criador do formulário se tiver newsletter ativado
    if (approval.form.user?.newsletter && approval.form.user.email) {
      await sendApprovalNotificationEmail(
        approval.form.user.email,
        {
          formTitle: approval.form.title,
          submissionId: approval.submissionId,
          status: "APPROVED",
        },
        approval.form.user.name
      );
    }

    // Enviar email para o usuário do ticket se tiver newsletter ativado
    if (createdTicket && createdTicket.user.newsletter && createdTicket.user.email) {
      await sendTicketNotificationEmail(
        createdTicket.user.email,
        {
          id: createdTicket.id,
          title: createdTicket.title,
        },
        "created",
        createdTicket.user.name
      );
    }

    return NextResponse.json({ success: true, status, message: "Formulário aprovado e ticket criado com sucesso" });
  } else {
    // Apenas rejeitar
    await prisma.formApproval.update({
      where: { id },
      data: {
        status,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    // Enviar email para o criador do formulário se tiver newsletter ativado
    if (approval.form.user?.newsletter && approval.form.user.email) {
      await sendApprovalNotificationEmail(
        approval.form.user.email,
        {
          formTitle: approval.form.title,
          submissionId: approval.submissionId,
          status: "REJECTED",
        },
        approval.form.user.name
      );
    }

    return NextResponse.json({ success: true, status, message: "Formulário rejeitado" });
  }
}


