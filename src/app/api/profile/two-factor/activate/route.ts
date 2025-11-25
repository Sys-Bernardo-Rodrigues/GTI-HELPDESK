import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const code = typeof body?.code === "string" ? body.code : body?.code?.toString() || "";

    if (!code) {
      return NextResponse.json({ ok: false, error: "Código é obrigatório" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorCode: true, twoFactorCodeExpires: true, twoFactor: true },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    // Verificar código
    if (!dbUser.twoFactorCode || !dbUser.twoFactorCodeExpires) {
      return NextResponse.json({ ok: false, error: "Código não encontrado. Solicite um novo código." }, { status: 400 });
    }

    if (new Date() > dbUser.twoFactorCodeExpires) {
      return NextResponse.json({ ok: false, error: "Código expirado. Solicite um novo código." }, { status: 400 });
    }

    if (dbUser.twoFactorCode !== code) {
      return NextResponse.json({ ok: false, error: "Código inválido" }, { status: 401 });
    }

    // Ativar 2FA e limpar código
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactor: true,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Autenticação de 2 fatores ativada com sucesso" });
  } catch (error: any) {
    console.error("Erro ao ativar 2FA:", error);
    return NextResponse.json({ ok: false, error: "Erro ao ativar 2FA" }, { status: 500 });
  }
}




