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

async function parseRawId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  return (params?.id ?? "").trim();
}

export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { id: "asc" } },
    },
  });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json(form);
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = await parseNumericId(context.params);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title : body?.title?.toString() || undefined;
  const description = typeof body?.description === "string" ? body.description : body?.description?.toString() || undefined;
  const fields = Array.isArray(body?.fields) ? (body?.fields as unknown[]) : undefined;
  const isPublic = typeof body?.isPublic === "boolean" ? Boolean(body.isPublic) : undefined;

  const updated = await prisma.form.update({
    where: { id },
    data: {
      title,
      description,
      ...(isPublic !== undefined ? { isPublic } : {}),
      ...(fields ? { fields: { deleteMany: {}, create: fields.map((f: any) => ({
        label: (f?.label?.toString() || "Campo").slice(0, 64),
        type: (f?.type as any) || "TEXT",
        options: f?.options ? String(f.options) : null,
        required: Boolean(f?.required),
      })) } } : {}),
    },
    include: { fields: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const raw = await parseRawId(context.params);
  let id = Number.parseInt(raw, 10);
  let formId: number | null = Number.isFinite(id) && id > 0 ? id : null;

  // Fallback 1: tentar por slug se não for número
  if (formId === null && raw) {
    const bySlug = await prisma.form.findFirst({ where: { slug: raw, userId: user.id }, select: { id: true } });
    if (bySlug?.id) formId = bySlug.id;
  }

  // Fallback 2: tentar id no corpo JSON { id }
  if (formId === null) {
    try {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      const rawId = typeof body?.id === "number" || typeof body?.id === "string" ? String(body.id) : "";
      const bodyId = Number.parseInt(rawId, 10);
      if (Number.isFinite(bodyId) && bodyId > 0) formId = bodyId;
    } catch {}
  }

  if (formId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  // Validar propriedade do formulário
  const owned = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  if (!hard) {
    // Soft delete: desativar o formulário (oculta link público e bloqueia acesso)
    try {
      await prisma.form.update({ where: { id: formId }, data: { isPublic: false } });
      return NextResponse.json({ success: true, disabled: true });
    } catch (e: any) {
      return NextResponse.json({ error: "Falha ao desativar formulário", detail: e?.message || String(e) }, { status: 500 });
    }
  }

  // Hard delete: remover registros relacionados e o formulário
  try {
    await prisma.$transaction(async (tx) => {
      const submissions = await tx.formSubmission.findMany({ where: { formId: formId! }, select: { id: true } });
      const submissionIds = submissions.map((s) => s.id);
      if (submissionIds.length > 0) {
        await tx.ticket.updateMany({ where: { submissionId: { in: submissionIds } }, data: { submissionId: null } });
      }
      await tx.formField.deleteMany({ where: { formId: formId! } });
      await tx.formSubmission.deleteMany({ where: { formId: formId! } });
      await tx.form.delete({ where: { id: formId! } });
    });
    return NextResponse.json({ success: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Falha ao excluir formulário", detail: e?.message || String(e) }, { status: 500 });
  }
}