"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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
};

type SummaryEntry =
  | { type: "section"; label: string }
  | { type: "field"; label: string; value: string; isLink: boolean; isPhone: boolean }
  | { type: "text"; value: string };

export default function HistoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTicket, setDrawerTicket] = useState<TicketItem | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
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

  async function loadTickets() {
    setLoading(true);
    setError("");
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
      setLoading(false);
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

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter((ticket) => {
      const searchable = [
        ticket.title,
        ticket.description,
        ticket.requester?.name,
        ticket.requester?.email,
        ticket.assignedTo?.name,
        ticket.assignedTo?.email,
        ticket.form?.title,
        ticket.form?.slug,
        ticket.id.toString(),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return searchable.includes(term);
    });
  }, [tickets, search]);

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
                <Title>Histórico de Tickets</Title>
                <Subtitle>Acompanhe os tickets encerrados e mantenha o registro das interações.</Subtitle>
              </HeaderBlock>
              <HeaderActions>
                <ReloadButton type="button" onClick={loadTickets} disabled={loading}>
                  {loading ? "Atualizando..." : "Recarregar"}
                </ReloadButton>
              </HeaderActions>
            </PageHeader>

            <Toolbar>
              <SearchInput
                type="search"
                placeholder="Busque por título, ID, formulário ou participante"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const value = event.currentTarget.value ?? "";
                  setSearch(value);
                }}
              />
            </Toolbar>

            {error && <Banner role="alert">{error}</Banner>}

            {loading ? (
              <SkeletonTable>
                {[...Array(5)].map((_, index) => (
                  <SkeletonRow key={index} />
                ))}
              </SkeletonTable>
            ) : filteredTickets.length === 0 ? (
              <EmptyState>
                <strong>Nenhum ticket encerrado encontrado.</strong>
                <span>Os tickets finalizados aparecerão aqui automaticamente.</span>
              </EmptyState>
            ) : (
              <Table role="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Solicitante</th>
                    <th>Responsável</th>
                    <th>Formulário</th>
                    <th>Encerrado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const requester = ticket.requester ? `${ticket.requester.name || "Usuário"}${ticket.requester.email ? ` · ${ticket.requester.email}` : ""}` : "—";
                    const assignee = ticket.assignedTo ? `${ticket.assignedTo.name || "Usuário"}${ticket.assignedTo.email ? ` · ${ticket.assignedTo.email}` : ""}` : "—";
                    return (
                      <tr key={ticket.id}>
                        <td>#{ticket.id}</td>
                        <td>{ticket.title}</td>
                        <td>{requester}</td>
                        <td>{assignee}</td>
                        <td>{ticket.form ? ticket.form.title : "—"}</td>
                        <td>{formatDate(ticket.updatedAt)}</td>
                        <td>
                          <InlineButton type="button" onClick={() => openDrawer(ticket)}>
                            Ver detalhes
                          </InlineButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
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
              {drawerTicket.status === "CLOSED" ? "Encerrado" : drawerTicket.status}
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
            </DetailGrid>
          </DrawerSection>

          <DrawerActions>
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

function openDrawer(ticket: TicketItem) {
  setDrawerTicket(ticket);
  setDrawerOpen(true);
}

function closeDrawer() {
  setDrawerOpen(false);
  setDrawerTicket(null);
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

const Toolbar = styled.section`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
`;

const Banner = styled.div`
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  font-weight: 600;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 18px 36px -28px rgba(15, 23, 42, 0.4);

  thead {
    background: #f1f5f9;
  }

  th, td {
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  th {
    font-weight: 700;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
  }

  tbody tr:hover {
    background: rgba(241, 245, 249, 0.6);
  }
`;

const InlineLink = styled.a`
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const InlineButton = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(148, 163, 184, 0.12);
  color: #475569;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: rgba(148, 163, 184, 0.2); }
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

const SkeletonTable = styled.div`
  display: grid;
  gap: 8px;
`;

const SkeletonRow = styled.div`
  height: 48px;
  border-radius: 12px;
  background: #e2e8f0;
  animation: pulse 1.2s ease-in-out infinite;

  @keyframes pulse {
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
  width: min(540px, 92vw);
  background: #fff;
  border-left: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: -24px 0 48px -34px rgba(15, 23, 42, 0.4);
  padding: 32px 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 45;
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
`;

const DrawerActions = styled.div`
  margin-top: auto;
  display: flex;
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
