import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sanitizeString(value: unknown, maxLength = 256) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "on"].includes(value.toLowerCase());
  if (typeof value === "number") return value === 1;
  return false;
}

function mapUserResponse(user: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  twoFactor: boolean;
  newsletter: boolean;
  avatarUrl: string | null;
  createdAt: Date | string | null;
}) {
  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    jobTitle: user.jobTitle ?? "",
    company: user.company ?? "",
    twoFactor: Boolean(user.twoFactor),
    newsletter: Boolean(user.newsletter),
    avatarUrl: user.avatarUrl ?? "",
    createdAt: typeof user.createdAt === "string" ? user.createdAt : user.createdAt?.toISOString?.() ?? null,
  };
}

export async function GET() {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        company: true,
        twoFactor: true,
        newsletter: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ items: users.map(mapUserResponse) });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao carregar usuários" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const name = sanitizeString((payload as any).name);
  const email = sanitizeString((payload as any).email);
  const password = sanitizeString((payload as any).password, 512);
  const phone = sanitizeString((payload as any).phone);
  const jobTitle = sanitizeString((payload as any).jobTitle);
  const company = sanitizeString((payload as any).company);
  const avatarUrl = sanitizeString((payload as any).avatarUrl, 512);
  const twoFactor = parseBoolean((payload as any).twoFactor);
  const newsletter = parseBoolean((payload as any).newsletter);

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        jobTitle: jobTitle || null,
        company: company || null,
        avatarUrl: avatarUrl || null,
        twoFactor,
        newsletter,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        company: true,
        twoFactor: true,
        newsletter: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(mapUserResponse(created), { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao criar usuário" }, { status: 500 });
  }
}

