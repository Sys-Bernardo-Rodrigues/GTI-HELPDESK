"use client";

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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
  category: { id: number; name: string } | null;
  requester: { id: number; name: string | null; email: string | null } | null;
  form: { id: number; title: string; slug: string } | null;
  assignedTo: { id: number; name: string | null; email: string | null } | null;
  scheduledAt: string | null;
  scheduledNote: string | null;
  updates: TicketUpdateItem[];
};

type UserOption = { id: number; name: string; email: string };

type SummaryEntry =
  | { type: "section"; label: string }
  | { type: "field"; label: string; value: string; isLink: boolean; isPhone: boolean }
  | { type: "text"; value: string };

type FeedbackMessage = { type: "success" | "error"; message: string } | null;

const STATUS_FLOW: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_DETAILS: Record<
  TicketStatus,
  { label: string; description: string; color: string; background: string }
> = {
  OPEN: {
    label: "Novo",
    description: "Aguardando triagem",
    color: "#1d4ed8",
    background: "rgba(37, 99, 235, 0.12)",
  },
  IN_PROGRESS: {
    label: "Em andamento",
    description: "Sendo tratado pela equipe",
    color: "#b45309",
    background: "rgba(234, 179, 8, 0.14)",
  },
  RESOLVED: {
    label: "Resolvido",
    description: "Concluído e aguardando validação",
    color: "#047857",
    background: "rgba(16, 185, 129, 0.14)",
  },
  CLOSED: {
    label: "Encerrado",
    description: "Ticket finalizado",
    color: "#334155",
    background: "rgba(148, 163, 184, 0.16)",
  },
};

const DUE_PULSE = keyframes`
  0% {
    transform: translateY(0);
    box-shadow: 0 20px 40px -22px rgba(249, 115, 22, 0.6);
  }
  50% {
    transform: translateY(-2px);
    box-shadow: 0 20px 44px -18px rgba(249, 115, 22, 0.75);
  }
  100% {
    transform: translateY(0);
    box-shadow: 0 20px 40px -22px rgba(249, 115, 22, 0.6);
  }
`;

const PULSE = keyframes`
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
`;

function normalizeTicket(raw: any): TicketItem {
  return {
    id: Number(raw.id),
    title: String(raw.title || "Ticket"),
    description: String(raw.description || ""),
    status: (raw.status || "OPEN") as TicketStatus,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
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
            : update.user
            ? {
                id: Number(update.user.id),
                name: update.user.name ?? null,
                email: update.user.email ?? null,
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
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function parseDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

function getBrowserOrigin(): string {
  const win = getBrowserWindow();
  if (win?.location?.origin) return String(win.location.origin);
  const loc = typeof globalThis !== "undefined" ? (globalThis as any).location : undefined;
  if (loc?.origin) return String(loc.origin);
  return "";
}

function openWhatsapp(raw: string) {
  const win = getBrowserWindow();
  const digits = raw.replace(/[^0-9+]/g, "");
  if (!digits) return;
  const normalized = digits.startsWith("+") ? digits.slice(1) : digits;
  const url = new URL(`https://wa.me/${normalized}`);
  if (win?.open) {
    win.open(url.toString(), "_blank", "noopener,noreferrer");
  }
}

export default function TicketsPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [feedback, setFeedback] = useState<FeedbackMessage>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTicket, setDrawerTicket] = useState<TicketItem | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<TicketStatus>("OPEN");
  const [drawerAssignee, setDrawerAssignee] = useState<string>("");
  const [drawerSaving, setDrawerSaving] = useState<boolean>(false);
  const [drawerSchedule, setDrawerSchedule] = useState<string>("");
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [scheduleSaving, setScheduleSaving] = useState<boolean>(false);
  const [scheduleError, setScheduleError] = useState<string>("");
  const [updateMessage, setUpdateMessage] = useState<string>("");
  const [updateSaving, setUpdateSaving] = useState<boolean>(false);
  const [pendingTicketId, setPendingTicketId] = useState<number | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<TicketStatus | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const firstLinkRef = useRef<any>(null);
  const footerRef = useRef<any>(null);
  const menuRef = useRef<any>(null);
  const firstMenuItemRef = useRef<any>(null);

  useEffect(() => {
    loadTickets();
    loadUsers();
  }, []);

  useEffect(() => {
    if (!drawerTicket) return;
    setDrawerStatus(drawerTicket.status);
    setDrawerAssignee(drawerTicket.assignedTo ? String(drawerTicket.assignedTo.id) : "");
    setUpdateMessage("");
    setDrawerSchedule(formatDateTimeLocal(drawerTicket.scheduledAt));
    setScheduleError("");
  }, [drawerTicket]);

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
    if (link?.focus) {
      link.focus();
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const doc = getBrowserDocument();
    if (!doc) return;
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as any;
      const menuEl = menuRef.current as any;
      const footerEl = footerRef.current as any;
      if (target && menuEl && footerEl && !menuEl.contains(target) && !footerEl.contains(target)) {
        setUserMenuOpen(false);
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
    if (userMenuOpen && item?.focus) {
      item.focus();
    }
  }, [userMenuOpen]);

  useEffect(() => {
    const win = getBrowserWindow();
    if (!win?.setInterval) return;
    const interval = win.setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => {
      if (interval) win.clearInterval(interval);
    };
  }, []);

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setUserMenuOpen(false);
    setConfirmOpen(false);
    const win = getBrowserWindow();
    if (win?.location?.assign) {
      win.location.assign("/");
    }
  }

  async function loadTickets(options: { silent?: boolean } = {}) {
    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const res = await fetch("/api/tickets");
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível carregar os tickets.");
      }
      const items = Array.isArray(json?.items) ? json.items : [];
      setTickets(items.map(normalizeTicket));
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao buscar tickets.");
    } finally {
      if (options.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Falha ao carregar usuários.");
      }
      const items = Array.isArray(json?.items) ? json.items : [];
      setUsers(items.map(normalizeUser));
    } catch {
      setUsers([]);
    }
  }

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      if (!matchesStatus) return false;
      if (!term) return true;
      const content = [
        ticket.title,
        ticket.description,
        ticket.assignedTo?.name,
        ticket.assignedTo?.email,
        ticket.form?.title,
        ticket.form?.slug,
        ticket.scheduledNote,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase())
        .join(" ");
      return content.includes(term);
    });
  }, [tickets, statusFilter, search]);

  const groupedTickets = useMemo(() => {
    return STATUS_FLOW.reduce<Record<TicketStatus, TicketItem[]>>((acc, status) => {
      acc[status] = filteredTickets.filter((ticket) => ticket.status === status);
      return acc;
    }, { OPEN: [], IN_PROGRESS: [], RESOLVED: [], CLOSED: [] });
  }, [filteredTickets]);

  const totalTickets = tickets.length;
  const metrics = useMemo(
    () =>
      STATUS_FLOW.map((status) => {
        const count = tickets.filter((ticket) => ticket.status === status).length;
        return {
          status,
          label: STATUS_DETAILS[status].label,
          count,
          percent: totalTickets ? Math.round((count / totalTickets) * 100) : 0,
        };
      }),
    [tickets, totalTickets],
  );

  async function mutateTicket(
    ticketId: number,
    payload: { status?: TicketStatus; assignedToId?: number | null; scheduledAt?: string | null; scheduledNote?: string | null },
    source: "card" | "drawer" | "schedule" = "card",
  ): Promise<boolean> {
    if (source !== "schedule") {
      setFeedback(null);
    }
    if (source === "card") {
      setPendingTicketId(ticketId);
    } else if (source === "drawer") {
      setDrawerSaving(true);
    } else {
      setScheduleSaving(true);
      setScheduleError("");
    }
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Erro ao atualizar ticket.");
      }
      const updated = normalizeTicket(json);
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      if (drawerTicket && drawerTicket.id === updated.id) {
        setDrawerTicket(updated);
      }
      if (source === "drawer" || source === "schedule") {
        setFeedback({ type: "success", message: "Ticket atualizado com sucesso." });
      }
      return true;
    } catch (err: any) {
      const message = err?.message || "Não foi possível atualizar o ticket.";
      if (source === "schedule") {
        setScheduleError(message);
      } else {
        setFeedback({ type: "error", message });
      }
      return false;
    } finally {
      if (source === "card") {
        setPendingTicketId(null);
      } else if (source === "drawer") {
        setDrawerSaving(false);
      } else {
        setScheduleSaving(false);
      }
    }
  }

  function openDrawer(ticket: TicketItem) {
    setDrawerTicket(ticket);
    setFeedback(null);
    setUpdateMessage("");
    setDrawerSchedule(formatDateTimeLocal(ticket.scheduledAt));
    setScheduleError("");
    setScheduleModalOpen(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerTicket(null);
    setFeedback(null);
    setUpdateMessage("");
    setDrawerSchedule("");
    setScheduleModalOpen(false);
    setScheduleError("");
  }

  function handleDrawerSave() {
    if (!drawerTicket) return;
    const updates: {
      status?: TicketStatus;
      assignedToId?: number | null;
    } = {};
    if (drawerStatus !== drawerTicket.status) updates.status = drawerStatus;
    const currentAssignee = drawerTicket.assignedTo ? String(drawerTicket.assignedTo.id) : "";
    if (drawerAssignee !== currentAssignee) {
      updates.assignedToId = drawerAssignee ? Number(drawerAssignee) : null;
    }
    if (Object.keys(updates).length === 0) {
      setFeedback({ type: "error", message: "Nenhuma alteração para salvar." });
      return;
    }
    mutateTicket(drawerTicket.id, updates, "drawer");
  }

  function openScheduleModal() {
    if (!drawerTicket) return;
    setDrawerSchedule(formatDateTimeLocal(drawerTicket.scheduledAt));
    setScheduleError("");
    setScheduleModalOpen(true);
  }

  function closeScheduleModal() {
    if (drawerTicket) {
      setDrawerSchedule(formatDateTimeLocal(drawerTicket.scheduledAt));
    } else {
      setDrawerSchedule("");
    }
    setScheduleError("");
    setScheduleModalOpen(false);
  }

  async function handleScheduleSave() {
    if (!drawerTicket) return;
    const trimmed = drawerSchedule.trim();
    if (!trimmed) {
      setScheduleError("Informe data e horário para o atendimento.");
      return;
    }
    const iso = parseDateTimeLocal(trimmed);
    if (!iso) {
      setScheduleError("Data e horário inválidos.");
      return;
    }
    const success = await mutateTicket(drawerTicket.id, { scheduledAt: iso, scheduledNote: null }, "schedule");
    if (success) {
      setScheduleModalOpen(false);
    }
  }

  async function handleScheduleClear() {
    if (!drawerTicket) return;
    const success = await mutateTicket(drawerTicket.id, { scheduledAt: null, scheduledNote: null }, "schedule");
    if (success) {
      setDrawerSchedule("");
      setScheduleModalOpen(false);
    }
  }

  async function handleAddUpdate(event?: FormEvent<HTMLFormElement> | null) {
    event?.preventDefault();
    if (!drawerTicket) return;
    const content = updateMessage.trim();
    if (!content) {
      setFeedback({ type: "error", message: "Digite uma anotação antes de salvar." });
      return;
    }

    setUpdateSaving(true);
    try {
      const res = await fetch(`/api/tickets/${drawerTicket.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível registrar a atualização.");
      }

      const update: TicketUpdateItem = {
        id: Number(json.id),
        content: String(json.content || ""),
        createdAt: json.createdAt,
        author: json.author
          ? {
              id: Number(json.author.id),
              name: json.author.name ?? null,
              email: json.author.email ?? null,
            }
          : null,
      };

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === drawerTicket.id ? { ...ticket, updates: [...ticket.updates, update] } : ticket,
        ),
      );
      setDrawerTicket((prev) =>
        prev ? { ...prev, updates: [...prev.updates, update], updatedAt: update.createdAt } : prev,
      );
      setUpdateMessage("");
      setFeedback({ type: "success", message: "Atualização registrada com sucesso." });
    } catch (err: any) {
      const message = err?.message || "Não foi possível salvar a atualização.";
      setFeedback({ type: "error", message });
    } finally {
      setUpdateSaving(false);
    }
  }

  function handleCardClick(ticket: TicketItem) {
    if (draggedTicketId !== null) return;
    openDrawer(ticket);
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, ticketId: number) {
    const transfer = event.dataTransfer as any;
    if (transfer?.setData) {
      transfer.setData("text/plain", String(ticketId));
    }
    if (transfer) {
      transfer.effectAllowed = "move";
    }
    setDraggedTicketId(ticketId);
  }

  function handleDragEnd() {
    setDraggedTicketId(null);
    setDropTargetStatus(null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, status: TicketStatus) {
    if (!draggedTicketId) return;
    const ticket = tickets.find((item) => item.id === draggedTicketId);
    if (ticket && ticket.status === status) {
      setDropTargetStatus(null);
      return;
    }
    event.preventDefault();
    const transfer = event.dataTransfer as any;
    if (transfer) {
      transfer.dropEffect = "move";
    }
    setDropTargetStatus(status);
  }

  function handleDragLeave(status: TicketStatus) {
    setDropTargetStatus((current) => (current === status ? null : current));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, status: TicketStatus) {
    const transfer = event.dataTransfer as any;
    const ticketId = draggedTicketId ?? Number(transfer?.getData?.("text/plain"));
    if (!ticketId) return;
    event.preventDefault();
    setDropTargetStatus(null);
    setDraggedTicketId(null);
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket || ticket.status === status) return;
    mutateTicket(ticketId, { status }, "card");
  }

  const drawerFormUrl = drawerTicket?.form ? `${getBrowserOrigin()}/forms/${drawerTicket.form.slug}` : null;
  const drawerUpdates = drawerTicket?.updates ?? [];
  const drawerScheduleDue = drawerTicket?.scheduledAt
    ? new Date(drawerTicket.scheduledAt).getTime() <= now
    : false;
  const drawerScheduleLabel = drawerTicket?.scheduledAt ? formatDate(drawerTicket.scheduledAt) : null;
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
              <NavItem href="/tickets" aria-label="Tickets" aria-current="page">
                Tickets
              </NavItem>
              <NavItem href="/users" aria-label="Usuários">
                Usuários
              </NavItem>
              <NavItem href="/history" aria-label="Histórico">
                Histórico
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
            aria-expanded={userMenuOpen}
            aria-controls="user-menu"
            onClick={() => setUserMenuOpen((v) => !v)}
            onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
              if (e.key === "Enter" || e.key === " ") setUserMenuOpen((v) => !v);
              if (e.key === "Escape") setUserMenuOpen(false);
              if (e.key === "ArrowDown") setUserMenuOpen(true);
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
            $open={userMenuOpen}
            ref={menuRef as any}
          >
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              ref={firstMenuItemRef as any}
              onClick={() => {
                setUserMenuOpen(false);
                const win = getBrowserWindow();
                if (win?.location?.assign) {
                  win.location.assign("/profile");
                }
              }}
            >
              Perfil
            </UserMenuItem>
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              $variant="danger"
              onClick={() => {
                setUserMenuOpen(false);
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
                <ConfirmTitle id="confirm-exit-title">Você deseja realmente sair?</ConfirmTitle>
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
              <div>
                <Title>Central de Tickets</Title>
                <Subtitle>
                  Monitore e atualize os chamados gerados pelos formulários em um pipeline moderno.
                </Subtitle>
              </div>
              <HeaderActions>
                <RefreshButton onClick={() => loadTickets({ silent: true })} disabled={refreshing}>
                  {refreshing ? "Atualizando..." : "Atualizar"}
                </RefreshButton>
              </HeaderActions>
            </PageHeader>

            <MetricsGrid>
              {metrics.map((metric) => (
                <MetricCard key={metric.status}>
                  <MetricLabel>{metric.label}</MetricLabel>
                  <MetricValue>{metric.count}</MetricValue>
                  <MetricBar>
                    <MetricProgress style={{ width: `${metric.percent}%` }} data-status={metric.status} />
                  </MetricBar>
                  <MetricFoot>{metric.percent}% do total</MetricFoot>
                </MetricCard>
              ))}
            </MetricsGrid>

            <Toolbar>
              <SearchInput
                type="search"
                placeholder="Busque por título, solicitante, responsável ou formulário..."
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const element = event.currentTarget as any;
                  const value = typeof element?.value === "string" ? element.value : "";
                  setSearch(value);
                }}
              />
              <StatusFilterList role="tablist" aria-label="Filtrar por status">
                <StatusChip
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  data-active={statusFilter === "ALL"}
                >
                  Todos
                </StatusChip>
                {STATUS_FLOW.map((status) => (
                  <StatusChip
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    data-active={statusFilter === status}
                  >
                    {STATUS_DETAILS[status].label}
                  </StatusChip>
                ))}
              </StatusFilterList>
            </Toolbar>

            {error && <Banner role="alert">{error}</Banner>}

            {loading ? (
              <BoardSkeleton>
                {STATUS_FLOW.map((status) => (
                  <ColumnSkeleton key={status}>
                    <SkeletonHeader />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </ColumnSkeleton>
                ))}
              </BoardSkeleton>
            ) : (
              <Board>
                {STATUS_FLOW.map((status) => {
                  const ticketsInColumn = groupedTickets[status];
                  const nextStatus = STATUS_DETAILS[status];
                  return (
                    <Column
                      key={status}
                      $dropping={dropTargetStatus === status}
                      onDragOver={(event) => handleDragOver(event, status)}
                      onDragEnter={(event) => handleDragOver(event, status)}
                      onDragLeave={() => handleDragLeave(status)}
                      onDrop={(event) => handleDrop(event, status)}
                    >
                      <ColumnHeader>
                        <ColumnTitle>{nextStatus.label}</ColumnTitle>
                        <ColumnCount>{ticketsInColumn.length}</ColumnCount>
                      </ColumnHeader>
                      <ColumnDescription>{nextStatus.description}</ColumnDescription>
                      <ColumnContent>
                        {ticketsInColumn.length === 0 && (
                          <EmptyState>
                            <strong>Nenhum ticket aqui.</strong>
                            <span>Assim que um ticket chegar neste estágio ele aparecerá nesta coluna.</span>
                          </EmptyState>
                        )}
                        {ticketsInColumn.map((ticket) => {
                          const assignedLabel = ticket.assignedTo
                            ? ticket.assignedTo.name || ticket.assignedTo.email || "Usuário"
                            : "Sem responsável";
                          let scheduleDate: Date | null = null;
                          if (ticket.scheduledAt) {
                            scheduleDate = new Date(ticket.scheduledAt);
                          }
                          const hasSchedule = Boolean(scheduleDate);
                          const scheduleDue = scheduleDate ? scheduleDate.getTime() <= now : false;
                          const scheduleLabel = scheduleDate ? formatDate(scheduleDate.toISOString()) : null;
                          return (
                            <TicketCard
                              key={ticket.id}
                              data-pending={pendingTicketId === ticket.id}
                              data-due={scheduleDue ? "true" : undefined}
                              role="button"
                              tabIndex={0}
                              draggable
                              onDragStart={(event) => handleDragStart(event, ticket.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleCardClick(ticket)}
                              onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                                if (draggedTicketId !== null) return;
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openDrawer(ticket);
                                }
                              }}
                            >
                              <TicketHeader>
                                <TicketId>#{ticket.id}</TicketId>
                                <StatusBadge data-status={ticket.status}>
                                  {STATUS_DETAILS[ticket.status].label}
                                </StatusBadge>
                              </TicketHeader>
                              <TicketTitle>{ticket.title}</TicketTitle>
                              <TicketMeta>
                                <MetaGroup>
                                  <MetaLabel>Responsável</MetaLabel>
                                  <MetaValue>{assignedLabel}</MetaValue>
                                </MetaGroup>
                                {ticket.form && (
                                  <MetaGroup>
                                    <MetaLabel>Origem</MetaLabel>
                                    <MetaValue>{ticket.form.title}</MetaValue>
                                  </MetaGroup>
                                )}
                                <MetaGroup>
                                  <MetaLabel>Atualizado</MetaLabel>
                                  <MetaValue>{formatDate(ticket.updatedAt)}</MetaValue>
                                </MetaGroup>
                                {hasSchedule && (
                                  <MetaGroup>
                                    <MetaLabel>Agendado</MetaLabel>
                                    <MetaValue>
                                      {scheduleLabel}
                                      {scheduleDue && <ScheduleBadge>Agora</ScheduleBadge>}
                                    </MetaValue>
                                  </MetaGroup>
                                )}
                              </TicketMeta>
                            </TicketCard>
                          );
                        })}
                      </ColumnContent>
                    </Column>
                  );
                })}
              </Board>
            )}
          </MainCard>
        </Content>
      </Shell>

      {drawerOpen && drawerTicket && <DrawerOverlay role="presentation" onClick={closeDrawer} />}

      {drawerOpen && drawerTicket && (
         <Drawer role="dialog" aria-modal="true" aria-labelledby="drawer-title">
           <DrawerHeader>
             <div>
               <DrawerTitle id="drawer-title">Ticket #{drawerTicket.id}</DrawerTitle>
               <DrawerSubtitle>{drawerTicket.title}</DrawerSubtitle>
             </div>
             <DrawerStatus data-status={drawerTicket.status}>
               {STATUS_DETAILS[drawerTicket.status].label}
             </DrawerStatus>
           </DrawerHeader>
 
           {feedback && <DrawerFeedback data-type={feedback.type}>{feedback.message}</DrawerFeedback>}
 
           <DrawerContent role="region" aria-label="Informações do ticket">
            <DrawerGrid>
              <DrawerColumn>
                <DrawerSection>
                  <SectionTitle>Resumo</SectionTitle>
                  {summaryEntries.length === 0 ? (
                    <EmptySummary>Nenhuma informação adicional registrada.</EmptySummary>
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
                                <WhatsappButton
                                  type="button"
                                  onClick={() => openWhatsapp(entry.value)}
                                >
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
                  <SectionTitle>Detalhes</SectionTitle>
                  <DetailGrid>
                    <DetailItem>
                      <DetailLabel>Responsável</DetailLabel>
                      <DetailValue>
                        {drawerTicket.assignedTo
                          ? `${drawerTicket.assignedTo.name || "Usuário"}${drawerTicket.assignedTo.email ? ` · ${drawerTicket.assignedTo.email}` : ""}`
                          : "—"}
                      </DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Status atual</DetailLabel>
                      <DetailValue>{STATUS_DETAILS[drawerTicket.status].label}</DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Formulário</DetailLabel>
                      <DetailValue>
                        {drawerTicket.form ? (
                          <SummaryLink href={drawerFormUrl ?? "#"} target="_blank" rel="noreferrer">
                            {drawerTicket.form.title}
                          </SummaryLink>
                        ) : (
                          "—"
                        )}
                      </DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Criação</DetailLabel>
                      <DetailValue>{formatDate(drawerTicket.createdAt)}</DetailValue>
                    </DetailItem>
                    <DetailItem>
                      <DetailLabel>Última atualização</DetailLabel>
                      <DetailValue>{formatDate(drawerTicket.updatedAt)}</DetailValue>
                    </DetailItem>
                    {drawerTicket.scheduledAt && (
                      <DetailItem>
                        <DetailLabel>Próximo atendimento</DetailLabel>
                        <DetailValue>{formatDate(drawerTicket.scheduledAt)}</DetailValue>
                      </DetailItem>
                    )}
                  </DetailGrid>
                </DrawerSection>
              </DrawerColumn>

              <DrawerColumn>
                <DrawerSection>
                  <SectionTitle>Atualizações</SectionTitle>
                  {drawerUpdates.length === 0 ? (
                    <EmptySummary>Nenhuma atualização registrada até o momento.</EmptySummary>
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

                  <UpdateForm onSubmit={handleAddUpdate}>
                    <UpdateTextarea
                      placeholder="Descreva o andamento, contatos realizados ou próximos passos..."
                      value={updateMessage}
                      onChange={(event) => {
                        const element = event.currentTarget as unknown as { value?: string };
                        setUpdateMessage(element.value ?? "");
                      }}
                      disabled={updateSaving}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          handleAddUpdate();
                        }
                      }}
                    />
                    <UpdateActions>
                      <UpdateHint>Use Ctrl+Enter para salvar rapidamente.</UpdateHint>
                      <UpdateSubmit type="submit" disabled={updateSaving || !updateMessage.trim()}>
                        {updateSaving ? "Registrando..." : "Registrar atualização"}
                      </UpdateSubmit>
                    </UpdateActions>
                  </UpdateForm>
                </DrawerSection>
              </DrawerColumn>
            </DrawerGrid>
          </DrawerContent>
 
           <DrawerFooter role="region" aria-label="Atualizações de status">
             <SectionTitle>Ações rápidas</SectionTitle>
             <QuickActionsGrid>
               <FormGroup>
                 <FormLabel>Status</FormLabel>
                 <Select
                   value={drawerStatus}
                   onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                     const element = event.currentTarget as any;
                     const value = (element?.value as TicketStatus) ?? drawerStatus;
                     setDrawerStatus(value);
                   }}
                   disabled={drawerSaving}
                 >
                   {STATUS_FLOW.map((status) => (
                     <option key={status} value={status}>
                       {STATUS_DETAILS[status].label}
                     </option>
                   ))}
                 </Select>
               </FormGroup>

               <FormGroup>
                 <FormLabel>Responsável</FormLabel>
                 <Select
                   value={drawerAssignee}
                   onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                     const element = event.currentTarget as any;
                     const value = typeof element?.value === "string" ? element.value : "";
                     setDrawerAssignee(value);
                   }}
                   disabled={drawerSaving}
                 >
                   <option value="">Sem responsável</option>
                   {users.map((user) => (
                     <option key={user.id} value={user.id}>
                       {user.name}
                       {user.email ? ` (${user.email})` : ""}
                     </option>
                   ))}
                 </Select>
               </FormGroup>

               <QuickActionScheduleCard>
                 <QuickActionScheduleLabel>Agendamento</QuickActionScheduleLabel>
                 <QuickActionScheduleButton
                   type="button"
                   onClick={openScheduleModal}
                   disabled={!drawerTicket || scheduleSaving}
                 >
                   {drawerTicket?.scheduledAt ? "Reagendar atendimento" : "Agendar atendimento"}
                 </QuickActionScheduleButton>
                 {drawerTicket?.scheduledAt && drawerScheduleLabel && (
                   <QuickActionScheduleSummary data-due={drawerScheduleDue ? "true" : undefined}>
                     {drawerScheduleDue ? "Agendamento vencido" : drawerScheduleLabel}
                   </QuickActionScheduleSummary>
                 )}
                 {drawerTicket?.scheduledAt && (
                   <QuickActionScheduleClear
                     type="button"
                     onClick={handleScheduleClear}
                     disabled={scheduleSaving}
                   >
                     Remover agendamento
                   </QuickActionScheduleClear>
                 )}
               </QuickActionScheduleCard>
             </QuickActionsGrid>
 
             <DrawerActions>
               <GhostAction type="button" onClick={closeDrawer} disabled={drawerSaving}>
                 Fechar
               </GhostAction>
               <PrimaryAction type="button" onClick={handleDrawerSave} disabled={drawerSaving}>
                 {drawerSaving ? "Salvando..." : "Salvar alterações"}
               </PrimaryAction>
             </DrawerActions>
           </DrawerFooter>
         </Drawer>
       )}
    </Page>
  );
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
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.8rem, 2vw, 2.2rem);
  color: #0f172a;
`;

const Subtitle = styled.p`
  margin: 4px 0 0;
  max-width: 640px;
  color: #475569;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const RefreshButton = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.2s ease;
  &:hover { background: rgba(37, 99, 235, 0.14); }
  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const MetricsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
`;

const MetricCard = styled.article`
  padding: 16px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 12px 24px -16px rgba(15, 23, 42, 0.4);
`;

const MetricLabel = styled.span`
  color: #475569;
  font-size: 0.9rem;
`;

const MetricValue = styled.strong`
  display: block;
  margin-top: 6px;
  font-size: 1.8rem;
  color: #0f172a;
`;

const MetricBar = styled.div`
  margin-top: 12px;
  height: 6px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
`;

const MetricProgress = styled.div`
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2563eb, #1d4ed8);
  transition: width 0.4s ease;
  &[data-status="IN_PROGRESS"] { background: linear-gradient(90deg, #f59e0b, #c2410c); }
  &[data-status="RESOLVED"] { background: linear-gradient(90deg, #10b981, #047857); }
  &[data-status="CLOSED"] { background: linear-gradient(90deg, #94a3b8, #475569); }
`;

const MetricFoot = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 0.8rem;
  color: #94a3b8;
`;

const Toolbar = styled.section`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
`;

const StatusFilterList = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const StatusChip = styled.button`
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s ease, transform 0.1s ease;
  &[data-active="true"] {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.4);
    color: #1d4ed8;
    font-weight: 600;
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

const Board = styled.section`
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const Column = styled.article<{ $dropping?: boolean }>`
  background: #fff;
  border-radius: 16px;
  border: 2px solid ${(p) => (p.$dropping ? "rgba(37, 99, 235, 0.45)" : "rgba(148, 163, 184, 0.18)")};
  display: flex;
  flex-direction: column;
  padding: 18px;
  box-shadow: 0 20px 30px -24px rgba(15, 23, 42, 0.6);
  transition: border-color 0.15s ease, transform 0.15s ease;
  ${(p) => (p.$dropping ? "transform: translateY(-4px);" : "")}
`;

const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ColumnTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
`;

const ColumnCount = styled.span`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #e2e8f0;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: #475569;
`;

const ColumnDescription = styled.p`
  margin: 8px 0 16px;
  color: #64748b;
  font-size: 0.85rem;
`;

const ColumnContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const EmptyState = styled.div`
  padding: 24px;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  background: rgba(241, 245, 249, 0.6);
  color: #475569;
  display: grid;
  gap: 4px;
  text-align: center;
`;

const TicketCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: linear-gradient(180deg, #ffffff, #f8fafc 120%);
  box-shadow: 0 16px 32px -24px rgba(15, 23, 42, 0.8);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
  &[data-pending="true"] {
    opacity: 0.6;
    pointer-events: none;
  }
  &[data-due="true"] {
    border-color: rgba(249, 115, 22, 0.8);
    box-shadow: 0 20px 40px -18px rgba(249, 115, 22, 0.45);
    animation: ${DUE_PULSE} 1.4s ease-in-out infinite;
  }
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 40px -20px rgba(15, 23, 42, 0.35);
  }
  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 3px solid rgba(37, 99, 235, 0.45);
    outline-offset: 3px;
  }
`;

const TicketHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TicketId = styled.span`
  font-weight: 700;
  color: #2563eb;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #475569;
  &[data-status="OPEN"] { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
  &[data-status="IN_PROGRESS"] { background: rgba(234, 179, 8, 0.14); color: #b45309; }
  &[data-status="RESOLVED"] { background: rgba(16, 185, 129, 0.18); color: #047857; }
  &[data-status="CLOSED"] { background: rgba(148, 163, 184, 0.18); color: #334155; }
`;

const TicketTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  color: #0f172a;
`;

const TicketMeta = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
`;

const MetaGroup = styled.div`
  display: grid;
  gap: 2px;
`;

const MetaLabel = styled.span`
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: #94a3b8;
  text-transform: uppercase;
`;

const MetaValue = styled.span`
  color: #0f172a;
`;

const PrimaryAction = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 0;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  &:hover { transform: translateY(-1px); box-shadow: 0 12px 24px -18px rgba(37, 99, 235, 0.6); }
  &:disabled { opacity: 0.6; cursor: default; }
`;

const GhostAction = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  &:hover { background: rgba(226, 232, 240, 0.6); }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const BoardSkeleton = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const ColumnSkeleton = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #fff;
`;

const SkeletonHeader = styled.div`
  height: 24px;
  border-radius: 8px;
  background: #e2e8f0;
  animation: ${PULSE} 1.2s ease infinite;
`;

const SkeletonCard = styled.div`
  height: 120px;
  border-radius: 12px;
  background: #e2e8f0;
  animation: ${PULSE} 1.2s ease infinite;
`;

const DrawerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  z-index: 30;
`;

const Drawer = styled.aside`
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(980px, 97vw);
  height: 100vh;
  max-height: 100vh;
  background: #fff;
  border-left: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: -26px 0 52px -34px rgba(15, 23, 42, 0.45);
  padding: 32px 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow: hidden;
  z-index: 40;

  @media (max-width: 1320px) {
    width: min(94vw, 840px);
  }

  @media (max-width: 980px) {
    width: min(95vw, 720px);
  }

  @media (max-width: 860px) {
    width: 100vw;
    padding: 28px 20px 24px;
  }
`;

const DrawerHeader = styled.div`
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
  font-size: 0.85rem;
  font-weight: 600;
  background: #e2e8f0;
  color: #475569;
  &[data-status="OPEN"] { background: rgba(37, 99, 235, 0.12); color: #1d4ed8; }
  &[data-status="IN_PROGRESS"] { background: rgba(234, 179, 8, 0.14); color: #b45309; }
  &[data-status="RESOLVED"] { background: rgba(16, 185, 129, 0.18); color: #047857; }
  &[data-status="CLOSED"] { background: rgba(148, 163, 184, 0.18); color: #334155; }
`;

const DrawerFeedback = styled.div`
  padding: 14px 16px;
  border-radius: 12px;
  font-weight: 600;
  &[data-type="success"] {
    background: rgba(16, 185, 129, 0.12);
    color: #047857;
    border: 1px solid rgba(16, 185, 129, 0.4);
  }
  &[data-type="error"] {
    background: rgba(220, 38, 38, 0.12);
    color: #b91c1c;
    border: 1px solid rgba(220, 38, 38, 0.4);
  }
`;

const DrawerContent = styled.div`
  flex: 1;
  display: grid;
  gap: 24px;
  overflow-y: auto;
  padding-right: 8px;

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

  @media (max-width: 1320px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 980px) {
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

const DrawerFooter = styled.div`
  display: grid;
  gap: 14px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0) 0%, rgba(248, 250, 252, 0.9) 35%, #f8fafc 100%);
  padding-bottom: 6px;
  box-shadow: 0 -18px 28px -28px rgba(15, 23, 42, 0.55);
`;

const QuickActionsGrid = styled.div`
   display: grid;
   gap: 12px;
   grid-template-columns: repeat(3, minmax(0, 1fr));
 
   @media (max-width: 960px) {
     grid-template-columns: repeat(2, minmax(0, 1fr));
   }
 
   @media (max-width: 640px) {
     grid-template-columns: 1fr;
   }
 `;
 
 const QuickActionScheduleCard = styled.div`
   display: grid;
   gap: 6px;
 `;
 
 const QuickActionScheduleLabel = styled.span`
   font-size: 0.8rem;
   text-transform: uppercase;
   letter-spacing: 0.08em;
   color: #94a3b8;
   font-weight: 600;
 `;
 
 const QuickActionScheduleButton = styled.button`
   width: 100%;
   padding: 10px 14px;
   border-radius: 10px;
   border: none;
   background: linear-gradient(135deg, #f97316, #fb923c);
   color: #fff;
   font-weight: 600;
   cursor: pointer;
   transition: transform 0.1s ease, box-shadow 0.1s ease;

   &:hover:not(:disabled) {
     transform: translateY(-1px);
     box-shadow: 0 12px 24px -18px rgba(249, 115, 22, 0.6);
   }

   &:disabled {
     opacity: 0.6;
     cursor: not-allowed;
   }
 `;
 
 const QuickActionScheduleSummary = styled.span<{ "data-due"?: string }>`
   font-size: 0.8rem;
   color: ${(p) => (p["data-due"] ? "#c2410c" : "#475569")};
   font-weight: 600;
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
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
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
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  transition: background 0.2s ease;
  &:hover { background: rgba(37, 211, 102, 0.2); }
`;

const SummarySectionHeading = styled.span`
  display: block;
  font-size: 0.85rem;
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
  border: 1px dashed rgba(148, 163, 184, 0.4);
  color: #64748b;
  background: rgba(248, 250, 252, 0.7);
`;

const DetailGrid = styled.div`
  display: grid;
  gap: 12px;
`;

const DetailItem = styled.div`
  display: grid;
  gap: 2px;
`;

const DetailLabel = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const DetailValue = styled.span`
  color: #0f172a;
  word-break: break-word;
`;

const FormGroup = styled.div`
  display: grid;
  gap: 6px;
`;

const FormLabel = styled.label`
  font-size: 0.8rem;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.08em;
  font-weight: 600;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  font-size: 0.95rem;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, rgba(15, 23, 42, 0.35) 50%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.35) 50%),
    linear-gradient(to right, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.35));
  background-position: calc(100% - 18px) calc(50% - 3px), calc(100% - 13px) calc(50% - 3px), calc(100% - 2.2rem) 50%;
  background-size: 8px 8px, 8px 8px, 1px 70%;
  background-repeat: no-repeat;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const UpdatesList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
`;

const UpdateItem = styled.li`
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #f8fafc;
`;

const UpdateMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 0.85rem;
  color: #475569;
`;

const UpdateAuthor = styled.span`
  font-weight: 600;
  color: #0f172a;
`;

const UpdateTimestamp = styled.time`
  font-size: 0.8rem;
  color: #64748b;
`;

const UpdateContent = styled.p`
  margin: 0;
  color: #334155;
  line-height: 1.5;
  white-space: pre-wrap;
`;

const UpdateForm = styled.form`
  display: grid;
  gap: 12px;
  margin-top: 16px;
`;

const UpdateTextarea = styled.textarea`
  min-height: 120px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const UpdateActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
`;

const UpdateHint = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
`;

const UpdateSubmit = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
`;

const DrawerActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
  align-items: center;
  justify-content: flex-end;
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

const ScheduleModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  z-index: 48;
`;

const ScheduleModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(480px, 96vw);
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 28px 80px -32px rgba(15, 23, 42, 0.6);
  padding: 26px 28px;
  display: grid;
  gap: 20px;
  z-index: 49;
`;

const ScheduleModalHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
`;

const ScheduleModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
`;

const ScheduleModalSubtitle = styled.p`
  margin: 6px 0 0;
  color: #64748b;
`;

const ScheduleModalAlert = styled.div`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(254, 226, 226, 0.7);
  color: #b91c1c;
  font-weight: 600;
`;

const ScheduleModalBody = styled.div`
  display: grid;
  gap: 14px;
`;

const ScheduleModalCurrent = styled.p`
  margin: 0;
  color: #475569;
  font-size: 0.9rem;

  strong {
    color: #0f172a;
  }
`;

const ScheduleModalFooter = styled.footer`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
`;

const ScheduleModalActions = styled.div`
   display: flex;
   gap: 10px;
   align-items: center;
 `;

const ScheduleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
`;

const QuickActionScheduleClear = styled.button`
  justify-self: flex-start;
  margin-top: 4px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(254, 226, 226, 0.6);
  color: #b91c1c;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(254, 202, 202, 0.8);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;