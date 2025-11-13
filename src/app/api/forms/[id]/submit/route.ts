import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type ParamsPromise = Promise<{ id: string }>;

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
      if (info.type === "FILE" && value && value !== "-" && value !== "null") {
        value = resolveFileUrl(value);
      }
    }
    lines.push(`${info.label}: ${value}`);
  }

  // demais entradas do payload que não são campos conhecidos
  const extraKeys = Object.keys(payload).filter((key) => !fieldMap.has(key) && key !== "website");
  if (extraKeys.length > 0) {
    lines.push("");
    lines.push("Campos adicionais:");
    for (const key of extraKeys) {
      const raw = payload[key];
      let value: string;
      if (raw === null || raw === undefined) value = "-";
      else if (Array.isArray(raw)) value = raw.join(", ");
      else if (typeof raw === "object") value = JSON.stringify(raw);
      else value = String(raw);
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

function resolveFileUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const isAbsolute = /^https?:\/\//i.test(trimmed);
  if (isAbsolute) return trimmed;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.PUBLIC_APP_URL || "";
  if (!base) return trimmed;
  try {
    const url = new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, base);
    return url.toString();
  } catch {
    return trimmed;
  }
}

export async function POST(req: NextRequest, context: { params: ParamsPromise }) {
  const id = await parseId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") || "local";
  if (!rateOk(ip)) return NextResponse.json({ error: "Muitas submissões. Tente novamente mais tarde." }, { status: 429 });

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.includes("multipart/form-data");

  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: true },
  });
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
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    if ((body as any).website) {
      return NextResponse.json({ error: "Detectado spam" }, { status: 400 });
    }
    payload = body as Record<string, any>;
  }

  try {
    // Persistir submissão
    const submission = await prisma.formSubmission.create({
      data: { formId: id, data: JSON.stringify(payload) },
    });

    // Converter em ticket automaticamente
    const adminEmail = process.env.DEFAULT_USER_EMAIL || "admin@example.com";
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    const fallbackUser = admin ?? (await prisma.user.findFirst());
    const userId = fallbackUser?.id ?? form.userId ?? null;

    let ticketId: number | null = null;
    if (userId) {
      const summary = buildSummary(payload, form.title, form.fields);
      const ticket = await prisma.ticket.create({
        data: {
          title: `Resposta: ${form.title}`,
          description: summary,
          userId,
          submissionId: submission.id,
        },
      });
      ticketId = ticket.id;
    }
    return NextResponse.json({ success: true, ticketId, submissionId: submission.id, formId: form.id });
  } catch (error) {
    console.error("[forms:submit]", error);
    const message = error instanceof Error ? error.message : "Falha ao registrar resposta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}