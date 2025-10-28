import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.emailVerificationToken || dbUser.emailVerificationToken !== token || !dbUser.pendingEmail) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: dbUser.pendingEmail,
      pendingEmail: null,
      emailVerificationToken: null,
      emailVerifiedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, message: "E-mail confirmado com sucesso" });
}