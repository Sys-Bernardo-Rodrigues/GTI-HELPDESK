import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function isStrongPassword(pw: string) {
  if (pw.length < 8) return false;
  const hasNumber = /\d/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return hasNumber && hasSpecial;
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { currentPassword, newPassword, confirmPassword } = await req.json();
  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "A confirmação não confere" }, { status: 400 });
  }
  if (!isStrongPassword(newPassword)) {
    return NextResponse.json({ error: "Senha fraca. Mínimo 8, com número e caractere especial" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.passwordHash) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  return NextResponse.json({ success: true, message: "Senha alterada com sucesso" });
}