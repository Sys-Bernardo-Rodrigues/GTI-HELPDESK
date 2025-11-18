import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendEmailVerificationEmail, generateCode } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email : body?.email?.toString() ?? "";
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  // Check availability
  const exists = await prisma.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (exists) return NextResponse.json({ error: "E-mail já em uso" }, { status: 409 });

  const token = generateToken();
  const dbUser = await prisma.user.update({
    where: { id: user.id },
    data: { pendingEmail: email, emailVerificationToken: token },
    select: { name: true },
  });

  // Enviar email de verificação
  const emailSent = await sendEmailVerificationEmail(email, token, dbUser.name || undefined);

  if (!emailSent) {
    console.warn("Falha ao enviar email de verificação, mas token foi gerado");
  }

  const verifyUrl = `${req.nextUrl.origin}/api/profile/email/verify?token=${token}`;
  return NextResponse.json({
    success: true,
    message: emailSent
      ? "E-mail de confirmação enviado. Verifique sua caixa de entrada."
      : "Token gerado. Verifique o console para o link de verificação.",
    verifyUrl: emailSent ? undefined : verifyUrl, // Só retorna URL se email não foi enviado
  });
}