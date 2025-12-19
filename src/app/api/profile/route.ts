import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, invalidateUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sanitize(input: unknown) {
  if (typeof input !== "string") return "";
  return input.replace(/[<>\u0000-\u001F\u007F]/g, "").slice(0, 256);
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json({
    name: dbUser.name ?? "",
    email: dbUser.email,
    phone: dbUser.phone ?? "",
    jobTitle: dbUser.jobTitle ?? "",
    company: dbUser.company ?? "",
    account: { twoFactor: dbUser.twoFactor ?? false, newsletter: dbUser.newsletter ?? false },
    avatarUrl: dbUser.avatarUrl ?? "",
    discordTag: dbUser.discordTag ?? "",
    phoneVerified: dbUser.phoneVerified ?? false,
    pendingEmail: dbUser.pendingEmail ?? "",
    emailVerifiedAt: dbUser.emailVerifiedAt ?? null,
    emailVerificationToken: dbUser.emailVerificationToken ?? null,
    twoFactor: dbUser.twoFactor ?? false,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const name = sanitize((body as any).name);
  const email = sanitize((body as any).email);
  const phone = sanitize((body as any).phone);
  const jobTitle = sanitize((body as any).jobTitle);
  const company = sanitize((body as any).company);
  const avatarUrl = sanitize((body as any).avatarUrl);
  const account = {
    twoFactor: Boolean((body as any)?.account?.twoFactor),
    newsletter: Boolean((body as any)?.account?.newsletter),
  };

  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  // Persist all profile fields in DB
  try {
    // Email deve ser alterado via fluxo de confirmação em /api/profile/email
    const updated = await prisma.user.update({ where: { id: user.id }, data: { name, phone, jobTitle, company, avatarUrl, twoFactor: account.twoFactor, newsletter: account.newsletter } });
    
    // Invalidar cache da sessão para forçar atualização
    await invalidateUserSession(user.id);
    
    return NextResponse.json({
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? "",
      jobTitle: updated.jobTitle ?? "",
      company: updated.company ?? "",
      account,
      avatarUrl: updated.avatarUrl ?? "",
      discordTag: updated.discordTag ?? "",
      phoneVerified: updated.phoneVerified ?? false,
      pendingEmail: updated.pendingEmail ?? "",
      emailVerifiedAt: updated.emailVerifiedAt ?? null,
      emailVerificationToken: updated.emailVerificationToken ?? null,
      twoFactor: updated.twoFactor ?? false,
    });
  } catch (e) {
    return NextResponse.json({ error: "Falha ao salvar no banco" }, { status: 500 });
  }
}