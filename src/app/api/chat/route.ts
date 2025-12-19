import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callLocalAi, isLocalAiEnabled, LocalAiMessage } from "@/lib/localAi";
import crypto from "crypto";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ConversationEntry = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_ITEMS = 8;

// Cache de respostas usando Redis (fallback para Map em memória se Redis não estiver disponível)
import { getChatCache, setChatCache } from "@/lib/redis";

// Fallback: cache em memória se Redis não estiver disponível
const memoryCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Limpar cache em memória antigo periodicamente (apenas como fallback)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto

// Função para normalizar texto (remover acentos, lowercase)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Sistema de sinônimos expandidos
const RAW_SYNONYM_GROUPS: Record<string, string[]> = {
  ticket: ["ticket", "tickets", "chamado", "chamados", "solicitacao", "solicitacoes", "incidente", "incidentes", "protocolo", "protocolos"],
  document: ["documento", "documentos", "artigo", "artigos", "manual", "manuais", "procedimento", "procedimentos", "tutorial", "tutoriais", "guia", "guias", "kb", "base", "documentacao", "documentação"],
  password: ["senha", "senhas", "password", "passwords", "credencial", "credenciais", "login", "logins", "acesso", "acessos", "usuario", "usuarios", "conta", "contas"],
  file: ["arquivo", "arquivos", "anexo", "anexos", "upload", "uploads", "download", "downloads", "documento anexado"],
  agenda: ["agenda", "agendas", "compromisso", "compromissos", "reuniao", "reunioes", "reunião", "reuniões", "evento", "eventos", "calendario", "calendário"],
  history: ["historico", "historicos", "histórico", "históricos", "atualizacao", "atualizacoes", "atualização", "atualizações", "comentario", "comentarios", "comentário", "comentários", "log", "logs", "registro", "registros"],
  statistics: ["estatistica", "estatisticas", "estatística", "estatísticas", "metrica", "metricas", "métrica", "métricas", "dashboard", "resumo", "quantidade", "quantidades", "total", "totais", "numeros", "números", "dados"],
  report: ["relatorio", "relatorios", "relatório", "relatórios", "analise", "analises", "análise", "análises", "insights"],
};

const SYNONYM_GROUPS: Record<string, Set<string>> = Object.entries(RAW_SYNONYM_GROUPS).reduce(
  (acc, [key, synonyms]) => {
    const normalizedKey = normalizeText(key);
    const normalizedSet = new Set<string>([normalizedKey]);
    synonyms.forEach((term) => normalizedSet.add(normalizeText(term)));
    acc[normalizedKey] = normalizedSet;
    return acc;
  },
  {} as Record<string, Set<string>>
);

const SYNONYM_LOOKUP: Record<string, string> = {};
Object.entries(SYNONYM_GROUPS).forEach(([canonical, terms]) => {
  terms.forEach((term) => {
    SYNONYM_LOOKUP[term] = canonical;
  });
});

function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set<string>();
  for (const keyword of keywords) {
    const normalized = normalizeText(keyword);
    const canonical = SYNONYM_LOOKUP[normalized] || normalized;
    expanded.add(canonical);
    const relatedTerms = SYNONYM_GROUPS[canonical];
    if (relatedTerms) {
      relatedTerms.forEach((term) => expanded.add(term));
    }
  }
  return Array.from(expanded);
}

// Função para extrair palavras-chave de uma pergunta
function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const stopWords = new Set([
    "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas", "por", "para", "com", "sem",
    "que", "qual", "quais", "como", "quando", "onde", "porque",
    "é", "são", "está", "estão", "foi", "foram", "ser", "estar",
    "tem", "têm", "ter", "me", "te", "se", "nos", "vocês",
    "eu", "ele", "ela", "eles", "elas", "nós", "você", "vocês",
    "mostre", "mostrar", "listar", "lista", "buscar", "busca", "encontrar", "encontre"
  ]);
  
  const baseKeywords = normalized
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  return expandKeywords(baseKeywords);
}

// Função para calcular similaridade entre duas strings (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeText(str1).split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(normalizeText(str2).split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Função para extrair número de ID de uma pergunta (melhorada)
function extractId(text: string): number | null {
  const match = text.match(/#?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Função para extrair URLs de uma pergunta
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Função para extrair emails de uma pergunta
function extractEmails(text: string): string[] {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  return text.match(emailRegex) || [];
}

// Função melhorada para extrair entidades nomeadas
function extractNamedEntities(text: string): {
  ids: number[];
  urls: string[];
  emails: string[];
  dates: Array<{ date: Date; isToday?: boolean; isTomorrow?: boolean }>;
} {
  return {
    ids: [extractId(text)].filter((id): id is number => id !== null),
    urls: extractUrls(text),
    emails: extractEmails(text),
    dates: [extractDate(text)].filter((d): d is NonNullable<typeof d> => d !== null),
  };
}

// Função para extrair data da pergunta (melhorada)
function extractDate(text: string): { date?: Date; isToday?: boolean; isTomorrow?: boolean } | null {
  const normalized = normalizeText(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Detectar "hoje"
  if (normalized.includes("hoje") || normalized.includes("today")) {
    return { date: new Date(today), isToday: true };
  }
  
  // Detectar "amanhã"
  if (normalized.includes("amanha") || normalized.includes("amanhã") || normalized.includes("tomorrow")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: tomorrow, isTomorrow: true };
  }
  
  // Detectar "ontem"
  if (normalized.includes("ontem") || normalized.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { date: yesterday };
  }
  
  // Detectar "semana passada", "última semana"
  if (normalized.includes("semana passada") || normalized.includes("ultima semana") || normalized.includes("última semana")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return { date: lastWeek };
  }
  
  // Detectar "próxima semana"
  if (normalized.includes("proxima semana") || normalized.includes("próxima semana") || normalized.includes("next week")) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return { date: nextWeek };
  }
  
  // Tentar extrair data no formato DD/MM/YYYY ou YYYY-MM-DD
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    let day: number, month: number, year: number;
    if (dateMatch[0].includes("/")) {
      day = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      year = parseInt(dateMatch[3], 10);
    } else {
      year = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      day = parseInt(dateMatch[3], 10);
    }
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return { date };
    }
  }
  
  return null;
}

// Função para sanitizar histórico de conversa
function sanitizeHistory(entries: any): ConversationEntry[] {
  if (!Array.isArray(entries)) return [];
  const cleaned = entries
    .map((entry) => {
      const role = entry?.role === "assistant" ? "assistant" : "user";
      const content = typeof entry?.content === "string" ? entry.content.trim() : "";
      return { role, content };
    })
    .filter((entry) => entry.content.length > 0);
  return cleaned.slice(-MAX_HISTORY_ITEMS);
}

// Função para gerar chave de cache baseada na mensagem e contexto
function generateCacheKey(message: string, intent: any, userId: number): string {
  const normalized = normalizeText(message);
  const intentStr = JSON.stringify(intent);
  return crypto.createHash("md5").update(`${userId}:${normalized}:${intentStr}`).digest("hex");
}

// Função para buscar resposta no cache (Redis com fallback para memória)
async function getCachedResponse(cacheKey: string): Promise<string | null> {
  try {
    // Tentar Redis primeiro
    const redisCache = await getChatCache(cacheKey);
    if (redisCache) {
      return redisCache;
    }
  } catch (error) {
    // Se Redis falhar, usar cache em memória
    console.warn("[Chat Cache] Redis não disponível, usando cache em memória:", error);
  }
  
  // Fallback: cache em memória
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }
  if (cached) {
    memoryCache.delete(cacheKey);
  }
  return null;
}

// Função para salvar resposta no cache (Redis com fallback para memória)
async function setCachedResponse(cacheKey: string, response: string): Promise<void> {
  try {
    // Tentar Redis primeiro
    await setChatCache(cacheKey, response);
  } catch (error) {
    // Se Redis falhar, usar cache em memória
    console.warn("[Chat Cache] Redis não disponível, usando cache em memória:", error);
    memoryCache.set(cacheKey, { response, timestamp: Date.now() });
  }
}

// Função para extrair nome de usuário da pergunta
async function extractUserName(text: string): Promise<number | null> {
  const normalized = normalizeText(text);
  const keywords = extractKeywords(text);
  
  // Buscar usuários no banco
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });
  
  // Tentar encontrar usuário por nome ou email
  for (const keyword of keywords) {
    for (const user of users) {
      const userName = normalizeText(user.name || "");
      const userEmail = normalizeText(user.email || "");
      if (userName.includes(keyword) || userEmail.includes(keyword)) {
        return user.id;
      }
    }
  }
  
  return null;
}

// Função para detectar filtros na pergunta
function detectFilters(text: string): {
  status?: string;
  category?: string;
  assignedToMe?: boolean;
  myTickets?: boolean;
  dateRange?: { start?: Date; end?: Date };
} {
  const normalized = normalizeText(text);
  const filters: any = {};
  
  // Detectar status
  if (normalized.includes("aberto") || normalized.includes("abertos")) {
    filters.status = "OPEN";
  } else if (normalized.includes("em andamento") || normalized.includes("andamento")) {
    filters.status = "IN_PROGRESS";
  } else if (normalized.includes("resolvido") || normalized.includes("resolvidos")) {
    filters.status = "RESOLVED";
  } else if (normalized.includes("fechado") || normalized.includes("fechados")) {
    filters.status = "CLOSED";
  } else if (normalized.includes("observacao") || normalized.includes("observação")) {
    filters.status = "OBSERVATION";
  }
  
  // Detectar "meus tickets" ou "tickets atribuídos a mim"
  if (normalized.includes("meus") || normalized.includes("minhas") || normalized.includes("atribuido a mim")) {
    filters.myTickets = true;
    filters.assignedToMe = true;
  }
  
  return filters;
}

// Função para detectar ações diretas
function detectAction(text: string): {
  action: "close_ticket" | "create_document" | "update_ticket_status" | null;
  ticketId?: number;
  status?: string;
  documentTitle?: string;
  documentContent?: string;
} | null {
  const normalized = normalizeText(text);
  const ticketId = extractId(text);
  
  // Detectar "fechar ticket #X" ou "encerrar ticket #X"
  if (
    (normalized.includes("fechar") || normalized.includes("encerrar") || normalized.includes("finalizar")) &&
    (normalized.includes("ticket") || normalized.includes("chamado")) &&
    ticketId !== null
  ) {
    return {
      action: "close_ticket",
      ticketId,
      status: "CLOSED",
    };
  }
  
  // Detectar "mudar status do ticket #X para Y"
  if (
    normalized.includes("mudar") || normalized.includes("alterar") || normalized.includes("atualizar")
  ) {
    if (normalized.includes("status") && ticketId !== null) {
      let status: string | undefined;
      if (normalized.includes("aberto") || normalized.includes("open")) status = "OPEN";
      else if (normalized.includes("andamento") || normalized.includes("progress")) status = "IN_PROGRESS";
      else if (normalized.includes("resolvido") || normalized.includes("resolved")) status = "RESOLVED";
      else if (normalized.includes("fechado") || normalized.includes("closed")) status = "CLOSED";
      else if (normalized.includes("observacao") || normalized.includes("observation")) status = "OBSERVATION";
      
      if (status) {
        return {
          action: "update_ticket_status",
          ticketId,
          status,
        };
      }
    }
  }
  
  // Detectar "criar documento sobre X" ou "adicionar documento X"
  if (
    (normalized.includes("criar") || normalized.includes("adicionar") || normalized.includes("novo")) &&
    (normalized.includes("documento") || normalized.includes("artigo") || normalized.includes("manual"))
  ) {
    // Tentar extrair título do documento
    const titleMatch = text.match(/(?:sobre|título|nome|chamado|de|do|da)\s+(.+?)(?:\s+com\s+conteúdo|\s+com\s+texto|$)/i);
    const title = titleMatch ? titleMatch[1].trim() : text.replace(/(?:criar|adicionar|novo)\s+(?:documento|artigo|manual)\s+(?:sobre|título|nome|chamado|de|do|da)?\s*/i, "").trim();
    
    return {
      action: "create_document",
      documentTitle: title || "Novo Documento",
      documentContent: "", // Será preenchido pelo usuário ou gerado
    };
  }
  
  return null;
}

// Função para detectar intenção da pergunta (melhorada)
function detectIntent(text: string): {
  type: "document" | "ticket" | "statistics" | "password" | "history" | "report" | "file" | "agenda" | "help" | "general" | "action";
  keywords: string[];
  filters?: any;
  id?: number | null;
  action?: ReturnType<typeof detectAction>;
} {
  const normalized = normalizeText(text);
  const keywords = extractKeywords(text);
  const id = extractId(text);
  const filters = detectFilters(text);
  const action = detectAction(text);
  
  // Se detectou uma ação, retornar tipo "action"
  if (action) {
    return { type: "action", keywords, filters, id, action };
  }
  
  // Detectar busca por ID específico
  if (id !== null) {
    if (normalized.includes("ticket") || normalized.includes("chamado")) {
      return { type: "ticket", keywords, filters, id };
    }
    if (normalized.includes("documento") || normalized.includes("artigo")) {
      return { type: "document", keywords, filters, id };
    }
  }
  
  // Detectar busca por senhas
  if (
    normalized.includes("senha") ||
    normalized.includes("password") ||
    normalized.includes("credencial") ||
    normalized.includes("acesso") ||
    normalized.includes("login") ||
    normalized.includes("usuario") ||
    normalized.includes("conta") ||
    normalized.includes("credenciais")
  ) {
    return { type: "password", keywords, filters };
  }
  
  // Detectar busca por histórico
  if (
    normalized.includes("historico") ||
    normalized.includes("histórico") ||
    normalized.includes("atualizacao") ||
    normalized.includes("atualização") ||
    normalized.includes("comentario") ||
    normalized.includes("comentário") ||
    normalized.includes("registro") ||
    normalized.includes("log") ||
    normalized.includes("atualizacoes")
  ) {
    return { type: "history", keywords, filters };
  }
  
  // Detectar busca por relatórios
  if (
    normalized.includes("relatorio") ||
    normalized.includes("relatório") ||
    normalized.includes("report") ||
    normalized.includes("analise") ||
    normalized.includes("análise") ||
    normalized.includes("dados") ||
    normalized.includes("metricas") ||
    normalized.includes("métricas") ||
    normalized.includes("dashboard")
  ) {
    return { type: "report", keywords, filters };
  }
  
  // Detectar busca por arquivos
  if (
    normalized.includes("arquivo") ||
    normalized.includes("file") ||
    normalized.includes("download") ||
    normalized.includes("anexo") ||
    normalized.includes("documento anexado") ||
    normalized.includes("arquivos")
  ) {
    return { type: "file", keywords, filters };
  }
  
  // Detectar busca por documentos
  if (
    normalized.includes("documento") ||
    normalized.includes("artigo") ||
    normalized.includes("base de conhecimento") ||
    normalized.includes("conhecimento") ||
    normalized.includes("como fazer") ||
    normalized.includes("procedimento") ||
    normalized.includes("tutorial") ||
    normalized.includes("guia") ||
    normalized.includes("manual") ||
    normalized.includes("documentacao") ||
    normalized.includes("documentação")
  ) {
    return { type: "document", keywords, filters };
  }
  
  // Detectar busca por agenda/eventos
  if (
    normalized.includes("agenda") ||
    normalized.includes("compromisso") ||
    normalized.includes("compromissos") ||
    normalized.includes("evento") ||
    normalized.includes("eventos") ||
    normalized.includes("reuniao") ||
    normalized.includes("reunião") ||
    normalized.includes("reunioes") ||
    normalized.includes("reuniões") ||
    normalized.includes("hoje") ||
    normalized.includes("amanha") ||
    normalized.includes("amanhã") ||
    normalized.includes("data") ||
    normalized.includes("datas") ||
    normalized.includes("calendario") ||
    normalized.includes("calendário")
  ) {
    return { type: "agenda", keywords, filters };
  }
  
  // Detectar busca por tickets agendados (com data ou usuário específico)
  if (
    (normalized.includes("ticket") || normalized.includes("chamado") || normalized.includes("tickets") || normalized.includes("chamados")) &&
    (normalized.includes("hoje") || normalized.includes("amanha") || normalized.includes("amanhã") || normalized.includes("data") || normalized.includes("agendado") || normalized.includes("agendados") || /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/.test(text))
  ) {
    // Se menciona ticket + data, tratar como agenda
    return { type: "agenda", keywords, filters };
  }
  
  // Detectar busca por tickets
  if (
    normalized.includes("ticket") ||
    normalized.includes("chamado") ||
    normalized.includes("solicitação") ||
    normalized.includes("problema") ||
    normalized.includes("atendimento") ||
    normalized.includes("aberto") ||
    normalized.includes("fechado") ||
    normalized.includes("status") ||
    normalized.includes("tickets") ||
    normalized.includes("chamados")
  ) {
    return { type: "ticket", keywords, filters, id };
  }
  
  // Detectar estatísticas
  if (
    normalized.includes("quantos") ||
    normalized.includes("quantidade") ||
    normalized.includes("total") ||
    normalized.includes("estatística") ||
    normalized.includes("métrica") ||
    normalized.includes("resumo") ||
    normalized.includes("estatisticas") ||
    normalized.includes("estatísticas") ||
    normalized.includes("numeros") ||
    normalized.includes("números")
  ) {
    return { type: "statistics", keywords, filters };
  }
  
  // Detectar ajuda geral
  if (
    normalized.includes("ajuda") ||
    normalized.includes("help") ||
    normalized.includes("o que") ||
    normalized.includes("quem") ||
    normalized.includes("onde") ||
    normalized.includes("como usar") ||
    normalized.includes("funciona")
  ) {
    return { type: "help", keywords, filters };
  }
  
  return { type: "general", keywords, filters };
}

// Buscar documentos relevantes (descriptografados)
async function searchDocuments(keywords: string[], userId: number): Promise<any[]> {
  let allDocs;
  
  if (keywords.length === 0) {
    allDocs = await prisma.document.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  } else {
    allDocs = await prisma.document.findMany({
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  }
  
  // Descriptografar conteúdo dos documentos
  const decryptedDocs = allDocs.map(doc => {
    try {
      const decryptedContent = decrypt(doc.content).toString("utf8");
      return {
        ...doc,
        content: decryptedContent,
      };
    } catch (error) {
      // Se falhar, pode ser documento antigo não criptografado
      return doc;
    }
  });
  
  if (keywords.length === 0) {
    return decryptedDocs;
  }
  
  // Busca semântica melhorada
  const scoredDocs = decryptedDocs.map(doc => {
    const docText = normalizeText(`${doc.title} ${doc.content} ${doc.category || ""} ${doc.tags || ""}`);
    let score = 0;
    
    // Calcular similaridade geral
    const queryText = keywords.join(" ");
    const similarity = calculateSimilarity(queryText, docText);
    score += similarity * 10;
    
    // Pontuação por palavras-chave
    for (const keyword of keywords) {
      if (doc.title.toLowerCase().includes(keyword)) {
        score += 5; // Título tem peso maior
      }
      if (doc.content.toLowerCase().includes(keyword)) {
        score += 2;
      }
      if (doc.category?.toLowerCase().includes(keyword)) {
        score += 3;
      }
      if (doc.tags?.toLowerCase().includes(keyword)) {
        score += 2;
      }
    }
    
    // Bonus para documentos recentes
    const daysSinceUpdate = (Date.now() - new Date(doc.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      score += 1;
    }
    
    return { doc, score };
  });
  
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.doc);
}

// Buscar tickets relevantes (melhorado com filtros e busca semântica)
async function searchTickets(keywords: string[], userId: number, filters?: any, ticketId?: number | null): Promise<any[]> {
  // Se há um ID específico, buscar diretamente
  if (ticketId) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        updates: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    return ticket ? [ticket] : [];
  }
  
  // Construir filtros de busca
  const whereClause: any = {};
  
  if (filters?.status) {
    whereClause.status = filters.status;
  }
  
  if (filters?.myTickets || filters?.assignedToMe) {
    whereClause.OR = [
      { userId },
      { assignedToId: userId },
    ];
  }
  
  const allTickets = await prisma.ticket.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  
  if (keywords.length === 0) {
    return allTickets.slice(0, 10);
  }
  
  // Busca semântica melhorada com scoring
  const scoredTickets = allTickets.map(ticket => {
    const ticketText = normalizeText(`${ticket.title} ${ticket.description || ""} ${ticket.category?.name || ""}`);
    let score = 0;
    
    // Calcular similaridade geral
    const queryText = keywords.join(" ");
    const similarity = calculateSimilarity(queryText, ticketText);
    score += similarity * 10;
    
    // Pontuação por palavras-chave individuais
    for (const keyword of keywords) {
      if (ticket.title.toLowerCase().includes(keyword)) {
        score += 5; // Título tem peso maior
      }
      if (ticket.description?.toLowerCase().includes(keyword)) {
        score += 2;
      }
      if (ticket.category?.name.toLowerCase().includes(keyword)) {
        score += 3;
      }
    }
    
    // Bonus para tickets recentes
    const daysSinceUpdate = (Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score += 1;
    }
    
    return { ticket, score };
  });
  
  return scoredTickets
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.ticket);
}

// Buscar arquivos relevantes (descriptografados)
async function searchFiles(keywords: string[], userId: number): Promise<any[]> {
  let allFiles;
  
  if (keywords.length === 0) {
    allFiles = await prisma.file.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  } else {
    allFiles = await prisma.file.findMany({
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  }
  
  // Descriptografar descrição dos arquivos
  const decryptedFiles = allFiles.map(file => {
    try {
      let decryptedDescription: string | null = null;
      if (file.description) {
        try {
          decryptedDescription = decrypt(file.description).toString("utf8");
        } catch (error) {
          decryptedDescription = file.description; // Fallback se não estiver criptografado
        }
      }
      return {
        ...file,
        description: decryptedDescription,
      };
    } catch (error) {
      return file;
    }
  });
  
  if (keywords.length === 0) {
    return decryptedFiles;
  }
  
  // Busca simples por palavras-chave
  const scoredFiles = decryptedFiles.map(file => {
    const fileText = normalizeText(`${file.originalName} ${file.description || ""} ${file.category || ""} ${file.tags || ""}`);
    let score = 0;
    
    for (const keyword of keywords) {
      if (fileText.includes(keyword)) {
        score += file.originalName.toLowerCase().includes(keyword) ? 3 : 1;
      }
    }
    
    return { file, score };
  });
  
  return scoredFiles
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.file);
}

// Buscar senhas relevantes (de todos os usuários, descriptografadas)
async function searchPasswords(keywords: string[], userId: number): Promise<any[]> {
  const allPasswords = await prisma.passwordVault.findMany({
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
  
  // Descriptografar senhas, usernames e notas
  const decryptedPasswords = allPasswords.map(password => {
    try {
      let decryptedPassword = "";
      let decryptedUsername: string | null = null;
      let decryptedNotes: string | null = null;
      
      // Descriptografar senha
      if (password.password) {
        try {
          decryptedPassword = decrypt(password.password).toString("utf8");
        } catch (error) {
          decryptedPassword = password.password; // Fallback se não estiver criptografado
        }
      }
      
      // Descriptografar username
      if (password.username) {
        try {
          decryptedUsername = decrypt(password.username).toString("utf8");
        } catch (error) {
          decryptedUsername = password.username; // Fallback
        }
      }
      
      // Descriptografar notes
      if (password.notes) {
        try {
          decryptedNotes = decrypt(password.notes).toString("utf8");
        } catch (error) {
          decryptedNotes = password.notes; // Fallback
        }
      }
      
      return {
        ...password,
        password: decryptedPassword,
        username: decryptedUsername,
        notes: decryptedNotes,
      };
    } catch (error) {
      // Em caso de erro crítico, retornar sem descriptografar
      return password;
    }
  });
  
  if (keywords.length === 0) {
    return decryptedPasswords.slice(0, 10);
  }
  
  // Busca simples por palavras-chave (usando dados descriptografados)
  const scoredPasswords = decryptedPasswords.map(password => {
    const passwordText = normalizeText(`${password.title} ${password.username || ""} ${password.url || ""} ${password.notes || ""} ${password.category || ""} ${password.tags || ""}`);
    let score = 0;
    
    for (const keyword of keywords) {
      if (passwordText.includes(keyword)) {
        score += password.title.toLowerCase().includes(keyword) ? 3 : 1;
      }
    }
    
    return { password, score };
  });
  
  return scoredPasswords
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.password);
}

// Buscar histórico (atualizações de tickets)
async function searchHistory(keywords: string[], userId: number): Promise<any[]> {
  const allUpdates = await prisma.ticketUpdate.findMany({
    include: {
      ticket: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  
  if (keywords.length === 0) {
    return allUpdates.slice(0, 10);
  }
  
  // Busca simples por palavras-chave
  const scoredUpdates = allUpdates.map(update => {
    const updateText = normalizeText(`${update.content} ${update.ticket.title} ${update.ticket.category?.name || ""}`);
    let score = 0;
    
    for (const keyword of keywords) {
      if (updateText.includes(keyword)) {
        score += update.content.toLowerCase().includes(keyword) ? 2 : 1;
      }
    }
    
    return { update, score };
  });
  
  return scoredUpdates
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.update);
}

// Obter estatísticas do sistema
async function getStatistics(userId: number): Promise<any> {
  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    observationTickets,
    resolvedTickets,
    closedTickets,
    totalDocuments,
    totalUsers,
    totalPasswords,
    totalUpdates,
    recentTickets,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.ticket.count({ where: { status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { status: "OBSERVATION" } }),
    prisma.ticket.count({ where: { status: "RESOLVED" } }),
    prisma.ticket.count({ where: { status: "CLOSED" } }),
    prisma.document.count(),
    prisma.user.count(),
    prisma.passwordVault.count(),
    prisma.ticketUpdate.count(),
    prisma.ticket.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
        },
      },
    }),
  ]);
  
  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    observationTickets,
    resolvedTickets,
    closedTickets,
    totalDocuments,
    totalUsers,
    totalPasswords,
    totalUpdates,
    recentTickets,
  };
}

// Buscar eventos e tickets agendados (agenda)
async function searchAgenda(keywords: string[], userId: number, targetUserId?: number | null, targetDate?: Date | null): Promise<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Se não há data específica, usar hoje como padrão
  const searchDate = targetDate || today;
  const startOfDay = new Date(searchDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(searchDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Buscar eventos
  const eventWhere: any = {
    OR: [
      {
        startDate: { gte: startOfDay, lte: endOfDay },
      },
      {
        endDate: { gte: startOfDay, lte: endOfDay },
      },
      {
        AND: [
          { startDate: { lte: startOfDay } },
          { endDate: { gte: endOfDay } },
        ],
      },
    ],
  };
  
  if (targetUserId) {
    eventWhere.userId = targetUserId;
  }
  
  const events = await prisma.event.findMany({
    where: eventWhere,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { startDate: "asc" },
  });
  
  // Buscar tickets agendados
  const ticketWhere: any = {
    scheduledAt: { gte: startOfDay, lte: endOfDay },
  };
  
  if (targetUserId) {
    ticketWhere.OR = [
      { userId: targetUserId },
      { assignedToId: targetUserId },
    ];
  }
  
  const scheduledTickets = await prisma.ticket.findMany({
    where: ticketWhere,
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
  
  // Se há palavras-chave, filtrar por relevância
  if (keywords.length > 0) {
    const filteredEvents = events.filter(event => {
      const eventText = normalizeText(`${event.title} ${event.description || ""} ${event.location || ""}`);
      return keywords.some(keyword => eventText.includes(keyword));
    });
    
    const filteredTickets = scheduledTickets.filter(ticket => {
      const ticketText = normalizeText(`${ticket.title} ${ticket.description || ""}`);
      return keywords.some(keyword => ticketText.includes(keyword));
    });
    
    return {
      events: filteredEvents,
      tickets: filteredTickets,
      date: searchDate,
    };
  }
  
  // Buscar nome do usuário se foi especificado
  let userName: string | null = null;
  if (targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, email: true },
    });
    userName = user?.name || user?.email || null;
  }
  
  return {
    events,
    tickets: scheduledTickets,
    date: searchDate,
    userName,
  };
}

// Obter relatórios detalhados
async function getReports(userId: number): Promise<any> {
  const [
    ticketsByStatus,
    ticketsByCategory,
    ticketsByUser,
    recentUpdates,
    documentsByCategory,
  ] = await Promise.all([
    prisma.ticket.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.ticket.groupBy({
      by: ["categoryId"],
      _count: true,
    }),
    prisma.ticket.groupBy({
      by: ["userId"],
      _count: true,
    }),
    prisma.ticketUpdate.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        ticket: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["category"],
      _count: true,
    }),
  ]);
  
  // Buscar nomes de categorias
  const categoryIds = ticketsByCategory.map(t => t.categoryId).filter(Boolean) as number[];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  
  // Buscar nomes de usuários
  const userIds = ticketsByUser.map(t => t.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  
  const userMap = new Map(users.map(u => [u.id, u.name || u.email]));
  
  return {
    ticketsByStatus,
    ticketsByCategory: ticketsByCategory.map(t => ({
      categoryId: t.categoryId,
      categoryName: t.categoryId ? categoryMap.get(t.categoryId) || "Sem categoria" : "Sem categoria",
      count: t._count,
    })),
    ticketsByUser: ticketsByUser.map(t => ({
      userId: t.userId,
      userName: userMap.get(t.userId) || "Desconhecido",
      count: t._count,
    })),
    recentUpdates,
    documentsByCategory,
  };
}

// Gerar resposta baseada na intenção e dados encontrados
function generateResponse(
  intent: { type: string; keywords: string[] },
  documents: any[],
  tickets: any[],
  passwords: any[],
  history: any[],
  files: any[],
  agenda: any,
  statistics: any,
  reports: any,
  originalQuestion: string
): string {
  switch (intent.type) {
    case "document":
      if (documents.length === 0) {
        const variations = [
          "Não encontrei documentos relacionados à sua busca. Tente usar palavras-chave diferentes ou verifique a base de conhecimento.",
          "Hmm, não consegui encontrar documentos que correspondam à sua busca. Que tal tentar outras palavras-chave?",
          "Não encontrei nada na base de conhecimento com esses termos. Pode reformular sua busca?",
        ];
        return variations[Math.floor(Math.random() * variations.length)];
      }
      
      const docIntroVariations = [
        `Encontrei ${documents.length} documento(s) relacionado(s) à sua busca`,
        `Achei ${documents.length} documento(s) que podem te ajudar`,
        `Encontrei ${documents.length} documento(s) relevantes na base de conhecimento`,
        `Aqui estão ${documents.length} documento(s) que encontrei`,
      ];
      let docResponse = `${docIntroVariations[Math.floor(Math.random() * docIntroVariations.length)]}:\n\n`;
      documents.forEach((doc, idx) => {
        docResponse += `${idx + 1}. **${doc.title}**\n`;
        if (doc.category) docResponse += `   📁 Categoria: ${doc.category}\n`;
        if (doc.content) {
          const preview = doc.content.substring(0, 150);
          docResponse += `   📝 ${preview}${doc.content.length > 150 ? "..." : ""}\n`;
        }
        docResponse += "\n";
      });
      
      return docResponse;
    
    case "ticket":
      if (tickets.length === 0) {
        const variations = [
          "Não encontrei tickets relacionados à sua busca. Tente usar palavras-chave diferentes ou verifique se há tickets com essas características.",
          "Hmm, não consegui encontrar tickets que correspondam à sua busca. Que tal tentar outras palavras-chave?",
          "Não encontrei nenhum ticket com essas características. Pode reformular sua busca?",
        ];
        return variations[Math.floor(Math.random() * variations.length)];
      }
      
      // Se há apenas um ticket (provavelmente busca por ID), mostrar detalhes completos
      if (tickets.length === 1 && tickets[0].updates) {
        const ticket = tickets[0];
        const introVariations = [
          `Aqui estão os detalhes do **Ticket #${ticket.id}**: ${ticket.title}`,
          `Encontrei o **Ticket #${ticket.id}**: ${ticket.title}`,
          `Aqui está o **Ticket #${ticket.id}**: ${ticket.title}`,
        ];
        let ticketResponse = `${introVariations[Math.floor(Math.random() * introVariations.length)]}\n\n`;
        ticketResponse += `📊 **Status**: ${ticket.status}\n`;
        if (ticket.category) ticketResponse += `📁 **Categoria**: ${ticket.category.name}\n`;
        if (ticket.user) ticketResponse += `👤 **Solicitante**: ${ticket.user.name || ticket.user.email}\n`;
        if (ticket.assignedTo) ticketResponse += `✅ **Atribuído a**: ${ticket.assignedTo.name || ticket.assignedTo.email}\n`;
        if (ticket.description) {
          const desc = ticket.description.substring(0, 200);
          ticketResponse += `\n📝 **Descrição**: ${desc}${ticket.description.length > 200 ? "..." : ""}\n`;
        }
        if (ticket.updates && ticket.updates.length > 0) {
          ticketResponse += `\n📝 **Últimas Atualizações**:\n`;
          ticket.updates.slice(0, 3).forEach((update: any) => {
            ticketResponse += `   • ${update.content.substring(0, 100)}${update.content.length > 100 ? "..." : ""}\n`;
            ticketResponse += `     Por: ${update.user?.name || update.user?.email || "Sistema"} em ${new Date(update.createdAt).toLocaleDateString("pt-BR")}\n`;
          });
        }
        return ticketResponse;
      }
      
      const ticketIntroVariations = [
        `Encontrei ${tickets.length} ticket(s) relacionado(s) à sua busca`,
        `Achei ${tickets.length} ticket(s) que podem te interessar`,
        `Aqui estão ${tickets.length} ticket(s) encontrados`,
        `Encontrei ${tickets.length} ticket(s) relevantes`,
      ];
      let ticketResponse = `${ticketIntroVariations[Math.floor(Math.random() * ticketIntroVariations.length)]}:\n\n`;
      tickets.slice(0, 5).forEach((ticket, idx) => {
        ticketResponse += `${idx + 1}. **Ticket #${ticket.id}**: ${ticket.title}\n`;
        ticketResponse += `   📊 Status: ${ticket.status}\n`;
        if (ticket.category) ticketResponse += `   📁 Categoria: ${ticket.category.name}\n`;
        if (ticket.assignedTo) {
          ticketResponse += `   ✅ Atribuído a: ${ticket.assignedTo.name || ticket.assignedTo.email}\n`;
        } else {
          ticketResponse += `   ⚠️ Não atribuído\n`;
        }
        if (ticket.description) {
          const desc = ticket.description.substring(0, 80);
          ticketResponse += `   📝 ${desc}${ticket.description.length > 80 ? "..." : ""}\n`;
        }
        ticketResponse += "\n";
      });
      
      if (tickets.length > 5) {
        ticketResponse += `\n*Mostrando 5 de ${tickets.length} resultados. Seja mais específico para ver mais detalhes.*`;
      }
      
      return ticketResponse;
    
    case "password":
      if (passwords.length === 0) {
        const pwdNotFoundVariations = [
          "Não encontrei senhas relacionadas à sua busca. Verifique se há credenciais cadastradas no sistema.",
          "Hmm, não consegui encontrar credenciais com esses termos. Pode tentar outras palavras-chave?",
          "Não encontrei nenhuma credencial relacionada. Que tal reformular sua busca?",
        ];
        return pwdNotFoundVariations[Math.floor(Math.random() * pwdNotFoundVariations.length)];
      }
      
      const pwdIntroVariations = [
        `Encontrei ${passwords.length} credencial(is) relacionada(s) à sua busca`,
        `Achei ${passwords.length} credencial(is) que podem te interessar`,
        `Aqui estão ${passwords.length} credencial(is) encontradas`,
      ];
      let passwordResponse = `${pwdIntroVariations[Math.floor(Math.random() * pwdIntroVariations.length)]}:\n\n`;
      passwords.slice(0, 5).forEach((password, idx) => {
        passwordResponse += `${idx + 1}. **${password.title}**\n`;
        if (password.createdBy) {
          passwordResponse += `   👤 Criado por: ${password.createdBy.name || password.createdBy.email}\n`;
        }
        if (password.username) passwordResponse += `   Usuário: ${password.username}\n`;
        if (password.url) passwordResponse += `   URL: ${password.url}\n`;
        if (password.category) passwordResponse += `   Categoria: ${password.category}\n`;
        // Mostrar senha descriptografada completa
        passwordResponse += `   🔐 Senha: ${password.password}\n`;
        if (password.notes) {
          const preview = password.notes.substring(0, 100);
          passwordResponse += `   Notas: ${preview}${password.notes.length > 100 ? "..." : ""}\n`;
        }
        passwordResponse += "\n";
      });
      
      return passwordResponse;
    
    case "file":
      if (files.length === 0) {
        const fileNotFoundVariations = [
          "Não encontrei arquivos relacionados à sua busca.",
          "Hmm, não consegui encontrar arquivos com esses termos.",
          "Não encontrei nenhum arquivo relacionado. Pode reformular sua busca?",
        ];
        return fileNotFoundVariations[Math.floor(Math.random() * fileNotFoundVariations.length)];
      }
      
      const fileIntroVariations = [
        `Encontrei ${files.length} arquivo(s) relacionado(s) à sua busca`,
        `Achei ${files.length} arquivo(s) que podem te interessar`,
        `Aqui estão ${files.length} arquivo(s) encontrados`,
      ];
      let fileResponse = `${fileIntroVariations[Math.floor(Math.random() * fileIntroVariations.length)]}:\n\n`;
      files.slice(0, 5).forEach((file, idx) => {
        fileResponse += `${idx + 1}. **${file.originalName}**\n`;
        fileResponse += `   Tipo: ${file.mimeType}\n`;
        fileResponse += `   Tamanho: ${(file.size / 1024).toFixed(2)} KB\n`;
        if (file.category) fileResponse += `   Categoria: ${file.category}\n`;
        if (file.description) {
          const preview = file.description.substring(0, 100);
          fileResponse += `   Descrição: ${preview}${file.description.length > 100 ? "..." : ""}\n`;
        }
        fileResponse += `   Caminho: ${file.path}\n`;
        fileResponse += "\n";
      });
      
      return fileResponse;
    
    case "history":
      if (history.length === 0) {
        const historyNotFoundVariations = [
          "Não encontrei histórico relacionado à sua busca.",
          "Hmm, não consegui encontrar registros no histórico com esses termos.",
          "Não encontrei nenhum registro no histórico. Pode reformular sua busca?",
        ];
        return historyNotFoundVariations[Math.floor(Math.random() * historyNotFoundVariations.length)];
      }
      
      const historyIntroVariations = [
        `Encontrei ${history.length} registro(s) no histórico`,
        `Achei ${history.length} registro(s) relevantes no histórico`,
        `Aqui estão ${history.length} registro(s) encontrados no histórico`,
      ];
      let historyResponse = `${historyIntroVariations[Math.floor(Math.random() * historyIntroVariations.length)]}:\n\n`;
      history.slice(0, 5).forEach((update, idx) => {
        historyResponse += `${idx + 1}. **Ticket #${update.ticket.id}**: ${update.ticket.title}\n`;
        historyResponse += `   Atualização: ${update.content.substring(0, 100)}${update.content.length > 100 ? "..." : ""}\n`;
        if (update.user) historyResponse += `   Por: ${update.user.name || update.user.email}\n`;
        historyResponse += `   Data: ${new Date(update.createdAt).toLocaleDateString("pt-BR")}\n`;
        historyResponse += "\n";
      });
      
      return historyResponse;
    
    case "report":
      if (!reports) {
        const reportErrorVariations = [
          "Não foi possível gerar o relatório no momento. Tente novamente em instantes.",
          "Hmm, tive um problema ao gerar o relatório. Pode tentar novamente?",
          "Desculpe, não consegui gerar o relatório agora. Tente mais tarde.",
        ];
        return reportErrorVariations[Math.floor(Math.random() * reportErrorVariations.length)];
      }
      
      const reportIntroVariations = [
        `**Relatório Detalhado do Sistema**`,
        `**Aqui está o relatório completo do sistema**`,
        `**Relatório Completo**`,
      ];
      let reportResponse = `${reportIntroVariations[Math.floor(Math.random() * reportIntroVariations.length)]}:\n\n`;
      
      reportResponse += `📊 **Tickets por Status:**\n`;
      reports.ticketsByStatus.forEach((item: any) => {
        reportResponse += `   • ${item.status}: ${item._count}\n`;
      });
      
      if (reports.ticketsByCategory.length > 0) {
        reportResponse += `\n📁 **Tickets por Categoria:**\n`;
        reports.ticketsByCategory.slice(0, 5).forEach((item: any) => {
          reportResponse += `   • ${item.categoryName}: ${item.count}\n`;
        });
      }
      
      if (reports.ticketsByUser.length > 0) {
        reportResponse += `\n👥 **Tickets por Usuário:**\n`;
        reports.ticketsByUser.slice(0, 5).forEach((item: any) => {
          reportResponse += `   • ${item.userName}: ${item.count}\n`;
        });
      }
      
      if (reports.documentsByCategory.length > 0) {
        reportResponse += `\n📚 **Documentos por Categoria:**\n`;
        reports.documentsByCategory.slice(0, 5).forEach((item: any) => {
          reportResponse += `   • ${item.category || "Sem categoria"}: ${item._count}\n`;
        });
      }
      
      if (reports.recentUpdates.length > 0) {
        reportResponse += `\n🕐 **Atualizações Recentes:**\n`;
        reports.recentUpdates.slice(0, 3).forEach((update: any, idx: number) => {
          reportResponse += `   ${idx + 1}. Ticket #${update.ticket.id} - ${update.ticket.title}\n`;
        });
      }
      
      return reportResponse;
    
    case "statistics":
      const statsIntros = [
        "Aqui estão as estatísticas do sistema",
        "Vou te mostrar um resumo das estatísticas",
        "Aqui está um panorama geral do sistema",
      ];
      const totalOpen = statistics.openTickets + statistics.inProgressTickets + statistics.observationTickets;
      const closedPercentage = statistics.totalTickets > 0 
        ? Math.round((statistics.closedTickets / statistics.totalTickets) * 100) 
        : 0;
      
      return `${statsIntros[Math.floor(Math.random() * statsIntros.length)]}:\n\n` +
        `📊 **Tickets:**\n` +
        `   • Total: ${statistics.totalTickets}\n` +
        `   • Abertos: ${statistics.openTickets}\n` +
        `   • Em andamento: ${statistics.inProgressTickets}\n` +
        `   • Em observação: ${statistics.observationTickets}\n` +
        `   • Resolvidos: ${statistics.resolvedTickets}\n` +
        `   • Fechados: ${statistics.closedTickets} (${closedPercentage}% do total)\n` +
        `   • Criados nos últimos 7 dias: ${statistics.recentTickets}\n` +
        (totalOpen > 0 ? `   • Total em aberto: ${totalOpen} tickets precisando de atenção\n` : ``) +
        `\n📚 **Base de Conhecimento:**\n` +
        `   • Documentos cadastrados: ${statistics.totalDocuments}\n\n` +
        `🔐 **Credenciais:**\n` +
        `   • Senhas salvas: ${statistics.totalPasswords}\n\n` +
        `👥 **Usuários:**\n` +
        `   • Total de usuários: ${statistics.totalUsers}\n\n` +
        `📝 **Atividades:**\n` +
        `   • Total de atualizações registradas: ${statistics.totalUpdates}`;
    
    case "agenda":
      if (!agenda || (!agenda.events?.length && !agenda.tickets?.length)) {
        const dateStr = agenda?.date ? new Date(agenda.date).toLocaleDateString("pt-BR") : "hoje";
        const userInfo = agenda?.userName ? ` do ${agenda.userName}` : "";
        const notFoundVariations = [
          `Não encontrei compromissos ou tickets agendados${userInfo} para ${dateStr}.`,
          `Parece que não há nada agendado${userInfo} para ${dateStr}.`,
          `Não há compromissos registrados${userInfo} para ${dateStr}.`,
        ];
        return notFoundVariations[Math.floor(Math.random() * notFoundVariations.length)];
      }
      
      const dateStr = new Date(agenda.date).toLocaleDateString("pt-BR");
      const userInfo = agenda?.userName ? ` de ${agenda.userName} ` : " ";
      const agendaIntros = [
        `📅 **Agenda${userInfo}para ${dateStr}**`,
        `📅 **Compromissos${userInfo}para ${dateStr}**`,
        `📅 **Aqui está a agenda${userInfo}para ${dateStr}**`,
      ];
      let agendaResponse = `${agendaIntros[Math.floor(Math.random() * agendaIntros.length)]}:\n\n`;
      
      const totalEvents = agenda.events?.length || 0;
      const totalTickets = agenda.tickets?.length || 0;
      
      if (totalEvents > 0) {
        agendaResponse += `📆 **Eventos** (${totalEvents}):\n\n`;
        agenda.events.slice(0, 5).forEach((event: any, idx: number) => {
          const startTime = new Date(event.startDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const endTime = new Date(event.endDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          agendaResponse += `${idx + 1}. **${event.title}**\n`;
          agendaResponse += `   ⏰ ${startTime} - ${endTime}\n`;
          if (event.user) {
            agendaResponse += `   👤 ${event.user.name || event.user.email}\n`;
          }
          if (event.location) {
            agendaResponse += `   📍 ${event.location}\n`;
          }
          if (event.description) {
            const desc = event.description.substring(0, 80);
            agendaResponse += `   📝 ${desc}${event.description.length > 80 ? "..." : ""}\n`;
          }
          agendaResponse += "\n";
        });
      }
      
      if (totalTickets > 0) {
        agendaResponse += `🎫 **Tickets Agendados** (${totalTickets}):\n\n`;
        agenda.tickets.slice(0, 5).forEach((ticket: any, idx: number) => {
          const scheduledTime = ticket.scheduledAt ? new Date(ticket.scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
          agendaResponse += `${idx + 1}. **Ticket #${ticket.id}**: ${ticket.title}\n`;
          if (scheduledTime) {
            agendaResponse += `   ⏰ ${scheduledTime}\n`;
          }
          agendaResponse += `   📊 Status: ${ticket.status}\n`;
          if (ticket.assignedTo) {
            agendaResponse += `   ✅ Atribuído a: ${ticket.assignedTo.name || ticket.assignedTo.email}\n`;
          }
          if (ticket.user) {
            agendaResponse += `   👤 Solicitante: ${ticket.user.name || ticket.user.email}\n`;
          }
          agendaResponse += "\n";
        });
      }
      
      const total = totalEvents + totalTickets;
      agendaResponse += `\n*Total: ${total} compromisso(s) encontrado(s)*`;
      
      return agendaResponse;
    
    case "help":
      const helpIntros = [
        "Olá! Fico feliz em ajudar!",
        "Oi! Estou aqui para te ajudar!",
        "Olá! Como posso ajudar você hoje?",
        "Oi! Vamos lá, como posso te auxiliar?",
      ];
      return `${helpIntros[Math.floor(Math.random() * helpIntros.length)]} Sou o Dobby, seu assistente virtual aqui no RootDesk. Posso te ajudar com várias coisas:\n\n` +
        `📚 **Base de Conhecimento**: Busque documentos e artigos da base\n` +
        `📁 **Arquivos**: Encontre arquivos armazenados no sistema\n` +
        `🎫 **Tickets**: Consulte informações sobre chamados e seu status\n` +
        `📅 **Agenda**: Veja seus compromissos e tickets agendados\n` +
        `🔐 **Senhas**: Encontre credenciais salvas no cofre\n` +
        `📝 **Histórico**: Veja atualizações e comentários de tickets\n` +
        `📊 **Estatísticas**: Veja métricas e números do sistema\n` +
        `📈 **Relatórios**: Análises detalhadas sobre tickets e atividades\n\n` +
        `**Alguns exemplos do que você pode perguntar:**\n` +
        `• "Como fazer backup?"\n` +
        `• "Quantos tickets estão abertos?"\n` +
        `• "Mostre tickets sobre rede"\n` +
        `• "Agenda de hoje"\n` +
        `• "Quantos tickets o [nome] tem para hoje?"\n` +
        `• "Compromissos de amanhã"\n` +
        `• "Senhas do servidor"\n` +
        `• "Arquivos sobre rede"\n` +
        `• "Histórico do ticket 123"\n` +
        `• "Relatório de tickets por categoria"\n\n` +
        `Fique à vontade para perguntar qualquer coisa! Estou aqui para ajudar. 😊`;
    
    default:
      // Busca combinada quando a intenção é geral
      const allResults: string[] = [];
      
      if (documents.length > 0) {
        allResults.push(`📚 **Documentos encontrados** (${documents.length}):\n` +
          documents.slice(0, 3).map((doc, idx) => 
            `${idx + 1}. ${doc.title}`
          ).join("\n"));
      }
      
      if (files.length > 0) {
        allResults.push(`📁 **Arquivos encontrados** (${files.length}):\n` +
          files.slice(0, 3).map((file, idx) => 
            `${idx + 1}. ${file.originalName}`
          ).join("\n"));
      }
      
      if (tickets.length > 0) {
        allResults.push(`🎫 **Tickets encontrados** (${tickets.length}):\n` +
          tickets.slice(0, 3).map((ticket, idx) => 
            `${idx + 1}. Ticket #${ticket.id}: ${ticket.title}`
          ).join("\n"));
      }
      
      if (passwords.length > 0) {
        allResults.push(`🔐 **Credenciais encontradas** (${passwords.length}):\n` +
          passwords.slice(0, 3).map((pwd, idx) => 
            `${idx + 1}. ${pwd.title}`
          ).join("\n"));
      }
      
      if (allResults.length > 0) {
        const foundIntros = [
          "Encontrei algumas informações relacionadas à sua busca",
          "Achei algumas coisas que podem te interessar",
          "Encontrei informações relevantes para você",
        ];
        return `${foundIntros[Math.floor(Math.random() * foundIntros.length)]}:\n\n` +
          allResults.join("\n\n") +
          `\n\n💡 **Dica**: Seja mais específico na sua busca para obter resultados mais precisos. Por exemplo:\n` +
          `• "Documentos sobre backup"\n` +
          `• "Tickets abertos sobre rede"\n` +
          `• "Senhas do servidor"`;
      }
      
      const notFoundVariations = [
        "Hmm, não consegui encontrar informações relacionadas à sua busca. Que tal tentar ser mais específico?",
        "Não encontrei nada com esses termos. Pode reformular sua pergunta?",
        "Desculpe, não encontrei informações relacionadas. Tente usar palavras-chave diferentes.",
      ];
      return `${notFoundVariations[Math.floor(Math.random() * notFoundVariations.length)]}\n\n` +
        `**Posso ajudar você a buscar:**\n` +
        `• Documentos da base de conhecimento\n` +
        `• Arquivos e downloads\n` +
        `• Tickets e chamados (ex: "tickets abertos", "meus tickets")\n` +
        `• Agenda e compromissos (ex: "agenda de hoje", "compromissos do João")\n` +
        `• Senhas e credenciais\n` +
        `• Histórico e atualizações\n` +
        `• Estatísticas e relatórios\n\n` +
        `**Alguns exemplos de perguntas:**\n` +
        `• "Quantos tickets estão abertos?"\n` +
        `• "Agenda de hoje"\n` +
        `• "Quantos tickets o [nome] tem para hoje?"\n` +
        `• "Senhas do servidor"\n` +
        `• "Arquivos sobre rede"\n` +
        `• "Meus tickets em andamento"\n` +
        `• "Ticket #123"`;
  }
}

// Função para construir mensagens para a IA local
type AiPayload = {
  question: string;
  intent: ReturnType<typeof detectIntent>;
  deterministicResponse: string;
  documents: any[];
  tickets: any[];
  passwords: any[];
  history: any[];
  files: any[];
  agenda: any;
  statistics: any;
  reports: any;
  conversationHistory: ConversationEntry[];
};

function buildAiMessages(payload: AiPayload, userName?: string | null): LocalAiMessage[] {
  const context = buildAiContext(payload, userName);
  const historyMessages: LocalAiMessage[] = (payload.conversationHistory || []).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));
  
  return [
    {
      role: "system",
      content:
        "Você é o Dobby, assistente virtual do sistema RootDesk. Você é amigável, prestativo e tem uma personalidade calorosa e empática.\n\n" +
        "**Sua personalidade:**\n" +
        "- Você se comunica de forma natural e conversacional, como um colega de trabalho prestativo\n" +
        "- Você demonstra interesse genuíno em ajudar e resolver problemas\n" +
        "- Você usa linguagem acessível, evitando jargões técnicos desnecessários\n" +
        "- Você é proativo e oferece sugestões úteis mesmo quando não perguntado diretamente\n" +
        "- Você celebra pequenas vitórias e reconhece quando as coisas estão indo bem\n" +
        "- Você mostra preocupação quando há problemas ou pendências\n\n" +
        "**Diretrizes de comunicação:**\n" +
        "- Sempre responda em português brasileiro\n" +
        "- Use um tom amigável e profissional, mas não excessivamente formal\n" +
        "- Varie suas saudações e despedidas (ex: 'Olá!', 'Oi!', 'Tudo bem?', 'Como posso ajudar?', 'Estou aqui para ajudar!', 'Fico feliz em ajudar!', 'Precisando de mais alguma coisa?', 'Estou à disposição!')\n" +
        "- Quando apresentar dados, contextualize-os de forma útil (ex: 'Isso representa X% do total', 'Isso é mais que ontem', 'Vamos precisar de atenção aqui')\n" +
        "- Use emojis com moderação e apenas quando fizer sentido (📊 para dados, ✅ para sucessos, ⚠️ para alertas, 💡 para dicas)\n" +
        "- Seja específico: cite números, nomes e detalhes relevantes do contexto\n" +
        "- Quando não encontrar informações, seja honesto e sugira alternativas\n" +
        "- Encerre sempre oferecendo ajuda adicional de forma natural\n" +
        "- Use formatação markdown (negrito, listas, parágrafos) para melhorar a legibilidade\n" +
        "- Evite repetir exatamente a mesma estrutura de resposta - varie sua abordagem\n\n" +
        "**Importante:** Use APENAS as informações fornecidas no contexto. Não invente dados ou informações que não estejam presentes. Se algo não estiver no contexto, seja honesto sobre isso.",
    },
    ...historyMessages,
    {
      role: "user",
      content: context,
    },
  ];
}

function buildAiContext(payload: AiPayload, userName?: string | null): string {
  const { question, intent, deterministicResponse } = payload;
  const sections: string[] = [];

  // Adicionar contexto do usuário se disponível
  if (userName) {
    sections.push(`Você está conversando com: ${userName}`);
  }

  sections.push(`Pergunta original do usuário:\n${question}`);
  sections.push(
    `Intenção detectada: ${intent.type}\nPalavras-chave: ${
      intent.keywords.length ? intent.keywords.join(", ") : "não identificadas"
    }`
  );

    if (payload.conversationHistory?.length) {
      const convoPreview = payload.conversationHistory
        .slice(-5)
        .map((entry) => `${entry.role === "assistant" ? "Dobby assistente virtual (Beta)" : "Usuário"}: ${entry.content}`)
        .join("\n");
    sections.push(`Histórico recente da conversa:\n${convoPreview}`);
  }

  if (payload.documents?.length) {
    const docLines = payload.documents.slice(0, 3).map((doc: any, idx: number) => {
      const preview = doc.content ? doc.content.substring(0, 120) : "";
      const category = doc.category ? ` [${doc.category}]` : "";
      return `${idx + 1}. ${doc.title}${category}${preview ? ` — ${preview}...` : ""}`;
    });
    sections.push(`Documentos relevantes encontrados (${payload.documents.length}):\n${docLines.join("\n")}`);
  }

  if (payload.tickets?.length) {
    const ticketLines = payload.tickets.slice(0, 3).map((ticket: any, idx: number) => {
      const status = ticket.status ? ` | Status: ${ticket.status}` : "";
      const category = ticket.category?.name ? ` | Categoria: ${ticket.category.name}` : "";
      const desc = ticket.description ? ticket.description.substring(0, 100) : "";
      return `${idx + 1}. Ticket #${ticket.id}: ${ticket.title}${status}${category}${desc ? ` — ${desc}...` : ""}`;
    });
    sections.push(`Tickets relevantes encontrados (${payload.tickets.length}):\n${ticketLines.join("\n")}`);
  }

  if (payload.passwords?.length) {
    const pwdLines = payload.passwords.slice(0, 3).map((password: any, idx: number) => {
      return `${idx + 1}. ${password.title}`;
    });
    sections.push(`Credenciais encontradas (${payload.passwords.length}):\n${pwdLines.join("\n")}`);
  }

  if (payload.files?.length) {
    const fileLines = payload.files.slice(0, 3).map((file: any, idx: number) => {
      const category = file.category ? ` [${file.category}]` : "";
      return `${idx + 1}. ${file.originalName}${category}`;
    });
    sections.push(`Arquivos encontrados (${payload.files.length}):\n${fileLines.join("\n")}`);
  }

  if (payload.history?.length) {
    const historyLines = payload.history.slice(0, 3).map((update: any, idx: number) => {
      const content = update.content.substring(0, 100);
      return `${idx + 1}. Ticket #${update.ticket.id} — ${content}...`;
    });
    sections.push(`Histórico recente (${payload.history.length} registros):\n${historyLines.join("\n")}`);
  }

  if (payload.agenda) {
    const totalEvents = payload.agenda.events?.length || 0;
    const totalTickets = payload.agenda.tickets?.length || 0;
    if (totalEvents > 0 || totalTickets > 0) {
      const date = payload.agenda.date ? new Date(payload.agenda.date).toLocaleDateString("pt-BR") : "sem data";
      sections.push(`Agenda: ${totalEvents} evento(s), ${totalTickets} ticket(s) em ${date}.`);
    }
  }

  if (payload.statistics) {
    sections.push(
      "Estatísticas principais:\n" +
        `- Tickets total: ${payload.statistics.totalTickets}\n` +
        `- Abertos: ${payload.statistics.openTickets} | Em andamento: ${payload.statistics.inProgressTickets} | Resolvidos: ${payload.statistics.resolvedTickets}\n` +
        `- Documentos cadastrados: ${payload.statistics.totalDocuments}\n` +
        `- Senhas salvas: ${payload.statistics.totalPasswords}`
    );
  }

  sections.push(`Resposta determinística sugerida (baseada em regras):\n${deterministicResponse}`);
  sections.push(
    "**INSTRUÇÕES PARA SUA RESPOSTA:**\n\n" +
    "Transforme a resposta determinística acima em uma conversa natural e humanizada. Siga estas diretrizes:\n\n" +
    "1. **Comece de forma calorosa**: Use uma saudação variada e demonstre interesse genuíno\n" +
    "2. **Contextualize os dados**: Não apenas liste informações, mas explique o que elas significam\n" +
    "3. **Use linguagem natural**: Evite listas muito técnicas, prefira parágrafos conversacionais quando possível\n" +
    "4. **Demonstre empatia**: Se houver problemas ou pendências, mostre preocupação. Se houver sucessos, celebre\n" +
    "5. **Seja específico**: Cite números, nomes e detalhes do contexto de forma natural\n" +
    "6. **Varie sua estrutura**: Não use sempre a mesma fórmula - seja criativo na apresentação\n" +
    "7. **Use formatação inteligente**: Markdown para destacar informações importantes, mas não exagere\n" +
    "8. **Encerre naturalmente**: Ofereça ajuda adicional de forma genuína, não robótica\n" +
    "9. **Mantenha o tom positivo**: Mesmo ao reportar problemas, mantenha um tom construtivo e proativo\n\n" +
    "**Lembre-se**: Você é o Dobby, um assistente prestativo e amigável. Suas respostas devem soar como se fossem de um colega de trabalho experiente e empático, não de um sistema automatizado."
  );

  return sections.join("\n\n");
}

// Função para gerar sugestões contextuais baseadas na resposta
function generateContextualSuggestions(intent: ReturnType<typeof detectIntent>, results: any): string[] {
  const suggestions: string[] = [];
  
  if (intent.type === "ticket" && results.tickets?.length > 0) {
    suggestions.push(`Detalhes do ticket #${results.tickets[0].id}`);
    if (results.tickets[0].status !== "CLOSED") {
      suggestions.push("Atualizar status do ticket");
    }
  }
  
  if (intent.type === "document" && results.documents?.length > 0) {
    suggestions.push(`Ver documento completo: ${results.documents[0].title}`);
  }
  
  if (intent.type === "statistics") {
    suggestions.push("Relatório detalhado de tickets");
    suggestions.push("Estatísticas por categoria");
  }
  
  if (intent.type === "general" || intent.type === "help") {
    suggestions.push("Como criar um ticket?");
    suggestions.push("Como buscar documentos?");
    suggestions.push("Ver minha agenda");
  }
  
  return suggestions.slice(0, 3); // Máximo 3 sugestões
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 });
    }
    
    // Obter histórico de conversa (se fornecido)
    const conversationHistory = sanitizeHistory((body as any).history || []);
    
    // Buscar informações do usuário para contexto adicional
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    
    // Detectar intenção
    const intent = detectIntent(message);
    
    // Se detectou uma ação, processar ação diretamente
    if (intent.type === "action" && intent.action) {
      try {
        const actionResponse = await fetch(`${req.nextUrl.origin}/api/chat/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: intent.action.action,
            ticketId: intent.action.ticketId,
            status: intent.action.status,
            documentTitle: intent.action.documentTitle,
            documentContent: intent.action.documentContent,
          }),
        });

        if (actionResponse.ok) {
          const actionData = await actionResponse.json();
          return NextResponse.json({
            message: `✅ ${actionData.message}\n\n${actionData.ticket ? `Ticket #${actionData.ticket.id} atualizado com sucesso.` : ""}${actionData.document ? `Documento "${actionData.document.title}" criado.` : ""}`,
            intent: intent.type,
            source: "action",
            actionResult: actionData,
            sources: {
              documents: 0,
              files: 0,
              tickets: 0,
              passwords: 0,
              history: 0,
            },
          });
        } else {
          const errorData = await actionResponse.json().catch(() => ({}));
          return NextResponse.json({
            message: `❌ Não foi possível executar a ação: ${errorData.error || "Erro desconhecido"}`,
            intent: intent.type,
            source: "action",
            error: errorData.error,
            sources: {
              documents: 0,
              files: 0,
              tickets: 0,
              passwords: 0,
              history: 0,
            },
          });
        }
      } catch (error) {
        console.error("[chat:POST] Erro ao executar ação:", error);
        return NextResponse.json({
          message: "❌ Erro ao executar ação. Tente novamente.",
          intent: intent.type,
          source: "action",
          sources: {
            documents: 0,
            files: 0,
            tickets: 0,
            passwords: 0,
            history: 0,
          },
        });
      }
    }
    
    // Verificar cache antes de processar
    const cacheKey = generateCacheKey(message, intent, user.id);
    const cachedResponse = await getCachedResponse(cacheKey);
    if (cachedResponse) {
      // Garantir que cachedResponse seja sempre uma string
      const cachedMessage = typeof cachedResponse === "string" ? cachedResponse : String(cachedResponse);
      return NextResponse.json({
        message: cachedMessage,
        intent: intent.type,
        source: "cache",
        sources: {
          documents: 0,
          files: 0,
          tickets: 0,
          passwords: 0,
          history: 0,
        },
      });
    }
    
    // Buscar informações baseadas na intenção
    let documents: any[] = [];
    let tickets: any[] = [];
    let passwords: any[] = [];
    let history: any[] = [];
    let files: any[] = [];
    let agenda: any = null;
    let statistics: any = null;
    let reports: any = null;
    
    // Extrair informações adicionais para agenda
    let targetUserId: number | null = null;
    let targetDate: Date | null = null;
    
    if (intent.type === "agenda") {
      const dateInfo = extractDate(message);
      if (dateInfo?.date) {
        targetDate = dateInfo.date;
      }
      targetUserId = await extractUserName(message);
    }
    
    if (intent.type === "document" || intent.type === "general") {
      documents = await searchDocuments(intent.keywords, user.id);
    }
    
    if (intent.type === "file" || intent.type === "general") {
      files = await searchFiles(intent.keywords, user.id);
    }
    
    if (intent.type === "ticket" || intent.type === "general") {
      tickets = await searchTickets(intent.keywords, user.id, intent.filters, intent.id);
    }
    
    if (intent.type === "password" || intent.type === "general") {
      passwords = await searchPasswords(intent.keywords, user.id);
    }
    
    if (intent.type === "history" || intent.type === "general") {
      history = await searchHistory(intent.keywords, user.id);
    }
    
    if (intent.type === "agenda") {
      agenda = await searchAgenda(intent.keywords, user.id, targetUserId, targetDate);
    }
    
    if (intent.type === "statistics" || intent.type === "help") {
      statistics = await getStatistics(user.id);
    }
    
    if (intent.type === "report") {
      reports = await getReports(user.id);
      // Também buscar estatísticas para relatórios
      if (!statistics) {
        statistics = await getStatistics(user.id);
      }
    }
    
    // Gerar resposta determinística (fallback)
    const deterministicResponse = generateResponse(intent, documents, tickets, passwords, history, files, agenda, statistics, reports, message);
    
    // Tentar usar IA local se habilitada
    let finalResponse: string = typeof deterministicResponse === "string" ? deterministicResponse : String(deterministicResponse);
    let responseSource: "local-ai" | "rule-based" | "cache" = "rule-based";
    
    if (isLocalAiEnabled()) {
      try {
        const aiMessages = buildAiMessages({
          question: message,
          intent,
          deterministicResponse,
          documents,
          tickets,
          passwords,
          history,
          files,
          agenda,
          statistics,
          reports,
          conversationHistory,
        }, userInfo?.name || userInfo?.email || null);

        const aiReply = await callLocalAi(aiMessages, { temperature: 0.85 });
        if (aiReply && typeof aiReply === "string" && aiReply.trim().length > 0) {
          finalResponse = aiReply;
          responseSource = "local-ai";
        }
      } catch (error) {
        console.error("[chat:POST] Erro ao chamar IA local, usando fallback:", error);
        // Fallback para resposta determinística já está definido
      }
    }
    
    // Garantir que finalResponse seja sempre uma string
    if (typeof finalResponse !== "string") {
      finalResponse = String(finalResponse);
    }
    
    // Salvar no cache
    await setCachedResponse(cacheKey, finalResponse);
    
    // Gerar sugestões contextuais
    const suggestions = generateContextualSuggestions(intent, {
      documents,
      tickets,
      passwords,
      history,
      files,
      agenda,
      statistics,
    });
    
    return NextResponse.json({
      message: finalResponse,
      intent: intent.type,
      source: responseSource,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      sources: {
        documents: documents.length,
        files: files.length,
        tickets: tickets.length,
        passwords: passwords.length,
        history: history.length,
      },
    });
  } catch (error) {
    console.error("[chat:POST]", error);
    return NextResponse.json(
      { error: "Erro ao processar mensagem" },
      { status: 500 }
    );
  }
}

