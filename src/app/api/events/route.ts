import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const onlyMine = searchParams.get("onlyMine") === "true";

  try {
    const where: any = {};
    
    if (startDate && endDate) {
      const dateFilter = {
        OR: [
          {
            startDate: { gte: new Date(startDate), lte: new Date(endDate) },
          },
          {
            endDate: { gte: new Date(startDate), lte: new Date(endDate) },
          },
          {
            AND: [
              { startDate: { lte: new Date(startDate) } },
              { endDate: { gte: new Date(endDate) } },
            ],
          },
        ],
      };
      
      if (onlyMine) {
        where.AND = [{ userId: user.id }, dateFilter];
      } else {
        where.OR = dateFilter.OR;
      }
    } else if (onlyMine) {
      where.userId = user.id;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const items = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      color: event.color,
      isAllDay: event.isAllDay,
      userId: event.userId,
      userAvatar: event.user.avatarUrl,
      userName: event.user.name,
      type: "event" as const,
    }));

    // Buscar deadlines de projetos onde o usuário é membro ou criador
    const userProjects = await prisma.project.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { members: { some: { userId: user.id } } },
        ],
        endDate: { not: null },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Buscar deadlines de tarefas atribuídas ao usuário ou de projetos onde ele é membro
    const userTasks = await prisma.projectTask.findMany({
      where: {
        dueDate: { not: null },
        OR: [
          { assignedToId: user.id },
          {
            project: {
              OR: [
                { createdById: user.id },
                { members: { some: { userId: user.id } } },
              ],
            },
          },
        ],
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    // Filtrar por período se fornecido
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    // Adicionar deadlines de projetos
    // Se onlyMine estiver ativo, já filtramos apenas projetos do usuário acima
    const projectDeadlines = userProjects
      .filter((project) => {
        if (!project.endDate) return false;
        // Normalizar a data para meia-noite no fuso horário local para comparação
        const deadline = new Date(project.endDate);
        const normalizedDeadline = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 0, 0, 0, 0);
        if (start && end) {
          // Normalizar as datas de filtro também
          const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
          const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
          return normalizedDeadline >= normalizedStart && normalizedDeadline <= normalizedEnd;
        }
        return true;
      })
      .map((project) => {
        // Normalizar a data para meia-noite no fuso horário local
        const deadline = new Date(project.endDate!);
        const normalizedDeadline = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 0, 0, 0, 0);
        return {
          id: `project-${project.id}`,
          title: `📅 Deadline: ${project.name}`,
          description: `Prazo final do projeto ${project.name}`,
          startDate: normalizedDeadline.toISOString(),
          endDate: normalizedDeadline.toISOString(),
          location: null,
          color: project.color || "#ef4444",
          isAllDay: true,
          userId: project.createdById,
          userAvatar: project.createdBy.avatarUrl,
          userName: project.createdBy.name,
          type: "project-deadline" as const,
          projectId: project.id,
        };
      });

    // Adicionar deadlines de tarefas
    // Se onlyMine estiver ativo, já filtramos apenas tarefas atribuídas ao usuário ou de projetos dele
    const taskDeadlines = userTasks
      .filter((task) => {
        if (!task.dueDate) return false;
        // Normalizar a data para meia-noite no fuso horário local para comparação
        const deadline = new Date(task.dueDate);
        const normalizedDeadline = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 0, 0, 0, 0);
        if (start && end) {
          // Normalizar as datas de filtro também
          const normalizedStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
          const normalizedEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
          return normalizedDeadline >= normalizedStart && normalizedDeadline <= normalizedEnd;
        }
        return true;
      })
      .map((task) => {
        // Normalizar a data para meia-noite no fuso horário local
        const deadline = new Date(task.dueDate!);
        const normalizedDeadline = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 0, 0, 0, 0);
        const today = new Date();
        const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const isOverdue = normalizedDeadline < normalizedToday && task.status !== "DONE";
        return {
          id: `task-${task.id}`,
          title: `⏰ ${task.title}${isOverdue ? " (Atrasado)" : ""}`,
          description: `Deadline da tarefa: ${task.title}\nProjeto: ${task.project.name}${task.description ? `\n\n${task.description}` : ""}`,
          startDate: normalizedDeadline.toISOString(),
          endDate: normalizedDeadline.toISOString(),
          location: null,
          color: isOverdue ? "#ef4444" : (task.project.color || "#f59e0b"),
          isAllDay: true,
          userId: task.assignedToId || task.project.createdById,
          userAvatar: task.assignedTo?.avatarUrl || task.project.createdBy.avatarUrl,
          userName: task.assignedTo?.name || task.project.createdBy.name,
          type: "task-deadline" as const,
          taskId: task.id,
          projectId: task.projectId,
          taskStatus: task.status,
        };
      });

    // Combinar todos os eventos
    const allItems = [...items, ...projectDeadlines, ...taskDeadlines].sort((a, b) => {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateA - dateB;
    });

    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error("[events:GET]", error);
    return NextResponse.json({ error: "Erro ao buscar eventos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const startDate = body.startDate ? new Date(String(body.startDate)) : null;
    const endDate = body.endDate ? new Date(String(body.endDate)) : null;
    const location = typeof body.location === "string" ? body.location.trim() : null;
    const color = typeof body.color === "string" ? body.color : "#3b82f6";
    const isAllDay = typeof body.isAllDay === "boolean" ? body.isAllDay : false;

    if (!title) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    if (!startDate || !endDate) return NextResponse.json({ error: "Data de início e fim são obrigatórias" }, { status: 400 });
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "Data de fim deve ser posterior à data de início" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startDate,
        endDate,
        location,
        color,
        isAllDay,
        userId: user.id,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("[events:POST]", error);
    return NextResponse.json({ error: "Erro ao criar evento" }, { status: 500 });
  }
}

