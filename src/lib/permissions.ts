import { prisma } from "./prisma";

/**
 * Verifica se um usuário tem uma permissão específica
 */
export async function hasPermission(userId: number, permissionKey: string): Promise<boolean> {
  try {
    const permission = await prisma.permission.findUnique({
      where: { key: permissionKey },
    });

    if (!permission) {
      return false;
    }

    const userPermission = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
    });

    // Se não houver registro, a permissão não foi concedida
    if (!userPermission) {
      return false;
    }

    return userPermission.granted;
  } catch (error) {
    console.error("[hasPermission]", error);
    return false;
  }
}

/**
 * Verifica se um usuário tem pelo menos uma das permissões fornecidas
 */
export async function hasAnyPermission(userId: number, permissionKeys: string[]): Promise<boolean> {
  for (const key of permissionKeys) {
    if (await hasPermission(userId, key)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifica se um usuário tem todas as permissões fornecidas
 */
export async function hasAllPermissions(userId: number, permissionKeys: string[]): Promise<boolean> {
  for (const key of permissionKeys) {
    if (!(await hasPermission(userId, key))) {
      return false;
    }
  }
  return true;
}

/**
 * Obtém todas as permissões de um usuário
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        granted: true,
      },
      include: {
        permission: true,
      },
    });

    return userPermissions.map((up) => up.permission.key);
  } catch (error) {
    console.error("[getUserPermissions]", error);
    return [];
  }
}

