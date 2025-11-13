"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
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
  const [formsList, setFormsList] = useState<Array<{ id: number; numericId?: number; title: string; slug: string; link: string; createdAt?: string; isPublic?: boolean; createdByName?: string | null; createdByEmail?: string | null }>>([]);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [builderFields, setBuilderFields] = useState<BuilderField[]>([]);
  const [savingForm, setSavingForm] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [formsFeedback, setFormsFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [manageOpen, setManageOpen] = useState<boolean>(false);
  const [manageFormId, setManageFormId] = useState<number | null>(null);
  const [formsLoading, setFormsLoading] = useState<boolean>(false);
  const [toggleVisibilityLoading, setToggleVisibilityLoading] = useState<boolean>(false);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editFormId, setEditFormId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editBuilderFields, setEditBuilderFields] = useState<BuilderField[]>([]);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  useEffect(() => {
    if (!formsFeedback) return;
    const timer = setTimeout(() => setFormsFeedback(null), 2400);
    return () => clearTimeout(timer);
  }, [formsFeedback]);


  // Fechar modal com ESC e gerenciar foco básico
  useEffect(() => {
    const globalWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    if (!createOpen || !globalWindow) return;
    const onKey = (event: KeyboardEvent) => {
      if ("key" in event && (event as unknown as { key?: string }).key === "Escape") {
        setCreateOpen(false);
      }
    };
    globalWindow.addEventListener("keydown", onKey);
    return () => globalWindow.removeEventListener("keydown", onKey);
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
    const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    if (appWindow) {
      const origin = appWindow.location.origin;
      if (val.startsWith("/")) return `${origin}${val}`;
      return `${origin}/${val}`;
    }
    return val;
  }

  // Persistir estado do sidebar e buscar dados do usuário, igual ao /home
  useEffect(() => {
    const storage = typeof globalThis !== "undefined" ? (globalThis as any).localStorage : undefined;
    if (!storage) return;
    const saved = storage.getItem("sidebar_open");
    if (saved !== null) setOpen(saved === "true");
  }, []);

  useEffect(() => {
    const storage = typeof globalThis !== "undefined" ? (globalThis as any).localStorage : undefined;
    if (!storage) return;
    storage.setItem("sidebar_open", String(open));
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = (await res.json()) as Record<string, any>;
          setUser(json?.user ?? null);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = (await res.json()) as Record<string, any>;
          setAvatarUrl(resolveAvatarUrl(json?.avatarUrl || ""));
        }
      } catch {}
    })();
  }, []);

  // Utilitário para carregar lista de formulários
  async function loadForms() {
    setFormsLoading(true);
    try {
      const res = await fetch("/api/forms");
      if (res.ok) {
        const json = (await res.json()) as Record<string, any>;
        const items = (json.items || []).map((i: any) => ({
          id: i.id,
          numericId: Number(i.id),
          title: i.title,
          slug: i.slug,
          link: i.link,
          createdAt: i.createdAt,
          isPublic: Boolean(i.isPublic),
          createdByName: i.createdByName ?? null,
          createdByEmail: i.createdByEmail ?? null,
        }));
        setFormsList(items);
        setFormsFeedback(null);
        setError("");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar formulários");
    } finally {
      setFormsLoading(false);
  }
  }

  // Carregar ao entrar na seção
  useEffect(() => {
    if (section === "forms") {
      loadForms();
    }
  }, [section]);
  // Atualizar automaticamente ao voltar o foco para a aba
  useEffect(() => {
    const doc = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
    if (!doc) return;
    function onVisibility() {
      if (doc.visibilityState === "visible") {
        // atualiza sessão (nome do criador) e formulários
        (async () => {
          try {
            const res = await fetch("/api/session");
            if (res.ok) {
              const json = (await res.json()) as Record<string, any>;
              setUser(json?.user ?? null);
            }
          } catch {}
          await loadForms();
        })();
      }
    }
    doc.addEventListener("visibilitychange", onVisibility);
    return () => doc.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
      setFormsFeedback({ type: "success", text: "Formulário criado com sucesso." });
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar");
    } finally {
      setSavingForm(false);
    }
  }
  

  function copyFormLink(slug: string) {
    try {
      const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
      const appNavigator = typeof globalThis !== "undefined" ? (globalThis as any).navigator : undefined;
      if (!appWindow) throw new Error("Ambiente sem window");
      const link = `${appWindow.location.origin}/forms/${slug}`;
      const clipboard = appNavigator?.clipboard;
      const write = clipboard?.writeText?.(link);
      if (write && typeof write.then === "function") {
        write.then(() => setFormsFeedback({ type: "success", text: "Link copiado" })).catch(() => setFormsFeedback({ type: "error", text: "Falha ao copiar link" }));
      } else {
        const doc = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
        if (!doc) throw new Error("Ambiente sem document");
        const input = doc.createElement("input");
        input.value = link;
        doc.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, 99999);
        doc.execCommand("copy");
        doc.body.removeChild(input);
        setFormsFeedback({ type: "success", text: "Link copiado" });
      }
    } catch (err: any) {
      setFormsFeedback({ type: "error", text: err?.message || "Erro ao copiar link" });
    }
  }

  function openManageForm(id: number) {
    setManageFormId(id);
    setManageOpen(true);
    setFormsFeedback(null);
  }

  function closeManageForm() {
    setManageOpen(false);
    setManageFormId(null);
    setFormsFeedback(null);
  }

  async function toggleFormVisibility(form: { id: number; isPublic?: boolean }) {
    setToggleVisibilityLoading(true);
    try {
      const res = await fetch(`/api/forms/${form.id}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !Boolean(form.isPublic) }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, any> | null;
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar visibilidade");
      setFormsList((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, isPublic: json?.isPublic ?? !Boolean(form.isPublic) } : f
        )
      );
      setFormsFeedback({ type: "success", text: "Formulário atualizado com sucesso." });
    } catch (err: any) {
      setFormsFeedback({ type: "error", text: err?.message || "Erro ao atualizar formulário" });
    } finally {
      setToggleVisibilityLoading(false);
    }
  }

  function closeEditModal() {
    if (editSaving) return;
    setEditOpen(false);
    setEditFormId(null);
    setEditBuilderFields([]);
    setEditTitle("");
    setEditDesc("");
    setEditError("");
  }

  function editAddField() {
    setEditBuilderFields((prev) => [
      ...prev,
      { tempId: Math.random().toString(36).slice(2), label: "Novo campo", type: "TEXT", options: "", required: true },
    ]);
  }

  function editRemoveField(tempId: string) {
    setEditBuilderFields((prev) => prev.filter((f) => f.tempId !== tempId));
  }

  function editUpdateField(tempId: string, patch: Partial<BuilderField>) {
    setEditBuilderFields((prev) => prev.map((f) => (f.tempId === tempId ? { ...f, ...patch } : f)));
  }

  async function openEditModal(formId: number) {
    setEditFormId(formId);
    setEditOpen(true);
    setEditLoading(true);
    setEditError("");
    setFormsFeedback(null);
    try {
      const res = await fetch(`/api/forms/${formId}?t=${Date.now()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao carregar formulário");
      }
      const data = (await res.json()) as Record<string, any>;
      setEditTitle(data?.title ?? "");
      setEditDesc(data?.description ?? "");
      const mapped: BuilderField[] = Array.isArray(data?.fields)
        ? data.fields.map((field: any) => {
            const rawType = String(field.type ?? "TEXT").toUpperCase();
            const allowed = ["TEXT", "TEXTAREA", "SELECT", "RADIO", "CHECKBOX", "FILE"] as const;
            const normalizedType = allowed.includes(rawType as BuilderField["type"]) ? (rawType as BuilderField["type"]) : "TEXT";
            return {
              tempId: `${field.id ?? Math.random().toString(36).slice(2)}`,
              label: String(field.label ?? "Campo"),
              type: normalizedType,
              options: field.options ?? "",
              required: Boolean(field.required),
            };
          })
        : [];
      setEditBuilderFields(mapped);
    } catch (err: any) {
      setEditError(err?.message || "Erro ao carregar formulário");
    } finally {
      setEditLoading(false);
    }
  }

  async function startEditForm(formId: number) {
    closeManageForm();
    await openEditModal(formId);
  }

  async function saveEditedForm() {
    if (!editFormId) return;
    if (!editTitle.trim()) {
      setEditError("Informe um título para o formulário.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const payload = {
        title: editTitle.trim(),
        description: editDesc.trim(),
        fields: editBuilderFields.map((f) => ({
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required,
        })),
      };
      const res = await fetch(`/api/forms/${editFormId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao salvar formulário");
      }
      await loadForms();
      setFormsFeedback({ type: "success", text: "Formulário atualizado com sucesso." });
      closeEditModal();
    } catch (err: any) {
      setEditError(err?.message || "Erro ao salvar formulário");
    } finally {
      setEditSaving(false);
    }
  }

  

  useEffect(() => {
    if (open && firstLinkRef.current) {
      (firstLinkRef.current as unknown as { focus?: () => void })?.focus?.();
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
    const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    appWindow?.location?.assign("/");
  }

  // fechar menu ao clicar fora
  useEffect(() => {
    const doc = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
    if (!doc) return;
    function onDocDown(event: MouseEvent | TouchEvent) {
      const target = event.target as unknown as HTMLElement | null;
      if (!target) return;
      const menuContains = (menuRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      const footerContains = (footerRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      if (!menuContains && !footerContains) {
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

  // acessibilidade: foco no primeiro item quando abrir menu
  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      (firstMenuItemRef.current as unknown as { focus?: () => void })?.focus?.();
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

  const activeForm = manageFormId ? formsList.find((f) => f.id === manageFormId) ?? null : null;
  const baseUrl = typeof globalThis !== "undefined" && (globalThis as any).window
    ? ((globalThis as any).window?.location?.origin ?? "")
    : "";

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
        <Sidebar id="sidebar" aria-label="Menu lateral" aria-expanded={open} aria-hidden={!open} $open={open}>
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
              <NavItem href="/history" aria-label="Histórico">
                Histórico
              </NavItem>
              <NavItem href="/relatorios" aria-label="Relatórios">
                Relatórios
              </NavItem>
              <NavItem href="/config?section=forms" aria-label="Configurações" aria-current="page">
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
              onClick={() => {
                setMenuOpen(false);
                const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
                appWindow?.location?.assign("/profile");
              }}
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
            <FormsWrapper>
              <Card aria-labelledby="forms-card-title">
                <CardHeader>
                  <HeaderIcon aria-hidden>📂</HeaderIcon>
                  <div>
                    <CardTitle id="forms-card-title">Formulários públicos</CardTitle>
                    <Muted>Gerencie as estruturas e links compartilhados com os usuários.</Muted>
                  </div>
                  <HeaderActions>
                    <ActionButton type="button" onClick={() => loadForms()} disabled={formsLoading}>
                      Recarregar
                    </ActionButton>
                    <PrimaryButton type="button" onClick={() => setCreateOpen(true)}>
                      Novo formulário
                    </PrimaryButton>
                  </HeaderActions>
                </CardHeader>
                {error && (
                  <Feedback role="alert" $variant="error">{error}</Feedback>
                )}
                {formsFeedback && !manageOpen && !createOpen && (
                  <Feedback role={formsFeedback.type === "error" ? "alert" : "status"} $variant={formsFeedback.type}>
                    {formsFeedback.text}
                  </Feedback>
                )}
                <FormsScroll role="region" aria-label="Lista de formulários">
                  <FormsTable>
                    <thead>
                      <tr>
                        <FormsHeaderCell>Formulário</FormsHeaderCell>
                        <FormsHeaderCell>Visibilidade</FormsHeaderCell>
                        <FormsHeaderCell>Criado por</FormsHeaderCell>
                        <FormsHeaderCell>Criado em</FormsHeaderCell>
                        <FormsHeaderCell>Link</FormsHeaderCell>
                        <FormsHeaderCell aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {formsLoading && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Carregando formulários...</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!formsLoading && formsList.length === 0 && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Nenhum formulário cadastrado ainda.</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!formsLoading && formsList.map((form) => (
                        <tr key={form.numericId ?? form.id}>
                          <FormsCell>
                            <FormTitle>
                              <strong>{form.title}</strong>
                              <small>Slug: {form.slug}</small>
                            </FormTitle>
                          </FormsCell>
                          <FormsCell>
                            <StatusBadge $tone={form.isPublic ? "success" : "warning"}>
                              {form.isPublic ? "Público" : "Desativado"}
                            </StatusBadge>
                          </FormsCell>
                          <FormsCell>
                            <FormMeta>{form.createdByName || form.createdByEmail || "—"}</FormMeta>
                          </FormsCell>
                          <FormsCell>{formatDateTime(form.createdAt)}</FormsCell>
                          <FormsCell>
                            {form.isPublic ? (
                              <FormLink href={`/forms/${form.slug}`} target="_blank" rel="noreferrer">
                                /forms/{form.slug}
                              </FormLink>
                            ) : (
                              <span>-</span>
                            )}
                          </FormsCell>
                          <FormsCell>
                            <ActionButton type="button" onClick={() => openManageForm(form.numericId ?? form.id)}>
                              Gerenciar
                      </ActionButton>
                          </FormsCell>
                        </tr>
                  ))}
                    </tbody>
                  </FormsTable>
                </FormsScroll>
              </Card>
            </FormsWrapper>
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
                  onChange={(event) => {
                    const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                    setFormTitle(value);
                  }}
                />
              </Field>
              <Field>
                <Label htmlFor="new-form-desc">Descrição</Label>
                <Input
                  id="new-form-desc"
                  type="text"
                  placeholder="Breve descrição"
                  value={formDesc}
                  onChange={(event) => {
                    const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                    setFormDesc(value);
                  }}
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
                          onChange={(event) => {
                            const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                            updateField(bf.tempId, { label: value });
                          }}
                        />
                      </Field>
                      <Field>
                        <Label>Tipo</Label>
                        <select
                          value={bf.type}
                          onChange={(event) => {
                            const value = (event.currentTarget as unknown as { value?: string }).value ?? "TEXT";
                            const normalized = ["TEXT", "TEXTAREA", "SELECT", "RADIO", "CHECKBOX", "FILE"].includes(value)
                              ? (value as BuilderField["type"])
                              : "TEXT";
                            updateField(bf.tempId, { type: normalized });
                          }}
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
                            onChange={(event) => {
                              const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                              updateField(bf.tempId, { options: value });
                            }}
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
                          onChange={(event) => {
                            const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                            updateField(bf.tempId, { required: checked });
                          }}
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

      {manageOpen && activeForm && (
        <>
          <ModalBackdrop $open={manageOpen} onClick={closeManageForm} aria-hidden={!manageOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-form-title"
            $open={manageOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeManageForm(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>🔧</ModalIcon>
              <div>
                <ModalTitle id="manage-form-title">{activeForm.title}</ModalTitle>
                <Muted>Detalhes do formulário e ações rápidas.</Muted>
              </div>
            </ModalHeader>
            {formsFeedback && (
              <Feedback role={formsFeedback.type === "error" ? "alert" : "status"} $variant={formsFeedback.type}>
                {formsFeedback.text}
              </Feedback>
            )}
            <InfoGrid>
            <div>
                <InfoLabel>ID</InfoLabel>
                <InfoValue>{activeForm.id}</InfoValue>
            </div>
              <div>
                <InfoLabel>Slug</InfoLabel>
                <InfoValue>{activeForm.slug}</InfoValue>
              </div>
              <div>
                <InfoLabel>Visibilidade</InfoLabel>
                <InfoValue>
                  <StatusBadge $tone={activeForm.isPublic ? "success" : "warning"}>
                    {activeForm.isPublic ? "Público" : "Desativado"}
                  </StatusBadge>
                </InfoValue>
              </div>
              <div>
                <InfoLabel>Criado por</InfoLabel>
                <InfoValue>{activeForm.createdByName || activeForm.createdByEmail || "—"}</InfoValue>
              </div>
              <div>
                <InfoLabel>Criado em</InfoLabel>
                <InfoValue>{formatDateTime(activeForm.createdAt)}</InfoValue>
              </div>
              <div>
                <InfoLabel>Link público</InfoLabel>
                <InfoValue>
                  {activeForm.isPublic ? (
                    <FormLink href={`/forms/${activeForm.slug}`} target="_blank" rel="noreferrer">
                      {`${baseUrl}/forms/${activeForm.slug}`}
                    </FormLink>
                  ) : (
                    <span>-</span>
                  )}
                </InfoValue>
              </div>
            </InfoGrid>
            <ModalActions>
              <ActionButton
                type="button"
                onClick={() => toggleFormVisibility(activeForm)}
                disabled={toggleVisibilityLoading}
              >
                {toggleVisibilityLoading ? "Atualizando..." : activeForm.isPublic ? "Desativar formulário" : "Reativar formulário"}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => startEditForm(activeForm.id)}
                disabled={toggleVisibilityLoading}
              >
                Editar conteúdo
              </ActionButton>
              <PrimaryButton
                type="button"
                onClick={() => copyFormLink(activeForm.slug)}
                disabled={!activeForm.isPublic || toggleVisibilityLoading}
              >
                Copiar link
              </PrimaryButton>
              <CancelButton type="button" onClick={closeManageForm} disabled={toggleVisibilityLoading}>Fechar</CancelButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {editOpen && (
        <>
          <ModalBackdrop
            $open={editOpen}
            onClick={() => { if (!editSaving && !editLoading) closeEditModal(); }}
            aria-hidden={!editOpen}
          />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-form-title"
            $open={editOpen}
            onKeyDown={(e) => { if (e.key === "Escape" && !editSaving) closeEditModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>✏️</ModalIcon>
              <div>
                <ModalTitle id="edit-form-title">Editar formulário</ModalTitle>
                <Muted>Atualize título, descrição e campos conforme necessário.</Muted>
              </div>
            </ModalHeader>
            {editError && (
              <Feedback role="alert" $variant="error">{editError}</Feedback>
            )}
            {editLoading ? (
              <Muted>Carregando dados do formulário...</Muted>
            ) : (
              <div>
                <Field>
                  <Label htmlFor="edit-form-title-input">Título</Label>
                  <Input
                    id="edit-form-title-input"
                    type="text"
                    value={editTitle}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setEditTitle(value);
                    }}
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-form-desc-input">Descrição</Label>
                  <Input
                    id="edit-form-desc-input"
                    type="text"
                    value={editDesc}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setEditDesc(value);
                    }}
                  />
                </Field>
                <SectionTitle>Campos</SectionTitle>
                <div style={{ display: "grid", gap: 12 }}>
                  {editBuilderFields.map((bf) => (
                    <div key={bf.tempId} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto", alignItems: "end" }}>
                      <div>
                        <Field>
                          <Label>Rótulo</Label>
                          <Input
                            type="text"
                            value={bf.label}
                            onChange={(event) => {
                              const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                              editUpdateField(bf.tempId, { label: value });
                            }}
                          />
                        </Field>
                        <Field>
                          <Label>Tipo</Label>
                          <select
                            value={bf.type}
                            onChange={(event) => {
                              const value = (event.currentTarget as unknown as { value?: string }).value ?? "TEXT";
                              const normalized = ["TEXT", "TEXTAREA", "SELECT", "RADIO", "CHECKBOX", "FILE"].includes(value)
                                ? (value as BuilderField["type"])
                                : "TEXT";
                              editUpdateField(bf.tempId, { type: normalized });
                            }}
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
                              value={bf.options || ""}
                              onChange={(event) => {
                                const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                                editUpdateField(bf.tempId, { options: value });
                              }}
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
                            onChange={(event) => {
                              const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                              editUpdateField(bf.tempId, { required: checked });
                            }}
                          />
                          <span>Obrigatório</span>
                        </label>
                      </div>
                      <DangerButton type="button" onClick={() => editRemoveField(bf.tempId)}>Remover</DangerButton>
                </div>
              ))}
            </div>
                <div style={{ marginTop: 10 }}>
                  <ActionButton type="button" onClick={editAddField}>Adicionar campo</ActionButton>
                </div>
              </div>
            )}
            <ModalActions>
              <CancelButton type="button" onClick={closeEditModal} disabled={editSaving || editLoading}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={saveEditedForm} disabled={editSaving || editLoading}>
                {editSaving ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
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

const FormsWrapper = styled.div`
  grid-column: span 12;
  min-height: calc(100dvh - 120px);
  display: flex;
  flex-direction: column;
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

const Feedback = styled.p<{ $variant: "success" | "error" }>`
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  background: ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(220, 38, 38, 0.12)")};
  color: ${(p) => (p.$variant === "success" ? "#047857" : "#B91C1C")};
  border: 1px solid ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(220, 38, 38, 0.4)")};
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

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
`;

const FormsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
`;

const FormsScroll = styled.div`
  flex: 1;
  overflow: auto;
  margin-top: 12px;
  padding-bottom: 12px;
`;

const FormsHeaderCell = styled.th`
  padding: 12px 14px;
  text-align: left;
  font-size: 0.9rem;
  font-weight: 700;
  color: #334155;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
`;

const FormsCell = styled.td`
  padding: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  vertical-align: top;
  font-size: 0.95rem;
  color: #1f2937;
`;

const FormTitle = styled.div`
  display: grid;
  gap: 4px;
  strong { font-size: 1rem; }
  small { color: var(--muted); font-size: 0.8rem; }
`;

const FormMeta = styled.span`
  color: var(--muted);
`;

const StatusBadge = styled.span<{ $tone: "success" | "warning" }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(p) => (p.$tone === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(234, 179, 8, 0.18)")};
  color: ${(p) => (p.$tone === "success" ? "#047857" : "#854d0e")};
`;

const FormLink = styled.a`
  color: var(--primary-700);
  text-decoration: none;
  word-break: break-all;
  &:hover { text-decoration: underline; }
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

// Estilos do modal de criação/gestão de formulário
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

const InfoGrid = styled.div`
  display: grid;
  gap: 12px;
  margin: 18px 0;
`;

const InfoLabel = styled.span`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
`;

const InfoValue = styled.span`
  font-size: 1rem;
  color: #1f2937;
  word-break: break-word;
`;
