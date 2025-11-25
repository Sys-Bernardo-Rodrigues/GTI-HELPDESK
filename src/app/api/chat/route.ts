import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { callLocalAi, isLocalAiEnabled, LocalAiMessage } from "@/lib/localAi";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ConversationEntry = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_ITEMS = 8;

// Função para normalizar texto (remover acentos, lowercase)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const STOP_WORDS = new Set(
  [
    "o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas", "por", "para", "com", "sem",
    "que", "qual", "quais", "como", "quando", "onde", "porque",
    "e", "é", "são", "está", "estão", "foi", "foram", "ser", "estar",
    "tem", "têm", "ter", "me", "te", "se", "nos", "vocês",
    "eu", "ele", "ela", "eles", "elas", "nós", "você", "vocês",
    "mostrar", "mostre", "lista", "listar", "buscar", "busca", "encontrar", "encontre",
    "quero", "preciso", "desejo", "sobre", "mais", "menos"
  ].map((word) => normalizeText(word))
);

const RAW_SYNONYM_GROUPS: Record<string, string[]> = {
  ticket: ["ticket", "tickets", "chamado", "chamados", "solicitacao", "solicitacoes", "incidente", "incidentes", "protocolo", "protocolo"],
  document: ["documento", "documentos", "artigo", "artigos", "manual", "procedimento", "tutorial", "guia", "kb", "base", "documentacao"],
  password: ["senha", "senhas", "password", "credencial", "credenciais", "login", "logins", "acesso", "acessos", "usuario", "usuarios", "conta", "contas"],
  file: ["arquivo", "arquivos", "anexo", "anexos", "upload", "uploads", "download", "downloads"],
  agenda: ["agenda", "agendas", "compromisso", "compromissos", "reuniao", "reunioes", "reuniao", "evento", "eventos", "calendario", "calendario"],
  history: ["historico", "historicos", "atualizacao", "atualizacoes", "comentario", "comentarios", "log", "logs", "registro", "registros"],
  statistics: ["estatistica", "estatisticas", "metrica", "metricas", "dashboard", "resumo", "quantidade", "quantidades", "total", "totais", "numeros", "dados"],
  report: ["relatorio", "relatorios", "relatório", "relatórios", "analise", "analises", "analise", "insights"],
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
  const baseKeywords = normalized
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
  
  return expandKeywords(baseKeywords);
}

// Função para calcular similaridade entre duas strings (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizeText(str1).split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(normalizeText(str2).split(/\s+/).filter((w) => w.length > 2));
  
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function buildSnippet(text: string | null | undefined, keywords: string[], maxLength = 160): string | null {
  if (!text) return null;
  if (!keywords.length) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }
  
  const normalizedText = normalizeText(text);
  let bestIndex = -1;
  let matchedKeyword: string | null = null;
  
  for (const keyword of keywords) {
    const idx = normalizedText.indexOf(keyword);
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx;
      matchedKeyword = keyword;
    }
  }
  
  if (bestIndex === -1) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }
  
  const start = Math.max(0, bestIndex - 60);
  const end = Math.min(text.length, bestIndex + (matchedKeyword?.length || 0) + 80);
  let snippet = text.slice(start, end).trim();
  
  if (start > 0) {
    snippet = `...${snippet}`;
  }
  if (end < text.length) {
    snippet = `${snippet}...`;
  }
  
  if (matchedKeyword) {
    const regex = new RegExp(escapeRegExp(matchedKeyword), "ig");
    snippet = snippet.replace(regex, (match) => `**${match}**`);
  }
  
  return snippet;
}

// Função para extrair número de ID de uma pergunta
function extractId(text: string): number | null {
  const match = text.match(/#?(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Função para extrair data da pergunta
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

// Função para detectar intenção da pergunta (melhorada)
function detectIntent(text: string): {
  type: "document" | "ticket" | "statistics" | "password" | "history" | "report" | "file" | "agenda" | "help" | "general";
  keywords: string[];
  filters?: any;
  id?: number | null;
} {
  const normalized = normalizeText(text);
  const keywords = extractKeywords(text);
  const id = extractId(text);
  const filters = detectFilters(text);
  
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
    const docText = normalizeText(`${doc.title} ${doc.content || ""} ${doc.category || ""} ${doc.tags || ""}`);
    const normalizedTitle = normalizeText(doc.title);
    const normalizedContent = normalizeText(doc.content || "");
    const normalizedCategory = normalizeText(doc.category || "");
    const normalizedTags = normalizeText(doc.tags || "");
    let score = 0;
    
    // Calcular similaridade geral
    const queryText = keywords.join(" ");
    const similarity = calculateSimilarity(queryText, docText);
    score += similarity * 10;
    
    // Pontuação por palavras-chave
    for (const keyword of keywords) {
      if (normalizedTitle.includes(keyword)) {
        score += 5; // Título tem peso maior
      }
      if (normalizedContent.includes(keyword)) {
        score += 2;
      }
      if (normalizedCategory.includes(keyword)) {
        score += 3;
      }
      if (normalizedTags.includes(keyword)) {
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
    const normalizedTitle = normalizeText(ticket.title);
    const normalizedDescription = normalizeText(ticket.description || "");
    const normalizedCategory = normalizeText(ticket.category?.name || "");
    let score = 0;
    
    // Calcular similaridade geral
    const queryText = keywords.join(" ");
    const similarity = calculateSimilarity(queryText, ticketText);
    score += similarity * 10;
    
    // Pontuação por palavras-chave individuais
    for (const keyword of keywords) {
      if (normalizedTitle.includes(keyword)) {
        score += 5; // Título tem peso maior
      }
      if (normalizedDescription.includes(keyword)) {
        score += 2;
      }
      if (normalizedCategory.includes(keyword)) {
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
    const normalizedName = normalizeText(file.originalName);
    let score = 0;
    
    for (const keyword of keywords) {
      if (fileText.includes(keyword)) {
        score += normalizedName.includes(keyword) ? 3 : 1;
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
    const normalizedTitle = normalizeText(password.title);
    let score = 0;
    
    for (const keyword of keywords) {
      if (passwordText.includes(keyword)) {
        score += normalizedTitle.includes(keyword) ? 3 : 1;
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
    const normalizedContent = normalizeText(update.content);
    let score = 0;
    
    for (const keyword of keywords) {
      if (updateText.includes(keyword)) {
        score += normalizedContent.includes(keyword) ? 2 : 1;
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
  historyUpdates: any[],
  files: any[],
  agenda: any,
  statistics: any,
  reports: any,
  originalQuestion: string
): string {
  switch (intent.type) {
    case "document":
      if (documents.length === 0) {
        return "Não encontrei documentos relacionados à sua busca. Tente usar palavras-chave diferentes ou verifique a base de conhecimento.";
      }
      
      let docResponse = `Encontrei ${documents.length} documento(s) relacionado(s):\n\n`;
      documents.slice(0, 5).forEach((doc, idx) => {
        docResponse += `${idx + 1}. **${doc.title}**\n`;
        if (doc.category) docResponse += `   📁 Categoria: ${doc.category}\n`;
        const preview = buildSnippet(doc.content, intent.keywords);
        if (preview) {
          docResponse += `   📝 ${preview}\n`;
        }
        if (doc.tags) {
          docResponse += `   🔖 Tags: ${doc.tags}\n`;
        }
        docResponse += "\n";
      });
      
      if (documents.length > 5) {
        docResponse += `\n*Mostrando 5 de ${documents.length} documentos. Refinar a busca pode trazer resultados ainda mais precisos.*`;
      }
      
      return docResponse;
    
    case "ticket":
      if (tickets.length === 0) {
        return "Não encontrei tickets relacionados à sua busca. Tente usar palavras-chave diferentes ou verifique se há tickets com essas características.";
      }
      
      // Se há apenas um ticket (provavelmente busca por ID), mostrar detalhes completos
      if (tickets.length === 1 && tickets[0].updates) {
        const ticket = tickets[0];
        let ticketResponse = `**Ticket #${ticket.id}**: ${ticket.title}\n\n`;
        ticketResponse += `📊 **Status**: ${ticket.status}\n`;
        if (ticket.category) ticketResponse += `📁 **Categoria**: ${ticket.category.name}\n`;
        if (ticket.user) ticketResponse += `👤 **Solicitante**: ${ticket.user.name || ticket.user.email}\n`;
        if (ticket.assignedTo) ticketResponse += `✅ **Atribuído a**: ${ticket.assignedTo.name || ticket.assignedTo.email}\n`;
        const descriptionSnippet = buildSnippet(ticket.description, intent.keywords, 220);
        if (descriptionSnippet) {
          ticketResponse += `\n📝 **Descrição**: ${descriptionSnippet}\n`;
        }
        if (ticket.updates && ticket.updates.length > 0) {
          ticketResponse += `\n📝 **Últimas Atualizações**:\n`;
          ticket.updates.slice(0, 3).forEach((update: any) => {
            const updateSnippet = buildSnippet(update.content, intent.keywords, 140) ?? update.content.substring(0, 120);
            ticketResponse += `   • ${updateSnippet}${update.content.length > 120 && !updateSnippet?.endsWith("...") ? "..." : ""}\n`;
            ticketResponse += `     Por: ${update.user?.name || update.user?.email || "Sistema"} em ${new Date(update.createdAt).toLocaleDateString("pt-BR")}\n`;
          });
        }
        return ticketResponse;
      }
      
      let ticketResponse = `Encontrei ${tickets.length} ticket(s) relacionado(s):\n\n`;
      tickets.slice(0, 5).forEach((ticket, idx) => {
        ticketResponse += `${idx + 1}. **Ticket #${ticket.id}**: ${ticket.title}\n`;
        ticketResponse += `   📊 Status: ${ticket.status}\n`;
        if (ticket.category) ticketResponse += `   📁 Categoria: ${ticket.category.name}\n`;
        if (ticket.assignedTo) {
          ticketResponse += `   ✅ Atribuído a: ${ticket.assignedTo.name || ticket.assignedTo.email}\n`;
        } else {
          ticketResponse += `   ⚠️ Não atribuído\n`;
        }
        const descriptionSnippet = buildSnippet(ticket.description, intent.keywords, 140);
        if (descriptionSnippet) {
          ticketResponse += `   📝 ${descriptionSnippet}\n`;
        }
        ticketResponse += "\n";
      });
      
      if (tickets.length > 5) {
        ticketResponse += `\n*Mostrando 5 de ${tickets.length} resultados. Seja mais específico para ver mais detalhes.*`;
      }
      
      return ticketResponse;
    
    case "password":
      if (passwords.length === 0) {
        return "Não encontrei senhas relacionadas à sua busca. Verifique se há credenciais cadastradas no sistema.";
      }
      
      let passwordResponse = `Encontrei ${passwords.length} credencial(is) relacionada(s):\n\n`;
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
        const notesSnippet = buildSnippet(password.notes, intent.keywords, 140);
        if (notesSnippet) {
          passwordResponse += `   📝 Notas: ${notesSnippet}\n`;
        }
        passwordResponse += "\n";
      });
      
      return passwordResponse;
    
    case "file":
      if (files.length === 0) {
        return "Não encontrei arquivos relacionados à sua busca.";
      }
      
      let fileResponse = `Encontrei ${files.length} arquivo(s) relacionado(s):\n\n`;
      files.slice(0, 5).forEach((file, idx) => {
        fileResponse += `${idx + 1}. **${file.originalName}**\n`;
        fileResponse += `   Tipo: ${file.mimeType}\n`;
        fileResponse += `   Tamanho: ${(file.size / 1024).toFixed(2)} KB\n`;
        if (file.category) fileResponse += `   Categoria: ${file.category}\n`;
        const descriptionSnippet = buildSnippet(file.description, intent.keywords, 140);
        if (descriptionSnippet) {
          fileResponse += `   📝 Descrição: ${descriptionSnippet}\n`;
        }
        fileResponse += `   Caminho: ${file.path}\n`;
        fileResponse += "\n";
      });
      
      return fileResponse;
    
    case "history":
      if (historyUpdates.length === 0) {
        return "Não encontrei histórico relacionado à sua busca.";
      }
      
      let historyResponse = `Encontrei ${historyUpdates.length} registro(s) no histórico:\n\n`;
      historyUpdates.slice(0, 5).forEach((update, idx) => {
        historyResponse += `${idx + 1}. **Ticket #${update.ticket.id}**: ${update.ticket.title}\n`;
        const historySnippet = buildSnippet(update.content, intent.keywords, 140) ?? update.content.substring(0, 120);
        historyResponse += `   📝 ${historySnippet}${update.content.length > 120 && !historySnippet.endsWith("...") ? "..." : ""}\n`;
        if (update.user) historyResponse += `   Por: ${update.user.name || update.user.email}\n`;
        historyResponse += `   Data: ${new Date(update.createdAt).toLocaleDateString("pt-BR")}\n`;
        historyResponse += "\n";
      });
      
      return historyResponse;
    
    case "report":
      if (!reports) {
        return "Não foi possível gerar o relatório no momento.";
      }
      
      let reportResponse = `**Relatório Detalhado do Sistema:**\n\n`;
      
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
      return `**Estatísticas do Sistema:**\n\n` +
        `📊 **Tickets:**\n` +
        `   • Total: ${statistics.totalTickets}\n` +
        `   • Abertos: ${statistics.openTickets}\n` +
        `   • Em andamento: ${statistics.inProgressTickets}\n` +
        `   • Em observação: ${statistics.observationTickets}\n` +
        `   • Resolvidos: ${statistics.resolvedTickets}\n` +
        `   • Fechados: ${statistics.closedTickets}\n` +
        `   • Criados nos últimos 7 dias: ${statistics.recentTickets}\n\n` +
        `📚 **Base de Conhecimento:**\n` +
        `   • Documentos: ${statistics.totalDocuments}\n\n` +
        `🔐 **Credenciais do Sistema:**\n` +
        `   • Total de senhas salvas: ${statistics.totalPasswords}\n\n` +
        `👥 **Usuários:**\n` +
        `   • Total: ${statistics.totalUsers}\n\n` +
        `📝 **Histórico:**\n` +
        `   • Total de atualizações: ${statistics.totalUpdates}`;
    
    case "agenda":
      if (!agenda || (!agenda.events?.length && !agenda.tickets?.length)) {
        const dateStr = agenda?.date ? new Date(agenda.date).toLocaleDateString("pt-BR") : "hoje";
        const userInfo = agenda?.userName ? ` do ${agenda.userName}` : "";
        return `Não encontrei compromissos ou tickets agendados${userInfo} para ${dateStr}.`;
      }
      
      const dateStr = new Date(agenda.date).toLocaleDateString("pt-BR");
      const userInfo = agenda?.userName ? ` de ${agenda.userName} ` : " ";
      let agendaResponse = `📅 **Agenda${userInfo}para ${dateStr}**:\n\n`;
      
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
      return `Olá! Sou o Dobby, assistente virtual do sistema. Posso ajudá-lo com:\n\n` +
        `📚 **Base de Conhecimento**: Busque documentos e artigos (descriptografados)\n` +
        `📁 **Arquivos**: Encontre arquivos da base de conhecimento\n` +
        `🎫 **Tickets**: Consulte informações sobre chamados\n` +
        `📅 **Agenda**: Veja compromissos e tickets agendados\n` +
        `🔐 **Senhas**: Encontre suas credenciais salvas (descriptografadas)\n` +
        `📝 **Histórico**: Veja atualizações e comentários\n` +
        `📊 **Estatísticas**: Veja métricas do sistema\n` +
        `📈 **Relatórios**: Análises detalhadas\n\n` +
        `Exemplos de perguntas:\n` +
        `• "Como fazer backup?"\n` +
        `• "Quantos tickets estão abertos?"\n` +
        `• "Mostre tickets sobre rede"\n` +
        `• "Agenda de hoje"\n` +
        `• "Quantos tickets o Bernardo tem para hoje?"\n` +
        `• "Compromissos de amanhã"\n` +
        `• "Senhas do servidor"\n` +
        `• "Arquivos sobre rede"\n` +
        `• "Histórico do ticket 123"\n` +
        `• "Relatório de tickets por categoria"`;
    
    default:
      // Busca combinada quando a intenção é geral
      const allResults: string[] = [];
      
      if (documents.length > 0) {
        allResults.push(`📚 **Documentos encontrados** (${documents.length}):\n` +
          documents.slice(0, 3).map((doc, idx) => {
            const snippet = buildSnippet(doc.content, intent.keywords, 120);
            return `${idx + 1}. ${doc.title}${snippet ? ` — ${snippet}` : ""}`;
          }).join("\n"));
      }
      
      if (files.length > 0) {
        allResults.push(`📁 **Arquivos encontrados** (${files.length}):\n` +
          files.slice(0, 3).map((file, idx) => {
            const snippet = buildSnippet(file.description, intent.keywords, 120);
            return `${idx + 1}. ${file.originalName}${snippet ? ` — ${snippet}` : ""}`;
          }).join("\n"));
      }
      
      if (tickets.length > 0) {
        allResults.push(`🎫 **Tickets encontrados** (${tickets.length}):\n` +
          tickets.slice(0, 3).map((ticket, idx) => {
            const snippet = buildSnippet(ticket.description, intent.keywords, 120);
            return `${idx + 1}. Ticket #${ticket.id}: ${ticket.title}${snippet ? ` — ${snippet}` : ""}`;
          }).join("\n"));
      }
      
      if (passwords.length > 0) {
        allResults.push(`🔐 **Credenciais encontradas** (${passwords.length}):\n` +
          passwords.slice(0, 3).map((pwd, idx) => {
            const snippet = buildSnippet(pwd.notes, intent.keywords, 120);
            return `${idx + 1}. ${pwd.title}${snippet ? ` — ${snippet}` : ""}`;
          }).join("\n"));
      }
      
      if (allResults.length > 0) {
        return `Encontrei informações relacionadas à sua busca:\n\n` +
          allResults.join("\n\n") +
          `\n\n💡 **Dica**: refine a pergunta adicionando contexto (ex.: "tickets abertos sobre rede" ou "documentos de backup") para respostas ainda melhores.`;
      }
      
      return `Desculpe, não encontrei informações diretamente relacionadas. Experimente mencionar o tipo de informação desejada (documentos, tickets, agenda, arquivos, senhas, histórico) ou inclua palavras-chave mais específicas da sua área.\n\n` +
        `Exemplos:\n` +
        `• "Documentos sobre backup do servidor"\n` +
        `• "Tickets abertos do time de rede"\n` +
        `• "Agenda do João amanhã"\n` +
        `• "Senhas do firewall"\n` +
        `• "Arquivos de onboarding"\n` +
        `• "Ticket #123"\n` +
        `• "Estatísticas da semana"`;
  }
}

type IntentResult = ReturnType<typeof detectIntent>;

type AiPayload = {
  question: string;
  intent: IntentResult;
  deterministicResponse: string;
  documents: any[];
  tickets: any[];
  passwords: any[];
  historyUpdates: any[];
  files: any[];
  agenda: any;
  statistics: any;
  reports: any;
  conversationHistory: ConversationEntry[];
};

function buildAiMessages(payload: AiPayload): LocalAiMessage[] {
  const context = buildAiContext(payload);
  const historyMessages: LocalAiMessage[] = (payload.conversationHistory || []).map((entry) => ({
    role: entry.role,
    content: entry.content,
  }));
  return [
    {
      role: "system",
      content:
        "Você é Dobby, assistente virtual interno do GTI. Responda sempre em português, com tom cordial, proativo e objetivo. Seja empático, cite apenas dados presentes no contexto e encerre oferecendo ajuda adicional.",
    },
    ...historyMessages,
    {
      role: "user",
      content: context,
    },
  ];
}

function buildAiContext(payload: AiPayload): string {
  const { question, intent, deterministicResponse } = payload;
  const sections: string[] = [];

  sections.push(`Pergunta original:\n${question}`);
  sections.push(
    `Intenção detectada: ${intent.type}\nPalavras-chave: ${
      intent.keywords.length ? intent.keywords.join(", ") : "não identificadas"
    }`
  );

  if (payload.conversationHistory?.length) {
    const convoPreview = payload.conversationHistory
      .slice(-5)
      .map((entry) => `${entry.role === "assistant" ? "Dobby" : "Usuário"}: ${entry.content}`)
      .join("\n");
    sections.push(`Histórico recente:\n${convoPreview}`);
  }

  const docSection = summarizeDocuments(payload.documents, intent.keywords);
  if (docSection) sections.push(docSection);

  const ticketSection = summarizeTickets(payload.tickets, intent.keywords);
  if (ticketSection) sections.push(ticketSection);

  const passwordSection = summarizePasswords(payload.passwords);
  if (passwordSection) sections.push(passwordSection);

  const fileSection = summarizeFiles(payload.files, intent.keywords);
  if (fileSection) sections.push(fileSection);

  const historySection = summarizeHistory(payload.historyUpdates, intent.keywords);
  if (historySection) sections.push(historySection);

  const agendaSection = summarizeAgenda(payload.agenda);
  if (agendaSection) sections.push(agendaSection);

  const statsSection = summarizeStatistics(payload.statistics);
  if (statsSection) sections.push(statsSection);

  sections.push(`Resumo determinístico sugerido:\n${deterministicResponse}`);
  sections.push(
    "Com base nesses dados, escreva uma resposta humanizada, utilizando parágrafos curtos, bullet points quando fizer sentido e encerrando com uma oferta de ajuda adicional."
  );

  return sections.join("\n\n");
}

function summarizeDocuments(documents: any[], keywords: string[]): string | null {
  if (!documents?.length) return null;
  const lines = documents.slice(0, 3).map((doc: any, idx: number) => {
    const snippet = buildSnippet(doc.content, keywords, 120);
    const category = doc.category ? ` [${doc.category}]` : "";
    return `${idx + 1}. ${doc.title}${category}${snippet ? ` — ${snippet}` : ""}`;
  });
  return `Documentos relevantes (${documents.length}):\n${lines.join("\n")}`;
}

function summarizeTickets(tickets: any[], keywords: string[]): string | null {
  if (!tickets?.length) return null;
  const lines = tickets.slice(0, 3).map((ticket: any, idx: number) => {
    const snippet = buildSnippet(ticket.description, keywords, 120);
    const status = ticket.status ? ` | Status: ${ticket.status}` : "";
    const category = ticket.category?.name ? ` | Categoria: ${ticket.category.name}` : "";
    return `${idx + 1}. Ticket #${ticket.id}: ${ticket.title}${status}${category}${snippet ? ` — ${snippet}` : ""}`;
  });
  return `Tickets relevantes (${tickets.length}):\n${lines.join("\n")}`;
}

function summarizePasswords(passwords: any[]): string | null {
  if (!passwords?.length) return null;
  const lines = passwords.slice(0, 3).map((password: any, idx: number) => {
    const owner = password.createdBy ? ` | Criado por: ${password.createdBy.name || password.createdBy.email}` : "";
    return `${idx + 1}. ${password.title}${owner}`;
  });
  return `Credenciais encontradas (${passwords.length}):\n${lines.join("\n")}`;
}

function summarizeFiles(files: any[], keywords: string[]): string | null {
  if (!files?.length) return null;
  const lines = files.slice(0, 3).map((file: any, idx: number) => {
    const snippet = buildSnippet(file.description, keywords, 100);
    return `${idx + 1}. ${file.originalName}${file.category ? ` [${file.category}]` : ""}${snippet ? ` — ${snippet}` : ""}`;
  });
  return `Arquivos encontrados (${files.length}):\n${lines.join("\n")}`;
}

function summarizeHistory(history: any[], keywords: string[]): string | null {
  if (!history?.length) return null;
  const lines = history.slice(0, 3).map((update: any, idx: number) => {
    const snippet = buildSnippet(update.content, keywords, 100) ?? update.content.substring(0, 100);
    return `${idx + 1}. Ticket #${update.ticket.id} — ${snippet}`;
  });
  return `Histórico recente (${history.length} registros):\n${lines.join("\n")}`;
}

function summarizeAgenda(agenda: any): string | null {
  if (!agenda) return null;
  const totalEvents = agenda.events?.length || 0;
  const totalTickets = agenda.tickets?.length || 0;
  if (totalEvents === 0 && totalTickets === 0) return null;
  const date = agenda.date ? new Date(agenda.date).toLocaleDateString("pt-BR") : "sem data";
  const owner = agenda.userName ? ` para ${agenda.userName}` : "";
  return `Agenda${owner} em ${date}: ${totalEvents} evento(s), ${totalTickets} ticket(s).`;
}

function summarizeStatistics(statistics: any): string | null {
  if (!statistics) return null;
  return (
    "Estatísticas principais:\n" +
    `- Tickets total: ${statistics.totalTickets}\n` +
    `- Abertos: ${statistics.openTickets} | Em andamento: ${statistics.inProgressTickets} | Resolvidos: ${statistics.resolvedTickets}\n` +
    `- Documentos cadastrados: ${statistics.totalDocuments}\n` +
    `- Senhas salvas: ${statistics.totalPasswords}`
  );
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

    const conversationHistory = sanitizeHistory((body as any).history);
    
    // Detectar intenção
    const intent = detectIntent(message);
    
    // Buscar informações baseadas na intenção
    let documents: any[] = [];
    let tickets: any[] = [];
    let passwords: any[] = [];
    let historyUpdates: any[] = [];
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
      historyUpdates = await searchHistory(intent.keywords, user.id);
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
    
    // Gerar resposta determinística
    const deterministicResponse = generateResponse(
      intent,
      documents,
      tickets,
      passwords,
      historyUpdates,
      files,
      agenda,
      statistics,
      reports,
      message
    );

    if (isLocalAiEnabled()) {
      const aiMessages = buildAiMessages({
        question: message,
        intent,
        deterministicResponse,
        documents,
        tickets,
        passwords,
        historyUpdates,
        files,
        agenda,
        statistics,
        reports,
        conversationHistory,
      });

      const aiReply = await callLocalAi(aiMessages);
      if (aiReply) {
        return NextResponse.json({
          message: aiReply,
          intent: intent.type,
          source: "local-ai",
          sources: {
            documents: documents.length,
            files: files.length,
            tickets: tickets.length,
            passwords: passwords.length,
            history: historyUpdates.length,
          },
        });
      }
    }
    
    return NextResponse.json({
      message: deterministicResponse,
      intent: intent.type,
      source: "rule-based",
      sources: {
        documents: documents.length,
        files: files.length,
        tickets: tickets.length,
        passwords: passwords.length,
        history: historyUpdates.length,
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

