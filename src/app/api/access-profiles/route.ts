import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const profiles = await prisma.accessProfile.findMany({
      include: {
        pages: {
          orderBy: { pageName: "asc" },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const items = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      isDefault: profile.isDefault,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      pages: profile.pages.map((page) => ({
        id: page.id,
        pagePath: page.pagePath,
        pageName: page.pageName,
      })),
      userCount: profile._count.users,
      users: profile.users.map((up) => ({
        id: up.user.id,
        name: up.user.name,
        email: up.user.email,
      })),
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Erro ao listar perfis de acesso:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao listar perfis de acesso" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, pagePaths } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nome do perfil é obrigatório" }, { status: 400 });
    }

    if (!Array.isArray(pagePaths)) {
      return NextResponse.json({ error: "pagePaths deve ser um array" }, { status: 400 });
    }

    // Definir nomes das páginas baseado nos paths
    const pageNamesMap: Record<string, string> = {
      "/home": "Início",
      "/tickets": "Tickets",
      "/base": "Base de Conhecimento",
      "/agenda": "Agenda",
      "/history": "Histórico",
      "/relatorios": "Relatórios",
      "/aprovacoes": "Aprovações",
      "/projetos": "Projetos",
      "/users": "Usuários",
      "/config?section=forms": "Formulários",
      "/config?section=webhooks": "Webhooks",
      "/config/acessos": "Acessos",
      "/profile": "Perfil",
    };

    const profile = await prisma.accessProfile.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        pages: {
          create: pagePaths.map((path: string) => ({
            pagePath: path,
            pageName: pageNamesMap[path] || path,
          })),
        },
      },
      include: {
        pages: true,
      },
    });

    return NextResponse.json({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      isDefault: profile.isDefault,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      pages: profile.pages.map((page) => ({
        id: page.id,
        pagePath: page.pagePath,
        pageName: page.pageName,
      })),
    });
  } catch (error: any) {
    console.error("Erro ao criar perfil de acesso:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao criar perfil de acesso" },
      { status: 500 }
    );
  }
}

