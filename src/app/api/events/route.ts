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
    }));

    return NextResponse.json({ items });
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

