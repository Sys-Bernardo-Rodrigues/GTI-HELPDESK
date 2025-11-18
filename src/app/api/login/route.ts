import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendTwoFactorCodeEmail, generateCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email : body?.email?.toString() || "";
    const password = typeof body?.password === "string" ? body.password : body?.password?.toString() || "";
    const twoFactorCode = typeof body?.twoFactorCode === "string" ? body.twoFactorCode : body?.twoFactorCode?.toString() || "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email e senha são obrigatórios" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Credenciais inválidas" }, { status: 401 });
    }

    // Verificar se 2FA está habilitado (sempre true agora)
    if (user.twoFactor) {
      // Se não forneceu código, gerar e enviar
      if (!twoFactorCode) {
        const code = generateCode(6);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorCode: code,
            twoFactorCodeExpires: expiresAt,
          },
        });

        // Enviar código por email
        const emailSent = await sendTwoFactorCodeEmail(user.email, code, user.name || undefined);

        return NextResponse.json({
          ok: false,
          requiresTwoFactor: true,
          message: emailSent
            ? "Código de verificação enviado para seu e-mail"
            : "Código gerado. Verifique o console para o código.",
          code: emailSent ? undefined : code, // Só retorna código se email não foi enviado (dev)
        });
      }

      // Verificar código 2FA
      if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
        return NextResponse.json({ ok: false, error: "Código de verificação não encontrado. Solicite um novo código." }, { status: 400 });
      }

      if (new Date() > user.twoFactorCodeExpires) {
        return NextResponse.json({ ok: false, error: "Código de verificação expirado. Solicite um novo código." }, { status: 400 });
      }

      if (user.twoFactorCode !== twoFactorCode) {
        return NextResponse.json({ ok: false, error: "Código de verificação inválido" }, { status: 401 });
      }

      // Limpar código após uso
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: null,
          twoFactorCodeExpires: null,
        },
      });
    }

    // Gerar token JWT
    const secret = process.env.AUTH_SECRET || "dev-secret";
    const token = jwt.sign({ sub: user.id, email: user.email, name: user.name }, secret, { expiresIn: "7d" });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e: any) {
    console.error("Erro no login:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro" }, { status: 500 });
  }
}