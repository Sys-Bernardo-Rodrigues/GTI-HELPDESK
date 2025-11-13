import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

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
  await prisma.user.update({
    where: { id: user.id },
    data: { pendingEmail: email, emailVerificationToken: token },
  });

  // In produção, enviaria um e-mail contendo o link abaixo:
  const verifyUrl = `${req.nextUrl.origin}/api/profile/email/verify?token=${token}`;
  return NextResponse.json({ success: true, message: "E-mail de confirmação enviado", verifyUrl });
}