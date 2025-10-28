import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email?.toString() || "";
    const password = body?.password?.toString() || "";
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
    return NextResponse.json({ ok: false, error: e?.message ?? "Erro" }, { status: 500 });
  }
}