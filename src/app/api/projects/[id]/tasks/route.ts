import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectProgress } from "@/lib/projectProgress";

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
    const projectId = await parseRawId(context.params);
    
    // Verificar se o projeto existe e o usuário tem acesso
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

    const isCreator = project.createdById === user.id;
    const isMember = project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para acessar este projeto" }, { status: 403 });
    }

    const tasks = await prisma.projectTask.findMany({
      where: { projectId },
      orderBy: [{ parentTaskId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: { subtasks: true },
        },
      },
    });

    return NextResponse.json({
      items: tasks.map((task) => ({
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assignedToId: task.assignedToId,
        assignedTo: task.assignedTo ? {
          id: task.assignedTo.id,
          name: task.assignedTo.name,
          email: task.assignedTo.email,
          avatarUrl: task.assignedTo.avatarUrl,
        } : null,
        createdById: task.createdById,
        createdBy: {
          id: task.createdBy.id,
          name: task.createdBy.name,
          email: task.createdBy.email,
          avatarUrl: task.createdBy.avatarUrl,
        },
        parentTaskId: task.parentTaskId,
        order: task.order,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        subtasksCount: task._count.subtasks,
      })),
    });
  } catch (error: any) {
    console.error("Erro ao carregar tarefas:", error);
    return NextResponse.json({ error: error?.message || "Erro ao carregar tarefas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const projectId = await parseRawId(context.params);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

    // Verificar se o projeto existe e o usuário tem acesso
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

    const isCreator = project.createdById === user.id;
    const isMember = project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para criar tarefas neste projeto" }, { status: 403 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "Título da tarefa é obrigatório" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : null;
    const status = typeof body.status === "string" ? body.status : "TODO";
    const priority = typeof body.priority === "string" ? body.priority : "MEDIUM";
    const parentTaskId = typeof body.parentTaskId === "number" ? body.parentTaskId : null;
    
    let assignedToId: number | null = null;
    if (body.assignedToId !== null && body.assignedToId !== undefined) {
      const parsed = Number(body.assignedToId);
      if (Number.isFinite(parsed) && parsed > 0) assignedToId = parsed;
    }

    let dueDate: Date | null = null;
    if (body.dueDate) {
      // Para datas de vencimento (dia inteiro), criar como meia-noite no fuso horário local
      const dateStr = String(body.dueDate);
      // Se for formato YYYY-MM-DD, criar como meia-noite local
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        dueDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      } else {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          // Normalizar para meia-noite no fuso horário local
          dueDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
        }
      }
    }

    // Se for uma subtarefa, verificar se a tarefa pai existe e pertence ao mesmo projeto
    if (parentTaskId) {
      const parentTask = await prisma.projectTask.findUnique({
        where: { id: parentTaskId },
      });
      if (!parentTask || parentTask.projectId !== projectId) {
        return NextResponse.json({ error: "Tarefa pai inválida" }, { status: 400 });
      }
    }

    // Calcular a ordem (última posição)
    const lastTask = await prisma.projectTask.findFirst({
      where: { projectId, parentTaskId: parentTaskId || null },
      orderBy: { order: "desc" },
    });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description,
        status: status as any,
        priority: priority as any,
        dueDate,
        assignedToId,
        createdById: user.id,
        parentTaskId,
        order,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: { subtasks: true },
        },
      },
    });

    // Atualizar progresso do projeto baseado nas tarefas
    await updateProjectProgress(projectId);

    return NextResponse.json({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedToId: task.assignedToId,
      assignedTo: task.assignedTo ? {
        id: task.assignedTo.id,
        name: task.assignedTo.name,
        email: task.assignedTo.email,
        avatarUrl: task.assignedTo.avatarUrl,
      } : null,
      createdById: task.createdById,
      createdBy: {
        id: task.createdBy.id,
        name: task.createdBy.name,
        email: task.createdBy.email,
        avatarUrl: task.createdBy.avatarUrl,
      },
      parentTaskId: task.parentTaskId,
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      subtasksCount: task._count.subtasks,
    });
  } catch (error: any) {
    console.error("Erro ao criar tarefa:", error);
    return NextResponse.json({ error: error?.message || "Erro ao criar tarefa" }, { status: 500 });
  }
}

