import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/permissions";

/**
 * Retorna todas as permissões do usuário autenticado
 * Usado para verificar permissões no frontend
 */
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const permissions = await getUserPermissions(user.id);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("[user-permissions:GET]", error);
    return NextResponse.json({ error: "Erro ao buscar permissões" }, { status: 500 });
  }
}

