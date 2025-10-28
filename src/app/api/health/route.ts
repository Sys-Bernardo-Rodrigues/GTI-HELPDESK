import { NextResponse } from "next/server";
import { assertDbConnection, prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const started = Date.now();
    await assertDbConnection();
    const duration = Date.now() - started;
    return NextResponse.json({ ok: true, db: "up", durationMs: duration });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, db: "down", error: e?.message ?? String(e) },
      { status: 500 }
    );
  } finally {
    if (process.env.NODE_ENV === "production") {
      await prisma.$disconnect();
    }
  }
}