import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const token = typeof body?.token === "string" ? body.token : body?.token?.toString() || "";
    const password = typeof body?.password === "string" ? body.password : body?.password?.toString() || "";

    if (!token) {
      return NextResponse.json({ ok: false, error: "Token é obrigatório" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Senha deve ter pelo menos 8 caracteres" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Token inválido ou expirado" }, { status: 400 });
    }

    // Atualizar senha e limpar token
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Senha redefinida com sucesso" });
  } catch (error: any) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json({ ok: false, error: "Erro ao redefinir senha" }, { status: 500 });
  }
}




