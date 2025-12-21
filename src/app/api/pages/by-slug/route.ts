import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  if (!slug) return NextResponse.json({ error: "Slug ausente" }, { status: 400 });
  
  const page = await prisma.publicPage.findUnique({ 
    where: { slug },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  
  if (!page || !page.isPublished) {
    return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
  }
  
  return NextResponse.json({ 
    id: page.id, 
    title: page.title, 
    description: page.description,
    content: page.content,
    blocks: page.blocks,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  });
}

