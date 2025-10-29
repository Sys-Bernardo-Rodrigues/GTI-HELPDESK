"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
// Remover header/aside custom e usar o mesmo padrão visual do /home

type SectionKey = "general" | "appearance" | "notifications" | "security" | "integrations" | "forms";

export default function ConfigPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(true);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const initialSection = (params?.get("section") as SectionKey) || "forms";
  const [section, setSection] = useState<SectionKey>(initialSection);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  // Estado do builder de formulários
  type BuilderField = { tempId: string; label: string; type: "TEXT"|"TEXTAREA"|"SELECT"|"RADIO"|"CHECKBOX"|"FILE"; options?: string; required: boolean };
  const [formsList, setFormsList] = useState<Array<{ id: number; title: string; slug: string; link: string; createdAt?: string }>>([]);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [builderFields, setBuilderFields] = useState<BuilderField[]>([]);
  const [savingForm, setSavingForm] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fechar modal com ESC e gerenciar foco básico
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCreateOpen(false);
    }
    if (createOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [createOpen]);

  // Garantir que a URL contenha ?section=forms quando acessado sem query
  useEffect(() => {
    const current = params?.get("section");
    if (!current) {
      const qs = new URLSearchParams(params?.toString());
      qs.set("section", "forms");
      router.replace(`/config?${qs.toString()}`);
    }
  }, [params, router]);

  useEffect(() => {
    const key = params?.get("section") as SectionKey | null;
    if (!key) return;
    if (!SECTIONS.includes(key)) {
      setError("Seção inválida");
    } else {
      setError("");
      setSection(key);
    }
  }, [params]);

  // feedback visual ao trocar de seção
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 250); // efeito suave de carregamento
    return () => clearTimeout(t);
  }, [section]);

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

  // Persistir estado do sidebar e buscar dados do usuário, igual ao /home
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

  // Utilitário para carregar lista de formulários
  async function loadForms() {
    try {
      const res = await fetch("/api/forms");
      if (res.ok) {
        const json = await res.json();
        setFormsList((json.items || []).map((i: any) => ({
          id: i.id,
          title: i.title,
          slug: i.slug,
          link: i.link,
          createdAt: i.createdAt,
        })));
      }
    } catch {}
  }
  // Carregar ao entrar na seção
  useEffect(() => {
    if (section === "forms") {
      loadForms();
    }
  }, [section]);
  // Atualizar automaticamente ao voltar o foco para a aba
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        // atualiza sessão (nome do criador) e formulários
        (async () => {
          try {
            const res = await fetch("/api/session");
            if (res.ok) {
              const json = await res.json();
              setUser(json.user);
            }
          } catch {}
        })();
        if (section === "forms") loadForms();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [section]);

  function addField() {
    setBuilderFields((prev) => [...prev, { tempId: Math.random().toString(36).slice(2), label: "Novo campo", type: "TEXT", options: "", required: true }]);
  }
  function removeField(tempId: string) {
    setBuilderFields((prev) => prev.filter((f) => f.tempId !== tempId));
  }
  function updateField(tempId: string, patch: Partial<BuilderField>) {
    setBuilderFields((prev) => prev.map((f) => (f.tempId === tempId ? { ...f, ...patch } : f)));
  }
  async function saveForm() {
    if (!formTitle.trim()) {
      setError("Informe um título para o formulário");
      return;
    }
    setSavingForm(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDesc.trim(),
        fields: builderFields.map((f) => ({ label: f.label, type: f.type, options: f.options, required: f.required })),
      };
      const res = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Falha ao salvar formulário");
      await loadForms();
      setFormTitle(""); setFormDesc(""); setBuilderFields([]);
      setCreateOpen(false);
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar");
    } finally {
      setSavingForm(false);
    }
  }
  async function deleteForm(id: number) {
    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir");
      await loadForms();
    } catch (e: any) {
      setError(e?.message || "Erro ao excluir");
    }
  }

  function copyFormLink(id: number, slug: string) {
    try {
      const link = `${window.location.origin}/forms/${slug}`;
      const write = navigator.clipboard?.writeText(link);
      if (write && typeof write.then === "function") {
        write.then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
        }).catch(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
        });
      } else {
        // Fallback: ainda atualiza feedback mesmo sem clipboard API
        setCopiedId(id);
        setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
      }
    } catch {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    }
  }

  async function onDeleteForm(id: number) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteForm(id);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    window.location.assign("/");
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
  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [menuOpen]);

  function formatDateTime(value?: string): string {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

  const content = useMemo(() => {
    if (error) return <Muted role="alert">{error}</Muted>;
    if (loading) return <Skeleton aria-hidden />;
    switch (section) {
      case "general":
        return (
          <div>
            <SectionTitle>Configurações Gerais</SectionTitle>
            <Muted>Defina preferências do sistema e informações básicas.</Muted>
            <Field>
              <Label htmlFor="site-name">Nome do sistema</Label>
              <Input id="site-name" type="text" placeholder="Helpdesk" />
            </Field>
            <Field>
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" type="text" placeholder="America/Sao_Paulo" />
            </Field>
          </div>
        );
      case "appearance":
        return (
          <div>
            <SectionTitle>Aparência</SectionTitle>
            <Muted>Controle de tema e opções visuais.</Muted>
            <Field>
              <Label>Modo</Label>
              <Actions>
                <PrimaryButton type="button">Claro</PrimaryButton>
                <PrimaryButton type="button">Escuro</PrimaryButton>
              </Actions>
            </Field>
          </div>
        );
      case "notifications":
        return (
          <div>
            <SectionTitle>Notificações</SectionTitle>
            <Muted>E-mails e alertas em tempo real.</Muted>
            <CheckboxRow>
              <label>
                <input type="checkbox" />
                <span style={{ marginLeft: 8 }}>Enviar e-mails de atualização</span>
              </label>
              <label>
                <input type="checkbox" />
                <span style={{ marginLeft: 8 }}>Alertas de novos tickets</span>
              </label>
            </CheckboxRow>
          </div>
        );
      case "security":
        return (
          <div>
            <SectionTitle>Segurança</SectionTitle>
            <Muted>Autenticação e políticas de acesso.</Muted>
            <Field>
              <Label>Política de senha</Label>
              <Input type="text" placeholder="Mínimo 8 caracteres, 1 número" />
            </Field>
          </div>
        );
      case "integrations":
        return (
          <div>
            <SectionTitle>Integrações</SectionTitle>
            <Muted>Serviços externos conectados.</Muted>
            <Field>
              <Label>Webhook URL</Label>
              <Input type="url" placeholder="https://exemplo.com/webhook" />
            </Field>
          </div>
        );
      case "forms":
        return (
          <div>
            <SectionTitle>Formulários Públicos</SectionTitle>
            <Muted>Crie, gerencie e compartilhe formulários públicos.
            </Muted>
          </div>
        );
    }
  }, [section, loading, error]);

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
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
        <Sidebar id="sidebar" aria-label="Menu lateral" aria-expanded={open} aria-hidden={!open} $open={open}>
          <nav role="navigation" aria-label="Navegação principal">
            <MenuScroll>
              <NavItem href="http://localhost:3000/home" aria-label="Início" ref={firstLinkRef as any}>Início</NavItem>
              <NavItem href="#" aria-label="Tickets">Tickets</NavItem>
              <NavItem href="#" aria-label="Usuários">Usuários</NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações" aria-current="page">Configurações</NavItem>
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
        <Overlay $show={open} onClick={() => setOpen(false)} />
        <Content>
          {section !== "forms" && (
            <Card aria-labelledby="config-title">
              <CardHeader>
                <HeaderIcon aria-hidden>⚙️</HeaderIcon>
                <div>
                  <CardTitle id="config-title">Configurações</CardTitle>
                  <Muted>Gerencie as opções do sistema por seções.</Muted>
                </div>
              </CardHeader>
              {content}
            </Card>
          )}
          {section === "forms" && (
            <RightCol aria-label="Ações de formulários">
              <Card>
                <CardHeader>
                  <HeaderIcon aria-hidden>📂</HeaderIcon>
                  <div>
                    <CardTitle>Meus formulários</CardTitle>
                    <Muted>Editar, excluir e compartilhar.</Muted>
                  </div>
                </CardHeader>
                {error && (
                  <Muted role="alert">{error}</Muted>
                )}
                <div style={{ display: "grid", gap: 10 }}>
                  {formsList.map((f) => (
                    <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
                      <div>
                        <strong>{f.title}</strong>
                        <div><small>Link: <a href={`/forms/${f.slug}`} target="_blank" rel="noreferrer">/forms/{f.slug}</a></small></div>
                        <Meta>
                          <span>Criado por: <strong>{user?.name ?? user?.email ?? "Usuário"}</strong></span>
                          <span>Em: <strong>{formatDateTime(f.createdAt)}</strong></span>
                        </Meta>
                      </div>
                      <ActionButton
                        type="button"
                        title="Copiar link do formulário"
                        aria-label={`Copiar link de ${f.title}`}
                        onClick={() => copyFormLink(f.id, f.slug)}
                        disabled={!!deletingId}
                      >
                        {copiedId === f.id ? "Copiado!" : "Copiar link"}
                      </ActionButton>
                      <DangerButton
                        type="button"
                        title="Excluir formulário"
                        aria-label={`Excluir ${f.title}`}
                        onClick={() => onDeleteForm(f.id)}
                        disabled={deletingId === f.id}
                      >
                        {deletingId === f.id ? "Excluindo..." : "Excluir"}
                      </DangerButton>
                    </div>
                  ))}
                  {formsList.length === 0 && <Muted>Nenhum formulário criado ainda.</Muted>}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <HeaderIcon aria-hidden>📝</HeaderIcon>
                  <div>
                    <CardTitle>Novo formulário</CardTitle>
                    <Muted>Abra um popup para configurar e salvar.</Muted>
                  </div>
                </CardHeader>
                <Actions>
                  <PrimaryButton type="button" onClick={() => setCreateOpen(true)}>Novo formulário</PrimaryButton>
                </Actions>
              </Card>
            </RightCol>
          )}
        </Content>
      </Shell>
      {createOpen && (
        <>
          <ModalBackdrop $open={createOpen} onClick={() => setCreateOpen(false)} aria-hidden={!createOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-form-title"
            $open={createOpen}
            onKeyDown={(e) => { if (e.key === "Escape") setCreateOpen(false); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>📝</ModalIcon>
              <div>
                <ModalTitle id="create-form-title">Criar novo formulário</ModalTitle>
                <Muted>Defina título, descrição e campos. Salvar tornará público.</Muted>
              </div>
            </ModalHeader>
            <div>
              <Field>
                <Label htmlFor="new-form-title">Título</Label>
                <Input
                  id="new-form-title"
                  type="text"
                  placeholder="Ex.: Solicitação de suporte"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="new-form-desc">Descrição</Label>
                <Input
                  id="new-form-desc"
                  type="text"
                  placeholder="Breve descrição"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </Field>

              <SectionTitle>Campos</SectionTitle>
              <div style={{ display: "grid", gap: 12 }}>
                {builderFields.map((bf) => (
                  <div key={bf.tempId} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto", alignItems: "end" }}>
                    <div>
                      <Field>
                        <Label>Rótulo</Label>
                        <Input
                          type="text"
                          value={bf.label}
                          onChange={(e) => updateField(bf.tempId, { label: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <Label>Tipo</Label>
                        <select
                          value={bf.type}
                          onChange={(e) => updateField(bf.tempId, { type: e.target.value as any })}
                          style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff" }}
                        >
                          <option value="TEXT">Texto</option>
                          <option value="TEXTAREA">Texto longo</option>
                          <option value="SELECT">Selecionar</option>
                          <option value="RADIO">Opções (única)</option>
                          <option value="CHECKBOX">Marcar</option>
                          <option value="FILE">Foto/Imagem</option>
                        </select>
                      </Field>
                      {(bf.type === "SELECT" || bf.type === "RADIO") && (
                        <Field>
                          <Label>Opções (separadas por vírgula)</Label>
                          <Input
                            type="text"
                            placeholder="Ex.: Suporte, Comercial, Financeiro"
                            value={bf.options || ""}
                            onChange={(e) => updateField(bf.tempId, { options: e.target.value })}
                          />
                        </Field>
                      )}
                      {bf.type === "FILE" && (
                        <Muted>Este campo aceitará upload de imagem (jpeg, png, webp).</Muted>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={bf.required}
                          onChange={(e) => updateField(bf.tempId, { required: e.target.checked })}
                        />
                        <span>Obrigatório</span>
                      </label>
                    </div>
                    <DangerButton type="button" onClick={() => removeField(bf.tempId)}>Remover</DangerButton>
                  </div>
                ))}
              </div>
              <Actions style={{ marginTop: 10 }}>
                <ActionButton type="button" onClick={addField}>Adicionar campo</ActionButton>
              </Actions>
            </div>
            <ModalActions>
              <CancelButton type="button" onClick={() => setCreateOpen(false)}>Cancelar</CancelButton>
              <ConfirmButton type="button" onClick={saveForm} disabled={savingForm} aria-label="Salvar novo formulário">
                {savingForm ? "Salvando..." : "Salvar"}
              </ConfirmButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}
    </Page>
  );
}

const SECTIONS: SectionKey[] = ["general", "appearance", "notifications", "security", "integrations", "forms"];

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--bg);
`;

// Header e aside iguais ao /home
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

const Card = styled.div`
  --card-radius: 18px;
  grid-column: span 12;
  position: relative;
  border-radius: var(--card-radius);
  padding: 20px;
  background: linear-gradient(180deg, #ffffff, #fcfcff);
  border: 1px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 18px 40px rgba(20, 93, 191, 0.08), 0 6px 18px rgba(0,0,0,0.06);
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: var(--card-radius);
    padding: 1px;
    background: conic-gradient(from 180deg, #c9d7ff, #e6edff, #cfe0ff, #c9d7ff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  @media (min-width: 960px) { grid-column: span 8; }
`;

// Layout em duas colunas com espaçamento de 15px, responsivo.
// Usa CSS Grid e aplica Flexbox como fallback para navegadores mais antigos.
const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  align-items: start;

  @media (min-width: 960px) {
    grid-template-columns: 1fr 1fr;
  }

  /* Neutraliza o grid-column do Card dentro deste container */
  > ${Card} { grid-column: auto; }

  @supports not (display: grid) {
    display: flex;
    gap: 15px;
    flex-direction: column;
    @media (min-width: 960px) {
      flex-direction: row;
      align-items: stretch;
    }
  }
`;

// Coluna lateral à direita para ações de formulários
const RightCol = styled.div`
  grid-column: span 12;
  display: grid;
  gap: 15px;
  align-items: start;
  grid-template-columns: 1fr;

  @media (min-width: 960px) {
    grid-column: span 12; /* ocupa toda a largura da main */
    grid-template-columns: repeat(2, 1fr); /* sempre 2 cards por linha */
  }

  > ${Card} { grid-column: auto; }

  /* Fallback para navegadores sem Grid */
  @supports not (display: grid) {
    display: flex;
    gap: 15px;
    flex-direction: column;
    @media (min-width: 960px) {
      flex-direction: row;
      align-items: stretch;
    }
  }
`;

const CardHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
`;

const CardTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0 0 12px;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 4px;
`;

const Field = styled.div`
  margin-bottom: 14px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
`;

const CheckboxRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const PrimaryButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
`;

// Botão de ação pequeno e discreto
const ActionButton = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--primary-800);
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #f8fafc; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

// Botão de ação perigosa (excluir)
const DangerButton = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ffd0d0;
  background: #fff5f5;
  color: #B00000;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #ffecec; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0 0 8px;
`;

const Skeleton = styled.div`
  height: 160px;
  border-radius: 12px;
  background: linear-gradient(90deg, #eef2f7 25%, #f8f9fb 50%, #eef2f7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

// Menu do usuário (igual ao /home)
const UserMenu = styled.div<{ $open: boolean }>`
  position: absolute;
  left: 16px;
  bottom: 96px; /* aparece acima do footer */
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
  opacity: ${(p) => (p.$open ? 1 : 0)};
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

// Estilos do modal de criação de formulário
const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 30;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  width: min(680px, 96vw);
  max-height: min(80vh, 720px);
  overflow-y: auto;
  padding: 18px;
  transition: opacity .18s ease, transform .18s ease;
  z-index: 35;
`;

const ModalHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const ModalIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
`;

const ModalTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
`;