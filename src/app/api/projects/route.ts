import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateProjectProgress } from "@/lib/projectProgress";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    // Buscar total de registros
    const total = await prisma.project.count();

    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    // Otimização: Calcular progresso apenas se necessário (pode ser feito em background job)
    // Por enquanto, usar o progresso armazenado e atualizar em batch se necessário
    const items = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress, // Usar progresso armazenado (atualizado por job ou sob demanda)
      startDate: project.startDate,
      endDate: project.endDate,
      color: project.color,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      createdBy: {
        id: project.createdBy.id,
        name: project.createdBy.name,
        email: project.createdBy.email,
        avatarUrl: project.createdBy.avatarUrl,
      },
      members: project.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
        },
      })),
      ticketsCount: project._count.tickets,
    }));

    return NextResponse.json(createPaginatedResponse(items, total, page, limit));
  } catch (error: any) {
    console.error("Erro ao carregar projetos:", error);
    return NextResponse.json({ error: error?.message || "Erro ao carregar projetos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Nome do projeto é obrigatório" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : null;
    const status = typeof body.status === "string" ? body.status : "PLANNING";
    // Progresso será calculado automaticamente baseado nas tarefas, então sempre começa em 0
    const progress = 0;
    const color = typeof body.color === "string" ? body.color : "#3b82f6";
    
    let startDate: Date | null = null;
    if (body.startDate) {
      const parsed = new Date(body.startDate as string);
      if (!isNaN(parsed.getTime())) startDate = parsed;
    }
    
    let endDate: Date | null = null;
    if (body.endDate) {
      const parsed = new Date(body.endDate as string);
      if (!isNaN(parsed.getTime())) endDate = parsed;
    }

    const memberIds = Array.isArray(body.memberIds) 
      ? (body.memberIds as unknown[]).map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
      : [];

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status as any,
        progress,
        startDate,
        endDate,
        color,
        createdById: user.id,
        members: memberIds.length > 0 ? {
          create: memberIds.map((userId) => ({
            userId,
            role: "MEMBER",
          })),
        } : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      color: project.color,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      createdBy: {
        id: project.createdBy.id,
        name: project.createdBy.name,
        email: project.createdBy.email,
        avatarUrl: project.createdBy.avatarUrl,
      },
      members: project.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        user: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarUrl: member.user.avatarUrl,
        },
      })),
      ticketsCount: project._count.tickets,
    });
  } catch (error: any) {
    console.error("Erro ao criar projeto:", error);
    return NextResponse.json({ error: error?.message || "Erro ao criar projeto" }, { status: 500 });
  }
}

