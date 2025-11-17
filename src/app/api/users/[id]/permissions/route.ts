import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ id: string }>;

async function parseUserId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const userId = Number(params.id);
  if (!Number.isFinite(userId) || userId < 1) throw new Error("ID de usuário inválido");
  return userId;
}

// Listar permissões de um usuário
export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const userId = await parseUserId(context.params);

    // Buscar todas as permissões disponíveis
    const allPermissions = await prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Buscar permissões do usuário
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    });

    // Criar um mapa de permissões do usuário
    const userPermissionsMap = new Map(
      userPermissions.map((up) => [up.permissionId, up.granted])
    );

    // Combinar todas as permissões com o status do usuário
    const permissions = allPermissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      granted: userPermissionsMap.get(permission.id) ?? false, // Por padrão, não concedida
    }));

    return NextResponse.json({ items: permissions });
  } catch (error: any) {
    console.error("[user-permissions:GET]", error);
    return NextResponse.json({ error: error.message || "Erro ao buscar permissões do usuário" }, { status: 500 });
  }
}

// Atualizar permissões de um usuário
export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const userId = await parseUserId(context.params);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const permissions = body.permissions as Array<{ permissionId: number; granted: boolean }> | undefined;
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: "Permissões devem ser um array" }, { status: 400 });
    }

    // Verificar se o usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Atualizar permissões em uma transação
    await prisma.$transaction(
      permissions.map(({ permissionId, granted }) =>
        prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId,
            },
          },
          create: {
            userId,
            permissionId,
            granted,
          },
          update: {
            granted,
          },
        })
      )
    );

    // Buscar permissões atualizadas
    const updatedPermissions = await prisma.userPermission.findMany({
      where: { userId },
      include: {
        permission: true,
      },
    });

    return NextResponse.json({
      success: true,
      permissions: updatedPermissions.map((up) => ({
        permissionId: up.permissionId,
        granted: up.granted,
        permission: {
          id: up.permission.id,
          key: up.permission.key,
          name: up.permission.name,
          category: up.permission.category,
        },
      })),
    });
  } catch (error: any) {
    console.error("[user-permissions:PUT]", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar permissões" }, { status: 500 });
  }
}

