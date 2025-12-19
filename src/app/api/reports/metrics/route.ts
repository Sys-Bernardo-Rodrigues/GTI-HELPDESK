import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Métricas gerais do sistema
    const [
      totalUsers,
      totalTickets,
      totalForms,
      totalCategories,
      totalAccessProfiles,
      totalWebhooks,
      closedTickets,
      ticketsByStatus,
      ticketsWithUpdates,
      recentTickets,
      recentUsers,
      topForms,
      ticketsByCategory,
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),

      // Total de tickets
      prisma.ticket.count(),

      // Total de formulários
      prisma.form.count(),

      // Total de categorias
      prisma.category.count(),

      // Total de perfis de acesso
      prisma.accessProfile.count(),

      // Total de webhooks
      prisma.webhook.count(),

      // Tickets encerrados
      prisma.ticket.count({
        where: { status: "CLOSED" },
      }),

      // Tickets por status
      prisma.ticket.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // Tickets com atualizações
      prisma.ticket.count({
        where: {
          updates: {
            some: {},
          },
        },
      }),

      // Tickets recentes (últimos 7 dias)
      prisma.ticket.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Usuários recentes (últimos 30 dias)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Top 5 formulários por uso (através de submissions)
      prisma.form.findMany({
        take: 5,
        include: {
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: [
          {
            submissions: {
              _count: "desc",
            },
          },
        ],
      }),

      // Tickets por categoria
      prisma.ticket.groupBy({
        by: ["categoryId"],
        _count: { categoryId: true },
        where: {
          categoryId: {
            not: null,
          },
        },
      }),
    ]);

    // Buscar nomes das categorias para tickets por categoria
    const categoryIds = ticketsByCategory.map((t) => t.categoryId).filter((id): id is number => id !== null);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Calcular taxa de resolução
    const resolutionRate = totalTickets > 0 ? (closedTickets / totalTickets) * 100 : 0;

    // Calcular taxa de tickets com resposta
    const responseRate = totalTickets > 0 ? (ticketsWithUpdates / totalTickets) * 100 : 0;

    // Mapear tickets por status
    const statusBreakdown: Record<string, number> = {};
    ticketsByStatus.forEach((item) => {
      statusBreakdown[item.status] = item._count.status;
    });

    // Mapear tickets por categoria
    const categoryBreakdown = ticketsByCategory.map((item) => ({
      categoryId: item.categoryId!,
      categoryName: categoryMap.get(item.categoryId!) || "Sem categoria",
      count: item._count.categoryId,
    }));

    // Top formulários (ordenar por submissions e pegar top 5)
    const topFormsData = topForms
      .sort((a, b) => b._count.submissions - a._count.submissions)
      .slice(0, 5)
      .map((form) => ({
        id: form.id,
        title: form.title,
        slug: form.slug,
        submissionsCount: form._count.submissions,
      }));

    // Calcular tempo médio de resolução (para tickets fechados)
    const closedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        status: "CLOSED",
        createdAt: { not: null },
        updatedAt: { not: null },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
      take: 1000, // Limitar para performance
    });

    let avgResolutionTime: number | null = null;
    if (closedTicketsWithTime.length > 0) {
      const resolutionTimes = closedTicketsWithTime
        .map((ticket) => {
          const created = new Date(ticket.createdAt).getTime();
          const updated = new Date(ticket.updatedAt).getTime();
          return updated - created;
        })
        .filter((time) => time > 0 && Number.isFinite(time));

      if (resolutionTimes.length > 0) {
        avgResolutionTime = Math.round(
          resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / (1000 * 60)
        ); // em minutos
      }
    }

    // Métricas de atividade (últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      ticketsLast30DaysList,
      usersLast30DaysList,
      formsLast30DaysList,
      ticketsByDayList,
    ] = await Promise.all([
      // Tickets criados nos últimos 30 dias
      prisma.ticket.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),

      // Usuários criados nos últimos 30 dias
      prisma.user.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),

      // Formulários criados nos últimos 30 dias
      prisma.form.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),

      // Buscar todos os tickets dos últimos 30 dias para agrupar por dia manualmente
      prisma.ticket.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),
    ]);

    // Agrupar tickets por dia
    const ticketsByDayMap: Record<string, number> = {};
    ticketsByDayList.forEach((ticket) => {
      const day = new Date(ticket.createdAt).toISOString().split("T")[0];
      ticketsByDayMap[day] = (ticketsByDayMap[day] || 0) + 1;
    });

    return NextResponse.json({
      general: {
        totalUsers,
        totalTickets,
        totalForms,
        totalCategories,
        totalAccessProfiles,
        totalWebhooks,
        closedTickets,
        resolutionRate: Math.round(resolutionRate * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100,
        avgResolutionTimeMinutes: avgResolutionTime,
      },
      statusBreakdown,
      categoryBreakdown,
      topForms: topFormsData,
      recent: {
        ticketsLast7Days: recentTickets,
        usersLast30Days: recentUsers,
        ticketsLast30DaysCount: ticketsLast30DaysList.length,
        usersLast30DaysCount: usersLast30DaysList.length,
        formsLast30DaysCount: formsLast30DaysList.length,
      },
      activity: {
        ticketsByDay: ticketsByDayMap,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar métricas:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar métricas do sistema" },
      { status: 500 }
    );
  }
}

