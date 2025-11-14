"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

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

const NavItemButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: inherit;
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.2s ease;
  width: 100%;
  cursor: pointer;
  position: relative;
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }

  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const ConfigSubmenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 180px;
  padding: 8px;
  transform: translateY(${(p) => (p.$open ? "0" : "8px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease, transform .18s ease;
  z-index: 9999;

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
  }
`;

const ConfigSubmenuItem = styled.a`
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
  color: inherit;
  text-decoration: none;
  font-size: 0.9rem;
  &:hover {
    background: #f3f4f6;
  }
  &:active {
    background: #e9ecef;
  }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }

  svg {
    flex-shrink: 0;
    opacity: 0.8;
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

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;

  @media (min-width: 960px) {
    grid-column: span 4;
  }

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 1.2rem;
`;

const Muted = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
`;

const CardLink = styled.a`
  color: var(--primary-600);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease;

  &:hover {
    color: var(--primary-700);
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ItemCard = styled.div`
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: #f1f5f9;
    border-color: var(--primary-300);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const ItemTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  flex: 1;
`;

const ItemBadge = styled.span<{ $color: string; $bg: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(p) => p.$color};
  background: ${(p) => p.$bg};
  white-space: nowrap;
`;

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #64748b;
`;

const ItemTime = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ItemUser = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ItemAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  background: var(--primary-600);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 8px;
`;

const UrgentBadge = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  background: #fee2e2;
  color: #dc2626;
  margin-left: auto;
`;

type TicketItem = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string | null;
  userId: number;
  requester: { id: number; name: string | null; email: string | null; avatarUrl: string | null } | null;
  assignedTo: { id: number; name: string | null; email: string | null; avatarUrl: string | null } | null;
};

type EventItem = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  color: string;
  userAvatar: string | null;
  userName: string | null;
};

const STATUS_DETAILS: Record<string, { label: string; color: string; background: string }> = {
  OPEN: { label: "Novo", color: "#1d4ed8", background: "rgba(37, 99, 235, 0.12)" },
  IN_PROGRESS: { label: "Em andamento", color: "#b45309", background: "rgba(234, 179, 8, 0.14)" },
  OBSERVATION: { label: "Em observação", color: "#0369a1", background: "rgba(3, 105, 161, 0.16)" },
  RESOLVED: { label: "Resolvido", color: "#047857", background: "rgba(16, 185, 129, 0.14)" },
  CLOSED: { label: "Encerrado", color: "#334155", background: "rgba(148, 163, 184, 0.16)" },
};

const OVERDUE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 horas

export default function HomePage() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);

  // Normaliza URLs do avatar (data URI, http(s), caminhos relativos)
  function resolveAvatarUrl(u?: string): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val;
    if (/^https?:\/\//i.test(val)) return val;
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) setOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(open));
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = await res.json();
          setUser(json.user);
        }
      } catch {}
    })();
  }, []);

  // Buscar perfil para obter avatar do usuário
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          setAvatarUrl(resolveAvatarUrl(json?.avatarUrl || ""));
        }
      } catch {}
    })();
  }, []);

  // Buscar tickets e eventos
  useEffect(() => {
    if (!user?.id) return; // Aguardar usuário estar carregado
    
    async function loadData() {
      setLoading(true);
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        // Buscar tickets e eventos em paralelo
        const [ticketsRes, eventsRes] = await Promise.all([
          fetch("/api/tickets"),
          fetch(`/api/events?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}&onlyMine=true`),
        ]);

        let ticketsList: TicketItem[] = [];
        if (ticketsRes.ok) {
          const ticketsData = await ticketsRes.json();
          ticketsList = ticketsData.items || [];
          setTickets(ticketsList);
        }

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const eventsList = eventsData.items || [];
          
          // Filtrar tickets agendados para hoje do usuário logado
          const scheduledTickets = ticketsList.filter((ticket) => {
            if (!ticket.scheduledAt) return false;
            const scheduledDate = new Date(ticket.scheduledAt);
            const isToday = scheduledDate >= startOfDay && scheduledDate <= endOfDay;
            // Mostrar tickets criados pelo usuário ou atribuídos a ele
            const isMine = ticket.userId === user.id || ticket.assignedTo?.id === user.id;
            return isToday && isMine;
          });
          
          // Converter tickets agendados para formato de evento
          const ticketEvents = scheduledTickets.map((ticket) => ({
            id: ticket.id + 1000000,
            title: ticket.title,
            startDate: ticket.scheduledAt!,
            endDate: ticket.scheduledAt!,
            isAllDay: false,
            color: "#3b82f6",
            userAvatar: ticket.assignedTo?.avatarUrl || ticket.requester?.avatarUrl || null,
            userName: ticket.assignedTo?.name || ticket.requester?.name || null,
            type: "ticket",
          }));
          
          setEvents([...eventsList, ...ticketEvents]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  // Filtrar tickets em atraso
  const overdueTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter((ticket) => {
      if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") return false;
      const updatedAt = new Date(ticket.updatedAt).getTime();
      const age = now - updatedAt;
      return age > OVERDUE_THRESHOLD_MS;
    });
  }, [tickets]);

  // Filtrar eventos do dia atual
  const todayEvents = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toISOString().split("T")[0];
      return eventDate === todayStr;
    });
  }, [events]);

  // Filtrar tickets novos (aguardando atendimento)
  const newTickets = useMemo(() => {
    return tickets.filter((ticket) => ticket.status === "OPEN");
  }, [tickets]);

  function formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return "";
    }
  }

  function getHoursAgo(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Menos de 1h";
      if (diffHours < 24) return `${diffHours}h atrás`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d atrás`;
    } catch {
      return "";
    }
  }

  function resolveAvatarUrl(u?: string | null): string {
    if (!u) return "";
    const val = String(u);
    if (val.startsWith("data:")) return val;
    if (/^https?:\/\//i.test(val)) return val;
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    window.location.assign("/");
  }

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  // fechar menu ao clicar fora
  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && footerRef.current && !footerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  // acessibilidade: foco no primeiro item quando abrir menu
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [menuOpen]);

  // Posicionar menu de config
  useEffect(() => {
    if (!configSubmenuOpen) return;
    const updatePosition = () => {
      const buttonEl = typeof window !== "undefined" && document?.getElementById("config-menu-button");
      const menuEl = typeof window !== "undefined" && document?.getElementById("config-submenu");
      if (buttonEl && menuEl) {
        const rect = (buttonEl as HTMLElement).getBoundingClientRect();
        const menu = menuEl as HTMLElement;
        menu.style.left = `${rect.right + 8}px`;
        menu.style.top = `${rect.top}px`;
      }
    };
    updatePosition();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [configSubmenuOpen]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!configSubmenuOpen) return;
    function onDocDown(event: MouseEvent | TouchEvent) {
      const target = event.target as unknown as HTMLElement | null;
      if (!target) return;
      const menuContains = document?.getElementById("config-submenu")?.contains?.(target);
      const buttonContains = document?.getElementById("config-menu-button")?.contains?.(target);
      if (!menuContains && !buttonContains) {
        setConfigSubmenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, [configSubmenuOpen]);

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
        <TopBarActions>
          <NotificationBell />
        </TopBarActions>
        <MenuToggle
          aria-label={open ? "Fechar menu lateral" : "Abrir menu lateral"}
          aria-controls="sidebar"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Fechar menu" : "Abrir menu"}
        </MenuToggle>
      </TopBar>
      <Shell>
        <Sidebar
          id="sidebar"
          aria-label="Menu lateral"
          aria-expanded={open}
          aria-hidden={!open}
          $open={open}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              <NavItem ref={firstLinkRef} href="/home" aria-label="Início" aria-current="page">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span>Início</span>
              </NavItem>
              <NavItem href="/tickets" aria-label="Tickets">
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
              <NavItem href="/agenda" aria-label="Agenda">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z"/>
                </svg>
                <span>Agenda</span>
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
              <div style={{ position: "relative" }}>
                <NavItemButton
                  type="button"
                  id="config-menu-button"
                  aria-label="Configurações"
                  aria-expanded={configSubmenuOpen}
                  aria-haspopup="true"
                  onClick={() => setConfigSubmenuOpen(!configSubmenuOpen)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  <span>Config</span>
                </NavItemButton>
                {typeof window !== "undefined" && document && configSubmenuOpen && createPortal(
                  <ConfigSubmenu
                    id="config-submenu"
                    role="menu"
                    aria-labelledby="config-menu-button"
                    $open={configSubmenuOpen}
                  >
                    <ConfigSubmenuItem
                      role="menuitem"
                      tabIndex={0}
                      href="/config?section=forms"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config?section=forms");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      Formulários
                    </ConfigSubmenuItem>
                    <ConfigSubmenuItem
                      role="menuitem"
                      tabIndex={0}
                      href="/config?section=webhooks"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config?section=webhooks");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 3.83l3.88 3.88-3.88 3.88V3.83zm0 12.34v-7.76l3.88 3.88L13 16.17z"/>
                      </svg>
                      Webhooks
                    </ConfigSubmenuItem>
                  </ConfigSubmenu>,
                  document.body
                )}
              </div>
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
            onKeyDown={(e) => {
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
                user?.name ? (user.name?.[0] || "U") : "U"
              )}
            </Avatar>
            <UserName aria-label="Nome do usuário">{user?.name ?? user?.email ?? "Usuário"}</UserName>
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
              onClick={() => { setMenuOpen(false); window.location.assign("/profile"); }}
            >
              Perfil
            </UserMenuItem>
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              $variant="danger"
              onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}
            >
              Sair
            </UserMenuItem>
          </UserMenu>
          {/* Modal de confirmação de saída (renderiza apenas quando aberto) */}
          {confirmOpen && (
            <>
              <ConfirmBackdrop $open={confirmOpen} onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen} />
              <ConfirmDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-exit-title"
                $open={confirmOpen}
                onKeyDown={(e) => { if (e.key === "Escape") setConfirmOpen(false); }}
              >
                <ConfirmTitle id="confirm-exit-title">Você deseja realmente sair?</ConfirmTitle>
                <ConfirmActions>
                  <CancelButton type="button" onClick={() => setConfirmOpen(false)}>Cancelar</CancelButton>
                  <ConfirmButton type="button" onClick={onLogout}>Confirmar</ConfirmButton>
                </ConfirmActions>
              </ConfirmDialog>
            </>
          )}
        </Sidebar>
        <Content>
          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>🎫</CardIcon>
                <div>
                  <CardTitle>
                    Tickets Novos
                    {newTickets.length > 0 && <CountBadge>{newTickets.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Aguardando atendimento</Muted>
                </div>
              </div>
              <CardLink href="/tickets">Ver todos →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : newTickets.length === 0 ? (
              <EmptyState>
                <EmptyIcon>✅</EmptyIcon>
                <EmptyText>Nenhum ticket novo aguardando atendimento</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {newTickets.slice(0, 5).map((ticket) => {
                  const statusInfo = STATUS_DETAILS[ticket.status] || STATUS_DETAILS.OPEN;
                  const displayUser = ticket.assignedTo || ticket.requester;
                  return (
                    <ItemCard
                      key={ticket.id}
                      onClick={() => router.push("/tickets")}
                    >
                      <ItemHeader>
                        <ItemTitle>{ticket.title}</ItemTitle>
                        <ItemBadge $color={statusInfo.color} $bg={statusInfo.background}>
                          {statusInfo.label}
                        </ItemBadge>
                      </ItemHeader>
                      <ItemMeta>
                        <ItemTime>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {getHoursAgo(ticket.createdAt)}
                        </ItemTime>
                        {displayUser && (
                          <ItemUser>
                            <ItemAvatar>
                              {displayUser.avatarUrl ? (
                                <img src={resolveAvatarUrl(displayUser.avatarUrl)} alt={displayUser.name || ""} />
                              ) : (
                                (displayUser.name?.[0] || displayUser.email?.[0] || "U").toUpperCase()
                              )}
                            </ItemAvatar>
                            <span>{displayUser.name || displayUser.email || "Usuário"}</span>
                          </ItemUser>
                        )}
                      </ItemMeta>
                    </ItemCard>
                  );
                })}
              </ItemsList>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>⚠️</CardIcon>
                <div>
                  <CardTitle>
                    Tickets em Atraso
                    {overdueTickets.length > 0 && <CountBadge>{overdueTickets.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Tickets sem atualização há mais de 48 horas</Muted>
                </div>
              </div>
              <CardLink href="/tickets">Ver todos →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : overdueTickets.length === 0 ? (
              <EmptyState>
                <EmptyIcon>✅</EmptyIcon>
                <EmptyText>Nenhum ticket em atraso</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {overdueTickets.slice(0, 5).map((ticket) => {
                  const statusInfo = STATUS_DETAILS[ticket.status] || STATUS_DETAILS.OPEN;
                  const displayUser = ticket.assignedTo || ticket.requester;
                  return (
                    <ItemCard
                      key={ticket.id}
                      onClick={() => router.push("/tickets")}
                    >
                      <ItemHeader>
                        <ItemTitle>{ticket.title}</ItemTitle>
                        <ItemBadge $color={statusInfo.color} $bg={statusInfo.background}>
                          {statusInfo.label}
                        </ItemBadge>
                        <UrgentBadge>URGENTE</UrgentBadge>
                      </ItemHeader>
                      <ItemMeta>
                        <ItemTime>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {getHoursAgo(ticket.updatedAt)}
                        </ItemTime>
                        {displayUser && (
                          <ItemUser>
                            <ItemAvatar>
                              {displayUser.avatarUrl ? (
                                <img src={resolveAvatarUrl(displayUser.avatarUrl)} alt={displayUser.name || ""} />
                              ) : (
                                (displayUser.name?.[0] || displayUser.email?.[0] || "U").toUpperCase()
                              )}
                            </ItemAvatar>
                            <span>{displayUser.name || displayUser.email || "Usuário"}</span>
                          </ItemUser>
                        )}
                      </ItemMeta>
                    </ItemCard>
                  );
                })}
              </ItemsList>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CardIcon>📅</CardIcon>
                <div>
                  <CardTitle>
                    Agenda de Hoje
                    {todayEvents.length > 0 && <CountBadge>{todayEvents.length}</CountBadge>}
                  </CardTitle>
                  <Muted>Compromissos agendados para hoje</Muted>
                </div>
              </div>
              <CardLink href="/agenda">Ver agenda →</CardLink>
            </CardHeader>
            {loading ? (
              <EmptyState>
                <EmptyText>Carregando...</EmptyText>
              </EmptyState>
            ) : todayEvents.length === 0 ? (
              <EmptyState>
                <EmptyIcon>📅</EmptyIcon>
                <EmptyText>Nenhum compromisso agendado para hoje</EmptyText>
              </EmptyState>
            ) : (
              <ItemsList>
                {todayEvents.slice(0, 5).map((event) => (
                  <ItemCard
                    key={event.id}
                    onClick={() => router.push("/agenda")}
                  >
                    <ItemHeader>
                      <ItemTitle>{event.title}</ItemTitle>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: event.color, flexShrink: 0 }} />
                    </ItemHeader>
                    <ItemMeta>
                      <ItemTime>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {event.isAllDay ? "Dia inteiro" : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
                      </ItemTime>
                      {event.userName && (
                        <ItemUser>
                          <ItemAvatar>
                            {event.userAvatar ? (
                              <img src={resolveAvatarUrl(event.userAvatar)} alt={event.userName} />
                            ) : (
                              event.userName[0].toUpperCase()
                            )}
                          </ItemAvatar>
                          <span>{event.userName}</span>
                        </ItemUser>
                      )}
                    </ItemMeta>
                  </ItemCard>
                ))}
              </ItemsList>
            )}
          </Card>
        </Content>
      </Shell>
      <Overlay $show={open} onClick={() => setOpen(false)} aria-hidden={!open} />
    </Page>
  );
}
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