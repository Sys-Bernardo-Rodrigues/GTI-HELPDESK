"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { useSound } from "@/lib/sounds";
import NotificationBell from "@/components/NotificationBell";
import StandardLayout from "@/components/StandardLayout";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "OBSERVATION" | "RESOLVED" | "CLOSED";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Novo",
  IN_PROGRESS: "Em andamento",
  OBSERVATION: "Em observação",
  RESOLVED: "Resolvido",
  CLOSED: "Encerrado",
};

type TicketUpdateItem = {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name: string | null; email: string | null } | null;
};

type TicketItem = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  requester: { id: number; name: string | null; email: string | null } | null;
  assignedTo: { id: number; name: string | null; email: string | null } | null;
  form: { id: number; title: string; slug: string } | null;
  category: { id: number; name: string } | null;
  updates: TicketUpdateItem[];
};

type UserOption = { id: number; name: string; email: string };

type FeedbackMessage = { type: "success" | "error"; message: string } | null;

function normalizeTicket(raw: any): TicketItem {
  return {
    id: Number(raw.id),
    title: String(raw.title || "Ticket"),
    description: String(raw.description || ""),
    status: (raw.status || "OPEN") as TicketStatus,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    scheduledAt: raw.scheduledAt ?? null,
    category: raw.category
      ? { id: Number(raw.category.id), name: String(raw.category.name || "") }
      : null,
    requester: raw.requester
      ? {
          id: Number(raw.requester.id),
          name: raw.requester.name ?? null,
          email: raw.requester.email ?? null,
        }
      : null,
    form: raw.form
      ? {
          id: Number(raw.form.id),
          title: String(raw.form.title || ""),
          slug: String(raw.form.slug || ""),
        }
      : null,
    assignedTo: raw.assignedTo
      ? {
          id: Number(raw.assignedTo.id),
          name: raw.assignedTo.name ?? null,
          email: raw.assignedTo.email ?? null,
        }
      : null,
    updates: Array.isArray(raw.updates)
      ? raw.updates.map((update: any) => ({
          id: Number(update.id),
          content: String(update.content || ""),
          createdAt: update.createdAt,
          author: update.author || update.user
            ? {
                id: Number((update.author || update.user).id),
                name: (update.author || update.user).name ?? null,
                email: (update.author || update.user).email ?? null,
              }
            : null,
        }))
      : [],
  };
}

function normalizeUser(raw: any): UserOption {
  return {
    id: Number(raw.id),
    name: String(raw.name || raw.email || "Usuário"),
    email: String(raw.email || ""),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function getBrowserWindow(): any {
  if (typeof globalThis !== "undefined" && (globalThis as any).window) {
    return (globalThis as any).window;
  }
  return undefined;
}

function getBrowserOrigin(): string {
  const win = getBrowserWindow();
  if (win?.location?.origin) return String(win.location.origin);
  return "";
}


function getResolutionMinutes(ticket: TicketItem): number | null {
  if (ticket.status !== "CLOSED") return null;
  const created = new Date(ticket.createdAt).getTime();
  const updated = new Date(ticket.updatedAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return null;
  const diffMs = updated - created;
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (1000 * 60));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
}

function getFirstResponseMinutes(ticket: TicketItem): number | null {
  if (!ticket.updates || ticket.updates.length === 0) return null;
  const firstUpdate = ticket.updates[0];
  const created = new Date(ticket.createdAt).getTime();
  const firstResponse = new Date(firstUpdate.createdAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(firstResponse)) return null;
  const diffMs = firstResponse - created;
  if (diffMs < 0) return null;
  return Math.floor(diffMs / (1000 * 60));
}

function getTicketAgeHours(ticket: TicketItem): number {
  const created = new Date(ticket.createdAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60)));
}

function isOverdue(ticket: TicketItem, thresholdHours: number = 48): boolean {
  if (ticket.status === "CLOSED") return false;
  return getTicketAgeHours(ticket) >= thresholdHours;
}

export default function ReportsPage() {
  const sounds = useSound();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [forms, setForms] = useState<Array<{ id: number; title: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [formFilter, setFormFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<FeedbackMessage>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    loadUsers();
    loadForms();
  }, []);


  async function loadTickets(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro ao carregar tickets: ${res.status} - ${errorText}`);
      }
      const json: any = await res.json().catch(() => ({}));
      
      // A API retorna { items: [...] }
      const rawItems = json.items || json.tickets || [];
      if (!Array.isArray(rawItems)) {
        console.error("Resposta da API não é um array:", json);
        throw new Error("Formato de resposta inválido da API");
      }
      
      const items = rawItems.map(normalizeTicket);
      setTickets(items);
      
      // Recarregar formulários e usuários para sincronizar filtros
      if (items.length > 0) {
        loadUsers();
        loadForms();
      }
      
      if (items.length === 0 && !options?.silent) {
        setFeedback({ type: "success", message: "Nenhum ticket encontrado no período selecionado." });
      }
    } catch (err: any) {
      console.error("Erro ao carregar tickets:", err);
      setError(err?.message || "Erro desconhecido");
      setFeedback({ type: "error", message: err?.message || "Erro ao carregar tickets" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        console.error("Erro ao carregar usuários:", res.status);
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      // A API retorna { items: [...] }
      const rawItems = json.items || json.users || [];
      if (!Array.isArray(rawItems)) {
        console.error("Resposta de usuários não é um array:", json);
        return;
      }
      const items = rawItems.map(normalizeUser);
      setUsers(items);
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
    }
  }

  async function loadForms() {
    try {
      const res = await fetch("/api/forms");
      if (!res.ok) {
        console.error("Erro ao carregar formulários:", res.status);
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      // A API retorna { items: [...] }
      const rawItems = json.items || json.forms || [];
      if (!Array.isArray(rawItems)) {
        console.error("Resposta de formulários não é um array:", json);
        return;
      }
      const items = rawItems.map((f: any) => ({ 
        id: Number(f.id), 
        title: String(f.title || "") 
      }));
      setForms(items);
    } catch (err: any) {
      console.error("Erro ao carregar formulários:", err);
    }
  }

  // Extrair formulários e usuários únicos dos tickets para sincronizar filtros
  const availableForms = useMemo(() => {
    const formMap = new Map<number, { id: number; title: string }>();
    tickets.forEach((ticket) => {
      if (ticket.form) {
        formMap.set(ticket.form.id, { id: ticket.form.id, title: ticket.form.title });
      }
    });
    return Array.from(formMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [tickets]);

  const availableUsers = useMemo(() => {
    const userMap = new Map<number, { id: number; name: string; email: string }>();
    tickets.forEach((ticket) => {
      if (ticket.assignedTo) {
        userMap.set(ticket.assignedTo.id, {
          id: ticket.assignedTo.id,
          name: ticket.assignedTo.name || ticket.assignedTo.email || "Sem nome",
          email: ticket.assignedTo.email || "",
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((t) => new Date(t.createdAt) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => new Date(t.createdAt) <= toDate);
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (formFilter !== "ALL") {
      const formId = Number(formFilter);
      // Verificar se o formulário ainda existe nos tickets disponíveis
      const formExists = availableForms.some((f) => f.id === formId) || forms.some((f) => f.id === formId);
      if (formExists) {
        filtered = filtered.filter((t) => t.form?.id === formId);
      }
    }

    if (assigneeFilter !== "ALL") {
      const userId = Number(assigneeFilter);
      // Verificar se o usuário ainda existe nos tickets disponíveis
      const userExists = availableUsers.some((u) => u.id === userId) || users.some((u) => u.id === userId);
      if (userExists) {
        filtered = filtered.filter((t) => t.assignedTo?.id === userId);
      }
    }

    return filtered;
  }, [tickets, dateFrom, dateTo, statusFilter, formFilter, assigneeFilter, availableForms, availableUsers, forms, users]);

  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const byStatus: Record<TicketStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      OBSERVATION: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    const byForm: Record<number, number> = {};
    const byAssignee: Record<number, { 
      count: number; 
      name: string; 
      closed: number;
      avgResolution: number;
      avgFirstResponse: number;
      resolutionTimes: number[];
      firstResponseTimes: number[];
    }> = {};
    const resolutionTimes: number[] = [];
    const firstResponseTimes: number[] = [];
    const overdueCount = filteredTickets.filter(t => isOverdue(t)).length;
    const closedCount = filteredTickets.filter(t => t.status === "CLOSED").length;
    const scheduledCount = filteredTickets.filter(t => t.scheduledAt !== null).length;
    const resolutionRate = total > 0 ? (closedCount / total) * 100 : 0;
    
    // Análise temporal
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};

    filteredTickets.forEach((ticket) => {
      byStatus[ticket.status] = (byStatus[ticket.status] || 0) + 1;

      if (ticket.form) {
        byForm[ticket.form.id] = (byForm[ticket.form.id] || 0) + 1;
      }

      // Análise temporal
      const createdDate = new Date(ticket.createdAt);
      const dayKey = createdDate.toISOString().split("T")[0];
      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      const hour = createdDate.getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;

      if (ticket.assignedTo) {
        const assigneeId = ticket.assignedTo.id;
        if (!byAssignee[assigneeId]) {
          byAssignee[assigneeId] = {
            count: 0,
            name: ticket.assignedTo.name || ticket.assignedTo.email || "Sem nome",
            closed: 0,
            avgResolution: 0,
            avgFirstResponse: 0,
            resolutionTimes: [],
            firstResponseTimes: [],
          };
        }
        byAssignee[assigneeId].count += 1;

        if (ticket.status === "CLOSED") {
          byAssignee[assigneeId].closed += 1;
          const minutes = getResolutionMinutes(ticket);
          if (minutes !== null) {
            byAssignee[assigneeId].resolutionTimes.push(minutes);
          }
        }

        const firstResponse = getFirstResponseMinutes(ticket);
        if (firstResponse !== null) {
          byAssignee[assigneeId].firstResponseTimes.push(firstResponse);
        }
      }

      if (ticket.status === "CLOSED") {
        const minutes = getResolutionMinutes(ticket);
        if (minutes !== null) {
          resolutionTimes.push(minutes);
        }
      }

      const firstResponse = getFirstResponseMinutes(ticket);
      if (firstResponse !== null) {
        firstResponseTimes.push(firstResponse);
      }
    });

    // Calcular médias por responsável
    Object.keys(byAssignee).forEach((assigneeId) => {
      const assignee = byAssignee[Number(assigneeId)];
      if (assignee.resolutionTimes.length > 0) {
        assignee.avgResolution = Math.round(
          assignee.resolutionTimes.reduce((a, b) => a + b, 0) / assignee.resolutionTimes.length
        );
      }
      if (assignee.firstResponseTimes.length > 0) {
        assignee.avgFirstResponse = Math.round(
          assignee.firstResponseTimes.reduce((a, b) => a + b, 0) / assignee.firstResponseTimes.length
        );
      }
    });

    const avgResolution = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : null;

    const avgFirstResponse = firstResponseTimes.length > 0
      ? Math.round(firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length)
      : null;

    const topForm = Object.entries(byForm).sort((a, b) => b[1] - a[1])[0];
    const topAssignee = Object.entries(byAssignee).sort((a, b) => b[1].count - a[1].count)[0];

    // Ordenar responsáveis por performance
    const assigneePerformance = Object.entries(byAssignee)
      .map(([id, data]) => ({
        id: Number(id),
        ...data,
        performance: data.closed > 0 ? (data.closed / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.performance - a.performance);

    return {
      total,
      closedCount,
      overdueCount,
      scheduledCount,
      resolutionRate,
      byStatus,
      byForm,
      byAssignee,
      byDay,
      byHour,
      avgResolution,
      avgFirstResponse,
      topForm: topForm ? { id: Number(topForm[0]), count: topForm[1] } : null,
      topAssignee: topAssignee ? { id: Number(topAssignee[0]), ...topAssignee[1] } : null,
      assigneePerformance,
    };
  }, [filteredTickets]);

  function handleExport() {
    setExporting(true);
    try {
      const headers = ["ID", "Título", "Status", "Formulário", "Responsável", "Solicitante", "Data de abertura", "Data de atualização"];
      const rows = filteredTickets.map((ticket) => [
        String(ticket.id),
        ticket.title,
        STATUS_LABELS[ticket.status],
        ticket.form?.title || "—",
        ticket.assignedTo?.name || ticket.assignedTo?.email || "—",
        ticket.requester?.name || ticket.requester?.email || "—",
        formatDateOnly(ticket.createdAt),
        formatDateOnly(ticket.updatedAt),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-tickets-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setFeedback({ type: "success", message: "Relatório exportado com sucesso!" });
      sounds.playSuccess();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao exportar relatório" });
      sounds.playError();
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (loading) {
    return (
      <StandardLayout>
            <LoadingContainer>
              <LoadingSpinner />
              <LoadingText>Carregando relatórios...</LoadingText>
            </LoadingContainer>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
          <MainCard>
            <PageHeader>
              <HeaderBlock>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <HeaderIcon aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                  </HeaderIcon>
                  <Title>Relatórios de Tickets</Title>
                </div>
              </HeaderBlock>
              <HeaderActions>
                <ExportButton type="button" onClick={handleExport} disabled={loading || exporting}>
                  {exporting ? "Exportando..." : "Exportar CSV"}
                </ExportButton>
                <ReloadButton 
                  onClick={() => loadTickets({ silent: true })} 
                  disabled={loading || refreshing}
                  title={refreshing ? "Atualizando..." : "Atualizar"}
                  aria-label={refreshing ? "Atualizando..." : "Atualizar"}
                >
                  <ReloadIcon $spinning={refreshing} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </ReloadIcon>
                </ReloadButton>
              </HeaderActions>
            </PageHeader>

            {feedback && (
              <FeedbackBanner data-type={feedback.type} role="status">
                {feedback.message}
              </FeedbackBanner>
            )}

            <FiltersBar>
              <FiltersHeader>
                <div>
                  <FiltersTitle>Filtros</FiltersTitle>
                </div>
                <FiltersSummary>
                  <FiltersBadge>{filteredTickets.length.toLocaleString("pt-BR")} ticket(s)</FiltersBadge>
                </FiltersSummary>
              </FiltersHeader>

              <FiltersGrid>
                <FilterGroup>
                  <FilterLabel>Período</FilterLabel>
                  <DateInputs>
                    <DateInput
                      type="date"
                      value={dateFrom}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                    />
                    <DateSeparator>até</DateSeparator>
                    <DateInput
                      type="date"
                      value={dateTo}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                    />
                  </DateInputs>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Status</FilterLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Todos</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Formulário</FilterLabel>
                  <Select
                    value={formFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormFilter(e.target.value)}
                  >
                    <option value="ALL">Todos</option>
                    {availableForms.length === 0 && forms.length === 0 ? (
                      <option disabled>Carregando formulários...</option>
                    ) : (
                      (availableForms.length > 0 ? availableForms : forms).map((form) => (
                        <option key={form.id} value={String(form.id)}>
                          {form.title}
                        </option>
                      ))
                    )}
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Responsável</FilterLabel>
                  <Select
                    value={assigneeFilter}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssigneeFilter(e.target.value)}
                  >
                    <option value="ALL">Todos</option>
                    {availableUsers.length === 0 && users.length === 0 ? (
                      <option disabled>Carregando responsáveis...</option>
                    ) : (
                      (availableUsers.length > 0 ? availableUsers : users).map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {user.name || user.email}
                        </option>
                      ))
                    )}
                  </Select>
                </FilterGroup>
              </FiltersGrid>
            </FiltersBar>

            {filteredTickets.length === 0 && !loading ? (
              <EmptyState>
                <EmptyStateIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </EmptyStateIcon>
                <EmptyStateTitle>Nenhum ticket encontrado</EmptyStateTitle>
                <EmptyStateText>
                  {dateFrom || dateTo || statusFilter !== "ALL" || formFilter !== "ALL" || assigneeFilter !== "ALL"
                    ? "Tente ajustar os filtros para encontrar tickets."
                    : "Não há tickets cadastrados no sistema."}
                </EmptyStateText>
              </EmptyState>
            ) : (
              <>
            <MetricsSection>
              <MetricsSectionTitle>Métricas Principais</MetricsSectionTitle>
              <PrimaryMetricsGrid>
                <StatCard $primary>
                  <StatIcon $primary>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue $primary>{stats.total}</StatValue>
                    <StatLabel>
                      Total de Tickets
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Total de tickets no período selecionado, incluindo todos os status.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard $primary>
                  <StatIcon $color="#10b981" $primary>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue $primary>{stats.resolutionRate.toFixed(1)}%</StatValue>
                    <StatLabel>
                      Taxa de Resolução
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Percentual de tickets encerrados em relação ao total de tickets.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                {stats.avgResolution !== null && (
                  <StatCard $primary>
                    <StatIcon $color="#7c3aed" $primary>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    </StatIcon>
                    <StatContent>
                      <StatValue $primary>{formatDuration(stats.avgResolution)}</StatValue>
                      <StatLabel>
                        Tempo Médio de Resolução
                        <InfoIconWrapper>
                          <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </InfoIcon>
                          <Tooltip>Tempo médio desde a abertura até o encerramento do ticket.</Tooltip>
                        </InfoIconWrapper>
                      </StatLabel>
                    </StatContent>
                  </StatCard>
                )}

                {stats.avgFirstResponse !== null && (
                  <StatCard $primary>
                    <StatIcon $color="#f59e0b" $primary>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        <line x1="9" y1="9" x2="15" y2="9"/>
                      </svg>
                    </StatIcon>
                    <StatContent>
                      <StatValue $primary>{formatDuration(stats.avgFirstResponse)}</StatValue>
                      <StatLabel>
                        Tempo Médio de Primeira Resposta
                        <InfoIconWrapper>
                          <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </InfoIcon>
                          <Tooltip>Tempo médio desde a abertura até a primeira atualização do ticket pelo responsável.</Tooltip>
                        </InfoIconWrapper>
                      </StatLabel>
                    </StatContent>
                  </StatCard>
                )}
              </PrimaryMetricsGrid>

              <MetricsSectionTitle>Distribuição por Status</MetricsSectionTitle>
              <ReportsGrid>
                <StatCard>
                  <StatIcon $color="#1d4ed8">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue>{stats.byStatus.OPEN}</StatValue>
                    <StatLabel>
                      Novos
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Tickets recém-criados que ainda não foram atribuídos ou iniciados.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon $color="#b45309">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue>{stats.byStatus.IN_PROGRESS}</StatValue>
                    <StatLabel>
                      Em Andamento
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Tickets que estão sendo trabalhados ativamente pelo responsável.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon $color="#0369a1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue>{stats.byStatus.OBSERVATION}</StatValue>
                    <StatLabel>
                      Em Observação
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Tickets aguardando resposta ou ação do solicitante.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon $color="#059669">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue>{stats.byStatus.RESOLVED}</StatValue>
                    <StatLabel>
                      Resolvidos
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Tickets que foram resolvidos mas ainda não foram encerrados oficialmente.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                <StatCard>
                  <StatIcon $color="#047857">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </StatIcon>
                  <StatContent>
                    <StatValue>{stats.byStatus.CLOSED}</StatValue>
                    <StatLabel>
                      Encerrados
                      <InfoIconWrapper>
                        <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </InfoIcon>
                        <Tooltip>Tickets finalizados e arquivados no histórico.</Tooltip>
                      </InfoIconWrapper>
                    </StatLabel>
                  </StatContent>
                </StatCard>

                {stats.overdueCount > 0 && (
                  <StatCard>
                    <StatIcon $color="#ef4444">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1 12l9.29 8.14a1 1 0 0 0 1.42 0l9.29-8.14L11.71 3.86a1 1 0 0 0-1.42 0z"/>
                        <line x1="1" y1="12" x2="23" y2="12"/>
                      </svg>
                    </StatIcon>
                    <StatContent>
                      <StatValue>{stats.overdueCount}</StatValue>
                      <StatLabel>
                        Tickets em Atraso (&gt;48h)
                        <InfoIconWrapper>
                          <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </InfoIcon>
                          <Tooltip>Tickets abertos há mais de 48 horas que ainda não foram encerrados.</Tooltip>
                        </InfoIconWrapper>
                      </StatLabel>
                    </StatContent>
                  </StatCard>
                )}

                {stats.topForm && (
                  <StatCard>
                    <StatIcon $color="#dc2626">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </StatIcon>
                    <StatContent>
                      <StatValue>{stats.topForm.count}</StatValue>
                      <StatLabel>
                        {forms.find((f) => f.id === stats.topForm!.id)?.title || availableForms.find((f) => f.id === stats.topForm!.id)?.title || "Formulário"}
                        <InfoIconWrapper>
                          <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </InfoIcon>
                          <Tooltip>Formulário que gerou mais tickets no período selecionado.</Tooltip>
                        </InfoIconWrapper>
                      </StatLabel>
                    </StatContent>
                  </StatCard>
                )}

                {stats.scheduledCount > 0 && (
                  <StatCard>
                    <StatIcon $color="#8b5cf6">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                      </svg>
                    </StatIcon>
                    <StatContent>
                      <StatValue>{stats.scheduledCount}</StatValue>
                      <StatLabel>
                        Em Agendamento
                        <InfoIconWrapper>
                          <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </InfoIcon>
                          <Tooltip>Tickets que possuem uma data de agendamento definida para atendimento.</Tooltip>
                        </InfoIconWrapper>
                      </StatLabel>
                    </StatContent>
                  </StatCard>
                )}
              </ReportsGrid>
            </MetricsSection>

            <ChartsSection>
              <SectionHeader>
                <SectionTitle>Análises Visuais</SectionTitle>
                <SectionSubtitle>Gráficos e distribuições para análise detalhada</SectionSubtitle>
              </SectionHeader>
              
              <ChartsGrid>
              <ChartCard>
                <ChartTitle>
                  Distribuição por Status
                  <InfoIconWrapper>
                    <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </InfoIcon>
                    <Tooltip>Visualização da quantidade de tickets em cada status, mostrando a distribuição percentual do total.</Tooltip>
                  </InfoIconWrapper>
                </ChartTitle>
                <StatusChart>
                  {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = stats.byStatus[status as TicketStatus];
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <StatusBar key={status}>
                        <StatusBarLabel>{label}</StatusBarLabel>
                        <StatusBarTrack>
                          <StatusBarFill $percentage={percentage} $status={status as TicketStatus}>
                            <StatusBarValue>{count}</StatusBarValue>
                          </StatusBarFill>
                        </StatusBarTrack>
                        <StatusBarPercentage>{percentage.toFixed(1)}%</StatusBarPercentage>
                      </StatusBar>
                    );
                  })}
                </StatusChart>
              </ChartCard>

              {Object.keys(stats.byForm).length > 0 && (
                <ChartCard>
                  <ChartTitle>
                    Top 5 Formulários
                    <InfoIconWrapper>
                      <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </InfoIcon>
                      <Tooltip>Os 5 formulários que geraram mais tickets no período selecionado, ordenados por quantidade.</Tooltip>
                    </InfoIconWrapper>
                  </ChartTitle>
                  <FormChart>
                    {Object.entries(stats.byForm)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([formId, count]) => {
                        const form = forms.find((f) => f.id === Number(formId));
                        const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                        return (
                          <FormBar key={formId}>
                            <FormBarLabel>{form?.title || `Formulário ${formId}`}</FormBarLabel>
                            <FormBarTrack>
                              <FormBarFill $percentage={percentage}>
                                <FormBarValue>{count}</FormBarValue>
                              </FormBarFill>
                            </FormBarTrack>
                            <FormBarPercentage>{percentage.toFixed(1)}%</FormBarPercentage>
                          </FormBar>
                        );
                      })}
                  </FormChart>
                </ChartCard>
              )}

              {Object.keys(stats.byDay).length > 0 && (
                <ChartCard>
                  <ChartTitle>
                    Evolução Temporal (Tickets por Dia)
                    <InfoIconWrapper>
                      <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </InfoIcon>
                      <Tooltip>Gráfico mostrando a quantidade de tickets criados por dia ao longo do período selecionado, permitindo identificar tendências temporais.</Tooltip>
                    </InfoIconWrapper>
                  </ChartTitle>
                  <TimelineChart>
                    {Object.entries(stats.byDay)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([day, count]) => {
                        const maxCount = Math.max(...Object.values(stats.byDay));
                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        const date = new Date(day);
                        const dayLabel = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                        return (
                          <TimelineBar key={day}>
                            <TimelineBarLabel>{dayLabel}</TimelineBarLabel>
                            <TimelineBarTrack>
                              <TimelineBarFill $percentage={percentage}>
                                <TimelineBarValue>{count}</TimelineBarValue>
                              </TimelineBarFill>
                            </TimelineBarTrack>
                          </TimelineBar>
                        );
                      })}
                  </TimelineChart>
                </ChartCard>
              )}

              {Object.keys(stats.byHour).length > 0 && (
                <ChartCard>
                  <ChartTitle>
                    Distribuição por Hora do Dia
                    <InfoIconWrapper>
                      <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </InfoIcon>
                      <Tooltip>Distribuição de tickets criados por hora do dia (0h às 23h), ajudando a identificar os horários de maior demanda.</Tooltip>
                    </InfoIconWrapper>
                  </ChartTitle>
                  <HourChart>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const count = stats.byHour[hour] || 0;
                      const maxCount = Math.max(...Object.values(stats.byHour));
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <HourBar key={hour}>
                          <HourBarLabel>{String(hour).padStart(2, "0")}h</HourBarLabel>
                          <HourBarTrack>
                            <HourBarFill $percentage={percentage}>
                              {count > 0 && <HourBarValue>{count}</HourBarValue>}
                            </HourBarFill>
                          </HourBarTrack>
                        </HourBar>
                      );
                    })}
                  </HourChart>
                </ChartCard>
              )}
              </ChartsGrid>
            </ChartsSection>

            {stats.assigneePerformance.length > 0 && (
              <PerformanceSection>
                <SectionHeader>
                  <SectionTitle>Performance da Equipe</SectionTitle>
                  <SectionSubtitle>Análise detalhada do desempenho por responsável</SectionSubtitle>
                </SectionHeader>
                <PerformanceTable>
                  <TableTitle>
                    Performance por Responsável
                    <InfoIconWrapper>
                      <InfoIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </InfoIcon>
                      <Tooltip>Análise detalhada do desempenho de cada responsável, incluindo taxa de resolução, tempo médio de resolução e tempo médio de primeira resposta.</Tooltip>
                    </InfoIconWrapper>
                  </TableTitle>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Responsável</TableHeader>
                      <TableHeader>Total</TableHeader>
                      <TableHeader>Encerrados</TableHeader>
                      <TableHeader>Taxa</TableHeader>
                      <TableHeader>Tempo Médio Resolução</TableHeader>
                      <TableHeader>Tempo Médio Primeira Resposta</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.assigneePerformance.map((assignee) => (
                      <TableRow key={assignee.id}>
                        <TableCell>{assignee.name}</TableCell>
                        <TableCell>{assignee.count}</TableCell>
                        <TableCell>{assignee.closed}</TableCell>
                        <TableCell>
                          <PerformanceBadge $performance={assignee.performance}>
                            {assignee.performance.toFixed(1)}%
                          </PerformanceBadge>
                        </TableCell>
                        <TableCell>
                          {assignee.avgResolution > 0 ? formatDuration(assignee.avgResolution) : "—"}
                        </TableCell>
                        <TableCell>
                          {assignee.avgFirstResponse > 0 ? formatDuration(assignee.avgFirstResponse) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </PerformanceTable>
              </PerformanceSection>
            )}
              </>
            )}
          </MainCard>
    </StandardLayout>
  );
}

const SPIN = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--bg);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const MenuToggle = styled.button`
  margin-left: auto;
  border: 1px solid var(--border);
  background: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  @media (min-width: 961px) {
    display: none;
  }
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 16px;
  padding: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside<{ $open: boolean }>`
  background: var(--surface);
  border-right: 1px solid var(--border);
  box-shadow: 2px 0 12px rgba(0,0,0,0.06);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 72px);
  overflow: visible;
  position: sticky;
  top: 72px;
  align-self: start;
  transition: transform .25s ease, opacity .25s ease;

  @media (max-width: 960px) {
    position: fixed;
    top: 56px;
    left: 0;
    right: auto;
    width: min(82vw, 240px);
    height: calc(100dvh - 56px);
    border-radius: 0 12px 12px 0;
    transform: translateX(${(p) => (p.$open ? "0" : "-105%")});
    opacity: ${(p) => (p.$open ? 1 : 0)};
    z-index: 20;
  }
`;

const MenuScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding-right: 4px;
`;

const NavItem = styled.a`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
  &:hover { background: #f3f4f6; }
  &[aria-current="page"] { background: #eef2f7; font-weight: 600; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const UserFooter = styled.footer`
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  cursor: pointer;
  user-select: none;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e7eb;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 700;
  user-select: none;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 0.875rem;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserName = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
`;

const UserMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 108px;
  bottom: 96px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 200px;
  padding: 8px;
  transform: translateY(${(p) => (p.$open ? "0" : "8px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease, transform .18s ease;
  z-index: 100;

  @media (max-width: 960px) {
    left: 16px;
  }
`;

const UserMenuItem = styled.button<{ $variant?: "danger" }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  color: ${(p) => (p.$variant === "danger" ? "#B00000" : "inherit")};
  &:hover { background: ${(p) => (p.$variant === "danger" ? "#ffe5e5" : "#f3f4f6")}; }
  &:active { background: ${(p) => (p.$variant === "danger" ? "#ffcccc" : "#e9ecef")}; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const Overlay = styled.div<{ $show: boolean }>`
  @media (min-width: 961px) { display: none; }
  position: fixed;
  inset: 56px 0 0 0;
  background: rgba(0,0,0,0.15);
  opacity: ${(p) => (p.$show ? 1 : 0)};
  pointer-events: ${(p) => (p.$show ? "auto" : "none")};
  transition: opacity .25s ease;
  z-index: 15;
`;

const Content = styled.main`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.04);

  @media (min-width: 960px) {
    grid-column: span 6;
  }
`;

const MainCard = styled(Card)`
  grid-column: span 12;
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 30;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.16);
  width: min(90vw, 420px);
  padding: 16px;
  z-index: 31;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: transform .18s ease, opacity .18s ease;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 12px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #FF0000;
  background: #FF0000;
  color: #fff;
  cursor: pointer;
  &:hover { filter: brightness(1.05); }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const PageHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ExportButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: rgba(37, 99, 235, 0.14);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ReloadButton = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, background 0.2s ease;
  &:hover:not(:disabled) { 
    background: rgba(37, 99, 235, 0.14);
    transform: scale(1.05);
  }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const ReloadIcon = styled.svg<{ $spinning?: boolean }>`
  width: 20px;
  height: 20px;
  transition: transform 0.3s ease;
  ${(p) => p.$spinning && css`
    animation: ${SPIN} 1s linear infinite;
  `}
`;

const FeedbackBanner = styled.div<{ "data-type": "success" | "error" }>`
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 24px;
  background: ${(p) => (p["data-type"] === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)")};
  color: ${(p) => (p["data-type"] === "success" ? "#047857" : "#dc2626")};
  font-weight: 500;
`;

const FiltersBar = styled.section`
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.78), #ffffff 120%);
  box-shadow: 0 20px 36px -30px rgba(15, 23, 42, 0.45);
  margin-bottom: 24px;
`;

const FiltersHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
`;

const FiltersTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
`;

const FiltersSummary = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const FiltersBadge = styled.span`
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-weight: 600;
  font-size: 0.9rem;
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DateInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DateInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #ffffff;
  color: #0f172a;
  font-size: 0.9rem;
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const DateSeparator = styled.span`
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
`;

const Select = styled.select`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #ffffff;
  color: #0f172a;
  font-size: 0.9rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const MetricsSection = styled.div`
  margin-bottom: 32px;
`;

const MetricsSectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(37, 99, 235, 0.15);
`;

const PrimaryMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
  
  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  
  @media (min-width: 1400px) {
    gap: 20px;
  }
`;

const StatCard = styled.div<{ $primary?: boolean }>`
  padding: ${(p) => (p.$primary ? "24px" : "16px")};
  border-radius: 12px;
  border: ${(p) => (p.$primary ? "2px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(148, 163, 184, 0.18)")};
  background: ${(p) => (p.$primary ? "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.04))" : "linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6))")};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${(p) => (p.$primary ? "12px" : "10px")};
  transition: all 0.2s ease;
  ${(p) => p.$primary && `
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  `}
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${(p) => (p.$primary ? "0 8px 24px rgba(37, 99, 235, 0.15)" : "0 8px 20px rgba(0, 0, 0, 0.1)")};
  }
`;

const StatIcon = styled.div<{ $color?: string; $primary?: boolean }>`
  width: ${(p) => (p.$primary ? "56px" : "44px")};
  height: ${(p) => (p.$primary ? "56px" : "44px")};
  border-radius: 10px;
  background: ${(p) => {
    if (p.$primary) return "rgba(37, 99, 235, 0.15)";
    if (p.$color === "#1d4ed8") return "rgba(29, 78, 216, 0.1)";
    if (p.$color === "#b45309") return "rgba(180, 83, 9, 0.1)";
    if (p.$color === "#047857") return "rgba(4, 120, 87, 0.1)";
    if (p.$color === "#7c3aed") return "rgba(124, 58, 237, 0.1)";
    if (p.$color === "#10b981") return "rgba(16, 185, 129, 0.1)";
    if (p.$color === "#f59e0b") return "rgba(245, 158, 11, 0.1)";
    if (p.$color === "#ef4444") return "rgba(239, 68, 68, 0.1)";
    if (p.$color === "#0369a1") return "rgba(3, 105, 161, 0.1)";
    if (p.$color === "#059669") return "rgba(5, 150, 105, 0.1)";
    if (p.$color === "#dc2626") return "rgba(220, 38, 38, 0.1)";
    if (p.$color === "#8b5cf6") return "rgba(139, 92, 246, 0.1)";
    return "rgba(37, 99, 235, 0.1)";
  }};
  color: ${(p) => p.$color || (p.$primary ? "#2563eb" : "#2563eb")};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg {
    width: ${(p) => (p.$primary ? "28px" : "22px")};
    height: ${(p) => (p.$primary ? "28px" : "22px")};
  }
`;

const StatContent = styled.div`
  flex: 1;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const StatValue = styled.div<{ $primary?: boolean }>`
  font-size: ${(p) => (p.$primary ? "2.25rem" : "1.5rem")};
  font-weight: 700;
  color: ${(p) => (p.$primary ? "#1d4ed8" : "#0f172a")};
  line-height: 1.2;
`;

const StatLabel = styled.div<{ $primary?: boolean }>`
  font-size: ${(p) => (p.$primary ? "0.9rem" : "0.8rem")};
  color: ${(p) => (p.$primary ? "#475569" : "#64748b")};
  font-weight: ${(p) => (p.$primary ? "600" : "500")};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  text-align: center;
`;

const InfoIconWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: help;
`;

const InfoIcon = styled.svg`
  width: 14px;
  height: 14px;
  color: #94a3b8;
  transition: color 0.2s ease;
  flex-shrink: 0;
  
  ${InfoIconWrapper}:hover & {
    color: #2563eb;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #0f172a;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 400;
  white-space: nowrap;
  min-width: 200px;
  max-width: 280px;
  white-space: normal;
  line-height: 1.4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
  z-index: 1000;
  pointer-events: none;
  
  ${InfoIconWrapper}:hover & {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }
  
  &::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #0f172a;
  }
`;

const ChartsSection = styled.div`
  margin-top: 32px;
`;

const SectionHeader = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
`;

const SectionSubtitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-top: 24px;
`;

const ChartCard = styled.div`
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6));
`;

const ChartTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StatusBar = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr 60px;
  gap: 12px;
  align-items: center;
`;

const StatusBarLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
`;

const StatusBarTrack = styled.div`
  height: 32px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
`;

const StatusBarFill = styled.div<{ $percentage: number; $status: TicketStatus }>`
  height: 100%;
  width: ${(p) => p.$percentage}%;
  background: ${(p) => {
    const colors: Record<TicketStatus, string> = {
      OPEN: "linear-gradient(90deg, #3b82f6, #2563eb)",
      IN_PROGRESS: "linear-gradient(90deg, #f59e0b, #d97706)",
      OBSERVATION: "linear-gradient(90deg, #0ea5e9, #0284c7)",
      RESOLVED: "linear-gradient(90deg, #10b981, #059669)",
      CLOSED: "linear-gradient(90deg, #64748b, #475569)",
    };
    return colors[p.$status];
  }};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  transition: width 0.5s ease;
`;

const StatusBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.85rem;
`;

const StatusBarPercentage = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-align: right;
`;

const FormChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px 60px;
  gap: 12px;
  align-items: center;
`;

const FormBarLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FormBarTrack = styled.div`
  height: 32px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
`;

const FormBarFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${(p) => p.$percentage}%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  transition: width 0.5s ease;
`;

const FormBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.85rem;
`;

const FormBarPercentage = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-align: right;
`;

const TimelineChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
`;

const TimelineBar = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  align-items: center;
`;

const TimelineBarLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  color: #475569;
`;

const TimelineBarTrack = styled.div`
  height: 28px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
`;

const TimelineBarFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${(p) => p.$percentage}%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  transition: width 0.5s ease;
`;

const TimelineBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.8rem;
`;

const HourChart = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const HourBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
`;

const HourBarLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
`;

const HourBarTrack = styled.div`
  width: 100%;
  height: 120px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: flex-end;
`;

const HourBarFill = styled.div<{ $percentage: number }>`
  width: 100%;
  height: ${(p) => p.$percentage}%;
  background: linear-gradient(180deg, #8b5cf6, #7c3aed);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  transition: height 0.5s ease;
  min-height: ${(p) => (p.$percentage > 0 ? "20px" : "0")};
`;

const HourBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.7rem;
`;

const PerformanceSection = styled.div`
  margin-top: 32px;
`;

const PerformanceTable = styled(Card)`
  margin-top: 24px;
  overflow-x: auto;
`;

const TableTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: rgba(248, 250, 252, 0.8);
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  &:hover {
    background: rgba(248, 250, 252, 0.5);
  }
`;

const TableHeader = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 0.9rem;
  color: #0f172a;
`;

const PerformanceBadge = styled.span<{ $performance: number }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  background: ${(p) => {
    if (p.$performance >= 80) return "rgba(16, 185, 129, 0.15)";
    if (p.$performance >= 60) return "rgba(234, 179, 8, 0.15)";
    return "rgba(239, 68, 68, 0.15)";
  }};
  color: ${(p) => {
    if (p.$performance >= 80) return "#047857";
    if (p.$performance >= 60) return "#b45309";
    return "#dc2626";
  }};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  color: #94a3b8;
  margin-bottom: 16px;
  svg {
    width: 100%;
    height: 100%;
  }
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
`;

const EmptyStateText = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 100dvh;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(37, 99, 235, 0.1);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: ${SPIN} 1s linear infinite;
`;

const LoadingText = styled.div`
  color: #64748b;
  font-weight: 500;
`;

