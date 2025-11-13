"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

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
   requester: { id: number; name: string | null; email: string | null } | null;
   assignedTo: { id: number; name: string | null; email: string | null } | null;
   form: { id: number; title: string; slug: string } | null;
   category: { id: number; name: string } | null;
   scheduledAt: string | null;
   scheduledNote: string | null;
   updates: TicketUpdateItem[];
};

type SummaryEntry =
  | { type: "section"; label: string }
  | { type: "field"; label: string; value: string; isLink: boolean; isPhone: boolean }
  | { type: "text"; value: string };

type FeedbackMessage = { type: "success" | "error"; message: string } | null;

export default function HistoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [formFilter, setFormFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<"recent" | "oldest" | "duration">("recent");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTicket, setDrawerTicket] = useState<TicketItem | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackMessage>(null);
  const [reopeningId, setReopeningId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const firstLinkRef = useRef<any>(null);
  const menuRef = useRef<any>(null);
  const footerRef = useRef<any>(null);
  const firstMenuItemRef = useRef<any>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const win = getBrowserWindow();
    if (!win?.localStorage) return;
    try {
      const saved = win.localStorage.getItem("sidebar_open");
      if (saved !== null) setSidebarOpen(saved === "true");
    } catch {}
  }, []);

  useEffect(() => {
    const win = getBrowserWindow();
    if (!win?.localStorage) return;
    try {
      win.localStorage.setItem("sidebar_open", String(sidebarOpen));
    } catch {}
  }, [sidebarOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json: any = await res.json().catch(() => ({}));
          setSessionUser(json.user);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json: any = await res.json().catch(() => ({}));
          setAvatarUrl(resolveAvatarUrl((json?.avatarUrl as string | undefined) || ""));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const link = firstLinkRef.current as any;
    if (link?.focus) link.focus();
  }, [sidebarOpen]);

  useEffect(() => {
    const doc = getBrowserDocument();
    if (!doc) return;
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as any;
      const menuEl = menuRef.current as any;
      const footerEl = footerRef.current as any;
      if (target && menuEl && footerEl && !menuEl.contains(target) && !footerEl.contains(target)) {
        setMenuOpen(false);
      }
    }
    doc.addEventListener("mousedown", onDocDown);
    doc.addEventListener("touchstart", onDocDown);
    return () => {
      doc.removeEventListener("mousedown", onDocDown);
      doc.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  useEffect(() => {
    const item = firstMenuItemRef.current as any;
    if (menuOpen && item?.focus) item.focus();
  }, [menuOpen]);

  async function loadTickets(options: { silent?: boolean } = {}) {
    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    if (!options.silent) {
      setFeedback(null);
    }
    try {
      const res = await fetch("/api/tickets");
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível carregar o histórico.");
      }
      const items = Array.isArray(json?.items) ? json.items : [];
      setTickets(
        items
          .filter((ticket: any) => ticket.status === "CLOSED")
          .map(normalizeTicket)
      );
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao buscar histórico.");
    } finally {
      if (options.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  function toggleUserMenu() {
    setMenuOpen((value) => !value);
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    const win = getBrowserWindow();
    setMenuOpen(false);
    setConfirmOpen(false);
    if (win?.location?.assign) win.location.assign("/");
  }

  async function reopenTicket(ticketId: number) {
    setReopeningId(ticketId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível reabrir o ticket.");
      }
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      setFeedback({ type: "success", message: `Ticket #${ticketId} reaberto e movido para andamento.` });
      return true;
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao reabrir ticket." });
      return false;
    } finally {
      setReopeningId(null);
    }
  }

  async function handleReopen(ticket: TicketItem | null) {
    if (!ticket) return;
    const success = await reopenTicket(ticket.id);
    if (success && drawerTicket?.id === ticket.id) {
      closeDrawer();
    }
  }

  function handleExport() {
    if (!filteredTickets.length) {
      setFeedback({ type: "error", message: "Nenhum ticket para exportar com os filtros atuais." });
      return;
    }
    try {
      setExporting(true);
      const headers = [
        "ID",
        "Título",
        "Responsável",
        "Solicitante",
        "Formulário",
        "Categoria",
        "Criado em",
        "Encerrado em",
        "Tempo de resolução (min)",
        "Descrição",
      ];

      const rows = filteredTickets.map((ticket) => {
        const resolution = getResolutionMinutes(ticket);
        return [
          ticket.id,
          sanitizeCsv(ticket.title),
          sanitizeCsv(ticket.assignedTo?.name || ticket.assignedTo?.email || ""),
          sanitizeCsv(ticket.requester?.name || ticket.requester?.email || ""),
          sanitizeCsv(ticket.form?.title || ""),
          sanitizeCsv(ticket.category?.name || ""),
          formatDate(ticket.createdAt),
          formatDate(ticket.updatedAt),
          resolution,
          sanitizeCsv(ticket.description.replace(/\s+/g, " ").trim()),
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((value) => {
              if (value === undefined || value === null) return "";
              return typeof value === "string" ? value : String(value);
            })
            .map((value) => `"${value.replace(/"/g, '""')}"`)
            .join(";")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `tickets-encerrados-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFeedback({ type: "success", message: "Exportação concluída com sucesso." });
    } catch (error) {
      setFeedback({ type: "error", message: "Falha ao exportar os tickets." });
    } finally {
      setExporting(false);
    }
  }

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    const filtered = tickets.filter((ticket) => {
      if (formFilter !== "ALL" && String(ticket.form?.id ?? "") !== formFilter) return false;
      if (assigneeFilter !== "ALL" && String(ticket.assignedTo?.id ?? "") !== assigneeFilter) return false;

      const closedAt = new Date(ticket.updatedAt);
      if (fromDate && closedAt.getTime() < fromDate.getTime()) return false;
      if (toDate && closedAt.getTime() > toDate.getTime()) return false;

      if (term) {
        const searchable = [
          ticket.title,
          ticket.description,
          ticket.requester?.name,
          ticket.requester?.email,
          ticket.assignedTo?.name,
          ticket.assignedTo?.email,
          ticket.form?.title,
          ticket.form?.slug,
          ticket.category?.name,
          ticket.id.toString(),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase())
          .join(" ");
        if (!searchable.includes(term)) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortOption === "oldest") {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortOption === "duration") {
        const durationA = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime();
        const durationB = new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime();
        return durationB - durationA;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return sorted;
  }, [tickets, search, dateFrom, dateTo, formFilter, assigneeFilter, sortOption]);

  const metrics = useMemo(() => {
    const total = tickets.length;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const closedLast7Days = tickets.filter((ticket) => new Date(ticket.updatedAt).getTime() >= sevenDaysAgo).length;
    const durations = tickets
      .map((ticket) => getResolutionMinutes(ticket))
      .filter((duration) => Number.isFinite(duration) && duration > 0);
    const avgMinutes = durations.length ? Math.round(durations.reduce((acc, duration) => acc + duration, 0) / durations.length) : 0;
    const withoutAssignee = tickets.filter((ticket) => !ticket.assignedTo).length;

    return [
      {
        id: "total",
        label: "Encerrados",
        value: total.toLocaleString("pt-BR"),
        hint: "Tickets finalizados registrados no histórico.",
      },
      {
        id: "week",
        label: "Últimos 7 dias",
        value: closedLast7Days.toLocaleString("pt-BR"),
        hint: "Chamados encerrados na última semana.",
      },
      {
        id: "avg",
        label: "Tempo médio de resolução",
        value: durations.length ? formatDuration(avgMinutes) : "—",
        hint: durations.length ? "Intervalo médio entre abertura e encerramento." : "Nenhum ticket elegível para cálculo.",
      },
      {
        id: "unassigned",
        label: "Sem responsável",
        value: withoutAssignee.toLocaleString("pt-BR"),
        hint: "Encerrados sem responsável definido.",
      },
    ];
  }, [tickets]);

  const formOptions = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((ticket) => {
      if (ticket.form) {
        map.set(String(ticket.form.id), ticket.form.title);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tickets]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    tickets.forEach((ticket) => {
      if (ticket.assignedTo) {
        const label = ticket.assignedTo.name || ticket.assignedTo.email || "Usuário";
        map.set(String(ticket.assignedTo.id), label);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tickets]);

  const insights = useMemo(() => {
    if (!tickets.length) return [] as Array<{ title: string; value: string; hint: string }>;

    const categoryCount = new Map<string, number>();
    const assigneeCount = new Map<string, { label: string; total: number }>();
    let longestTicket: TicketItem | null = null;
    let shortestTicket: TicketItem | null = null;

    tickets.forEach((ticket) => {
      if (ticket.category?.name) {
        categoryCount.set(ticket.category.name, (categoryCount.get(ticket.category.name) ?? 0) + 1);
      } else {
        categoryCount.set("Sem categoria", (categoryCount.get("Sem categoria") ?? 0) + 1);
      }

      if (ticket.assignedTo) {
        const key = String(ticket.assignedTo.id);
        const label = ticket.assignedTo.name || ticket.assignedTo.email || "Usuário";
        const current = assigneeCount.get(key);
        assigneeCount.set(key, { label, total: current ? current.total + 1 : 1 });
      }

      const duration = getResolutionMinutes(ticket);
      if (!longestTicket || duration > getResolutionMinutes(longestTicket)) {
        longestTicket = ticket;
      }
      if (!shortestTicket || duration < getResolutionMinutes(shortestTicket)) {
        shortestTicket = ticket;
      }
    });

    const topCategory = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0];
    const topAssignee = Array.from(assigneeCount.values()).sort((a, b) => b.total - a.total)[0];

    const results: Array<{ title: string; value: string; hint: string }> = [];

    if (topCategory) {
      results.push({
        title: "Categoria mais recorrente",
        value: `${topCategory[0]}`,
        hint: `${topCategory[1]} ticket(s) encerrados` ,
      });
    }

    if (topAssignee) {
      results.push({
        title: "Responsável mais atuante",
        value: topAssignee.label,
        hint: `${topAssignee.total} encerramento(s) registrados`,
      });
    }

    if (longestTicket) {
      const value = formatDuration(getResolutionMinutes(longestTicket));
      results.push({
        title: "Maior tempo de resolução",
        value,
        hint: `Ticket #${longestTicket.id}`,
      });
    }

    if (shortestTicket && shortestTicket !== longestTicket) {
      const value = formatDuration(getResolutionMinutes(shortestTicket));
      results.push({
        title: "Tempo mais rápido",
        value,
        hint: `Ticket #${shortestTicket.id}`,
      });
    }

    return results.slice(0, 4);
  }, [tickets]);

  const summaryEntries = useMemo<SummaryEntry[]>(() => {
    if (!drawerTicket?.description) return [];
    const lines = drawerTicket.description.split(/\r?\n/g);
    const items: SummaryEntry[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (/^campos adicionais:?$/i.test(line)) {
        items.push({ type: "section", label: "Campos adicionais" });
        continue;
      }
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const label = line.slice(0, colonIndex).trim();
        const valueRaw = line.slice(colonIndex + 1).trim() || "-";
        const isLink = /^https?:\/\//i.test(valueRaw) || valueRaw.startsWith("/uploads/") || valueRaw.startsWith("/files/");
        const isPhoneLabel = /telefone|celular|whats?/i.test(label);
        const phoneDigits = valueRaw.replace(/[^0-9+]/g, "");
        const isPhone = isPhoneLabel && phoneDigits.length >= 9;
        items.push({ type: "field", label, value: valueRaw, isLink, isPhone });
      } else {
        items.push({ type: "text", value: line });
      }
    }
    return items;
  }, [drawerTicket?.description]);

  const drawerUpdates = useMemo(() => drawerTicket?.updates ?? [], [drawerTicket?.updates]);

  function openDrawer(ticket: TicketItem) {
    setDrawerTicket(ticket);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerTicket(null);
  }

  const handleDrawerReopen = () => {
    if (!drawerTicket) return;
    handleReopen(drawerTicket);
  };

  const drawerResolutionMinutes = drawerTicket ? getResolutionMinutes(drawerTicket) : 0;
  const drawerResolutionLabel = drawerResolutionMinutes ? formatDuration(drawerResolutionMinutes) : "—";

  const filteredCount = filteredTickets.length;

  const activeFilters = useMemo(() => {
    const filters: string[] = [];
    if (dateFrom) filters.push(`De ${formatInputDate(dateFrom)}`);
    if (dateTo) filters.push(`Até ${formatInputDate(dateTo)}`);
    if (formFilter !== "ALL") {
      const match = formOptions.find((option) => option.id === formFilter)?.name;
      if (match) filters.push(`Formulário: ${match}`);
    }
    if (assigneeFilter !== "ALL") {
      const match = assigneeOptions.find((option) => option.id === assigneeFilter)?.name;
      if (match) filters.push(`Responsável: ${match}`);
    }
    if (sortOption === "oldest") filters.push("Ordenado por mais antigos");
    if (sortOption === "duration") filters.push("Ordenado por tempo de resolução");
    return filters;
  }, [dateFrom, dateTo, formFilter, assigneeFilter, sortOption, formOptions, assigneeOptions]);

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
        <MenuToggle
          aria-label={sidebarOpen ? "Fechar menu lateral" : "Abrir menu lateral"}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {sidebarOpen ? "Fechar menu" : "Abrir menu"}
        </MenuToggle>
      </TopBar>
      <Shell>
        <Sidebar
          id="sidebar"
          aria-label="Menu lateral"
          aria-expanded={sidebarOpen}
          aria-hidden={!sidebarOpen}
          $open={sidebarOpen}
          onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
        >
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              <NavItem ref={firstLinkRef} href="/home" aria-label="Início">
                Início
              </NavItem>
              <NavItem href="/tickets" aria-label="Tickets">
                Tickets
              </NavItem>
              <NavItem href="/users" aria-label="Usuários">
                Usuários
              </NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">
                Configurações
              </NavItem>
              <NavItem href="/history" aria-label="Histórico" aria-current="page">
                Histórico
              </NavItem>
            </MenuScroll>
          </nav>

          <UserFooter
            aria-label="Menu do usuário"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            onClick={toggleUserMenu}
            onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
              if (e.key === "Enter" || e.key === " ") toggleUserMenu();
              if (e.key === "Escape") setMenuOpen(false);
              if (e.key === "ArrowDown") setMenuOpen(true);
            }}
            ref={footerRef as any}
          >
            <Avatar aria-label="Foto do usuário" role="img">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" decoding="async" />
              ) : (
                sessionUser?.name ? sessionUser.name?.[0] || "U" : "U"
              )}
            </Avatar>
            <UserName aria-label="Nome do usuário">
              {sessionUser?.name ?? sessionUser?.email ?? "Usuário"}
            </UserName>
          </UserFooter>

          <UserMenu
            id="user-menu"
            role="menu"
            aria-labelledby="user-menu-button"
            $open={menuOpen}
            ref={menuRef as any}
          >
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              ref={firstMenuItemRef as any}
              onClick={() => {
                setMenuOpen(false);
                const win = getBrowserWindow();
                if (win?.location?.assign) win.location.assign("/profile");
              }}
            >
              Perfil
            </UserMenuItem>
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              $variant="danger"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              Sair
            </UserMenuItem>
          </UserMenu>

          {confirmOpen && (
            <>
              <ConfirmBackdrop $open={confirmOpen} onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen} />
              <ConfirmDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-exit-title"
                $open={confirmOpen}
                onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
                  if (e.key === "Escape") setConfirmOpen(false);
                }}
              >
                <ConfirmTitle id="confirm-exit-title">Deseja realmente sair?</ConfirmTitle>
                <ConfirmActions>
                  <CancelButton type="button" onClick={() => setConfirmOpen(false)}>
                    Cancelar
                  </CancelButton>
                  <ConfirmButton type="button" onClick={onLogout}>
                    Confirmar
                  </ConfirmButton>
                </ConfirmActions>
              </ConfirmDialog>
            </>
          )}
        </Sidebar>

        <Overlay $show={sidebarOpen} onClick={() => setSidebarOpen(false)} />

        <Content>
          <MainCard>
            <PageHeader>
              <HeaderBlock>
                <Title>Histórico de tickets</Title>
                <Subtitle>Consulte chamados encerrados, visualize o detalhamento completo e reabra quando necessário.</Subtitle>
              </HeaderBlock>
              <HeaderActions>
                <ExportButton type="button" onClick={handleExport} disabled={loading || exporting}>
                  {exporting ? "Exportando..." : "Exportar CSV"}
                </ExportButton>
                <ReloadButton onClick={() => loadTickets({ silent: true })} disabled={loading || refreshing}>
                  {refreshing ? "Atualizando..." : "Atualizar"}
                </ReloadButton>
              </HeaderActions>
            </PageHeader>

            <MetricsGrid role="list" aria-label="Indicadores de desempenho dos tickets encerrados">
              {metrics.map((metric) => (
                <MetricCard key={metric.id} role="listitem">
                  <MetricValue>{metric.value}</MetricValue>
                  <MetricLabel>{metric.label}</MetricLabel>
                  <MetricHint>{metric.hint}</MetricHint>
                </MetricCard>
              ))}
            </MetricsGrid>

            {insights.length > 0 && (
              <InsightsSection aria-label="Principais destaques do histórico">
                {insights.map((insight, index) => (
                  <InsightCard key={`${insight.title}-${index}`}>
                    <InsightTitle>{insight.title}</InsightTitle>
                    <InsightValue>{insight.value}</InsightValue>
                    <InsightHint>{insight.hint}</InsightHint>
                  </InsightCard>
                ))}
              </InsightsSection>
            )}

            {feedback && (
              <FeedbackBanner data-type={feedback.type} role="status">
                {feedback.message}
              </FeedbackBanner>
            )}

            <FiltersBar>
              <FiltersHeader>
                <div>
                  <FiltersTitle>Filtros avançados</FiltersTitle>
                  <FiltersSubtitle>Refine o histórico de tickets encerrados para encontrar os registros desejados.</FiltersSubtitle>
                </div>
                <FiltersSummary>
                  <FiltersBadge>{filteredCount.toLocaleString("pt-BR") || 0} resultado(s)</FiltersBadge>
                  <ClearFiltersButton
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDateFrom("");
                      setDateTo("");
                      setFormFilter("ALL");
                      setAssigneeFilter("ALL");
                      setSortOption("recent");
                    }}
                  >
                    Limpar filtros
                  </ClearFiltersButton>
                </FiltersSummary>
              </FiltersHeader>

              <SearchInput
                type="search"
                placeholder="Busque por título, solicitante, responsável ou formulário..."
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const element = event.currentTarget as unknown as { value?: string };
                  setSearch(element?.value ?? "");
                }}
              />

              <FiltersRow>
                <FilterGroup>
                  <FilterLabel>Período</FilterLabel>
                  <DateInputs>
                    <DateInput
                      type="date"
                      value={dateFrom}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setDateFrom(event.currentTarget?.value ?? "")}
                      aria-label="Filtrar por data inicial"
                    />
                    <span>até</span>
                    <DateInput
                      type="date"
                      value={dateTo}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setDateTo(event.currentTarget?.value ?? "")}
                      aria-label="Filtrar por data final"
                    />
                  </DateInputs>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Formulário</FilterLabel>
                  <Select
                    value={formFilter}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const element = event.currentTarget as unknown as { value?: string };
                      setFormFilter(element?.value ?? "ALL");
                    }}
                  >
                    <option value="ALL">Todos</option>
                    {formOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Responsável</FilterLabel>
                  <Select
                    value={assigneeFilter}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const element = event.currentTarget as unknown as { value?: string };
                      setAssigneeFilter(element?.value ?? "ALL");
                    }}
                  >
                    <option value="ALL">Todos</option>
                    {assigneeOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                </FilterGroup>

                <FilterGroup>
                  <FilterLabel>Ordenar por</FilterLabel>
                  <Select
                    value={sortOption}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                      const element = event.currentTarget as unknown as { value?: string };
                      const value = (element?.value as typeof sortOption) ?? "recent";
                      setSortOption(value);
                    }}
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                    <option value="duration">Maior tempo de resolução</option>
                  </Select>
                </FilterGroup>
              </FiltersRow>

              {activeFilters.length > 0 && (
                <ActiveFiltersBar>
                  {activeFilters.map((label) => (
                    <ActiveFilterChip key={label}>{label}</ActiveFilterChip>
                  ))}
                </ActiveFiltersBar>
              )}
            </FiltersBar>

            {error && <Banner role="alert">{error}</Banner>}

            {loading ? (
              <HistorySkeleton>
                {Array.from({ length: 4 }).map((_, index) => (
                  <HistorySkeletonCard key={index} />
                ))}
              </HistorySkeleton>
            ) : filteredTickets.length === 0 ? (
              <EmptyState>
                <strong>Nenhum ticket encerrado encontrado.</strong>
                <span>Ajuste os filtros ou o período de busca para ampliar os resultados.</span>
              </EmptyState>
            ) : (
              <HistoryList>
                {filteredTickets.map((ticket) => {
                  const resolutionMinutes = getResolutionMinutes(ticket);
                  const resolutionLabel = resolutionMinutes ? formatDuration(resolutionMinutes) : "—";
                  const snippet = getSummarySnippet(ticket.description);
                  return (
                    <HistoryCard key={ticket.id}>
                      <HistoryCardHeader>
                        <HistoryCardTitle>
                          <span>#{ticket.id}</span>
                          {ticket.title}
                        </HistoryCardTitle>
                        <HistoryStatus>
                          Encerrado em {formatDate(ticket.updatedAt)}
                        </HistoryStatus>
                      </HistoryCardHeader>
                      <HistoryMetaGrid>
                        <HistoryMetaItem>
                          <HistoryMetaLabel>Responsável</HistoryMetaLabel>
                          <HistoryMetaValue>
                            {ticket.assignedTo ? ticket.assignedTo.name || ticket.assignedTo.email || "Usuário" : "—"}
                          </HistoryMetaValue>
                        </HistoryMetaItem>
                        <HistoryMetaItem>
                          <HistoryMetaLabel>Formulário</HistoryMetaLabel>
                          <HistoryMetaValue>{ticket.form?.title || "—"}</HistoryMetaValue>
                        </HistoryMetaItem>
                        <HistoryMetaItem>
                          <HistoryMetaLabel>Categoria</HistoryMetaLabel>
                          <HistoryMetaValue>{ticket.category?.name || "—"}</HistoryMetaValue>
                        </HistoryMetaItem>
                        <HistoryMetaItem>
                          <HistoryMetaLabel>Tempo de resolução</HistoryMetaLabel>
                          <HistoryMetaValue>{resolutionLabel}</HistoryMetaValue>
                        </HistoryMetaItem>
                      </HistoryMetaGrid>
                      <HistoryDescription>
                        {snippet}
                      </HistoryDescription>
                      <HistoryActions>
                        <GhostButton type="button" onClick={() => openDrawer(ticket)}>
                          Ver detalhes
                        </GhostButton>
                        <PrimaryButton
                          type="button"
                          onClick={() => handleReopen(ticket)}
                          disabled={reopeningId === ticket.id}
                        >
                          {reopeningId === ticket.id ? "Reabrindo..." : "Reabrir ticket"}
                        </PrimaryButton>
                      </HistoryActions>
                    </HistoryCard>
                  );
                })}
              </HistoryList>
            )}
          </MainCard>
        </Content>
      </Shell>

      {drawerOpen && drawerTicket && <DrawerOverlay role="presentation" onClick={closeDrawer} />}
      {drawerOpen && drawerTicket && (
        <Drawer role="dialog" aria-modal="true" aria-labelledby="history-drawer-title">
          <DrawerHeader>
            <div>
              <DrawerTitle id="history-drawer-title">Ticket #{drawerTicket.id}</DrawerTitle>
              <DrawerSubtitle>{drawerTicket.title}</DrawerSubtitle>
            </div>
            <DrawerStatus data-status={drawerTicket.status}>
              {STATUS_LABELS[drawerTicket.status]}
            </DrawerStatus>
          </DrawerHeader>

          <DrawerSection>
            <SectionTitle>Resumo</SectionTitle>
            {summaryEntries.length === 0 ? (
              <EmptySummary>Nenhum detalhe adicional registrado.</EmptySummary>
            ) : (
              <SummaryWrapper>
                {summaryEntries.map((entry, index) => {
                  if (entry.type === "section") {
                    return (
                      <SummarySectionHeading key={`section-${index}`}>
                        {entry.label}
                      </SummarySectionHeading>
                    );
                  }
                  if (entry.type === "text") {
                    return (
                      <SummaryText key={`text-${index}`}>{entry.value}</SummaryText>
                    );
                  }
                  return (
                    <SummaryRow key={`field-${index}`}>
                      <SummaryLabel>{entry.label}</SummaryLabel>
                      <SummaryRowContent>
                        {entry.isLink ? (
                          <SummaryLink
                            href={entry.value.startsWith("http") ? entry.value : `${getBrowserOrigin()}${entry.value}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir arquivo
                          </SummaryLink>
                        ) : (
                          <SummaryValue>{entry.value || "-"}</SummaryValue>
                        )}
                        {entry.isPhone && (
                          <WhatsappButton type="button" onClick={() => openWhatsapp(entry.value)}>
                            Chamar no WhatsApp
                          </WhatsappButton>
                        )}
                      </SummaryRowContent>
                    </SummaryRow>
                  );
                })}
              </SummaryWrapper>
            )}
          </DrawerSection>

          <DrawerSection>
            <SectionTitle>Detalhes básicos</SectionTitle>
            <DetailGrid>
              <DetailItem>
                <DetailLabel>Status</DetailLabel>
                <DetailValue>{STATUS_LABELS[drawerTicket.status]}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Solicitante</DetailLabel>
                <DetailValue>
                  {drawerTicket.requester
                    ? `${drawerTicket.requester.name || "Usuário"}${drawerTicket.requester.email ? ` · ${drawerTicket.requester.email}` : ""}`
                    : "—"}
                </DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Responsável</DetailLabel>
                <DetailValue>
                  {drawerTicket.assignedTo
                    ? `${drawerTicket.assignedTo.name || "Usuário"}${drawerTicket.assignedTo.email ? ` · ${drawerTicket.assignedTo.email}` : ""}`
                    : "—"}
                </DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Categoria</DetailLabel>
                <DetailValue>{drawerTicket.category?.name || "—"}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Criado em</DetailLabel>
                <DetailValue>{formatDate(drawerTicket.createdAt)}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Encerrado em</DetailLabel>
                <DetailValue>{formatDate(drawerTicket.updatedAt)}</DetailValue>
              </DetailItem>
              <DetailItem>
                <DetailLabel>Formulário</DetailLabel>
                <DetailValue>
                  {drawerTicket.form ? (
                    <SummaryLink href={`/forms/${drawerTicket.form.slug}`} target="_blank" rel="noreferrer">
                      {drawerTicket.form.title}
                    </SummaryLink>
                  ) : (
                    "—"
                  )}
                </DetailValue>
              </DetailItem>
              {drawerTicket.scheduledAt && (
                <DetailItem>
                  <DetailLabel>Agendado para</DetailLabel>
                  <DetailValue>{formatDate(drawerTicket.scheduledAt)}</DetailValue>
                </DetailItem>
              )}
              {drawerTicket.scheduledNote && (
                <DetailItem>
                  <DetailLabel>Observação do agendamento</DetailLabel>
                  <DetailValue>{drawerTicket.scheduledNote}</DetailValue>
                </DetailItem>
              )}
            </DetailGrid>

            <DrawerStatsGrid>
              <DrawerStatCard>
                <DrawerStatLabel>Tempo de resolução</DrawerStatLabel>
                <DrawerStatValue>{drawerResolutionLabel}</DrawerStatValue>
              </DrawerStatCard>
              <DrawerStatCard>
                <DrawerStatLabel>Atualizações registradas</DrawerStatLabel>
                <DrawerStatValue>{drawerUpdates.length}</DrawerStatValue>
              </DrawerStatCard>
              {drawerTicket.assignedTo && (
                <DrawerStatCard>
                  <DrawerStatLabel>Responsável</DrawerStatLabel>
                  <DrawerStatValue>{drawerTicket.assignedTo.name || drawerTicket.assignedTo.email || "Usuário"}</DrawerStatValue>
                </DrawerStatCard>
              )}
            </DrawerStatsGrid>
          </DrawerSection>

          <DrawerSection>
            <SectionTitle>Atualizações</SectionTitle>
            {drawerUpdates.length === 0 ? (
              <EmptySummary>Nenhuma atualização registrada.</EmptySummary>
            ) : (
              <UpdatesList>
                {drawerUpdates.map((update) => (
                  <UpdateItem key={update.id}>
                    <UpdateMeta>
                      <UpdateAuthor>{update.author?.name || update.author?.email || "Equipe"}</UpdateAuthor>
                      <UpdateTimestamp>{formatDate(update.createdAt)}</UpdateTimestamp>
                    </UpdateMeta>
                    <UpdateContent>{update.content}</UpdateContent>
                  </UpdateItem>
                ))}
              </UpdatesList>
            )}
          </DrawerSection>

          <DrawerActions>
            <PrimaryButton
              type="button"
              onClick={handleDrawerReopen}
              disabled={reopeningId === drawerTicket.id}
            >
              {reopeningId === drawerTicket.id ? "Reabrindo..." : "Reabrir ticket"}
            </PrimaryButton>
            <CloseButton type="button" onClick={closeDrawer}>
              Fechar
            </CloseButton>
          </DrawerActions>
        </Drawer>
      )}
    </Page>
  );
}

function normalizeTicket(raw: any): TicketItem {
  return {
    id: Number(raw.id),
    title: String(raw.title || "Ticket"),
    description: String(raw.description || ""),
    status: (raw.status || "OPEN") as TicketStatus,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    requester: raw.requester
      ? { id: Number(raw.requester.id), name: raw.requester.name ?? null, email: raw.requester.email ?? null }
      : null,
    assignedTo: raw.assignedTo
      ? { id: Number(raw.assignedTo.id), name: raw.assignedTo.name ?? null, email: raw.assignedTo.email ?? null }
      : null,
    form: raw.form
      ? { id: Number(raw.form.id), title: String(raw.form.title || ""), slug: String(raw.form.slug || "") }
      : null,
    category: raw.category ? { id: Number(raw.category.id), name: String(raw.category.name || "") } : null,
    scheduledAt: raw.scheduledAt ?? null,
    scheduledNote: raw.scheduledNote ?? null,
    updates: Array.isArray(raw.updates)
      ? raw.updates.map((update: any) => ({
          id: Number(update.id),
          content: String(update.content || ""),
          createdAt: update.createdAt,
          author: update.author
            ? {
                id: Number(update.author.id),
                name: update.author.name ?? null,
                email: update.author.email ?? null,
              }
            : null,
        }))
      : [],
  };
}

function getResolutionMinutes(ticket: TicketItem): number {
  const end = new Date(ticket.updatedAt).getTime();
  const start = new Date(ticket.createdAt).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start)) return 0;
  return Math.max(0, Math.round((end - start) / 60000));
}

function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 min";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}min`);
  return parts.join(" ") || "0 min";
}

function getSummarySnippet(text: string): string {
  if (!text) return "Sem descrição registrada para este ticket.";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem descrição registrada para este ticket.";
  return normalized.length > 180 ? `${normalized.slice(0, 180)}…` : normalized;
}

function sanitizeCsv(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\r?\n/g, " ").trim();
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function resolveAvatarUrl(u?: string): string {
  if (!u) return "";
  const val = String(u);
  if (val.startsWith("data:")) return val;
  if (/^https?:\/\//i.test(val)) return val;
  const win = getBrowserWindow();
  if (win?.location?.origin) {
    const origin = win.location.origin as string;
    if (val.startsWith("/")) return `${origin}${val}`;
    return `${origin}/${val}`;
  }
  return val;
}

function getBrowserOrigin(): string {
  const win = getBrowserWindow();
  if (win?.location?.origin) {
    return win.location.origin;
  }
  return "";
}

function openWhatsapp(phoneNumber: string) {
  const win = getBrowserWindow();
  if (win?.open) {
    win.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}`, "_blank");
  }
}

function getBrowserWindow(): any {
  if (typeof globalThis !== "undefined" && (globalThis as any).window) {
    return (globalThis as any).window;
  }
  return undefined;
}

function getBrowserDocument(): any {
  const win = getBrowserWindow();
  if (win?.document) return win.document;
  if (typeof globalThis !== "undefined" && (globalThis as any).document) {
    return (globalThis as any).document;
  }
  return undefined;
}

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
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 72px);
  overflow: hidden;
  position: sticky;
  top: 72px;
  align-self: start;
  transition: transform .25s ease, opacity .25s ease;

  @media (max-width: 960px) {
    position: fixed;
    top: 56px;
    left: 0;
    right: auto;
    width: min(82vw, 300px);
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
  padding-right: 4px;
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  &:hover { background: #f3f4f6; }
  &[aria-current="page"] { background: #eef2f7; font-weight: 600; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
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

const MainCard = styled.section`
  grid-column: span 12;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: linear-gradient(180deg, #ffffff, #f7f9fd 120%);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 24px 48px -32px rgba(15, 23, 42, 0.4);
`;

const PageHeader = styled.header`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.7rem, 2.4vw, 2.2rem);
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #475569;
  max-width: 640px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const ReloadButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(37, 99, 235, 0.14); }
  &:disabled { opacity: 0.6; cursor: default; }
`;

const FiltersBar = styled.section`
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.78), #ffffff 120%);
  box-shadow: 0 20px 36px -30px rgba(15, 23, 42, 0.45);
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
  font-size: 1.05rem;
  color: #0f172a;
`;

const FiltersSubtitle = styled.p`
  margin: 4px 0 0;
  color: #64748b;
  max-width: 520px;
`;

const FiltersSummary = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const FiltersBadge = styled.span`
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-weight: 600;
  font-size: 0.85rem;
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.6);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const Banner = styled.div`
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  font-weight: 600;
`;

const MetricsGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
`;

const MetricCard = styled.article`
  display: grid;
  gap: 4px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.65), #ffffff 120%);
  box-shadow: 0 18px 32px -26px rgba(15, 23, 42, 0.45);
`;

const MetricLabel = styled.span`
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
`;

const MetricValue = styled.strong`
  font-size: clamp(1.4rem, 2.2vw, 1.9rem);
  color: #0f172a;
`;

const MetricHint = styled.span`
  font-size: 0.85rem;
  color: #64748b;
`;

const FiltersRow = styled.div`
  display: grid;
  gap: 16px;
  width: 100%;
  align-items: end;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const FilterGroup = styled.div`
  display: grid;
  gap: 8px;
`;

const FilterLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
`;

const DateInputs = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DateInput = styled.input`
  flex: 1;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.6);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.6);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const ClearFiltersButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  justify-self: flex-start;
  transition: background 0.2s ease, border-color 0.2s ease;
  &:hover { background: rgba(148, 163, 184, 0.2); border-color: rgba(148, 163, 184, 0.6); }
`;

const FeedbackBanner = styled.div<{ "data-type": "success" | "error" }>`
  padding: 14px 16px;
  border-radius: 12px;
  font-weight: 600;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  ${({ "data-type": type }) =>
    type === "success"
      ? "background: rgba(16, 185, 129, 0.12); color: #047857; border-color: rgba(16, 185, 129, 0.35);"
      : "background: rgba(220, 38, 38, 0.12); color: #b91c1c; border-color: rgba(220, 38, 38, 0.35);"}
`;

const HistoryList = styled.div`
  display: grid;
  gap: 16px;
`;

const HistoryCard = styled.article`
  display: grid;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #fff;
  box-shadow: 0 22px 48px -32px rgba(15, 23, 42, 0.45);
`;

const HistoryCardHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
`;

const HistoryCardTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
  display: flex;
  gap: 10px;
  align-items: baseline;

  span {
    font-size: 0.9rem;
    color: #2563eb;
    font-weight: 700;
  }
`;

const HistoryStatus = styled.span`
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
`;

const HistoryMetaGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
`;

const HistoryMetaItem = styled.div`
  display: grid;
  gap: 4px;
`;

const HistoryMetaLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
`;

const HistoryMetaValue = styled.span`
  color: #0f172a;
`;

const HistoryDescription = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.5;
`;

const HistoryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
`;

const PrimaryButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -18px rgba(37, 99, 235, 0.55);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) { background: rgba(148, 163, 184, 0.2); }
`;

const ExportButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(15, 118, 110, 0.4);
  background: rgba(13, 148, 136, 0.12);
  color: #0f766e;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -18px rgba(13, 148, 136, 0.5);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 32px;
  border-radius: 16px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.7);
  text-align: center;
  display: grid;
  gap: 6px;
  color: #475569;
`;

const HistorySkeleton = styled.div`
  display: grid;
  gap: 14px;
`;

const HistorySkeletonCard = styled.div`
  height: 132px;
  border-radius: 16px;
  background: #e2e8f0;
  animation: skeletonPulse 1.2s ease-in-out infinite;

  @keyframes skeletonPulse {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

const UserFooter = styled.footer`
  border-top: 1px solid var(--border);
  padding-top: 12px;
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  cursor: pointer;
  user-select: none;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #e5e7eb;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 700;
  user-select: none;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
`;

const UserMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  left: 16px;
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
  z-index: 25;
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
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  width: min(480px, 94vw);
  padding: 18px;
  transition: opacity .18s ease, transform .18s ease;
  z-index: 35;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0 0 12px;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #B00000, #8A0000);
`;

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(2px);
  z-index: 40;
`;

const Drawer = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(1100px, 96vw);
  background: #fff;
  border-left: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: -24px 0 48px -34px rgba(15, 23, 42, 0.4);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 45;

  @media (max-width: 1024px) {
    width: min(94vw, 820px);
  }

  @media (max-width: 720px) {
    width: 100vw;
    padding: 28px 20px 24px;
  }
`;

const DrawerHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const DrawerTitle = styled.h2`
  margin: 0;
  font-size: 1.4rem;
  color: #0f172a;
`;

const DrawerSubtitle = styled.p`
  margin: 6px 0 0;
  color: #475569;
`;

const DrawerStatus = styled.span`
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
  background: rgba(148, 163, 184, 0.18);
  color: #334155;
  &[data-status="OPEN"] { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
  &[data-status="IN_PROGRESS"] { background: rgba(234, 179, 8, 0.14); color: #b45309; }
  &[data-status="OBSERVATION"] { background: rgba(14, 165, 233, 0.16); color: #0369a1; }
  &[data-status="RESOLVED"] { background: rgba(16, 185, 129, 0.18); color: #047857; }
  &[data-status="CLOSED"] { background: rgba(148, 163, 184, 0.24); color: #334155; }
`;

const DrawerSection = styled.section`
  display: grid;
  gap: 12px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
`;

const SummaryWrapper = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #f8fafc;
`;

const SummaryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryRowContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const SummaryLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
`;

const SummaryValue = styled.span`
  color: #0f172a;
  word-break: break-word;
`;

const SummaryLink = styled.a`
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const SummarySectionHeading = styled.span`
  display: block;
  font-weight: 700;
  color: #0f172a;
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 163, 184, 0.6);
`;

const SummaryText = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.5;
`;

const EmptySummary = styled.p`
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.7);
  color: #64748b;
`;

const DetailGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const DetailItem = styled.div`
  display: grid;
  gap: 4px;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const DetailValue = styled.span`
  color: #0f172a;
  word-break: break-word;
  white-space: pre-line;
`;

const DrawerActions = styled.div`
  margin-top: auto;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(148, 163, 184, 0.2); }
`;

const WhatsappButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(37, 211, 102, 0.4);
  background: rgba(37, 211, 102, 0.12);
  color: #128c7e;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(37, 211, 102, 0.2); }
`;

const UpdatesList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 0 0 18px;
  margin: 0;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    left: 6px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(148, 163, 184, 0.3);
  }
`;

const UpdateItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f3f4f6;
  border: 1px solid rgba(148, 163, 184, 0.18);
  position: relative;

  &::before {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #1d4ed8;
    border: 2px solid #fff;
    left: -18px;
    top: 14px;
    box-shadow: 0 0 0 2px rgba(29, 78, 216, 0.2);
  }
`;

const UpdateMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #475569;
`;

const UpdateAuthor = styled.span`
  font-weight: 600;
`;

const UpdateTimestamp = styled.span`
  font-weight: 400;
`;

const UpdateContent = styled.p`
  margin: 0;
  color: #0f172a;
  line-height: 1.4;
  white-space: pre-line;
`;

const DrawerStatsGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
`