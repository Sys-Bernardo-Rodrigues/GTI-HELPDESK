"use client";

import { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useSound } from "@/lib/sounds";
import { useNotifications } from "@/lib/notifications";
import NotificationBell from "@/components/NotificationBell";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "OBSERVATION" | "RESOLVED" | "CLOSED";

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
  | { type: "field"; label: string; value: string; isLink: boolean; isPhone: boolean; isEmail: boolean }
  | { type: "text"; value: string };

type FeedbackMessage = { type: "success" | "error"; message: string } | null;

const STATUS_FLOW: TicketStatus[] = ["OPEN", "IN_PROGRESS", "OBSERVATION", "RESOLVED", "CLOSED"];
const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

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
  OBSERVATION: {
    label: "Em observação",
    description: "Aguardando acompanhamento ou retorno",
    color: "#0369a1",
    background: "rgba(3, 105, 161, 0.16)",
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

const BOARD_STATUSES: TicketStatus[] = STATUS_FLOW.filter((status) => status !== "CLOSED");

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

function getTicketAgeMs(ticket: TicketItem, nowTs: number): number {
  const createdAt = new Date(ticket.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  return Math.max(0, nowTs - createdAt);
}

function isTicketOverdue(ticket: TicketItem, nowTs: number): boolean {
  if (ticket.status === "CLOSED") return false;
  return getTicketAgeMs(ticket, nowTs) >= OVERDUE_THRESHOLD_MS;
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

const RefreshButton = styled.button`
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

const RefreshIcon = styled.svg<{ $spinning?: boolean }>`
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

export default function TicketsPage() {
  const sounds = useSound();
  const notifications = useNotifications();
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
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);
  const [onlyScheduled, setOnlyScheduled] = useState<boolean>(false);
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
    // Solicitar permissão para notificações após interação do usuário
    const timer = setTimeout(() => {
      if (notifications.getPermission() === "default") {
        notifications.requestPermission();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Iniciar verificação periódica de tickets atrasados e agendados
  useEffect(() => {
    if (tickets.length > 0 && notifications.isAvailable()) {
      notifications.startChecking(tickets.map(t => ({
        id: t.id,
        title: t.title,
        createdAt: t.createdAt,
        status: t.status,
        scheduledAt: t.scheduledAt,
      })));
    }
    return () => {
      notifications.stopChecking();
    };
  }, [tickets]);

  // Verificar novos tickets e tickets atribuídos ao usuário
  const previousTicketsRef = useRef<Map<number, { assignedToId: number | null; createdAt: string }>>(new Map());
  const isInitialLoadRef = useRef<boolean>(true);
  
  useEffect(() => {
    if (tickets.length === 0) {
      previousTicketsRef.current.clear();
      return;
    }

    // Na primeira carga, apenas armazenar os tickets sem notificar
    if (isInitialLoadRef.current) {
      tickets.forEach((ticket) => {
        previousTicketsRef.current.set(ticket.id, {
          assignedToId: ticket.assignedTo?.id || null,
          createdAt: ticket.createdAt,
        });
      });
      isInitialLoadRef.current = false;
      return;
    }

    const currentTicketsMap = new Map(tickets.map(t => [t.id, t]));
    const previousTicketsMap = previousTicketsRef.current;

    tickets.forEach((ticket) => {
      const previous = previousTicketsMap.get(ticket.id);
      
      // Novo ticket criado (não estava no mapa anterior)
      if (!previous) {
        notifications.notifyNewTicket({
          id: ticket.id,
          title: ticket.title,
          form: ticket.form,
        });
      }

      // Ticket atribuído ao usuário atual
      if (sessionUser?.id && ticket.assignedTo?.id === sessionUser.id) {
        const previousAssignedToId = previous?.assignedToId;
        // Se não estava atribuído antes ou estava atribuído a outro usuário
        if (previousAssignedToId !== sessionUser.id) {
          notifications.notifyTicketAssigned({
            id: ticket.id,
            title: ticket.title,
            assignedTo: ticket.assignedTo,
          });
        }
      }
    });

    // Atualizar o mapa de referência
    tickets.forEach((ticket) => {
      previousTicketsRef.current.set(ticket.id, {
        assignedToId: ticket.assignedTo?.id || null,
        createdAt: ticket.createdAt,
      });
    });
  }, [tickets, sessionUser?.id]);

  useEffect(() => {
    if (!sessionUser?.id) {
      setOnlyMine(false);
    }
  }, [sessionUser?.id]);

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
      const normalizedTickets = items.map(normalizeTicket);
      setTickets(normalizedTickets);
      
      // Se for um refresh silencioso, marcar como não sendo carga inicial para detectar novos tickets
      if (options.silent) {
        isInitialLoadRef.current = false;
      }
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
      if (ticket.status === "CLOSED") return false;
      const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      if (!matchesStatus) return false;
      const matchesAssignee =
        !onlyMine || (sessionUser?.id != null && ticket.assignedTo?.id === sessionUser.id);
      if (!matchesAssignee) return false;
      if (onlyOverdue && !isTicketOverdue(ticket, now)) return false;
      if (onlyScheduled && ticket.scheduledAt === null) return false;
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
  }, [tickets, statusFilter, search, onlyMine, sessionUser?.id, onlyOverdue, onlyScheduled, now]);

  const groupedTickets = useMemo(() => {
    return BOARD_STATUSES.reduce<Record<TicketStatus, TicketItem[]>>((acc, status) => {
      acc[status] = filteredTickets.filter((ticket) => ticket.status === status);
      return acc;
    }, {} as Record<TicketStatus, TicketItem[]>);
  }, [filteredTickets]);

  const activeTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== "CLOSED"), [tickets]);
  
  const scheduledTickets = useMemo(() => 
    activeTickets.filter((ticket) => ticket.scheduledAt !== null), 
    [activeTickets]
  );

  const metrics = useMemo(
    () =>
      BOARD_STATUSES.map((status) => {
        const count = activeTickets.filter((ticket) => ticket.status === status).length;
        const total = activeTickets.length;
        return {
          status,
          label: STATUS_DETAILS[status].label,
          count,
          percent: total ? Math.round((count / total) * 100) : 0,
        };
      }),
    [activeTickets],
  );

  const overdueTickets = useMemo(
    () => activeTickets.filter((ticket) => isTicketOverdue(ticket, now)),
    [activeTickets, now],
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
      const previousTicket = drawerTicket?.id === ticketId ? drawerTicket : tickets.find(t => t.id === ticketId);
      const wasClosed = previousTicket?.status === "CLOSED";
      const isNowClosed = updated.status === "CLOSED";
      
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      if (drawerTicket && drawerTicket.id === updated.id) {
        setDrawerTicket(updated);
      }
      if (source === "drawer" || source === "schedule") {
        setFeedback({ type: "success", message: "Ticket atualizado com sucesso." });
        if (isNowClosed && !wasClosed) {
          sounds.playTicketClosed();
        } else {
          sounds.playTicketUpdated();
        }
      }
      return true;
    } catch (err: any) {
      const message = err?.message || "Não foi possível atualizar o ticket.";
      if (source === "schedule") {
        setScheduleError(message);
      } else {
        setFeedback({ type: "error", message });
        sounds.playError();
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
    sounds.playClick();
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
      sounds.playError();
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

  function handleScheduleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleScheduleSave();
  }

  function handleScheduleInputChange(event: ChangeEvent<any>) {
    const element = event.target as unknown as { value?: string };
    setDrawerSchedule(typeof element?.value === "string" ? element.value : "");
  }

  function handleScheduleModalClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.stopPropagation();
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
      sounds.playSuccess();
    } catch (err: any) {
      const message = err?.message || "Não foi possível salvar a atualização.";
      setFeedback({ type: "error", message });
      sounds.playError();
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
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueRaw);
        items.push({ type: "field", label, value: valueRaw, isLink, isPhone, isEmail });
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
        <TopBarActions>
          <NotificationBell
            onNotificationClick={(ticketId) => {
              if (ticketId) {
                const ticket = tickets.find((t) => t.id === ticketId);
                if (ticket) {
                  openDrawer(ticket);
                }
              }
            }}
          />
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
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Início</span>
              </NavItem>
              <NavItem href="/tickets" aria-label="Tickets" aria-current="page">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                </svg>
                <span>Tickets</span>
              </NavItem>
              <NavItem href="/users" aria-label="Usuários">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <span>Usuários</span>
              </NavItem>
              <NavItem href="/base" aria-label="Base de Conhecimento">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>Base</span>
              </NavItem>
              <NavItem href="/history" aria-label="Histórico">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                <span>Histórico</span>
              </NavItem>
              <NavItem href="/relatorios" aria-label="Relatórios">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                <span>Relatórios</span>
              </NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                <span>Config</span>
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
              </div>
              <HeaderActions>
                <RefreshButton 
                  onClick={() => loadTickets({ silent: true })} 
                  disabled={refreshing}
                  title={refreshing ? "Atualizando..." : "Atualizar"}
                  aria-label={refreshing ? "Atualizando..." : "Atualizar"}
                >
                  <RefreshIcon $spinning={refreshing} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </RefreshIcon>
                </RefreshButton>
              </HeaderActions>
            </PageHeader>

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
              <ToolbarFilters>
                <StatusFilterList role="tablist" aria-label="Filtrar por status">
                  <StatusChip
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    data-active={statusFilter === "ALL"}
                  >
                    Todos
                  </StatusChip>
                  {BOARD_STATUSES.map((status) => (
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
                {sessionUser?.id && (
                  <MineToggle
                    type="button"
                    onClick={() => setOnlyMine((prev) => !prev)}
                    data-active={onlyMine ? "true" : undefined}
                    aria-pressed={onlyMine ? "true" : "false"}
                    title="Mostrar apenas tickets atribuídos a mim"
                  >
                    Meus tickets
                  </MineToggle>
                )}
                <OverdueToggle
                  type="button"
                  onClick={() => setOnlyOverdue((prev) => !prev)}
                  data-active={onlyOverdue ? "true" : undefined}
                  aria-pressed={onlyOverdue ? "true" : "false"}
                  title="Mostrar apenas tickets abertos há mais de 48 horas"
                >
                  Tickets atrasados
                  <OverdueCount data-highlight={overdueTickets.length > 0 ? "true" : undefined}>
                    {overdueTickets.length.toLocaleString("pt-BR")}
                  </OverdueCount>
                </OverdueToggle>
                <ScheduledToggle
                  type="button"
                  onClick={() => setOnlyScheduled((prev) => !prev)}
                  data-active={onlyScheduled ? "true" : undefined}
                  aria-pressed={onlyScheduled ? "true" : "false"}
                  title="Mostrar apenas tickets agendados"
                >
                  Tickets agendados
                  <ScheduledCount data-highlight={scheduledTickets.length > 0 ? "true" : undefined}>
                    {scheduledTickets.length.toLocaleString("pt-BR")}
                  </ScheduledCount>
                </ScheduledToggle>
              </ToolbarFilters>
            </Toolbar>

            {error && <Banner role="alert">{error}</Banner>}

            {loading ? (
              <BoardSkeleton>
                {BOARD_STATUSES.map((status) => (
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
                {BOARD_STATUSES.map((status) => {
                  const ticketsInColumn = groupedTickets[status] || [];
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
                          const overdue = isTicketOverdue(ticket, now);
                          return (
                            <TicketCard
                              key={ticket.id}
                              data-pending={pendingTicketId === ticket.id}
                              data-due={scheduleDue ? "true" : undefined}
                              data-overdue={overdue ? "true" : undefined}
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
                              {overdue && <OverdueBadge>Pendente há 48h+</OverdueBadge>}
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
                                <WhatsappButton
                                  type="button"
                                  onClick={() => openWhatsapp(entry.value)}
                                >
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

      {drawerOpen && drawerTicket && scheduleModalOpen && (
        <>
          <ScheduleModalBackdrop onClick={closeScheduleModal} />
          <ScheduleModal
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-modal-title"
            aria-describedby="schedule-modal-description"
            onClick={handleScheduleModalClick}
          >
            <ScheduleModalHeader>
              <div>
                <ScheduleModalTitle id="schedule-modal-title">Agendar atendimento</ScheduleModalTitle>
                <ScheduleModalSubtitle id="schedule-modal-description">
                  Defina data e horário para receber o alerta visual na lista de tickets.
                </ScheduleModalSubtitle>
              </div>
              {drawerTicket.scheduledAt && <ScheduleBadge>Ativo</ScheduleBadge>}
            </ScheduleModalHeader>

            {scheduleError && <ScheduleModalAlert role="alert">{scheduleError}</ScheduleModalAlert>}

            <ScheduleModalForm onSubmit={handleScheduleFormSubmit}>
              <ScheduleModalBody>
                {drawerTicket.scheduledAt && (
                  <ScheduleModalCurrent>
                    Atualmente agendado para <strong>{formatDate(drawerTicket.scheduledAt)}</strong>
                  </ScheduleModalCurrent>
                )}

                <div>
                  <ScheduleModalLabel htmlFor="schedule-datetime">Data e horário</ScheduleModalLabel>
                  <ScheduleModalInput
                    id="schedule-datetime"
                    type="datetime-local"
                    value={drawerSchedule}
                    onChange={handleScheduleInputChange}
                    disabled={scheduleSaving}
                    autoFocus
                  />
                </div>
              </ScheduleModalBody>

              <ScheduleModalFooter>
                <ScheduleModalNote>
                  O cartão do ticket ficará destacado quando o horário configurado for alcançado.
                </ScheduleModalNote>
                <ScheduleModalActions>
                  {drawerTicket.scheduledAt && (
                    <ScheduleModalRemove type="button" onClick={handleScheduleClear} disabled={scheduleSaving}>
                      Remover agendamento
                    </ScheduleModalRemove>
                  )}
                  <ScheduleModalCancel type="button" onClick={closeScheduleModal} disabled={scheduleSaving}>
                    Cancelar
                  </ScheduleModalCancel>
                  <ScheduleModalSave type="submit" disabled={scheduleSaving}>
                    {scheduleSaving ? "Salvando..." : "Salvar"}
                  </ScheduleModalSave>
                </ScheduleModalActions>
              </ScheduleModalFooter>
            </ScheduleModalForm>
          </ScheduleModal>
        </>
      )}

      {confirmOpen && (
        <>
          <ConfirmBackdrop $open={confirmOpen} />
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
    overflow: visible;
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
  &[data-status="OBSERVATION"] { background: linear-gradient(90deg, #0ea5e9, #0369a1); }
  &[data-status="RESOLVED"] { background: linear-gradient(90deg, #10b981, #047857); }
  &[data-status="CLOSED"] { background: linear-gradient(90deg, #94a3b8, #475569); }
`;

const MetricFoot = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 0.8rem;
  color: #94a3b8;
`;

const OverdueCard = styled.article<{ "data-empty"?: string }>`
  margin: 18px 0 6px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #fff;
  box-shadow: 0 14px 28px -22px rgba(15, 23, 42, 0.35);
  display: grid;
  gap: 10px;
  border-left: 4px solid ${(p) => (p["data-empty"] ? "rgba(16, 185, 129, 0.85)" : "rgba(248, 113, 113, 0.85)")};
`;

const OverdueCardHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const OverdueCardTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
`;

const OverdueCardBody = styled.p`
  margin: 0;
  color: #475569;
  line-height: 1.45;
`;

const OverdueChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
  font-weight: 700;
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
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const StatusChip = styled.button`
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(148, 163, 184, 0.08);
    border-color: rgba(148, 163, 184, 0.5);
  }
  &[data-active="true"] {
    background: rgba(37, 99, 235, 0.15);
    border-color: rgba(37, 99, 235, 0.5);
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
  &[data-overdue="true"] {
    border-color: rgba(248, 113, 113, 0.85);
    background: linear-gradient(180deg, #fee2e2, #fecaca 120%);
    box-shadow: 0 28px 54px -20px rgba(239, 68, 68, 0.55);
    animation: none;
  }
  &[data-due="true"] {
    border-color: rgba(249, 115, 22, 0.85);
    background: linear-gradient(180deg, #fff7ed, #ffe6cc 120%);
    box-shadow: 0 24px 48px -18px rgba(249, 115, 22, 0.55);
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

const OverdueBadge = styled.span`
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.15);
  color: #b91c1c;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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
  &[data-status="OBSERVATION"] { background: rgba(14, 165, 233, 0.16); color: #0369a1; }
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
  &[data-status="OBSERVATION"] { background: rgba(14, 165, 233, 0.16); color: #0369a1; }
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

const ScheduleModalForm = styled.form`
  display: contents;
`;

const ScheduleModalLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
`;

const ScheduleModalInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  font-size: 0.95rem;

  &:focus {
    outline: none;
    border-color: rgba(37, 99, 235, 0.6);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  &:disabled {
    background: #e2e8f0;
    cursor: not-allowed;
  }
`;

const ScheduleModalNote = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
  max-width: 60%;

  @media (max-width: 640px) {
    max-width: 100%;
  }
`;

const ScheduleModalButtonBase = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  border: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ScheduleModalCancel = styled(ScheduleModalButtonBase)`
  background: #e2e8f0;
  color: #475569;
  border: 1px solid rgba(148, 163, 184, 0.4);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -18px rgba(148, 163, 184, 0.6);
  }
`;

const ScheduleModalSave = styled(ScheduleModalButtonBase)`
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -18px rgba(37, 99, 235, 0.6);
  }
`;

const ScheduleModalRemove = styled(ScheduleModalButtonBase)`
  background: rgba(254, 226, 226, 0.8);
  color: #b91c1c;
  border: 1px solid rgba(248, 113, 113, 0.4);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -18px rgba(248, 113, 113, 0.6);
  }
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

const ToolbarFilters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;

const MineToggle = styled.button<{ "data-active"?: string }>`
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.4);
  background: ${(p) => (p["data-active"] ? "rgba(37, 99, 235, 0.15)" : "#fff")};
  color: ${(p) => (p["data-active"] ? "#1d4ed8" : "#475569")};
  font-size: 0.9rem;
  font-weight: ${(p) => (p["data-active"] ? "600" : "500")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p["data-active"] ? "rgba(37, 99, 235, 0.2)" : "rgba(37, 99, 235, 0.08)")};
    border-color: rgba(37, 99, 235, 0.6);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const OverdueToggle = styled.button<{ "data-active"?: string }>`
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(248, 113, 113, 0.5);
  background: ${(p) => (p["data-active"] ? "rgba(254, 202, 202, 0.6)" : "#fff")};
  color: ${(p) => (p["data-active"] ? "#b91c1c" : "#991b1b")};
  font-size: 0.9rem;
  font-weight: ${(p) => (p["data-active"] ? "600" : "500")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p["data-active"] ? "rgba(254, 202, 202, 0.8)" : "rgba(254, 226, 226, 0.4)")};
    border-color: rgba(248, 113, 113, 0.7);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const OverdueCount = styled.span<{ "data-highlight"?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${(p) => (p["data-highlight"] ? "rgba(239, 68, 68, 0.2)" : "rgba(148, 163, 184, 0.2)")};
  color: ${(p) => (p["data-highlight"] ? "#b91c1c" : "#475569")};
`;

const ScheduledToggle = styled.button<{ "data-active"?: string }>`
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  background: ${(p) => (p["data-active"] ? "rgba(221, 214, 254, 0.6)" : "#fff")};
  color: ${(p) => (p["data-active"] ? "#7c3aed" : "#6d28d9")};
  font-size: 0.9rem;
  font-weight: ${(p) => (p["data-active"] ? "600" : "500")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p["data-active"] ? "rgba(221, 214, 254, 0.8)" : "rgba(237, 233, 254, 0.4)")};
    border-color: rgba(139, 92, 246, 0.7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ScheduledCount = styled.span<{ "data-highlight"?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${(p) => (p["data-highlight"] ? "rgba(139, 92, 246, 0.2)" : "rgba(148, 163, 184, 0.2)")};
  color: ${(p) => (p["data-highlight"] ? "#7c3aed" : "#475569")};
`;