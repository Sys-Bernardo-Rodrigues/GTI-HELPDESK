import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function isValidDiscordTag(tag: string) {
  // username#0000 (4 digits discriminator)
  return /^[A-Za-z0-9_\.]{2,32}#\d{4}$/.test(tag);
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const discordTag = typeof body?.discordTag === "string" ? body.discordTag : body?.discordTag?.toString() ?? "";
  if (!discordTag || !isValidDiscordTag(discordTag)) {
    return NextResponse.json({ error: "Usuário do Discord inválido. Use formato username#0000" }, { status: 400 });
  }

  // Check availability (unique across users)
  const exists = await prisma.user.findFirst({ where: { discordTag, NOT: { id: user.id } } });
  if (exists) return NextResponse.json({ error: "Este usuário do Discord já está em uso" }, { status: 409 });

  const updated = await prisma.user.update({ where: { id: user.id }, data: { discordTag } });
  return NextResponse.json({ success: true, discordTag: updated.discordTag });
}