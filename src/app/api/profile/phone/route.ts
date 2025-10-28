import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

function normalizeDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { phone } = await req.json();
  const digits = normalizeDigits(phone);
  if (digits.length < 10) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });

  // Reset verified flag if number changed
  const db = await prisma.user.findUnique({ where: { id: user.id } });
  const changed = db?.phone !== phone;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phone, phoneVerified: changed ? false : db?.phoneVerified ?? false },
  });
  return NextResponse.json({ success: true, phone: updated.phone, phoneVerified: updated.phoneVerified });
}