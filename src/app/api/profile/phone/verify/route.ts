import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// Import the in-memory store from request-code module (same bundle scope in dev)
import { __getCodesForTesting } from "../request-code/route";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const code = typeof body?.code === "string" ? body.code : body?.code?.toString() ?? "";
  if (!code) return NextResponse.json({ error: "Informe o código" }, { status: 400 });

  const store = __getCodesForTesting();
  const rec = store.get(user.id);
  if (!rec) return NextResponse.json({ error: "Solicite um novo código" }, { status: 400 });

  if (Date.now() > rec.expiresAt) {
    store.delete(user.id);
    return NextResponse.json({ error: "Código expirado" }, { status: 400 });
  }

  if (rec.code !== code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

  store.delete(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
  return NextResponse.json({ success: true, message: "Telefone verificado" });
}