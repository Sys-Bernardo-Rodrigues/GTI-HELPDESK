import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const profile = await prisma.accessProfile.findUnique({
      where: { id: profileId },
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
    });

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
    }

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
      userCount: profile._count.users,
      users: profile.users.map((up) => ({
        id: up.user.id,
        name: up.user.name,
        email: up.user.email,
      })),
    });
  } catch (error: any) {
    console.error("Erro ao obter perfil de acesso:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao obter perfil de acesso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
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

    // Atualizar perfil e páginas
    const profile = await prisma.accessProfile.update({
      where: { id: profileId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        pages: {
          deleteMany: {},
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
    console.error("Erro ao atualizar perfil de acesso:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar perfil de acesso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const profileId = parseInt(id, 10);

    if (isNaN(profileId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se o perfil está sendo usado
    const userCount = await prisma.userAccessProfile.count({
      where: { profileId },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um perfil que está sendo usado por usuários" },
        { status: 400 }
      );
    }

    await prisma.accessProfile.delete({
      where: { id: profileId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir perfil de acesso:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao excluir perfil de acesso" },
      { status: 500 }
    );
  }
}

