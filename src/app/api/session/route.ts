import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  // Buscar perfil de acesso do usuário
  const userAccessProfile = await prisma.userAccessProfile.findFirst({
    where: { userId: user.id },
    include: {
      profile: {
        include: {
          pages: {
            select: {
              pagePath: true,
              pageName: true,
            },
          },
        },
      },
    },
  });

  const accessProfile = userAccessProfile?.profile || null;
  const allowedPages = accessProfile?.pages.map((p) => p.pagePath) || [];

  return NextResponse.json({
    ok: true,
    user: {
      ...user,
      accessProfile: accessProfile
        ? {
            id: accessProfile.id,
            name: accessProfile.name,
            allowedPages,
          }
        : null,
    },
  });
}