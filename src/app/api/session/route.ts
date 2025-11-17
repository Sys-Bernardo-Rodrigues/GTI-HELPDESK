import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }
  
  // Buscar permissões do usuário
  const permissions = await getUserPermissions(user.id);
  
  return NextResponse.json({ ok: true, user, permissions });
}