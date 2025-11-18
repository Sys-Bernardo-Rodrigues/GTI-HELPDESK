import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, generateCode } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email : body?.email?.toString() || "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "E-mail inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Por segurança, não revelamos se o email existe ou não
      return NextResponse.json({
        ok: true,
        message: "Se o e-mail existir, você receberá um link para redefinir sua senha.",
      });
    }

    // Gerar token de recuperação
    const token = generateCode(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });

    // Enviar email
    const emailSent = await sendPasswordResetEmail(user.email, token, user.name);

    if (!emailSent) {
      console.error("Falha ao enviar email de recuperação de senha");
      return NextResponse.json({
        ok: true,
        message: "Se o e-mail existir, você receberá um link para redefinir sua senha.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Se o e-mail existir, você receberá um link para redefinir sua senha.",
    });
  } catch (error: any) {
    console.error("Erro ao processar recuperação de senha:", error);
    return NextResponse.json({ ok: false, error: "Erro ao processar solicitação" }, { status: 500 });
  }
}

