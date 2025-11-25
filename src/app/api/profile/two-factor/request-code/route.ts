import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { sendTwoFactorCodeEmail, generateCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, twoFactor: true },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    // Gerar código de 6 dígitos
    const code = generateCode(6);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

    // Salvar código no banco (usando o campo twoFactorCode)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorCodeExpires: expiresAt,
      },
    });

    // Enviar código por email
    const emailSent = await sendTwoFactorCodeEmail(dbUser.email, code, dbUser.name || undefined);

    if (!emailSent) {
      console.warn("Falha ao enviar código 2FA, mas código foi gerado");
    }

    return NextResponse.json({
      ok: true,
      message: emailSent
        ? "Código de verificação enviado para seu e-mail"
        : "Código gerado. Verifique o console para o código.",
      code: emailSent ? undefined : code, // Só retorna código se email não foi enviado (dev)
    });
  } catch (error: any) {
    console.error("Erro ao gerar código 2FA:", error);
    return NextResponse.json({ ok: false, error: "Erro ao gerar código" }, { status: 500 });
  }
}




