import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Listar todas as permissões disponíveis no sistema
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ items: permissions });
  } catch (error) {
    console.error("[permissions:GET]", error);
    return NextResponse.json({ error: "Erro ao buscar permissões" }, { status: 500 });
  }
}

// Criar uma nova permissão (apenas para inicialização do sistema)
export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const key = typeof body.key === "string" ? body.key.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const category = typeof body.category === "string" ? body.category.trim() : "general";

    if (!key || !name) {
      return NextResponse.json({ error: "Chave e nome são obrigatórios" }, { status: 400 });
    }

    const permission = await prisma.permission.create({
      data: {
        key,
        name,
        description,
        category,
      },
    });

    return NextResponse.json(permission);
  } catch (error: any) {
    console.error("[permissions:POST]", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Permissão com esta chave já existe" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar permissão" }, { status: 500 });
  }
}

