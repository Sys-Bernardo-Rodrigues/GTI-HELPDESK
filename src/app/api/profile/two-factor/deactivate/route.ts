import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    // Desativar 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactor: false,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Autenticação de 2 fatores desativada com sucesso" });
  } catch (error: any) {
    console.error("Erro ao desativar 2FA:", error);
    return NextResponse.json({ ok: false, error: "Erro ao desativar 2FA" }, { status: 500 });
  }
}

