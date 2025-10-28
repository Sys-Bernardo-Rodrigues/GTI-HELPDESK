import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

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
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true, email: true, name: true },
  });
  return user ?? null;
}