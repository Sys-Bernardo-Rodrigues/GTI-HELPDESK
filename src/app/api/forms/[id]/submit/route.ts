import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// Rate limit básico em memória por IP (limite: 5/min)
const rate = new Map<string, { count: number; resetAt: number }>();

function rateOk(ip: string) {
  const now = Date.now();
  const cur = rate.get(ip);
  if (!cur || now > cur.resetAt) {
    rate.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (cur.count >= 5) return false;
  cur.count += 1;
  return true;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateOk(ip)) return NextResponse.json({ error: "Muitas submissões. Tente novamente mais tarde." }, { status: 429 });

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const form = await prisma.form.findUnique({ where: { id }, include: { fields: true } });
  if (!form || !form.isPublic) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });

  let payload: Record<string, any> = {};
  if (isMultipart) {
    const fd = await req.formData();
    // honeypot
    const website = fd.get("website");
    if (website) return NextResponse.json({ error: "Detectado spam" }, { status: 400 });

    for (const f of form.fields) {
      const key = `field_${f.id}`;
      const raw = fd.get(key);
      if (f.type === "FILE") {
        if (raw && typeof raw !== "string" && (raw as File).size > 0) {
          const file = raw as File;
          const allowed = ["image/jpeg", "image/png", "image/webp"];
          if (!allowed.includes(file.type)) {
            return NextResponse.json({ error: "Tipo de imagem não suportado" }, { status: 400 });
          }
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
          const dir = path.join(process.cwd(), "public", "uploads", "forms");
          await fs.promises.mkdir(dir, { recursive: true });
          const name = `form_${id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = path.join(dir, name);
          await fs.promises.writeFile(filePath, buffer);
          payload[key] = `/uploads/forms/${name}`;
        } else {
          payload[key] = null;
        }
      } else if (f.type === "CHECKBOX") {
        payload[key] = raw != null; // presença indica true
      } else {
        payload[key] = typeof raw === "string" ? raw : null;
      }
    }
  } else {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    if ((body as any).website) return NextResponse.json({ error: "Detectado spam" }, { status: 400 }); // honeypot
    payload = body as any;
  }

  // Persistir submissão
  const submission = await prisma.formSubmission.create({ data: { formId: id, data: payload as any } });

  // Converter em ticket
  const adminEmail = process.env.DEFAULT_USER_EMAIL || "admin@example.com";
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const userId = admin?.id || 1; // fallback simples
  const description = JSON.stringify(body);
  const ticket = await prisma.ticket.create({
    data: {
      title: `Resposta: ${form.title}`,
      description,
      userId,
      submissionId: submission.id,
    },
  });
  // Ação pós-submissão: desativar o formulário (persistente)
  // Motivo: manter integridade referencial com o ticket/submissão
  // Caso deseje remover completamente, isso exigiria tratar chaves estrangeiras
  // e não é recomendado aqui.
  let postActionStatus: "ok" | "error" = "ok";
  let postActionMessage: string | undefined;
  try {
    await prisma.form.update({ where: { id }, data: { isPublic: false } });
  } catch (e: any) {
    postActionStatus = "error";
    postActionMessage = e?.message || "Falha ao desativar formulário";
  }

  return NextResponse.json({ success: true, ticketId: ticket.id, postActionStatus, postActionMessage });
}