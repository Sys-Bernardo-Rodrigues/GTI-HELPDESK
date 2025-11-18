import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ParamsPromise = Promise<{ id: string }>;

async function parseRawId(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const rawId = params.id;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id < 1) throw new Error("ID inválido");
  return id;
}

export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const id = await parseRawId(context.params);
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

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
      tickets: project.tickets,
      ticketsCount: project._count.tickets,
    });
  } catch (error: any) {
    console.error("Erro ao carregar projeto:", error);
    return NextResponse.json({ error: error?.message || "Erro ao carregar projeto" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const id = await parseRawId(context.params);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

    // Verificar se o usuário é o criador ou membro
    const isCreator = project.createdById === user.id;
    const isMember = project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para editar este projeto" }, { status: 403 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : project.name;
    if (!name) return NextResponse.json({ error: "Nome do projeto é obrigatório" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : project.description;
    const status = typeof body.status === "string" ? body.status : project.status;
    // Progresso não pode ser editado manualmente, é calculado automaticamente baseado nas tarefas
    // Vamos recalcular o progresso baseado nas tarefas
    const { calculateProjectProgress } = await import("@/lib/projectProgress");
    const calculatedProgress = await calculateProjectProgress(id);
    const color = typeof body.color === "string" ? body.color : project.color;
    
    let startDate: Date | null = project.startDate;
    if (body.startDate !== undefined) {
      if (body.startDate === null) {
        startDate = null;
      } else {
        const parsed = new Date(body.startDate as string);
        if (!isNaN(parsed.getTime())) startDate = parsed;
      }
    }
    
    let endDate: Date | null = project.endDate;
    if (body.endDate !== undefined) {
      if (body.endDate === null) {
        endDate = null;
      } else {
        const parsed = new Date(body.endDate as string);
        if (!isNaN(parsed.getTime())) endDate = parsed;
      }
    }

    // Atualizar membros se fornecido
    if (Array.isArray(body.memberIds)) {
      const memberIds = (body.memberIds as unknown[])
        .map((id) => Number(id))
        .filter((id) => !isNaN(id) && id > 0 && id !== user.id); // Não incluir o criador

      // Remover membros que não estão mais na lista
      const currentMemberIds = project.members.map((m) => m.userId);
      const toRemove = currentMemberIds.filter((id) => !memberIds.includes(id));
      
      // Adicionar novos membros
      const toAdd = memberIds.filter((id) => !currentMemberIds.includes(id));

      await prisma.$transaction([
        ...toRemove.map((userId) =>
          prisma.projectMember.deleteMany({
            where: { projectId: id, userId },
          })
        ),
        ...toAdd.map((userId) =>
          prisma.projectMember.create({
            data: { projectId: id, userId, role: "MEMBER" },
          })
        ),
      ]);
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status: status as any,
        progress: calculatedProgress,
        startDate,
        endDate,
        color,
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
      id: updated.id,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      progress: updated.progress,
      startDate: updated.startDate,
      endDate: updated.endDate,
      color: updated.color,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      createdBy: {
        id: updated.createdBy.id,
        name: updated.createdBy.name,
        email: updated.createdBy.email,
        avatarUrl: updated.createdBy.avatarUrl,
      },
      members: updated.members.map((member) => ({
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
      ticketsCount: updated._count.tickets,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar projeto:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar projeto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const id = await parseRawId(context.params);
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

    // Apenas o criador pode deletar
    if (project.createdById !== user.id) {
      return NextResponse.json({ error: "Apenas o criador pode deletar o projeto" }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar projeto:", error);
    return NextResponse.json({ error: error?.message || "Erro ao deletar projeto" }, { status: 500 });
  }
}

