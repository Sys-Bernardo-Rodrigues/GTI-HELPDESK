"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Toast, useToast } from "@/components/Toast";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "OBSERVATION" | "RESOLVED" | "CLOSED";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Novo",
  IN_PROGRESS: "Em andamento",
  OBSERVATION: "Em observação",
  RESOLVED: "Resolvido",
  CLOSED: "Encerrado",
};

type TicketItem = {
  id: number;
  title: string;
  description?: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; email: string; avatarUrl?: string };
  assignedTo?: { id: number; name: string; email: string; avatarUrl?: string };
  category?: { id: number; name: string };
  submission?: { id: number; form: { id: number; title: string; slug: string } };
  updates?: Array<{ id: number; createdAt: string; content: string }>;
  _count?: { updates: number };
};

function normalizeTicket(item: any): TicketItem {
  return {
    id: item.id,
    title: item.title || "",
    description: item.description || undefined,
    status: item.status || "OPEN",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    user: item.user ? { id: item.user.id, name: item.user.name, email: item.user.email, avatarUrl: item.user.avatarUrl } : undefined,
    assignedTo: item.assignedTo ? { id: item.assignedTo.id, name: item.assignedTo.name, email: item.assignedTo.email, avatarUrl: item.assignedTo.avatarUrl } : undefined,
    category: item.category ? { id: item.category.id, name: item.category.name } : undefined,
    submission: item.submission ? { id: item.submission.id, form: { id: item.submission.form.id, title: item.submission.form.title, slug: item.submission.form.slug } } : undefined,
    updates: item.updates || [],
    _count: item._count || { updates: 0 },
  };
}

export default function KioskReportsPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);
  const [autoRefreshInterval] = useState<number>(30); // 30 segundos por padrão no kiosk

  useEffect(() => {
    loadTickets();
    loadSystemMetrics();
    
    // Tentar entrar em fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Ignora erros de fullscreen (usuário pode ter bloqueado)
      });
    }
  }, []);

  // Auto-refresh no kiosk
  useEffect(() => {
    const intervalMs = autoRefreshInterval * 1000;
    const intervalId = setInterval(() => {
      loadTickets({ silent: true });
      loadSystemMetrics();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshInterval]);

  async function loadTickets(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      if (!res.ok) throw new Error(`Erro ao carregar tickets: ${res.status}`);
      const json: any = await res.json();
      const rawItems = json.items || json.tickets || [];
      if (!Array.isArray(rawItems)) throw new Error("Formato de resposta inválido");
      const items = rawItems.map(normalizeTicket);
      setTickets(items);
    } catch (err: any) {
      console.error("Erro ao carregar tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSystemMetrics() {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/reports/metrics");
      if (!res.ok) return;
      const data = await res.json();
      setSystemMetrics(data);
    } catch (err: any) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }

  const filteredTickets = useMemo(() => tickets, [tickets]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      OBSERVATION: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    // Análise temporal
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};

    filteredTickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      // Análise temporal
      const createdDate = new Date(t.createdAt);
      const dayKey = createdDate.toISOString().split("T")[0];
      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      const hour = createdDate.getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;
    });

    const closed = byStatus.CLOSED;
    const total = filteredTickets.length;
    const resolutionRate = total > 0 ? (closed / total) * 100 : 0;

    // Calcular tempo médio de resolução
    const closedTickets = filteredTickets.filter((t) => t.status === "CLOSED");
    let avgResolution: number | null = null;
    if (closedTickets.length > 0) {
      const times = closedTickets
        .map((t) => {
          const created = new Date(t.createdAt).getTime();
          const updated = new Date(t.updatedAt).getTime();
          return updated - created;
        })
        .filter((t) => t > 0 && Number.isFinite(t));

      if (times.length > 0) {
        avgResolution = Math.round(times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60));
      }
    }

    // Calcular tempo médio de primeira resposta
    let avgFirstResponse: number | null = null;
    const ticketsWithUpdates = filteredTickets.filter((t) => t.updates && t.updates.length > 0);
    if (ticketsWithUpdates.length > 0) {
      const firstResponseTimes = ticketsWithUpdates
        .map((t) => {
          if (!t.updates || t.updates.length === 0) return null;
          const firstUpdate = t.updates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
          const created = new Date(t.createdAt).getTime();
          const firstResponse = new Date(firstUpdate.createdAt).getTime();
          return firstResponse - created;
        })
        .filter((t): t is number => t !== null && t > 0 && Number.isFinite(t));

      if (firstResponseTimes.length > 0) {
        avgFirstResponse = Math.round(firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length / (1000 * 60));
      }
    }

    return {
      total,
      byStatus,
      byDay,
      byHour,
      resolutionRate,
      avgResolution,
      avgFirstResponse,
    };
  }, [filteredTickets]);

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const hrs = hours % 24;
    return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
  }

  if (loading && tickets.length === 0) {
    return (
      <KioskContainer>
        <LoadingOverlay>
          <LoadingSpinner size="large" />
        </LoadingOverlay>
      </KioskContainer>
    );
  }

  return (
    <KioskContainer>
      <KioskContent>
        <KioskMainContent>
        {systemMetrics && !loadingMetrics && (
          <SystemMetricsSection>
            <MetricsSectionTitle>Métricas Gerais do Sistema</MetricsSectionTitle>
            <SystemMetricsGrid>
              <SystemMetricCard $highlight>
                <SystemMetricIcon $color="#2563eb">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalUsers}</SystemMetricValue>
                  <SystemMetricLabel>Total de Usuários</SystemMetricLabel>
                  {systemMetrics.recent.usersLast30DaysCount > 0 && (
                    <SystemMetricChange $positive>
                      +{systemMetrics.recent.usersLast30DaysCount} nos últimos 30 dias
                    </SystemMetricChange>
                  )}
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard $highlight>
                <SystemMetricIcon $color="#10b981">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalTickets}</SystemMetricValue>
                  <SystemMetricLabel>Total de Tickets</SystemMetricLabel>
                  {systemMetrics.recent.ticketsLast30DaysCount > 0 && (
                    <SystemMetricChange $positive>
                      +{systemMetrics.recent.ticketsLast30DaysCount} nos últimos 30 dias
                    </SystemMetricChange>
                  )}
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard $highlight>
                <SystemMetricIcon $color="#8b5cf6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalForms}</SystemMetricValue>
                  <SystemMetricLabel>Total de Formulários</SystemMetricLabel>
                  {systemMetrics.recent.formsLast30DaysCount > 0 && (
                    <SystemMetricChange $positive>
                      +{systemMetrics.recent.formsLast30DaysCount} nos últimos 30 dias
                    </SystemMetricChange>
                  )}
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard>
                <SystemMetricIcon $color="#f59e0b">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.resolutionRate.toFixed(1)}%</SystemMetricValue>
                  <SystemMetricLabel>Taxa de Resolução Geral</SystemMetricLabel>
                  <SystemMetricSubtext>
                    {systemMetrics.general.closedTickets} de {systemMetrics.general.totalTickets} tickets encerrados
                  </SystemMetricSubtext>
                </SystemMetricContent>
              </SystemMetricCard>

              {systemMetrics.general.avgResolutionTimeMinutes !== null && (
                <SystemMetricCard>
                  <SystemMetricIcon $color="#7c3aed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </SystemMetricIcon>
                  <SystemMetricContent>
                    <SystemMetricValue>{formatDuration(systemMetrics.general.avgResolutionTimeMinutes)}</SystemMetricValue>
                    <SystemMetricLabel>Tempo Médio de Resolução</SystemMetricLabel>
                    <SystemMetricSubtext>Baseado em todos os tickets encerrados</SystemMetricSubtext>
                  </SystemMetricContent>
                </SystemMetricCard>
              )}

              <SystemMetricCard>
                <SystemMetricIcon $color="#3b82f6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.responseRate.toFixed(1)}%</SystemMetricValue>
                  <SystemMetricLabel>Taxa de Resposta</SystemMetricLabel>
                  <SystemMetricSubtext>Tickets com pelo menos uma atualização</SystemMetricSubtext>
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard>
                <SystemMetricIcon $color="#ef4444">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 7h10M7 12h10M7 17h10"/>
                    <circle cx="18" cy="6" r="2"/>
                    <circle cx="18" cy="11" r="2"/>
                    <circle cx="18" cy="16" r="2"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalCategories}</SystemMetricValue>
                  <SystemMetricLabel>Categorias</SystemMetricLabel>
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard>
                <SystemMetricIcon $color="#06b6d4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 13H4V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6z"/>
                    <path d="M4 13l4-4M20 13l-4-4M8 13h8"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalWebhooks}</SystemMetricValue>
                  <SystemMetricLabel>Webhooks Configurados</SystemMetricLabel>
                </SystemMetricContent>
              </SystemMetricCard>

              <SystemMetricCard>
                <SystemMetricIcon $color="#6366f1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                </SystemMetricIcon>
                <SystemMetricContent>
                  <SystemMetricValue>{systemMetrics.general.totalAccessProfiles}</SystemMetricValue>
                  <SystemMetricLabel>Perfis de Acesso</SystemMetricLabel>
                </SystemMetricContent>
              </SystemMetricCard>
            </SystemMetricsGrid>

            {systemMetrics.topForms && systemMetrics.topForms.length > 0 && (
              <TopFormsSection>
                <MetricsSectionTitle>Formulários Mais Utilizados</MetricsSectionTitle>
                <TopFormsList>
                  {systemMetrics.topForms.map((form: any, index: number) => (
                    <TopFormItem key={form.id}>
                      <TopFormRank>#{index + 1}</TopFormRank>
                      <TopFormInfo>
                        <TopFormTitle>{form.title}</TopFormTitle>
                        <TopFormSubtext>{form.submissionsCount} submissões</TopFormSubtext>
                      </TopFormInfo>
                      <TopFormBadge>{form.submissionsCount}</TopFormBadge>
                    </TopFormItem>
                  ))}
                </TopFormsList>
              </TopFormsSection>
            )}

            {systemMetrics.categoryBreakdown && systemMetrics.categoryBreakdown.length > 0 && (
              <CategoryBreakdownSection>
                <MetricsSectionTitle>Distribuição por Categoria</MetricsSectionTitle>
                <CategoryChart>
                  {systemMetrics.categoryBreakdown.map((item: any) => {
                    const percentage = systemMetrics.general.totalTickets > 0 
                      ? (item.count / systemMetrics.general.totalTickets) * 100 
                      : 0;
                    return (
                      <CategoryBar key={item.categoryId}>
                        <CategoryBarLabel>
                          <span>{item.categoryName}</span>
                          <span>{item.count} ({percentage.toFixed(1)}%)</span>
                        </CategoryBarLabel>
                        <CategoryBarTrack>
                          <CategoryBarFill $percentage={percentage}>
                            <CategoryBarValue>{item.count}</CategoryBarValue>
                          </CategoryBarFill>
                        </CategoryBarTrack>
                      </CategoryBar>
                    );
                  })}
                </CategoryChart>
              </CategoryBreakdownSection>
            )}
          </SystemMetricsSection>
        )}

        <MetricsSection>
          <MetricsSectionTitle style={{ flexShrink: 0 }}>Métricas do Período</MetricsSectionTitle>
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
                <StatLabel>Total de Tickets</StatLabel>
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
                <StatLabel>Taxa de Resolução</StatLabel>
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
                  <StatLabel>Tempo Médio de Resolução</StatLabel>
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
                  <StatLabel>Tempo Médio de Primeira Resposta</StatLabel>
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
                <StatLabel>Novos</StatLabel>
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
                <StatLabel>Em Andamento</StatLabel>
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
                <StatLabel>Em Observação</StatLabel>
              </StatContent>
            </StatCard>

            <StatCard>
              <StatIcon $color="#059669">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </StatIcon>
              <StatContent>
                <StatValue>{stats.byStatus.RESOLVED}</StatValue>
                <StatLabel>Resolvidos</StatLabel>
              </StatContent>
            </StatCard>

            <StatCard>
              <StatIcon $color="#dc2626">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </StatIcon>
              <StatContent>
                <StatValue>{stats.byStatus.CLOSED}</StatValue>
                <StatLabel>Encerrados</StatLabel>
              </StatContent>
            </StatCard>
          </ReportsGrid>
        </MetricsSection>

        <ChartsSection>
          <SectionHeader>
            <SectionTitle>Análises Visuais</SectionTitle>
            <SectionSubtitle>Gráficos e distribuições para análise detalhada</SectionSubtitle>
          </SectionHeader>
          
          <ChartsGrid>
            <ChartCard>
              <ChartTitle>Distribuição por Status</ChartTitle>
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

            {Object.keys(stats.byDay).length > 0 && (
              <ChartCard>
                <ChartTitle>Evolução Temporal (Tickets por Dia)</ChartTitle>
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
                <ChartTitle>Distribuição por Hora do Dia</ChartTitle>
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
        </KioskMainContent>
      </KioskContent>
      <Toast toasts={toast.toasts} onClose={toast.removeToast} />
    </KioskContainer>
  );
}

const KioskContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  overflow: auto;
  padding: 40px;
  
  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
`;

const KioskContent = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
`;

const KioskMainContent = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 10px;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 1400px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
`;

const SystemMetricsSection = styled.div`
  padding: 12px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.5), rgba(255, 255, 255, 0.8));
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const MetricsSectionTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(37, 99, 235, 0.15);
`;

const SystemMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const SystemMetricCard = styled.div<{ $highlight?: boolean }>`
  padding: 8px;
  border-radius: 6px;
  border: ${(p) => (p.$highlight ? "1.5px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(148, 163, 184, 0.18)")};
  background: ${(p) => (p.$highlight ? "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(59, 130, 246, 0.04))" : "linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6))")};
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
`;

const SystemMetricIcon = styled.div<{ $color?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: ${(p) => {
    const color = p.$color || "#2563eb";
    const rgba = color === "#2563eb" ? "rgba(37, 99, 235, 0.15)" :
                 color === "#10b981" ? "rgba(16, 185, 129, 0.15)" :
                 color === "#8b5cf6" ? "rgba(139, 92, 246, 0.15)" :
                 color === "#f59e0b" ? "rgba(245, 158, 11, 0.15)" :
                 color === "#7c3aed" ? "rgba(124, 58, 237, 0.15)" :
                 color === "#3b82f6" ? "rgba(59, 130, 246, 0.15)" :
                 color === "#ef4444" ? "rgba(239, 68, 68, 0.15)" :
                 color === "#06b6d4" ? "rgba(6, 182, 212, 0.15)" :
                 "rgba(99, 102, 241, 0.15)";
    return rgba;
  }};
  color: ${(p) => p.$color || "#2563eb"};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const SystemMetricContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SystemMetricValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
`;

const SystemMetricLabel = styled.div`
  font-size: 0.75rem;
  color: #475569;
  font-weight: 600;
`;

const SystemMetricSubtext = styled.div`
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 2px;
`;

const SystemMetricChange = styled.div<{ $positive?: boolean }>`
  font-size: 0.65rem;
  color: ${(p) => (p.$positive ? "#10b981" : "#ef4444")};
  font-weight: 600;
  margin-top: 2px;
`;

const TopFormsSection = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const TopFormsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 2px;
  }
`;

const TopFormItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 6px;
  background: linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: all 0.2s ease;
  flex-shrink: 0;
`;

const TopFormRank = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(59, 130, 246, 0.08));
  color: #2563eb;
  font-weight: 700;
  font-size: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TopFormInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TopFormTitle = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TopFormSubtext = styled.div`
  font-size: 0.55rem;
  color: #64748b;
`;

const TopFormBadge = styled.div`
  padding: 2px 6px;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.05));
  color: #2563eb;
  font-weight: 700;
  font-size: 0.65rem;
  flex-shrink: 0;
`;

const CategoryBreakdownSection = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const CategoryChart = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 8px;
  flex: 1;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 2px;
  }
`;

const CategoryBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.5), rgba(255, 255, 255, 0.8));
  border: 1px solid rgba(148, 163, 184, 0.15);
`;

const CategoryBarLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CategoryBarTrack = styled.div`
  height: 24px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.1);
  overflow: hidden;
  position: relative;
`;

const CategoryBarFill = styled.div<{ $percentage: number }>`
  height: 100%;
  width: ${(p) => p.$percentage}%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
`;

const CategoryBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.7rem;
`;

const CategoryBarPercentage = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
`;

const MetricsSection = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
`;

const PrimaryMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
`;

const StatCard = styled.div<{ $primary?: boolean }>`
  padding: 8px;
  border-radius: 6px;
  background: ${(p) => (p.$primary ? "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.05))" : "linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6))")};
  border: ${(p) => (p.$primary ? "1.5px solid rgba(37, 99, 235, 0.2)" : "1px solid rgba(148, 163, 184, 0.18)")};
  box-shadow: ${(p) => (p.$primary ? "0 2px 6px rgba(37, 99, 235, 0.12)" : "0 1px 4px rgba(0, 0, 0, 0.04)")};
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
`;

const StatIcon = styled.div<{ $primary?: boolean; $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${(p) => {
    if (p.$primary) {
      return p.$color 
        ? `linear-gradient(135deg, ${p.$color}, ${p.$color}dd)`
        : "linear-gradient(135deg, #2563eb, #1d4ed8)";
    }
    return p.$color
      ? `linear-gradient(135deg, ${p.$color}20, ${p.$color}10)`
      : "linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.05))";
  }};
  color: ${(p) => {
    if (p.$primary) return "#fff";
    return p.$color || "#64748b";
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const StatContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const StatValue = styled.div<{ $primary?: boolean }>`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${(p) => (p.$primary ? "#2563eb" : "#0f172a")};
  line-height: 1;
`;

const StatLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: #64748b;
`;

const ReportsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 8px;
  flex-shrink: 0;
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
`;

const ChartsSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const SectionHeader = styled.div`
  margin-bottom: 8px;
  flex-shrink: 0;
`;

const SectionTitle = styled.h2`
  margin: 0 0 2px 0;
  font-size: 0.85rem;
  font-weight: 700;
  color: #0f172a;
`;

const SectionSubtitle = styled.p`
  margin: 0;
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 400;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  padding: 10px;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6));
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const ChartTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  flex-shrink: 0;
`;

const StatusChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StatusBar = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr 60px;
  gap: 12px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 120px 1fr 50px;
    gap: 8px;
  }
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
    switch (p.$status) {
      case "OPEN":
        return "linear-gradient(90deg, #1d4ed8, #2563eb)";
      case "IN_PROGRESS":
        return "linear-gradient(90deg, #b45309, #d97706)";
      case "OBSERVATION":
        return "linear-gradient(90deg, #0369a1, #0284c7)";
      case "RESOLVED":
        return "linear-gradient(90deg, #059669, #10b981)";
      case "CLOSED":
        return "linear-gradient(90deg, #dc2626, #ef4444)";
      default:
        return "linear-gradient(90deg, #64748b, #94a3b8)";
    }
  }};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
`;

const StatusBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.55rem;
  position: relative;
  z-index: 1;
`;

const StatusBarPercentage = styled.div`
  font-size: 0.55rem;
  font-weight: 600;
  color: #64748b;
  text-align: right;
`;

const TimelineChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 2px;
  }
`;

const TimelineBar = styled.div`
  display: grid;
  grid-template-columns: 50px 1fr;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
`;

const TimelineBarLabel = styled.div`
  font-size: 0.6rem;
  font-weight: 600;
  color: #475569;
`;

const TimelineBarTrack = styled.div`
  height: 16px;
  border-radius: 4px;
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
  padding-right: 4px;
  transition: width 0.5s ease;
`;

const TimelineBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.55rem;
`;

const HourChart = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  flex: 1;
  min-height: 0;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(8, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const HourBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  flex-shrink: 0;
`;

const HourBarLabel = styled.div`
  font-size: 0.55rem;
  font-weight: 500;
  color: #64748b;
`;

const HourBarTrack = styled.div`
  width: 100%;
  flex: 1;
  min-height: 60px;
  border-radius: 4px;
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
  padding-top: 2px;
  transition: height 0.5s ease;
  min-height: ${(p) => (p.$percentage > 0 ? "12px" : "0")};
`;

const HourBarValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.5rem;
`;

