import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProjectProgress } from "@/lib/projectProgress";

type ParamsPromise = Promise<{ id: string; taskId: string }>;

async function parseIds(paramsPromise: ParamsPromise) {
  const params = await paramsPromise;
  const projectId = Number(params.id);
  const taskId = Number(params.taskId);
  if (!Number.isFinite(projectId) || projectId < 1) throw new Error("ID do projeto inválido");
  if (!Number.isFinite(taskId) || taskId < 1) throw new Error("ID da tarefa inválido");
  return { projectId, taskId };
}

export async function GET(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { projectId, taskId } = await parseIds(context.params);
    
    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { members: true } },
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: { subtasks: true },
        },
      },
    });

    if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    if (task.projectId !== projectId) {
      return NextResponse.json({ error: "Tarefa não pertence a este projeto" }, { status: 400 });
    }

    const isCreator = task.project.createdById === user.id;
    const isMember = task.project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para acessar esta tarefa" }, { status: 403 });
    }

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
    console.error("Erro ao carregar tarefa:", error);
    return NextResponse.json({ error: error?.message || "Erro ao carregar tarefa" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { projectId, taskId } = await parseIds(context.params);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { members: true } },
      },
    });

    if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    if (task.projectId !== projectId) {
      return NextResponse.json({ error: "Tarefa não pertence a este projeto" }, { status: 400 });
    }

    const isCreator = task.project.createdById === user.id;
    const isMember = task.project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para editar esta tarefa" }, { status: 403 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : task.title;
    if (!title) return NextResponse.json({ error: "Título da tarefa é obrigatório" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim() : task.description;
    const status = typeof body.status === "string" ? body.status : task.status;
    const priority = typeof body.priority === "string" ? body.priority : task.priority;
    
    let assignedToId: number | null = task.assignedToId;
    if (body.assignedToId !== undefined) {
      if (body.assignedToId === null) {
        assignedToId = null;
      } else {
        const parsed = Number(body.assignedToId);
        if (Number.isFinite(parsed) && parsed > 0) assignedToId = parsed;
      }
    }

    let dueDate: Date | null = task.dueDate;
    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        dueDate = null;
      } else {
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
    }

    let parentTaskId: number | null = task.parentTaskId;
    if (body.parentTaskId !== undefined) {
      if (body.parentTaskId === null) {
        parentTaskId = null;
      } else {
        const parsed = Number(body.parentTaskId);
        if (Number.isFinite(parsed) && parsed > 0) {
          // Verificar se a tarefa pai existe e pertence ao mesmo projeto
          const parentTask = await prisma.projectTask.findUnique({
            where: { id: parsed },
          });
          if (!parentTask || parentTask.projectId !== projectId || parentTask.id === taskId) {
            return NextResponse.json({ error: "Tarefa pai inválida" }, { status: 400 });
          }
          parentTaskId = parsed;
        }
      }
    }

    const updated = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        title,
        description,
        status: status as any,
        priority: priority as any,
        dueDate,
        assignedToId,
        parentTaskId,
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
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      dueDate: updated.dueDate,
      assignedToId: updated.assignedToId,
      assignedTo: updated.assignedTo ? {
        id: updated.assignedTo.id,
        name: updated.assignedTo.name,
        email: updated.assignedTo.email,
        avatarUrl: updated.assignedTo.avatarUrl,
      } : null,
      createdById: updated.createdById,
      createdBy: {
        id: updated.createdBy.id,
        name: updated.createdBy.name,
        email: updated.createdBy.email,
        avatarUrl: updated.createdBy.avatarUrl,
      },
      parentTaskId: updated.parentTaskId,
      order: updated.order,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      subtasksCount: updated._count.subtasks,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar tarefa" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: ParamsPromise }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { projectId, taskId } = await parseIds(context.params);

    const task = await prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: { include: { members: true } },
      },
    });

    if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    if (task.projectId !== projectId) {
      return NextResponse.json({ error: "Tarefa não pertence a este projeto" }, { status: 400 });
    }

    const isCreator = task.project.createdById === user.id;
    const isMember = task.project.members.some((m) => m.userId === user.id);
    if (!isCreator && !isMember) {
      return NextResponse.json({ error: "Sem permissão para deletar esta tarefa" }, { status: 403 });
    }

    await prisma.projectTask.delete({
      where: { id: taskId },
    });

    // Atualizar progresso do projeto baseado nas tarefas
    await updateProjectProgress(projectId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar tarefa:", error);
    return NextResponse.json({ error: error?.message || "Erro ao deletar tarefa" }, { status: 500 });
  }
}

