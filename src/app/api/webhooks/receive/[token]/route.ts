import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ token: string }>;

// Rate limit básico em memória por IP (limite: 10/min)
const rate = new Map<string, { count: number; resetAt: number }>();

function rateOk(ip: string) {
  const now = Date.now();
  const cur = rate.get(ip);
  if (!cur || now > cur.resetAt) {
    rate.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (cur.count >= 10) return false;
  cur.count += 1;
  return true;
}

function buildSummary(payload: Record<string, any>, webhookName: string): string {
  const lines: string[] = [];
  lines.push(`Webhook: ${webhookName}`);
  lines.push(`Recebido em: ${new Date().toLocaleString("pt-BR")}`);
  lines.push("");

  // Tentar extrair informações comuns de webhooks
  const title = payload.title || payload.subject || payload.name || payload.event || "Webhook recebido";
  const description = payload.description || payload.message || payload.body || payload.content || "";

  lines.push(`Título: ${title}`);
  if (description) {
    lines.push(`Descrição: ${description}`);
  }
  lines.push("");

  // Adicionar todos os campos do payload
  lines.push("Dados recebidos:");
  for (const [key, value] of Object.entries(payload)) {
    if (key === "title" || key === "subject" || key === "name" || key === "event" || key === "description" || key === "message" || key === "body" || key === "content") {
      continue; // Já foram incluídos acima
    }
    let displayValue: string;
    if (value === null || value === undefined) {
      displayValue = "-";
    } else if (Array.isArray(value)) {
      displayValue = value.join(", ");
    } else if (typeof value === "object") {
      displayValue = JSON.stringify(value, null, 2);
    } else {
      displayValue = String(value);
    }
    lines.push(`${key}: ${displayValue}`);
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest, context: { params: ParamsPromise }) {
  const params = await context.params;
  const token = params?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local";
  if (!rateOk(ip)) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
  }

  // Buscar webhook pelo token
  const webhook = await prisma.webhook.findUnique({
    where: { token },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook não encontrado" }, { status: 404 });
  }

  if (!webhook.isActive) {
    return NextResponse.json({ error: "Webhook desativado" }, { status: 403 });
  }

  // Parse do payload
  let payload: Record<string, any> = {};
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = (await req.json().catch(() => ({}))) as Record<string, any>;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      // Tentar JSON mesmo sem o header correto
      payload = (await req.json().catch(() => ({}))) as Record<string, any>;
    }
  } catch (error) {
    return NextResponse.json({ error: "Erro ao processar payload" }, { status: 400 });
  }

  try {
    // Criar ticket automaticamente
    const adminEmail = process.env.DEFAULT_USER_EMAIL || "admin@example.com";
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    const fallbackUser = admin ?? (await prisma.user.findFirst());
    const userId = fallbackUser?.id ?? webhook.userId ?? null;

    if (!userId) {
      return NextResponse.json({ error: "Nenhum usuário disponível para criar o ticket" }, { status: 500 });
    }

    const summary = buildSummary(payload, webhook.name);
    const title = payload.title || payload.subject || payload.name || payload.event || `Webhook: ${webhook.name}`;
    
    const ticket = await prisma.ticket.create({
      data: {
        title: String(title).slice(0, 255),
        description: summary,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            newsletter: true,
          },
        },
      },
    });

    // Enviar email para o usuário se tiver newsletter ativado
    if (ticket.user.newsletter && ticket.user.email) {
      const { sendTicketNotificationEmail } = await import("@/lib/email");
      await sendTicketNotificationEmail(
        ticket.user.email,
        {
          id: ticket.id,
          title: ticket.title,
        },
        "created",
        ticket.user.name
      );
    }

    return NextResponse.json({ 
      success: true, 
      ticketId: ticket.id,
      webhookId: webhook.id,
      message: "Ticket criado com sucesso"
    });
  } catch (error) {
    console.error("[webhooks:receive]", error);
    const message = error instanceof Error ? error.message : "Falha ao criar ticket";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

