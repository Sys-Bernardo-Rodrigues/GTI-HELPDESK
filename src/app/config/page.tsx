"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
// Remover header/aside custom e usar o mesmo padrão visual do /home

type SectionKey = "general" | "appearance" | "notifications" | "security" | "integrations" | "forms" | "webhooks";

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
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);
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
  // Estado do gerenciamento de webhooks
  const [webhooksList, setWebhooksList] = useState<Array<{ id: number; name: string; description?: string | null; token: string; isActive: boolean; link: string; createdAt?: string; createdByName?: string | null; createdByEmail?: string | null }>>([]);
  const [webhookName, setWebhookName] = useState<string>("");
  const [webhookDesc, setWebhookDesc] = useState<string>("");
  const [savingWebhook, setSavingWebhook] = useState<boolean>(false);
  const [createWebhookOpen, setCreateWebhookOpen] = useState<boolean>(false);
  const [webhooksFeedback, setWebhooksFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [manageWebhookOpen, setManageWebhookOpen] = useState<boolean>(false);
  const [manageWebhookId, setManageWebhookId] = useState<number | null>(null);
  const [webhooksLoading, setWebhooksLoading] = useState<boolean>(false);
  const [toggleWebhookLoading, setToggleWebhookLoading] = useState<boolean>(false);
  const [editWebhookOpen, setEditWebhookOpen] = useState<boolean>(false);
  const [editWebhookId, setEditWebhookId] = useState<number | null>(null);
  const [editWebhookName, setEditWebhookName] = useState<string>("");
  const [editWebhookDesc, setEditWebhookDesc] = useState<string>("");
  const [editWebhookLoading, setEditWebhookLoading] = useState<boolean>(false);
  const [editWebhookSaving, setEditWebhookSaving] = useState<boolean>(false);
  const [editWebhookError, setEditWebhookError] = useState<string>("");
  const [webhookHelpOpen, setWebhookHelpOpen] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; ticketId?: number } | null>(null);

  useEffect(() => {
    if (!formsFeedback) return;
    const timer = setTimeout(() => setFormsFeedback(null), 2400);
    return () => clearTimeout(timer);
  }, [formsFeedback]);

  useEffect(() => {
    if (!webhooksFeedback) return;
    const timer = setTimeout(() => setWebhooksFeedback(null), 2400);
    return () => clearTimeout(timer);
  }, [webhooksFeedback]);


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
    } else if (section === "webhooks") {
      loadWebhooks();
    }
  }, [section]);

  // Abrir submenu de config quando estiver em forms ou webhooks
  useEffect(() => {
    if (section === "forms" || section === "webhooks") {
      setConfigSubmenuOpen(true);
    }
  }, [section]);

  // Posicionar menu de config
  useEffect(() => {
    if (!configSubmenuOpen) return;
    const updatePosition = () => {
      const buttonEl = typeof globalThis !== "undefined" && (globalThis as any).document?.getElementById("config-menu-button");
      const menuEl = typeof globalThis !== "undefined" && (globalThis as any).document?.getElementById("config-submenu");
      if (buttonEl && menuEl) {
        const rect = (buttonEl as HTMLElement).getBoundingClientRect();
        const menu = menuEl as HTMLElement;
        menu.style.left = `${rect.right + 8}px`;
        menu.style.top = `${rect.top}px`;
      }
    };
    updatePosition();
    const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    if (appWindow) {
      appWindow.addEventListener("resize", updatePosition);
      appWindow.addEventListener("scroll", updatePosition, true);
      return () => {
        appWindow.removeEventListener("resize", updatePosition);
        appWindow.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [configSubmenuOpen]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const doc = typeof globalThis !== "undefined" ? (globalThis as any).document : undefined;
    if (!doc || !configSubmenuOpen) return;
    function onDocDown(event: MouseEvent | TouchEvent) {
      const target = event.target as unknown as HTMLElement | null;
      if (!target) return;
      const menuContains = (typeof globalThis !== "undefined" && (globalThis as any).document?.getElementById("config-submenu")?.contains?.(target));
      const buttonContains = (typeof globalThis !== "undefined" && (globalThis as any).document?.querySelector('[aria-label="Configurações"]')?.contains?.(target));
      if (!menuContains && !buttonContains) {
        setConfigSubmenuOpen(false);
      }
    }
    doc.addEventListener("mousedown", onDocDown);
    doc.addEventListener("touchstart", onDocDown);
    return () => {
      doc.removeEventListener("mousedown", onDocDown);
      doc.removeEventListener("touchstart", onDocDown);
    };
  }, [configSubmenuOpen]);
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

  // Funções para gerenciar webhooks
  async function loadWebhooks() {
    setWebhooksLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const json = (await res.json()) as Record<string, any>;
        const items = (json.items || []).map((i: any) => ({
          id: i.id,
          name: i.name,
          description: i.description ?? null,
          token: i.token,
          isActive: Boolean(i.isActive),
          link: i.link,
          createdAt: i.createdAt,
          createdByName: i.createdByName ?? null,
          createdByEmail: i.createdByEmail ?? null,
        }));
        setWebhooksList(items);
        setWebhooksFeedback(null);
        setError("");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar webhooks");
    } finally {
      setWebhooksLoading(false);
    }
  }

  async function saveWebhook() {
    if (!webhookName.trim()) {
      setError("Informe um nome para o webhook");
      return;
    }
    setSavingWebhook(true);
    try {
      const payload = {
        name: webhookName.trim(),
        description: webhookDesc.trim() || null,
      };
      const res = await fetch("/api/webhooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Falha ao salvar webhook");
      await loadWebhooks();
      setWebhookName(""); setWebhookDesc("");
      setCreateWebhookOpen(false);
      setWebhooksFeedback({ type: "success", text: "Webhook criado com sucesso." });
    } catch (e: any) {
      setError(e?.message || "Erro ao salvar");
    } finally {
      setSavingWebhook(false);
    }
  }

  function copyWebhookLink(token: string) {
    try {
      const appWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
      const appNavigator = typeof globalThis !== "undefined" ? (globalThis as any).navigator : undefined;
      if (!appWindow) throw new Error("Ambiente sem window");
      const link = `${appWindow.location.origin}/api/webhooks/receive/${token}`;
      const clipboard = appNavigator?.clipboard;
      const write = clipboard?.writeText?.(link);
      if (write && typeof write.then === "function") {
        write.then(() => setWebhooksFeedback({ type: "success", text: "Link copiado" })).catch(() => setWebhooksFeedback({ type: "error", text: "Falha ao copiar link" }));
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
        setWebhooksFeedback({ type: "success", text: "Link copiado" });
      }
    } catch (err: any) {
      setWebhooksFeedback({ type: "error", text: err?.message || "Erro ao copiar link" });
    }
  }

  function openManageWebhook(id: number) {
    setManageWebhookId(id);
    setManageWebhookOpen(true);
    setWebhooksFeedback(null);
  }

  function closeManageWebhook() {
    setManageWebhookOpen(false);
    setManageWebhookId(null);
    setWebhooksFeedback(null);
    setTestResult(null);
  }

  async function toggleWebhookVisibility(webhook: { id: number; isActive?: boolean }) {
    setToggleWebhookLoading(true);
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !Boolean(webhook.isActive) }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, any> | null;
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar webhook");
      setWebhooksList((prev) =>
        prev.map((w) =>
          w.id === webhook.id ? { ...w, isActive: json?.isActive ?? !Boolean(webhook.isActive) } : w
        )
      );
      setWebhooksFeedback({ type: "success", text: "Webhook atualizado com sucesso." });
    } catch (err: any) {
      setWebhooksFeedback({ type: "error", text: err?.message || "Erro ao atualizar webhook" });
    } finally {
      setToggleWebhookLoading(false);
    }
  }

  function closeEditWebhookModal() {
    if (editWebhookSaving) return;
    setEditWebhookOpen(false);
    setEditWebhookId(null);
    setEditWebhookName("");
    setEditWebhookDesc("");
    setEditWebhookError("");
  }

  async function openEditWebhookModal(webhookId: number) {
    setEditWebhookId(webhookId);
    setEditWebhookOpen(true);
    setEditWebhookLoading(true);
    setEditWebhookError("");
    setWebhooksFeedback(null);
    try {
      const res = await fetch(`/api/webhooks/${webhookId}?t=${Date.now()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao carregar webhook");
      }
      const data = (await res.json()) as Record<string, any>;
      setEditWebhookName(data?.name ?? "");
      setEditWebhookDesc(data?.description ?? "");
    } catch (err: any) {
      setEditWebhookError(err?.message || "Erro ao carregar webhook");
    } finally {
      setEditWebhookLoading(false);
    }
  }

  async function startEditWebhook(webhookId: number) {
    closeManageWebhook();
    await openEditWebhookModal(webhookId);
  }

  async function saveEditedWebhook() {
    if (!editWebhookId) return;
    if (!editWebhookName.trim()) {
      setEditWebhookError("Informe um nome para o webhook.");
      return;
    }
    setEditWebhookSaving(true);
    setEditWebhookError("");
    try {
      const payload = {
        name: editWebhookName.trim(),
        description: editWebhookDesc.trim() || null,
      };
      const res = await fetch(`/api/webhooks/${editWebhookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao salvar webhook");
      }
      await loadWebhooks();
      setWebhooksFeedback({ type: "success", text: "Webhook atualizado com sucesso." });
      closeEditWebhookModal();
    } catch (err: any) {
      setEditWebhookError(err?.message || "Erro ao salvar webhook");
    } finally {
      setEditWebhookSaving(false);
    }
  }

  async function testWebhook(token: string) {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const testPayload = {
        title: "Teste de Webhook",
        description: "Este é um teste de webhook enviado pela interface de configuração.",
        source: "Interface de Teste",
        timestamp: new Date().toISOString(),
        test: true
      };

      const res = await fetch(`/api/webhooks/receive/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, any>;

      if (res.ok) {
        setTestResult({
          success: true,
          message: "Webhook testado com sucesso!",
          ticketId: data.ticketId || undefined,
        });
        setWebhooksFeedback({ type: "success", text: `Webhook testado! Ticket #${data.ticketId || "N/A"} criado.` });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Erro ao testar webhook",
        });
        setWebhooksFeedback({ type: "error", text: data.error || "Erro ao testar webhook" });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Erro ao testar webhook",
      });
      setWebhooksFeedback({ type: "error", text: err?.message || "Erro ao testar webhook" });
    } finally {
      setTestingWebhook(false);
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
      case "webhooks":
        return (
          <div>
            <SectionTitle>Webhooks</SectionTitle>
            <Muted>Configure webhooks para receber notificações de outros sistemas e criar tickets automaticamente.
            </Muted>
          </div>
        );
    }
  }, [section, loading, error]);

  const activeForm = manageFormId ? formsList.find((f) => f.id === manageFormId) ?? null : null;
  const activeWebhook = manageWebhookId ? webhooksList.find((w) => w.id === manageWebhookId) ?? null : null;
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
                  $active={section === "forms" || section === "webhooks"}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  <span>Config</span>
                </NavItemButton>
{typeof globalThis !== "undefined" && (globalThis as any).document && configSubmenuOpen && createPortal(
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
                    $active={section === "forms"}
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
                    $active={section === "webhooks"}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 3.83l3.88 3.88-3.88 3.88V3.83zm0 12.34v-7.76l3.88 3.88L13 16.17z"/>
                    </svg>
                    Webhooks
                  </ConfigSubmenuItem>
                </ConfigSubmenu>,
                (globalThis as any).document.body
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
          {section !== "forms" && section !== "webhooks" && (
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
          {section === "webhooks" && (
            <FormsWrapper>
              <Card aria-labelledby="webhooks-card-title">
                <CardHeader>
                  <HeaderIcon aria-hidden>🔗</HeaderIcon>
                  <div>
                    <CardTitle id="webhooks-card-title">Webhooks</CardTitle>
                    <Muted>Configure webhooks para receber notificações de outros sistemas e criar tickets automaticamente.</Muted>
                  </div>
                  <HeaderActions>
                    <HelpButton type="button" onClick={() => setWebhookHelpOpen(true)} aria-label="Ajuda sobre webhooks">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                      </svg>
                    </HelpButton>
                    <ActionButton type="button" onClick={() => loadWebhooks()} disabled={webhooksLoading}>
                      Recarregar
                    </ActionButton>
                    <PrimaryButton type="button" onClick={() => setCreateWebhookOpen(true)}>
                      Novo webhook
                    </PrimaryButton>
                  </HeaderActions>
                </CardHeader>
                {error && (
                  <Feedback role="alert" $variant="error">{error}</Feedback>
                )}
                {webhooksFeedback && !manageWebhookOpen && !createWebhookOpen && (
                  <Feedback role={webhooksFeedback.type === "error" ? "alert" : "status"} $variant={webhooksFeedback.type}>
                    {webhooksFeedback.text}
                  </Feedback>
                )}
                <FormsScroll role="region" aria-label="Lista de webhooks">
                  <FormsTable>
                    <thead>
                      <tr>
                        <FormsHeaderCell>Webhook</FormsHeaderCell>
                        <FormsHeaderCell>Status</FormsHeaderCell>
                        <FormsHeaderCell>Criado por</FormsHeaderCell>
                        <FormsHeaderCell>Criado em</FormsHeaderCell>
                        <FormsHeaderCell>URL</FormsHeaderCell>
                        <FormsHeaderCell aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {webhooksLoading && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Carregando webhooks...</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!webhooksLoading && webhooksList.length === 0 && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Nenhum webhook cadastrado ainda.</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!webhooksLoading && webhooksList.map((webhook) => (
                        <tr key={webhook.id}>
                          <FormsCell>
                            <FormTitle>
                              <strong>{webhook.name}</strong>
                              {webhook.description && <small>{webhook.description}</small>}
                            </FormTitle>
                          </FormsCell>
                          <FormsCell>
                            <StatusBadge $tone={webhook.isActive ? "success" : "warning"}>
                              {webhook.isActive ? "Ativo" : "Desativado"}
                            </StatusBadge>
                          </FormsCell>
                          <FormsCell>
                            <FormMeta>{webhook.createdByName || webhook.createdByEmail || "—"}</FormMeta>
                          </FormsCell>
                          <FormsCell>{formatDateTime(webhook.createdAt)}</FormsCell>
                          <FormsCell>
                            <FormLink href={webhook.link} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); copyWebhookLink(webhook.token); }}>
                              {webhook.link.replace(/^https?:\/\//, "").replace(/^[^\/]+/, "")}
                            </FormLink>
                          </FormsCell>
                          <FormsCell>
                            <ActionButton type="button" onClick={() => openManageWebhook(webhook.id)}>
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

      {createWebhookOpen && (
        <>
          <ModalBackdrop $open={createWebhookOpen} onClick={() => setCreateWebhookOpen(false)} aria-hidden={!createWebhookOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-webhook-title"
            $open={createWebhookOpen}
            onKeyDown={(e) => { if (e.key === "Escape") setCreateWebhookOpen(false); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>🔗</ModalIcon>
              <div>
                <ModalTitle id="create-webhook-title">Criar novo webhook</ModalTitle>
                <Muted>Configure um webhook para receber notificações de outros sistemas.</Muted>
              </div>
            </ModalHeader>
            <div>
              <Field>
                <Label htmlFor="new-webhook-name">Nome</Label>
                <Input
                  id="new-webhook-name"
                  type="text"
                  placeholder="Ex.: Webhook Zabbix"
                  value={webhookName}
                  onChange={(event) => {
                    const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                    setWebhookName(value);
                  }}
                />
              </Field>
              <Field>
                <Label htmlFor="new-webhook-desc">Descrição</Label>
                <Input
                  id="new-webhook-desc"
                  type="text"
                  placeholder="Breve descrição do webhook"
                  value={webhookDesc}
                  onChange={(event) => {
                    const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                    setWebhookDesc(value);
                  }}
                />
              </Field>
            </div>
            <ModalActions>
              <CancelButton type="button" onClick={() => setCreateWebhookOpen(false)}>Cancelar</CancelButton>
              <ConfirmButton type="button" onClick={saveWebhook} disabled={savingWebhook} aria-label="Salvar novo webhook">
                {savingWebhook ? "Salvando..." : "Salvar"}
              </ConfirmButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {manageWebhookOpen && activeWebhook && (
        <>
          <ModalBackdrop $open={manageWebhookOpen} onClick={closeManageWebhook} aria-hidden={!manageWebhookOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-webhook-title"
            $open={manageWebhookOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeManageWebhook(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>🔧</ModalIcon>
              <div>
                <ModalTitle id="manage-webhook-title">{activeWebhook.name}</ModalTitle>
                <Muted>Detalhes do webhook e ações rápidas.</Muted>
              </div>
            </ModalHeader>
            {webhooksFeedback && (
              <Feedback role={webhooksFeedback.type === "error" ? "alert" : "status"} $variant={webhooksFeedback.type}>
                {webhooksFeedback.text}
              </Feedback>
            )}
            <InfoGrid>
              <div>
                <InfoLabel>ID</InfoLabel>
                <InfoValue>{activeWebhook.id}</InfoValue>
              </div>
              <div>
                <InfoLabel>Token</InfoLabel>
                <InfoValue style={{ fontFamily: "monospace", fontSize: "0.85rem", wordBreak: "break-all" }}>{activeWebhook.token}</InfoValue>
              </div>
              <div>
                <InfoLabel>Status</InfoLabel>
                <InfoValue>
                  <StatusBadge $tone={activeWebhook.isActive ? "success" : "warning"}>
                    {activeWebhook.isActive ? "Ativo" : "Desativado"}
                  </StatusBadge>
                </InfoValue>
              </div>
              <div>
                <InfoLabel>Criado por</InfoLabel>
                <InfoValue>{activeWebhook.createdByName || activeWebhook.createdByEmail || "—"}</InfoValue>
              </div>
              <div>
                <InfoLabel>Criado em</InfoLabel>
                <InfoValue>{formatDateTime(activeWebhook.createdAt)}</InfoValue>
              </div>
              <div>
                <InfoLabel>URL do webhook</InfoLabel>
                <InfoValue>
                  <FormLink href={activeWebhook.link} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); copyWebhookLink(activeWebhook.token); }}>
                    {activeWebhook.link}
                  </FormLink>
                </InfoValue>
              </div>
            </InfoGrid>
            {testResult && (
              <Feedback role="alert" $variant={testResult.success ? "success" : "error"}>
                {testResult.message}
                {testResult.success && testResult.ticketId && (
                  <div style={{ marginTop: "8px", fontSize: "0.9rem" }}>
                    Ticket criado: <strong>#{testResult.ticketId}</strong>
                  </div>
                )}
              </Feedback>
            )}
            <ModalActions>
              <ActionButton
                type="button"
                onClick={() => testWebhook(activeWebhook.token)}
                disabled={toggleWebhookLoading || testingWebhook || !activeWebhook.isActive}
              >
                {testingWebhook ? "Testando..." : "Testar Webhook"}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => toggleWebhookVisibility(activeWebhook)}
                disabled={toggleWebhookLoading}
              >
                {toggleWebhookLoading ? "Atualizando..." : activeWebhook.isActive ? "Desativar webhook" : "Ativar webhook"}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => startEditWebhook(activeWebhook.id)}
                disabled={toggleWebhookLoading}
              >
                Editar
              </ActionButton>
              <PrimaryButton
                type="button"
                onClick={() => copyWebhookLink(activeWebhook.token)}
                disabled={toggleWebhookLoading}
              >
                Copiar URL
              </PrimaryButton>
              <CancelButton type="button" onClick={closeManageWebhook} disabled={toggleWebhookLoading}>Fechar</CancelButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {editWebhookOpen && (
        <>
          <ModalBackdrop
            $open={editWebhookOpen}
            onClick={() => { if (!editWebhookSaving && !editWebhookLoading) closeEditWebhookModal(); }}
            aria-hidden={!editWebhookOpen}
          />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-webhook-title"
            $open={editWebhookOpen}
            onKeyDown={(e) => { if (e.key === "Escape" && !editWebhookSaving) closeEditWebhookModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>✏️</ModalIcon>
              <div>
                <ModalTitle id="edit-webhook-title">Editar webhook</ModalTitle>
                <Muted>Atualize nome e descrição conforme necessário.</Muted>
              </div>
            </ModalHeader>
            {editWebhookError && (
              <Feedback role="alert" $variant="error">{editWebhookError}</Feedback>
            )}
            {editWebhookLoading ? (
              <Muted>Carregando dados do webhook...</Muted>
            ) : (
              <div>
                <Field>
                  <Label htmlFor="edit-webhook-name-input">Nome</Label>
                  <Input
                    id="edit-webhook-name-input"
                    type="text"
                    value={editWebhookName}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setEditWebhookName(value);
                    }}
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-webhook-desc-input">Descrição</Label>
                  <Input
                    id="edit-webhook-desc-input"
                    type="text"
                    value={editWebhookDesc}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setEditWebhookDesc(value);
                    }}
                  />
                </Field>
              </div>
            )}
            <ModalActions>
              <CancelButton type="button" onClick={closeEditWebhookModal} disabled={editWebhookSaving || editWebhookLoading}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={saveEditedWebhook} disabled={editWebhookSaving || editWebhookLoading}>
                {editWebhookSaving ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {webhookHelpOpen && (
        <>
          <ModalBackdrop $open={webhookHelpOpen} onClick={() => setWebhookHelpOpen(false)} aria-hidden={!webhookHelpOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="webhook-help-title"
            $open={webhookHelpOpen}
            onKeyDown={(e) => { if (e.key === "Escape") setWebhookHelpOpen(false); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>❓</ModalIcon>
              <div>
                <ModalTitle id="webhook-help-title">Como funcionam os Webhooks?</ModalTitle>
                <Muted>Entenda como configurar e usar webhooks para criar tickets automaticamente.</Muted>
              </div>
            </ModalHeader>
            <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "8px" }}>
              <HelpSection>
                <HelpSectionTitle>O que é um Webhook?</HelpSectionTitle>
                <HelpText>
                  Um webhook é uma URL especial que permite que outros sistemas enviem notificações para o seu helpdesk. 
                  Quando um evento ocorre no sistema externo (como Zabbix, por exemplo), ele envia uma requisição HTTP POST 
                  para a URL do webhook, e automaticamente um ticket é criado no sistema.
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Como criar um Webhook?</HelpSectionTitle>
                <HelpText>
                  <ol style={{ marginLeft: "20px", marginTop: "8px" }}>
                    <li>Clique no botão "Novo webhook"</li>
                    <li>Informe um nome descritivo (ex: "Webhook Zabbix")</li>
                    <li>Adicione uma descrição opcional</li>
                    <li>Clique em "Salvar"</li>
                  </ol>
                  Um token único será gerado automaticamente e uma URL será criada.
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Como configurar no sistema externo?</HelpSectionTitle>
                <HelpText>
                  <strong>1. Copie a URL do webhook:</strong> Clique em "Gerenciar" no webhook desejado e depois em "Copiar URL".
                  <br /><br />
                  <strong>2. Configure no seu sistema (exemplo Zabbix):</strong>
                  <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                    <li>Acesse as configurações de Media Types ou Actions</li>
                    <li>Adicione uma nova ação de webhook</li>
                    <li>Cole a URL copiada no campo de URL</li>
                    <li>Configure o método como POST</li>
                    <li>Defina o Content-Type como application/json</li>
                  </ul>
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Formato dos dados enviados</HelpSectionTitle>
                <HelpText>
                  O sistema aceita dados em formato JSON ou form-data. Exemplo de payload JSON:
                  <CodeBlock>
{`{
  "title": "Alerta Zabbix",
  "description": "Servidor com alta utilização de CPU",
  "host": "servidor01",
  "severity": "High",
  "event": "CPU_ALERT"
}`}
                  </CodeBlock>
                  O sistema tentará extrair automaticamente:
                  <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                    <li><strong>Título do ticket:</strong> title, subject, name ou event</li>
                    <li><strong>Descrição:</strong> description, message, body ou content</li>
                    <li><strong>Outros campos:</strong> Todos os campos adicionais serão incluídos na descrição do ticket</li>
                  </ul>
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Ativar/Desativar Webhook</HelpSectionTitle>
                <HelpText>
                  Você pode ativar ou desativar um webhook a qualquer momento através do botão "Gerenciar". 
                  Quando desativado, o webhook não aceitará novas requisições, mas os tickets já criados permanecerão no sistema.
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Segurança</HelpSectionTitle>
                <HelpText>
                  Cada webhook possui um token único e secreto na URL. Mantenha essa URL em segurança e não compartilhe publicamente. 
                  Se o token for comprometido, você pode desativar o webhook e criar um novo.
                </HelpText>
              </HelpSection>

              <HelpSection>
                <HelpSectionTitle>Como testar o Webhook?</HelpSectionTitle>
                <HelpText>
                  <strong>Opção 1 - Teste pela interface:</strong>
                  <ol style={{ marginLeft: "20px", marginTop: "8px" }}>
                    <li>Clique em "Gerenciar" no webhook desejado</li>
                    <li>Clique no botão "Testar Webhook"</li>
                    <li>Um ticket de teste será criado automaticamente</li>
                    <li>Verifique o ID do ticket criado na mensagem de sucesso</li>
                  </ol>
                  <br />
                  <strong>Opção 2 - Teste via cURL (Terminal):</strong>
                  <CodeBlock>
{`curl -X POST http://localhost:3000/api/webhooks/receive/SEU_TOKEN_AQUI \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Teste de Webhook",
    "description": "Este é um teste via cURL",
    "host": "servidor-teste",
    "severity": "Medium"
  }'`}
                  </CodeBlock>
                  <br />
                  <strong>Opção 3 - Teste via Postman ou Insomnia:</strong>
                  <ul style={{ marginLeft: "20px", marginTop: "8px" }}>
                    <li>Método: <strong>POST</strong></li>
                    <li>URL: Cole a URL completa do webhook</li>
                    <li>Headers: <code>Content-Type: application/json</code></li>
                    <li>Body: Selecione "raw" e "JSON", depois cole o exemplo abaixo</li>
                  </ul>
                  <CodeBlock>
{`{
  "title": "Alerta do Sistema",
  "description": "Descrição do problema",
  "host": "servidor01",
  "severity": "High"
}`}
                  </CodeBlock>
                  <br />
                  <strong>Opção 4 - Teste via JavaScript (Node.js):</strong>
                  <CodeBlock>
{`const fetch = require('node-fetch');

const webhookUrl = 'http://localhost:3000/api/webhooks/receive/SEU_TOKEN_AQUI';

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Teste via Node.js',
    description: 'Este é um teste automatizado',
    source: 'script-teste'
  })
})
.then(res => res.json())
.then(data => console.log('Sucesso:', data))
.catch(err => console.error('Erro:', err));`}
                  </CodeBlock>
                </HelpText>
              </HelpSection>
            </div>
            <ModalActions>
              <PrimaryButton type="button" onClick={() => setWebhookHelpOpen(false)}>
                Entendi
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}
      
      </Page>
  );
}

const SECTIONS: SectionKey[] = ["general", "appearance", "notifications", "security", "integrations", "forms", "webhooks"];

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

const NavItemButton = styled.button<{ $active?: boolean }>`
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
  ${(p) => p.$active && "background: #eef2f7; font-weight: 600;"}
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

const ConfigSubmenuItem = styled.a<{ $active?: boolean }>`
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

const HelpButton = styled.button`
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-700);
  transition: background .15s ease, transform .05s ease;
  &:hover { 
    background: #f8fafc; 
    color: var(--primary-800);
  }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const HelpSection = styled.div`
  margin-bottom: 24px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const HelpSectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--primary-800);
`;

const HelpText = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: #374151;
  
  ol, ul {
    margin: 8px 0;
    padding-left: 20px;
  }
  
  li {
    margin-bottom: 4px;
  }
  
  strong {
    color: #1f2937;
    font-weight: 600;
  }
`;

const CodeBlock = styled.pre`
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #1f2937;
  white-space: pre-wrap;
  word-wrap: break-word;
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
