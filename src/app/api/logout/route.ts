import { NextResponse } from "next/server";
import { verifyTokenFromCookies, invalidateUserSession } from "@/lib/auth";

export async function POST() {
  // Invalidar sessão no Redis antes de remover o cookie
  const verified = await verifyTokenFromCookies();
  if (verified) {
    await invalidateUserSession(verified.userId);
  }
  
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}