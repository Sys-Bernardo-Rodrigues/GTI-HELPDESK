import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ id: string }>;

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
  };
}

async function getUserId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function GET(_req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(context.params);
  if (!userId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        accessProfiles: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...mapUserResponse(user),
      accessProfile: user.accessProfiles[0]?.profile || null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Falha ao buscar usuário" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await getUserId(context.params);
  if (!userId) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const name = sanitizeString((payload as any).name);
  const email = sanitizeString((payload as any).email);
  const phone = sanitizeString((payload as any).phone);
  const jobTitle = sanitizeString((payload as any).jobTitle);
  const company = sanitizeString((payload as any).company);
  const avatarUrl = sanitizeString((payload as any).avatarUrl, 512);
  const twoFactor = parseBoolean((payload as any).twoFactor);
  const newsletter = parseBoolean((payload as any).newsletter);
  const accessProfileId = typeof (payload as any).accessProfileId === "number" 
    ? (payload as any).accessProfileId 
    : typeof (payload as any).accessProfileId === "string" 
      ? (payload as any).accessProfileId === "" ? null : parseInt((payload as any).accessProfileId, 10)
      : null;

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
  }

  try {
    // Verificar se o perfil de acesso existe (se fornecido)
    if (accessProfileId && !isNaN(accessProfileId)) {
      const profile = await prisma.accessProfile.findUnique({
        where: { id: accessProfileId },
      });
      if (!profile) {
        return NextResponse.json({ error: "Perfil de acesso não encontrado" }, { status: 400 });
      }
    }

    // Remover perfis existentes e adicionar o novo (se fornecido)
    if (accessProfileId && !isNaN(accessProfileId)) {
      await prisma.userAccessProfile.deleteMany({
        where: { userId },
      });
    } else if (accessProfileId === null) {
      // Se accessProfileId for null explicitamente, remover todos os perfis
      await prisma.userAccessProfile.deleteMany({
        where: { userId },
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: phone || null,
        jobTitle: jobTitle || null,
        company: company || null,
        avatarUrl: avatarUrl || null,
        twoFactor,
        newsletter,
        accessProfiles: accessProfileId && !isNaN(accessProfileId) ? {
          create: {
            profileId: accessProfileId,
          },
        } : undefined,
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
        accessProfiles: {
          include: {
            profile: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...mapUserResponse(updated),
      accessProfile: updated.accessProfiles[0]?.profile || null,
    });
  } catch (error: any) {
    if (error && typeof error === "object" && "code" in error && (error as any).code === "P2002") {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

