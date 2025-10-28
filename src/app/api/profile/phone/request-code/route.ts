import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

// In-memory store for demo/testing only
const codes = new Map<number, { code: string; expiresAt: number }>();

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const code = genCode();
  codes.set(user.id, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  // In produção, enviar o SMS com `code` aqui.
  return NextResponse.json({ success: true, message: "Código enviado por SMS", debugCode: code });
}

// Helper for verification route to access the map from same module instance
export function __getCodesForTesting() {
  return codes;
}