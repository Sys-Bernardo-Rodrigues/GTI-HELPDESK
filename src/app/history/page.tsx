"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

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
  | { type: "field"; label: string; value: string; isLink: boolean; isPhone: boolean; isEmail: boolean }
  | { type: "text"; value: string };

const PAGE_SIZE = 5;

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
  const [currentPage, setCurrentPage] = useState<number>(1);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo, formFilter, assigneeFilter, sortOption]);

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

  const totalPages = useMemo(() => {
    if (!filteredTickets.length) return 1;
    return Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  }, [filteredTickets.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, currentPage]);

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

    const formCount = new Map<string, { title: string; total: number }>();
    const assigneeCount = new Map<string, { label: string; total: number }>();
    let longestTicket: TicketItem | null = null;
    let shortestTicket: TicketItem | null = null;

    tickets.forEach((ticket) => {
      if (ticket.form) {
        const key = ticket.form.slug || String(ticket.form.id);
        const title = ticket.form.title || `Formulário #${ticket.form.id}`;
        const current = formCount.get(key);
        formCount.set(key, { title, total: current ? current.total + 1 : 1 });
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

    const topForm = Array.from(formCount.values()).sort((a, b) => b.total - a.total)[0];
    const topAssignee = Array.from(assigneeCount.values()).sort((a, b) => b.total - a.total)[0];

    const results: Array<{ title: string; value: string; hint: string }> = [];

    if (topForm) {
      results.push({
        title: "Formulário com mais solicitações",
        value: topForm.title,
        hint: `${topForm.total} ticket(s) encerrados`,
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
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueRaw);
        items.push({ type: "field", label, value: valueRaw, isLink, isPhone, isEmail });
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
        <TopBarActions>
          <NotificationBell />
        </TopBarActions>
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
              <NavItem href="/history" aria-label="Histórico" aria-current="page">
                Histórico
              </NavItem>
              <NavItem href="/relatorios" aria-label="Relatórios">
                Relatórios
              </NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">
                Configurações
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
                  <FiltersTitle>Filtros avançados</FiltersTitle>
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
            ) : filteredCount === 0 ? (
              <EmptyState>
                <strong>Nenhum ticket encerrado encontrado.</strong>
                <span>Ajuste os filtros ou o período de busca para ampliar os resultados.</span>
              </EmptyState>
            ) : (
              <>
                <HistoryList>
                  {paginatedTickets.map((ticket) => {
                    const resolutionMinutes = getResolutionMinutes(ticket);
                    const resolutionLabel = resolutionMinutes ? formatDuration(resolutionMinutes) : "—";
                    const formFields = parseFormFields(ticket.description);
                    return (
                      <HistoryCard key={ticket.id}>
                        <HistoryCardHeader>
                          <HistoryCardTitle>
                            <span>#{ticket.id}</span>
                            {ticket.title}
                          </HistoryCardTitle>
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
                            <HistoryMetaLabel>Tempo de resolução</HistoryMetaLabel>
                            <HistoryMetaValue>{resolutionLabel}</HistoryMetaValue>
                          </HistoryMetaItem>
                          <HistoryMetaItem>
                            <HistoryMetaLabel>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              Abertura
                            </HistoryMetaLabel>
                            <HistoryMetaDateValue>{formatDate(ticket.createdAt)}</HistoryMetaDateValue>
                          </HistoryMetaItem>
                          <HistoryMetaItem>
                            <HistoryMetaLabel>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                              </svg>
                              Encerramento
                            </HistoryMetaLabel>
                            <HistoryMetaDateValue>{formatDate(ticket.updatedAt)}</HistoryMetaDateValue>
                          </HistoryMetaItem>
                        </HistoryMetaGrid>
                        {formFields.length > 0 ? (
                          <HistoryFormFields>
                            {formFields.map((field, idx) => (
                              <HistoryFormField key={idx}>
                                <HistoryFormFieldLabel>
                                  {field.isPhone && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                  )}
                                  {field.isEmail && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                      <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                  )}
                                  {field.isLink && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                    </svg>
                                  )}
                                  {field.label}
                                </HistoryFormFieldLabel>
                                <HistoryFormFieldValue>
                                  {field.isLink ? (
                                    <HistoryFormLink href={field.value.startsWith("http") ? field.value : `${getBrowserOrigin()}${field.value}`} target="_blank" rel="noreferrer">
                                      Ver arquivo
                                    </HistoryFormLink>
                                  ) : field.isEmail ? (
                                    <HistoryFormLink as="a" href={`mailto:${field.value}`} style={{ background: "transparent", padding: 0 }}>
                                      {field.value}
                                    </HistoryFormLink>
                                  ) : (
                                    field.value
                                  )}
                                </HistoryFormFieldValue>
                              </HistoryFormField>
                            ))}
                          </HistoryFormFields>
                        ) : (
                          <HistoryDescription>
                            {getSummarySnippet(ticket.description)}
                          </HistoryDescription>
                        )}
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
                {totalPages > 1 && (
                  <PaginationBar aria-label="Paginação do histórico">
                    <PaginationButton
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </PaginationButton>
                    <PaginationStatus>
                      Página {currentPage} de {totalPages}
                    </PaginationStatus>
                    <PaginationButton
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </PaginationButton>
                  </PaginationBar>
                )}
              </>
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

          <DrawerContent role="region" aria-label="Informações do ticket">
            <DrawerGrid>
              <DrawerColumn>
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
                            <SummaryLabel>
                              {entry.isPhone && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                </svg>
                              )}
                              {entry.isEmail && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                  <polyline points="22,6 12,13 2,6"/>
                                </svg>
                              )}
                              {entry.isLink && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                </svg>
                              )}
                              {entry.label}
                            </SummaryLabel>
                            <SummaryRowContent>
                              {entry.isLink ? (
                                <SummaryLink
                                  href={entry.value.startsWith("http") ? entry.value : `${getBrowserOrigin()}${entry.value}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                    <polyline points="15 3 21 3 21 9"/>
                                    <line x1="10" y1="14" x2="21" y2="3"/>
                                  </svg>
                                  Abrir arquivo
                                </SummaryLink>
                              ) : entry.isEmail ? (
                                <SummaryLink as="a" href={`mailto:${entry.value}`} style={{ background: "transparent", padding: 0 }}>
                                  {entry.value || "-"}
                                </SummaryLink>
                              ) : (
                                <SummaryValue>{entry.value || "-"}</SummaryValue>
                              )}
                              {entry.isPhone && (
                                <WhatsappButton type="button" onClick={() => openWhatsapp(entry.value)}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.041-.024c-2.788-1.552-4.636-4.067-5.435-6.644l-.002-.009c-1.39-3.7-.256-7.684 2.994-10.44a9.825 9.825 0 0112.807.094c3.25 2.756 4.384 6.74 2.994 10.44l-.002.009c-.799 2.577-2.647 5.092-5.435 6.644l-.041.024a9.87 9.87 0 01-5.031 1.378m5.421-15.403c-2.115 0-4.197.585-6.001 1.691l-.048.028c-2.567 1.428-4.27 3.745-4.998 6.298l-.002.009c-1.28 3.4-.177 7.05 2.754 9.57a9.125 9.125 0 0011.95-.086c2.931-2.52 4.034-6.17 2.754-9.57l-.002-.009c-.728-2.553-2.431-4.87-4.998-6.298l-.048-.028a9.125 9.125 0 00-6.001-1.691"/>
                                  </svg>
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
              </DrawerColumn>

              <DrawerColumn>
                <DrawerSection>
                  <SectionTitle>Detalhes básicos</SectionTitle>
                  <DetailGrid>
                    <DetailItem>
                      <DetailLabel>Status</DetailLabel>
                      <DetailValue>{STATUS_LABELS[drawerTicket.status]}</DetailValue>
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
              </DrawerColumn>

              <DrawerColumn>
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
              </DrawerColumn>
            </DrawerGrid>
          </DrawerContent>

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

function parseFormFields(description: string): Array<{ label: string; value: string; isLink: boolean; isPhone: boolean; isEmail: boolean }> {
  if (!description) return [];
  const lines = description.split(/\r?\n/g);
  const fields: Array<{ label: string; value: string; isLink: boolean; isPhone: boolean; isEmail: boolean }> = [];
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^formulário:|^enviado em:|^campos adicionais:?$/i.test(line)) continue;
    
    const colonIndex = line.indexOf(":");
    if (colonIndex > -1) {
      const label = line.slice(0, colonIndex).trim();
      const valueRaw = line.slice(colonIndex + 1).trim() || "-";
      if (!valueRaw || valueRaw === "-") continue;
      
      const isLink = /^https?:\/\//i.test(valueRaw) || valueRaw.startsWith("/uploads/") || valueRaw.startsWith("/files/");
      const isPhoneLabel = /telefone|celular|whats?/i.test(label);
      const phoneDigits = valueRaw.replace(/[^0-9+]/g, "");
      const isPhone = isPhoneLabel && phoneDigits.length >= 9;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueRaw);
      
      fields.push({ label, value: valueRaw.length > 50 ? `${valueRaw.slice(0, 50)}…` : valueRaw, isLink, isPhone, isEmail });
    }
  }
  
  return fields.slice(0, 5); // Limitar a 5 campos principais
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
  ${(p) => p.$spinning && `
    animation: spin 1s linear infinite;
  `}
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
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
  gap: 16px;
  grid-template-columns: repeat(5, 1fr);
  
  @media (max-width: 1400px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const HistoryMetaItem = styled.div`
  display: grid;
  gap: 6px;
`;

const HistoryMetaLabel = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.06em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    flex-shrink: 0;
    color: #2563eb;
  }
`;

const HistoryMetaValue = styled.span`
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 500;
`;

const HistoryMetaDateValue = styled(HistoryMetaValue)`
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
`;

const HistoryDatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.03));
  border: 1px solid rgba(37, 99, 235, 0.15);
  margin-top: 8px;
`;

const HistoryDateItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const HistoryDateLabel = styled.span`
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  
  svg {
    flex-shrink: 0;
    color: #2563eb;
  }
`;

const HistoryDateValue = styled.span`
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
`;

const HistoryDescription = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.5;
`;

const HistoryFormFields = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, rgba(248, 250, 252, 0.6) 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const HistoryFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.12);
  transition: all 0.15s ease;
  &:hover {
    border-color: rgba(37, 99, 235, 0.25);
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.08);
  }
`;

const HistoryFormFieldLabel = styled.span`
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const HistoryFormFieldValue = styled.span`
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 500;
  word-break: break-word;
  line-height: 1.4;
`;

const HistoryFormLink = styled.a`
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.1);
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(37, 99, 235, 0.15);
  }
`;

const HistoryActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
`;

const PaginationBar = styled.nav`
  margin-top: 24px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
`;

const PaginationButton = styled.button`
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.1s ease, box-shadow 0.1s ease;

  &:hover:not(:disabled) {
    background: rgba(148, 163, 184, 0.16);
    transform: translateY(-1px);
    box-shadow: 0 10px 20px -18px rgba(15, 23, 42, 0.45);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const PaginationStatus = styled.span`
  color: #475569;
  font-weight: 600;
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

const DrawerContent = styled.div`
  flex: 1;
  display: grid;
  overflow-y: auto;
  padding-right: 10px;
  margin-right: -6px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.6);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.4);
    border-radius: 999px;
  }
`;

const DrawerGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: flex-start;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const DrawerColumn = styled.div`
  display: grid;
  gap: 24px;
  min-width: 0;
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
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, #ffffff, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
`;

const SummaryRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.15);
  transition: all 0.2s ease;
  &:hover {
    border-color: rgba(37, 99, 235, 0.3);
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08);
  }
`;

const SummaryRowContent = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const SummaryLabel = styled.span`
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SummaryValue = styled.span`
  color: #0f172a;
  word-break: break-word;
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
`;

const SummaryLink = styled.a`
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  &:hover { 
    background: rgba(37, 99, 235, 0.15);
    transform: translateY(-1px);
  }
`;

const SummarySectionHeading = styled.span`
  display: block;
  font-weight: 700;
  color: #0f172a;
  font-size: 1rem;
  padding: 12px 16px;
  margin-top: 8px;
  border-top: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.05);
`;

const SummaryText = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.6;
  font-size: 0.95rem;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.8);
  border-left: 3px solid rgba(37, 99, 235, 0.3);
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
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid rgba(37, 211, 102, 0.5);
  background: rgba(37, 211, 102, 0.15);
  color: #128c7e;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { 
    background: rgba(37, 211, 102, 0.25);
    border-color: rgba(37, 211, 102, 0.7);
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(37, 211, 102, 0.2);
  }
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
`;

const DrawerStatCard = styled.article`
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.55), #fff 130%);
  box-shadow: 0 14px 26px -24px rgba(15, 23, 42, 0.65);
`;

const DrawerStatLabel = styled.span`
  font-size: 0.85rem;
  color: #475569;
  font-weight: 500;
`;

const DrawerStatValue = styled.strong`
  font-size: clamp(1.05rem, 1.8vw, 1.35rem);
  color: #0f172a;
`;

const InsightsSection = styled.section`
  display: grid;
  gap: 14px;
  margin: 26px 0 18px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const InsightCard = styled.article`
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid rgba(3, 105, 161, 0.2);
  background: linear-gradient(180deg, rgba(224, 242, 254, 0.6), #fff 120%);
  box-shadow: 0 18px 32px -32px rgba(30, 64, 175, 0.55);
`;

const InsightTitle = styled.h3`
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
`;

const InsightValue = styled.strong`
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  color: #1d4ed8;
`;

const InsightHint = styled.span`
  font-size: 0.85rem;
  color: #475569;
`;