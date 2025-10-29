import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const form = await prisma.form.findFirst({ where: { id, userId: user.id }, include: { fields: true } });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json(form);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const title = body?.title?.toString() || undefined;
  const description = body?.description?.toString() || undefined;
  const fields = Array.isArray(body?.fields) ? body.fields : undefined;

  const updated = await prisma.form.update({
    where: { id },
    data: {
      title,
      description,
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

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const idStr = (params.id || "").trim();
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  // Validar propriedade do formulário
  const owned = await prisma.form.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!owned) {
    return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  }
  // Remover/soltar dependências para evitar erro de restrição de chave estrangeira
  // 1) Desassociar tickets que referenciam submissões deste formulário
  const submissions = await prisma.formSubmission.findMany({ where: { formId: id }, select: { id: true } });
  const submissionIds = submissions.map((s) => s.id);
  if (submissionIds.length > 0) {
    await prisma.ticket.updateMany({ where: { submissionId: { in: submissionIds } }, data: { submissionId: null } });
  }
  // 2) Excluir campos e submissões do formulário, depois o formulário
  await prisma.formField.deleteMany({ where: { formId: id } });
  await prisma.formSubmission.deleteMany({ where: { formId: id } });
  await prisma.form.delete({ where: { id } });
  return NextResponse.json({ success: true });
}