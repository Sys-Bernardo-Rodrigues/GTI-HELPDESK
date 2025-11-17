import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status") || "PENDING";
  
  // Primeiro, buscar os IDs dos formulários onde o usuário é aprovador
  const formApprovers = await prisma.formApprover.findMany({
    where: {
      userId: user.id,
    },
    select: {
      formId: true,
    },
  });
  
  const formIds = formApprovers.map((fa) => fa.formId);
  
  // Se não houver formulários para aprovar, retornar vazio
  if (formIds.length === 0) {
    return NextResponse.json({ items: [] });
  }
  
  const approvals = await prisma.formApproval.findMany({
    where: {
      status: status === "PENDING" ? "PENDING" : status === "APPROVED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : undefined,
      formId: {
        in: formIds, // Apenas aprovações de formulários onde o usuário logado é um dos aprovadores
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      submission: true,
      form: {
        include: {
          fields: { orderBy: { id: "asc" } },
          user: { select: { id: true, name: true, email: true } },
        },
      },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
  });

  const items = approvals.map((a) => ({
    id: a.id,
    submissionId: a.submissionId,
    formId: a.formId,
    status: a.status,
    createdAt: a.createdAt,
    reviewedAt: a.reviewedAt,
    formTitle: a.form.title,
    formSlug: a.form.slug,
    submissionData: JSON.parse(a.submission.data),
    formFields: a.form.fields,
    reviewedByName: a.reviewedBy?.name ?? null,
    reviewedByEmail: a.reviewedBy?.email ?? null,
  }));

  return NextResponse.json({ items });
}

