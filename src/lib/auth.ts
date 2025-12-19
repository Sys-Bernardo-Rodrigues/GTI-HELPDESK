import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession, setSession, deleteSession } from "@/lib/redis";

export type AuthUser = { id: number; email: string; name: string | null };

function getSecret() {
  return process.env.AUTH_SECRET || "dev-secret";
}

export async function verifyTokenFromCookies(): Promise<{ userId: number } | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("auth_token");
    const token = tokenCookie?.value;
    
    if (!token) return null;
    
    const payload = jwt.verify(token, getSecret()) as { sub: number };
    if (!payload?.sub) return null;
    return { userId: Number(payload.sub) };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const verified = await verifyTokenFromCookies();
  if (!verified) return null;
  
  // Tentar obter do cache Redis primeiro
  const cachedUser = await getSession(verified.userId);
  if (cachedUser && cachedUser.id === verified.userId) {
    return cachedUser as AuthUser;
  }
  
  // Se não estiver em cache, buscar do banco
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, name: true },
  });
  
  // Armazenar no cache para próximas requisições
  if (user) {
    await setSession(verified.userId, user);
  }
  
  return user ?? null;
}

/**
 * Invalidar sessão do usuário (útil em logout ou atualização de perfil)
 */
export async function invalidateUserSession(userId: number): Promise<void> {
  await deleteSession(userId);
}