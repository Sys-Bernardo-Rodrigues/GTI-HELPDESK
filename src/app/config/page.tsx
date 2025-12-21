"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import StandardLayout from "@/components/StandardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Toast, useToast } from "@/components/Toast";
import LoadingOverlay from "@/components/LoadingOverlay";
import PageBuilder, { PageBlock } from "@/components/PageBuilder";


type SectionKey = "general" | "appearance" | "notifications" | "security" | "integrations" | "forms" | "webhooks" | "update" | "env" | "backup" | "pages";

export default function ConfigPage() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const initialSection = (params?.get("section") as SectionKey) || "forms";
  const [section, setSection] = useState<SectionKey>(initialSection);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  // Estado do builder de formulários
  type BuilderField = { tempId: string; label: string; type: "TEXT"|"TEXTAREA"|"SELECT"|"RADIO"|"CHECKBOX"|"FILE"; options?: string; required: boolean };
  const [formsList, setFormsList] = useState<Array<{ id: number; numericId?: number; title: string; slug: string; link: string; createdAt?: string; isPublic?: boolean; requiresApproval?: boolean; approvers?: Array<{ id: number; name: string; email: string }>; createdByName?: string | null; createdByEmail?: string | null }>>([]);
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formRequiresApproval, setFormRequiresApproval] = useState<boolean>(false);
  const [formApproverIds, setFormApproverIds] = useState<number[]>([]);
  const [builderFields, setBuilderFields] = useState<BuilderField[]>([]);
  const [usersList, setUsersList] = useState<Array<{ id: number; name: string; email: string }>>([]);
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
  const [editRequiresApproval, setEditRequiresApproval] = useState<boolean>(false);
  const [editApproverIds, setEditApproverIds] = useState<number[]>([]);
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
  
  // Estado do gerenciamento de páginas públicas
  const [pagesList, setPagesList] = useState<Array<{ id: number; title: string; slug: string; description?: string | null; isPublished: boolean; link: string; createdAt?: string; updatedAt?: string; createdByName?: string | null; createdByEmail?: string | null }>>([]);
  const [pageTitle, setPageTitle] = useState<string>("");
  const [pageDescription, setPageDescription] = useState<string>("");
  const [pageBlocks, setPageBlocks] = useState<PageBlock[]>([]);
  const [pageIsPublished, setPageIsPublished] = useState<boolean>(false);
  const [savingPage, setSavingPage] = useState<boolean>(false);
  const [createPageOpen, setCreatePageOpen] = useState<boolean>(false);
  const [pagesFeedback, setPagesFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [managePageOpen, setManagePageOpen] = useState<boolean>(false);
  const [managePageId, setManagePageId] = useState<number | null>(null);
  const [pagesLoading, setPagesLoading] = useState<boolean>(false);
  const [editPageOpen, setEditPageOpen] = useState<boolean>(false);
  const [editPageId, setEditPageId] = useState<number | null>(null);
  const [editPageTitle, setEditPageTitle] = useState<string>("");
  const [editPageDescription, setEditPageDescription] = useState<string>("");
  const [editPageBlocks, setEditPageBlocks] = useState<PageBlock[]>([]);
  const [editPageIsPublished, setEditPageIsPublished] = useState<boolean>(false);
  const [editPageLoading, setEditPageLoading] = useState<boolean>(false);
  const [editPageSaving, setEditPageSaving] = useState<boolean>(false);
  const [editPageError, setEditPageError] = useState<string>("");

  // Estado de configuração de ambiente (.env) - Nova implementação
  // IMPORTANTE: Declarar antes dos useEffects que o utilizam
  const [envConfig, setEnvConfig] = useState<Record<string, string>>({});
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSuccess, setEnvSuccess] = useState<string | null>(null);
  const [envSearchQuery, setEnvSearchQuery] = useState("");
  const [envCollapsedCategories, setEnvCollapsedCategories] = useState<Set<string>>(new Set());
  const [envVisiblePasswords, setEnvVisiblePasswords] = useState<Set<string>>(new Set());
  const [envValidationErrors, setEnvValidationErrors] = useState<Record<string, string>>({});

  // Estado da atualização via GitHub
  const [updateRepoUrl, setUpdateRepoUrl] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estado da versão do sistema
  const [systemVersion, setSystemVersion] = useState<{
    name?: string;
    version?: string;
    git?: {
      branch?: string;
      commit?: string;
      commitShort?: string;
      commitDate?: string;
      tag?: string;
    };
  } | null>(null);
  const [versionLoading, setVersionLoading] = useState<boolean>(false);

  // Estado de backup
  const [backupsList, setBackupsList] = useState<Array<{
    filename: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    modifiedAt: string;
  }>>([]);
  const [backupsLoading, setBackupsLoading] = useState<boolean>(false);
  const [backupCreating, setBackupCreating] = useState<boolean>(false);
  const [backupUploading, setBackupUploading] = useState<boolean>(false);
  const [backupRestoring, setBackupRestoring] = useState<boolean>(false);
  const [backupSendingEmail, setBackupSendingEmail] = useState<boolean>(false);
  const [backupFeedback, setBackupFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backupConfig, setBackupConfig] = useState<{
    enabled: boolean;
    schedule: "daily" | "weekly" | "monthly" | null;
    scheduleTime?: string;
    scheduleDay?: number;
    emailRecipients: string[];
    keepDays: number;
  }>({
    enabled: false,
    schedule: null,
    emailRecipients: [],
    keepDays: 30,
  });
  const [backupConfigSaving, setBackupConfigSaving] = useState<boolean>(false);

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

  useEffect(() => {
    if (!updateFeedback) return;
    const timer = setTimeout(() => setUpdateFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [updateFeedback]);

  // Carregar configurações de ambiente quando a seção for acessada
  useEffect(() => {
    if (section === "env" || section === "update") {
      loadEnvConfig();
    }
  }, [section]);

  // Inicializar todas as categorias como recolhidas quando a seção env for acessada
  useEffect(() => {
    if (section === "env") {
      const allCategories = [
        "E-mail (SMTP)",
        "Inteligência Artificial",
        "Banco de Dados",
        "URLs e Ambiente",
        "Segurança e Usuários",
        "Docker",
        "Operações Avançadas",
        "Redis",
        "Criptografia",
      ];
      setEnvCollapsedCategories(new Set(allCategories));
    }
  }, [section]);

  // Carregar versão do sistema quando a seção de update for acessada
  useEffect(() => {
    if (section === "update") {
      loadSystemVersion();
    }
  }, [section]);
  
  // Carrega ALLOWED_REPO_URL do .env quando a seção de atualização é acessada
  useEffect(() => {
    if (section === "update" && envConfig.ALLOWED_REPO_URL) {
      setUpdateRepoUrl(envConfig.ALLOWED_REPO_URL);
    }
  }, [section, envConfig.ALLOWED_REPO_URL]);

  async function loadEnvConfig() {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const res = await fetch("/api/system/env");
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const data = await res.json();
      setEnvConfig(data || {});
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao carregar configurações");
    } finally {
      setEnvLoading(false);
    }
  }

  async function saveEnvConfig() {
    if (process.env.ALLOW_ENV_EDIT !== "true") {
      setEnvError("Edição de .env desabilitada (ALLOW_ENV_EDIT != true)");
      return;
    }

    setEnvSaving(true);
    setEnvError(null);
    setEnvSuccess(null);
    try {
      const res = await fetch("/api/system/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar");
      const message = data?.message || "Configurações salvas. Reinicie o servidor para aplicar.";
      setEnvSuccess(message);
      toast.showSuccess(message);
      setTimeout(() => setEnvSuccess(null), 5000);
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao salvar configurações");
    } finally {
      setEnvSaving(false);
    }
  }

  async function loadSystemVersion() {
    setVersionLoading(true);
    try {
      const res = await fetch("/api/system/version");
      if (res.ok) {
        const data = await res.json();
        setSystemVersion(data);
      }
    } catch (err: any) {
      console.warn("Erro ao carregar versão do sistema:", err);
    } finally {
      setVersionLoading(false);
    }
  }


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


  // Utilitário para carregar lista de usuários
  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = (await res.json()) as Record<string, any>;
        const items = (json.items || []).map((u: any) => ({
          id: Number(u.id),
          name: String(u.name || u.email || "Usuário"),
          email: String(u.email || ""),
        }));
        setUsersList(items);
      }
    } catch (err: any) {
      console.error("Erro ao carregar usuários:", err);
    }
  }

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
          requiresApproval: Boolean(i.requiresApproval ?? false),
          approvers: Array.isArray(i.approvers) ? i.approvers : [],
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

  // Utilitário para carregar lista de páginas públicas
  async function loadPages() {
    setPagesLoading(true);
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const json = (await res.json()) as Record<string, any>;
        const items = (json.items || []).map((i: any) => ({
          id: i.id,
          title: i.title,
          slug: i.slug,
          description: i.description ?? null,
          isPublished: Boolean(i.isPublished),
          link: i.link,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          createdByName: i.createdByName ?? null,
          createdByEmail: i.createdByEmail ?? null,
        }));
        setPagesList(items);
        setPagesFeedback(null);
        setError("");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar páginas");
    } finally {
      setPagesLoading(false);
  }
  }

  // Carregar ao entrar na seção
  useEffect(() => {
    if (section === "forms") {
      loadUsers();
      loadForms();
    } else if (section === "pages") {
      loadPages();
    } else if (section === "webhooks") {
      loadWebhooks();
    } else if (section === "backup") {
      loadBackups();
      loadBackupConfig();
    } else if (section === "env") {
      (async () => {
        setEnvLoading(true);
        setEnvFeedback(null);
        try {
          const res = await fetch("/api/system/env");
          const data = (await res.json().catch(() => null)) as any;
          if (res.ok && data && typeof data === "object") {
            setEnvSettings(data);
          } else if (!res.ok) {
            throw new Error(data?.error || "Erro ao carregar configurações de ambiente.");
          }
        } catch (err: any) {
          setEnvFeedback({ type: "error", text: err?.message || "Erro ao carregar configurações de ambiente." });
        } finally {
          setEnvLoading(false);
        }
      })();
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
        requiresApproval: formRequiresApproval,
        approverIds: formRequiresApproval ? formApproverIds : [],
        fields: builderFields.map((f) => ({ label: f.label, type: f.type, options: f.options, required: f.required })),
      };
      const res = await fetch("/api/forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Falha ao salvar formulário");
      await loadForms();
      setFormTitle(""); setFormDesc(""); setFormRequiresApproval(false); setFormApproverIds([]); setBuilderFields([]);
      setCreateOpen(false);
      const message = "Formulário criado com sucesso!";
      setFormsFeedback({ type: "success", text: message });
      toast.showSuccess(message);
    } catch (e: any) {
      const errorMsg = e?.message || "Erro ao salvar";
      setError(errorMsg);
      toast.showError(errorMsg);
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
    // Garantir que a lista de usuários está carregada
    loadUsers();
  }

  function closeManageForm() {
    setManageOpen(false);
    setManageFormId(null);
    setFormsFeedback(null);
  }

  async function toggleFormVisibility(form: { id: number; isPublic?: boolean }) {
    setToggleVisibilityLoading(true);
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
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

  async function toggleRequiresApproval(form: { id: number; requiresApproval?: boolean }) {
    setToggleVisibilityLoading(true);
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiresApproval: !Boolean(form.requiresApproval) }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, any> | null;
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar aprovação");
      const approvers = Array.isArray(json?.approvers) ? json.approvers.map((a: any) => ({
        id: a.user?.id ?? a.id,
        name: a.user?.name ?? a.name,
        email: a.user?.email ?? a.email,
      })) : [];
      setFormsList((prev) =>
        prev.map((f) =>
          f.id === form.id ? { ...f, requiresApproval: json?.requiresApproval ?? !Boolean(form.requiresApproval), approvers: approvers } : f
        )
      );
      setFormsFeedback({ type: "success", text: "Formulário atualizado com sucesso." });
    } catch (err: any) {
      setFormsFeedback({ type: "error", text: err?.message || "Erro ao atualizar formulário" });
    } finally {
      setToggleVisibilityLoading(false);
    }
  }

  async function updateApprovers(form: { id: number }, approverIds: number[]) {
    setToggleVisibilityLoading(true);
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverIds }),
      });
      const json = (await res.json().catch(() => null)) as Record<string, any> | null;
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar aprovadores");
      const approvers = Array.isArray(json?.approvers) ? json.approvers.map((a: any) => ({
        id: a.user?.id ?? a.id,
        name: a.user?.name ?? a.name,
        email: a.user?.email ?? a.email,
      })) : [];
      setFormsList((prev) =>
        prev.map((f) =>
          f.id === form.id ? { 
            ...f, 
            approvers: approvers,
          } : f
        )
      );
      setFormsFeedback({ type: "success", text: "Aprovadores atualizados com sucesso." });
    } catch (err: any) {
      setFormsFeedback({ type: "error", text: err?.message || "Erro ao atualizar aprovadores" });
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
      setEditRequiresApproval(Boolean(data?.requiresApproval ?? false));
      const approvers = Array.isArray(data?.approvers) ? data.approvers : [];
      setEditApproverIds(approvers.map((a: any) => Number(a.user?.id ?? a.id)).filter((id: number) => !isNaN(id)));
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
        requiresApproval: editRequiresApproval,
        approverIds: editRequiresApproval ? editApproverIds : [],
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

  // Funções para gerenciar páginas públicas
  async function savePage() {
    if (!pageTitle.trim()) {
      setError("Informe um título para a página");
      return;
    }
    if (pageBlocks.length === 0) {
      setError("Adicione pelo menos um bloco à página");
      return;
    }
    setSavingPage(true);
    try {
      const payload = {
        title: pageTitle.trim(),
        description: pageDescription.trim() || null,
        content: "", // Mantido para compatibilidade
        blocks: JSON.stringify(pageBlocks),
        isPublished: pageIsPublished,
      };
      const res = await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao salvar página");
      }
      await loadPages();
      setPageTitle(""); setPageDescription(""); setPageBlocks([]); setPageIsPublished(false);
      setCreatePageOpen(false);
      const message = "Página criada com sucesso!";
      setPagesFeedback({ type: "success", text: message });
      toast.showSuccess(message);
    } catch (e: any) {
      const errorMsg = e?.message || "Erro ao salvar";
      setError(errorMsg);
      toast.showError(errorMsg);
    } finally {
      setSavingPage(false);
    }
  }

  async function deletePage(pageId: number) {
    if (!confirm("Tem certeza que deseja deletar esta página?")) return;
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao deletar página");
      }
      await loadPages();
      setManagePageOpen(false);
      setManagePageId(null);
      const message = "Página deletada com sucesso!";
      setPagesFeedback({ type: "success", text: message });
      toast.showSuccess(message);
    } catch (e: any) {
      const errorMsg = e?.message || "Erro ao deletar";
      setError(errorMsg);
      toast.showError(errorMsg);
    }
  }

  async function togglePageVisibility(pageId: number, currentStatus: boolean) {
    try {
      // Carregar a página completa primeiro
      const res = await fetch(`/api/pages/${pageId}?t=${Date.now()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao carregar página");
      }
      const page = (await res.json()) as Record<string, any>;
      
      // Atualizar apenas o status
      const updateRes = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: page.title,
          description: page.description || "",
          content: page.content || "",
          blocks: page.blocks || null,
          isPublished: !currentStatus 
        }),
      });
      if (!updateRes.ok) {
        const json = (await updateRes.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao atualizar status");
      }
      await loadPages();
      setPagesFeedback({ type: "success", text: "Status da página atualizado com sucesso." });
    } catch (e: any) {
      const errorMsg = e?.message || "Erro ao atualizar";
      setError(errorMsg);
      toast.showError(errorMsg);
    }
  }

  async function openEditPage(pageId: number) {
    setEditPageId(pageId);
    setEditPageOpen(true);
    setEditPageLoading(true);
    setEditPageError("");
    setPagesFeedback(null);
    try {
      const res = await fetch(`/api/pages/${pageId}?t=${Date.now()}`);
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao carregar página");
      }
      const data = (await res.json()) as Record<string, any>;
      setEditPageTitle(data?.title ?? "");
      setEditPageDescription(data?.description ?? "");
      try {
        const blocks = data?.blocks ? (typeof data.blocks === "string" ? JSON.parse(data.blocks) : data.blocks) : [];
        setEditPageBlocks(Array.isArray(blocks) ? blocks : []);
      } catch {
        setEditPageBlocks([]);
      }
      setEditPageIsPublished(Boolean(data?.isPublished ?? false));
    } catch (e: any) {
      setEditPageError(e?.message || "Erro ao carregar página");
    } finally {
      setEditPageLoading(false);
    }
  }

  async function saveEditPage() {
    if (!editPageTitle.trim()) {
      setEditPageError("Informe um título para a página");
      return;
    }
    if (editPageBlocks.length === 0) {
      setEditPageError("Adicione pelo menos um bloco à página");
      return;
    }
    if (!editPageId) return;
    setEditPageSaving(true);
    try {
      const payload = {
        title: editPageTitle.trim(),
        description: editPageDescription.trim() || null,
        content: "", // Mantido para compatibilidade
        blocks: JSON.stringify(editPageBlocks),
        isPublished: editPageIsPublished,
      };
      const res = await fetch(`/api/pages/${editPageId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as Record<string, any> | null;
        throw new Error(json?.error || "Falha ao atualizar página");
      }
      await loadPages();
      setEditPageOpen(false);
      setEditPageId(null);
      setManagePageOpen(false);
      setManagePageId(null);
      const message = "Página atualizada com sucesso!";
      setPagesFeedback({ type: "success", text: message });
      toast.showSuccess(message);
    } catch (e: any) {
      setEditPageError(e?.message || "Erro ao atualizar");
    } finally {
      setEditPageSaving(false);
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
      const errorMsg = e?.message || "Erro ao salvar";
      setError(errorMsg);
      toast.showError(errorMsg);
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

  


  function formatDateTime(value?: string): string {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

  // ========== Funções de Backup ==========
  
  async function loadBackups() {
    setBackupsLoading(true);
    try {
      const res = await fetch("/api/system/backup/list");
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data.backups || []);
      }
    } catch (err: any) {
      console.error("Erro ao carregar backups:", err);
    } finally {
      setBackupsLoading(false);
    }
  }

  async function loadBackupConfig() {
    try {
      const res = await fetch("/api/system/backup/config");
      if (res.ok) {
        const data = await res.json();
        setBackupConfig(data.config || {
          enabled: false,
          schedule: null,
          emailRecipients: [],
          keepDays: 30,
        });
      }
    } catch (err: any) {
      console.error("Erro ao carregar configuração de backup:", err);
    }
  }

  async function createBackup() {
    setBackupCreating(true);
    setBackupFeedback(null);
    try {
      const res = await fetch("/api/system/backup/create", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const message = `Backup criado com sucesso: ${data.filename} (${data.sizeFormatted})`;
        setBackupFeedback({
          type: "success",
          text: message,
        });
        toast.showSuccess(message);
        await loadBackups();
      } else {
        const errorMsg = data.error || "Erro ao criar backup";
        setBackupFeedback({
          type: "error",
          text: errorMsg,
        });
        toast.showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao criar backup";
      setBackupFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setBackupCreating(false);
    }
  }

  async function uploadBackup(file: File) {
    setBackupUploading(true);
    setBackupFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/system/backup/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const message = `Backup enviado com sucesso: ${data.filename} (${data.sizeFormatted})`;
        setBackupFeedback({
          type: "success",
          text: message,
        });
        toast.showSuccess(message);
        await loadBackups();
      } else {
        const errorMsg = data.error || "Erro ao fazer upload do backup";
        setBackupFeedback({
          type: "error",
          text: errorMsg,
        });
        toast.showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao fazer upload do backup";
      setBackupFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setBackupUploading(false);
    }
  }

  async function downloadBackup(filename: string) {
    try {
      const res = await fetch(`/api/system/backup/download/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await res.json();
        setBackupFeedback({
          type: "error",
          text: data.error || "Erro ao baixar backup",
        });
      }
    } catch (err: any) {
      setBackupFeedback({
        type: "error",
        text: err?.message || "Erro ao baixar backup",
      });
    }
  }

  async function restoreBackup(filename: string) {
    if (!confirm(`Tem certeza que deseja restaurar o backup "${filename}"? Esta ação irá substituir todos os dados atuais do banco de dados.`)) {
      return;
    }

    setBackupRestoring(true);
    setBackupFeedback(null);
    try {
      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (res.ok) {
        const message = data.message || "Backup restaurado com sucesso";
        setBackupFeedback({
          type: "success",
          text: message,
        });
        toast.showSuccess(message);
      } else {
        const errorMsg = data.error || "Erro ao restaurar backup";
        setBackupFeedback({
          type: "error",
          text: errorMsg,
        });
        toast.showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao restaurar backup";
      setBackupFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setBackupRestoring(false);
    }
  }

  async function sendBackupByEmail(filename: string, recipients: string[]) {
    setBackupSendingEmail(true);
    setBackupFeedback(null);
    try {
      const res = await fetch("/api/system/backup/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, recipients }),
      });
      const data = await res.json();
      if (res.ok) {
        const message = data.message || "Backup enviado por email com sucesso";
        setBackupFeedback({
          type: "success",
          text: message,
        });
        toast.showSuccess(message);
      } else {
        const errorMsg = data.error || "Erro ao enviar backup por email";
        setBackupFeedback({
          type: "error",
          text: errorMsg,
        });
        toast.showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao enviar backup por email";
      setBackupFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setBackupSendingEmail(false);
    }
  }

  async function saveBackupConfig() {
    setBackupConfigSaving(true);
    setBackupFeedback(null);
    try {
      const res = await fetch("/api/system/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupConfig),
      });
      const data = await res.json();
      if (res.ok) {
        const message = data.message || "Configuração de backup salva com sucesso";
        setBackupFeedback({
          type: "success",
          text: message,
        });
        toast.showSuccess(message);
      } else {
        const errorMsg = data.error || "Erro ao salvar configuração";
        setBackupFeedback({
          type: "error",
          text: errorMsg,
        });
        toast.showError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao salvar configuração";
      setBackupFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setBackupConfigSaving(false);
    }
  }

  useEffect(() => {
    if (!backupFeedback) return;
    const timer = setTimeout(() => setBackupFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [backupFeedback]);

  async function handleSystemUpdate() {
    setUpdateLoading(true);
    setUpdateFeedback(null);
    try {
      // Envia repoUrl apenas se fornecido, caso contrário usa o do .env
      const body: any = {};
      if (updateRepoUrl.trim()) {
        body.repoUrl = updateRepoUrl.trim();
      }
      
      const res = await fetch("/api/system/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        throw new Error(data?.error || data?.detail || "Falha ao iniciar atualização.");
      }
      setUpdateFeedback({
        type: "success",
        text: data?.message || "Atualização concluída com sucesso.",
      });
      // Mostra stdout se disponível
      if (data?.stdout) {
        console.log("[system/update] Output:", data.stdout);
      }
      if (data?.stderr) {
        console.warn("[system/update] Warnings:", data.stderr);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Erro ao iniciar atualização.";
      setUpdateFeedback({
        type: "error",
        text: errorMsg,
      });
      toast.showError(errorMsg);
    } finally {
      setUpdateLoading(false);
    }
  }

  async function loadEnvConfig() {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const res = await fetch("/api/system/env");
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const data = await res.json();
      setEnvConfig(data || {});
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao carregar configurações");
    } finally {
      setEnvLoading(false);
    }
  }

  async function saveEnvConfig() {
    if (process.env.ALLOW_ENV_EDIT !== "true") {
      setEnvError("Edição de .env desabilitada (ALLOW_ENV_EDIT != true)");
      return;
    }

    setEnvSaving(true);
    setEnvError(null);
    setEnvSuccess(null);
    try {
      const res = await fetch("/api/system/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao salvar");
      const message = data?.message || "Configurações salvas. Reinicie o servidor para aplicar.";
      setEnvSuccess(message);
      toast.showSuccess(message);
      setTimeout(() => setEnvSuccess(null), 5000);
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao salvar configurações");
    } finally {
      setEnvSaving(false);
    }
  }

  async function loadSystemVersion() {
    setVersionLoading(true);
    try {
      const res = await fetch("/api/system/version");
      if (res.ok) {
        const data = await res.json();
        setSystemVersion(data);
      }
    } catch (err: any) {
      console.warn("Erro ao carregar versão do sistema:", err);
    } finally {
      setVersionLoading(false);
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
              <Input id="site-name" type="text" placeholder="RootDesk" />
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
      case "update":
        return (
          <div>
            <SectionHeaderRow>
              <SectionTitle>Atualizar sistema</SectionTitle>
              <Pill $tone="info">DevOps</Pill>
            </SectionHeaderRow>
            <SectionSubtitle>
              Dispare uma atualização do código diretamente do servidor, usando o repositório GitHub configurado.
            </SectionSubtitle>

            {/* Informações da versão atual */}
            <VersionCard>
              <VersionHeader>
                <VersionTitle>Versão atual do sistema</VersionTitle>
                {versionLoading && <VersionLoading>Carregando...</VersionLoading>}
              </VersionHeader>
              {systemVersion && (
                <VersionInfo>
                  <VersionRow>
                    <VersionLabel>Nome:</VersionLabel>
                    <VersionValue>{systemVersion.name || "RootDesk"}</VersionValue>
                  </VersionRow>
                  <VersionRow>
                    <VersionLabel>Versão:</VersionLabel>
                    <VersionBadge>{systemVersion.version || "Desconhecida"}</VersionBadge>
                  </VersionRow>
                  {systemVersion.git?.tag && (
                    <VersionRow>
                      <VersionLabel>Tag:</VersionLabel>
                      <VersionBadge $variant="tag">{systemVersion.git.tag}</VersionBadge>
                    </VersionRow>
                  )}
                  {systemVersion.git?.branch && (
                    <VersionRow>
                      <VersionLabel>Branch:</VersionLabel>
                      <VersionValue>{systemVersion.git.branch}</VersionValue>
                    </VersionRow>
                  )}
                  {systemVersion.git?.commitShort && (
                    <VersionRow>
                      <VersionLabel>Commit:</VersionLabel>
                      <VersionCode>{systemVersion.git.commitShort}</VersionCode>
                      {systemVersion.git.commitDate && (
                        <VersionDate>
                          ({new Date(systemVersion.git.commitDate).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })})
                        </VersionDate>
                      )}
                    </VersionRow>
                  )}
                </VersionInfo>
              )}
            </VersionCard>

            {updateFeedback && (
              <Feedback
                role={updateFeedback.type === "error" ? "alert" : "status"}
                $variant={updateFeedback.type}
              >
                {updateFeedback.text}
              </Feedback>
            )}

            <TwoColumnGrid>
              <div>
                <Field>
                  <Label htmlFor="repo-url">
                    URL do repositório GitHub
                    {envConfig.ALLOWED_REPO_URL && (
                      <span style={{ marginLeft: "8px", fontSize: "0.875rem", fontWeight: "normal", color: "#10b981" }}>
                        (já configurado no .env)
                      </span>
                    )}
                  </Label>
                  <Input
                    id="repo-url"
                    type="url"
                    placeholder={envConfig.ALLOWED_REPO_URL || "https://github.com/seu-usuario/rootdesk.git"}
                    value={updateRepoUrl}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setUpdateRepoUrl(value);
                    }}
                  />
                  <SmallMuted>
                    {envConfig.ALLOWED_REPO_URL 
                      ? "Opcional: Se não preencher, será usado o valor de ALLOWED_REPO_URL do .env. Para usar outro repositório, informe a URL aqui."
                      : "Configure ALLOWED_REPO_URL no .env ou informe a URL completa de clonagem HTTPS do projeto autorizado para este servidor."
                    }
                  </SmallMuted>
                </Field>
                <Actions>
                  <PrimaryButton
                    type="button"
                    onClick={handleSystemUpdate}
                    disabled={updateLoading}
                    aria-label="Atualizar sistema a partir do repositório GitHub"
                    style={{ position: "relative" }}
                  >
                    {updateLoading && (
                      <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                        <LoadingSpinner size="small" color="#fff" />
                      </span>
                    )}
                    {updateLoading ? "Atualizando..." : "Atualizar do repositório"}
                  </PrimaryButton>
                </Actions>
              </div>

              <InfoPanel>
                <InfoTitle>Antes de atualizar</InfoTitle>
                <HelpList>
                  <li>
                    Verifique se a variável <InlineCode>ALLOW_GIT_UPDATE</InlineCode> está definida como{" "}
                    <InlineCode>true</InlineCode>.
                  </li>
                  <li>
                    (Opcional) Restrinja o repositório permitido com{" "}
                    <InlineCode>ALLOWED_REPO_URL</InlineCode>.
                  </li>
                  <li>
                    Certifique-se de que não há deploy em andamento ou alterações locais não commitadas.
                  </li>
                  <li>
                    Após a atualização, reinicie o processo do Node/PM2 se o seu fluxo de deploy exigir.
                  </li>
                </HelpList>
              </InfoPanel>
            </TwoColumnGrid>
          </div>
        );
      case "env":
        // Metadados completos para cada variável de ambiente
        const envVariablesMetadata: Record<string, {
          label: string;
          description: string;
          type: "string" | "boolean" | "number" | "password" | "url" | "email";
          required: boolean;
          sensitive: boolean;
          category: string;
          placeholder?: string;
          validation?: (value: string) => string | null;
          examples?: string[];
        }> = {
          // E-mail (SMTP)
          EMAIL_ENABLED: {
            label: "Habilitar E-mail",
            description: "Ativa ou desativa o envio de emails pelo sistema",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
          },
          SMTP_HOST: {
            label: "Servidor SMTP",
            description: "Endereço do servidor SMTP (ex: smtp.gmail.com, smtp-mail.outlook.com)",
            type: "string",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
            placeholder: "smtp.gmail.com",
            examples: ["smtp.gmail.com", "smtp-mail.outlook.com", "smtp.sendgrid.net"],
          },
          SMTP_PORT: {
            label: "Porta SMTP",
            description: "Porta do servidor SMTP (587 para TLS, 465 para SSL)",
            type: "number",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
            placeholder: "587",
            validation: (v) => {
              const num = parseInt(v);
              if (v && (isNaN(num) || num < 1 || num > 65535)) return "Porta inválida (1-65535)";
              return null;
            },
          },
          SMTP_SECURE: {
            label: "Conexão Segura",
            description: "Usar SSL/TLS (true para porta 465, false para porta 587)",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
          },
          SMTP_USER: {
            label: "Usuário SMTP",
            description: "Email ou usuário para autenticação SMTP",
            type: "email",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
            placeholder: "seu-email@gmail.com",
          },
          SMTP_PASSWORD: {
            label: "Senha SMTP",
            description: "Senha ou App Password para autenticação SMTP",
            type: "password",
            required: false,
            sensitive: true,
            category: "E-mail (SMTP)",
          },
          EMAIL_FROM: {
            label: "Email Remetente",
            description: "Endereço de email que aparecerá como remetente",
            type: "email",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
            placeholder: "noreply@rootdesk.com",
          },
          EMAIL_FROM_NAME: {
            label: "Nome do Remetente",
            description: "Nome que aparecerá junto com o email remetente",
            type: "string",
            required: false,
            sensitive: false,
            category: "E-mail (SMTP)",
            placeholder: "RootDesk",
          },
          // Inteligência Artificial
          LOCAL_AI_ENABLED: {
            label: "Habilitar IA Local",
            description: "Ativa o assistente virtual Dobby usando Ollama",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Inteligência Artificial",
          },
          LOCAL_AI_URL: {
            label: "URL do Ollama",
            description: "URL do servidor Ollama (geralmente http://localhost:11434)",
            type: "url",
            required: false,
            sensitive: false,
            category: "Inteligência Artificial",
            placeholder: "http://localhost:11434",
          },
          LOCAL_AI_MODEL: {
            label: "Modelo de IA",
            description: "Nome do modelo Ollama a ser usado (ex: llama3:8b, mistral:7b)",
            type: "string",
            required: false,
            sensitive: false,
            category: "Inteligência Artificial",
            placeholder: "llama3:8b",
            examples: ["llama3:8b", "mistral:7b", "codellama:7b", "phi3:mini"],
          },
          LOCAL_AI_TIMEOUT_MS: {
            label: "Timeout (ms)",
            description: "Tempo máximo em milissegundos para aguardar resposta do modelo",
            type: "number",
            required: false,
            sensitive: false,
            category: "Inteligência Artificial",
            placeholder: "15000",
          },
          LOCAL_AI_PORT: {
            label: "Porta do Ollama",
            description: "Porta do servidor Ollama (usado pelo docker-compose)",
            type: "number",
            required: false,
            sensitive: false,
            category: "Inteligência Artificial",
            placeholder: "11434",
          },
          // Banco de Dados
          DATABASE_URL: {
            label: "URL do Banco de Dados",
            description: "URL completa de conexão PostgreSQL (formato: postgresql://user:pass@host:port/db?schema=public)",
            type: "url",
            required: true,
            sensitive: true,
            category: "Banco de Dados",
            placeholder: "postgresql://user:password@localhost:5432/helpdesk?schema=public",
            validation: (v) => {
              if (!v) return "URL do banco é obrigatória";
              if (!v.includes("postgresql://")) return "URL deve começar com postgresql://";
              return null;
            },
          },
          SHADOW_DATABASE_URL: {
            label: "URL do Shadow Database",
            description: "URL do banco de dados shadow para migrações do Prisma",
            type: "url",
            required: false,
            sensitive: true,
            category: "Banco de Dados",
            placeholder: "postgresql://user:password@localhost:5432/shadow_db?schema=public",
          },
          DB_HOST: {
            label: "Host do Banco",
            description: "Endereço do servidor PostgreSQL",
            type: "string",
            required: false,
            sensitive: false,
            category: "Banco de Dados",
            placeholder: "localhost",
          },
          DB_PORT: {
            label: "Porta do Banco",
            description: "Porta do PostgreSQL (padrão: 5432)",
            type: "number",
            required: false,
            sensitive: false,
            category: "Banco de Dados",
            placeholder: "5432",
          },
          DB_USER: {
            label: "Usuário do Banco",
            description: "Nome de usuário do PostgreSQL",
            type: "string",
            required: false,
            sensitive: false,
            category: "Banco de Dados",
            placeholder: "helpdesk_user",
          },
          DB_PASSWORD: {
            label: "Senha do Banco",
            description: "Senha do usuário PostgreSQL",
            type: "password",
            required: false,
            sensitive: true,
            category: "Banco de Dados",
          },
          DB_NAME: {
            label: "Nome do Banco",
            description: "Nome do banco de dados PostgreSQL",
            type: "string",
            required: false,
            sensitive: false,
            category: "Banco de Dados",
            placeholder: "helpdesk",
          },
          // URLs e Ambiente
          APP_URL: {
            label: "URL da Aplicação",
            description: "URL base da aplicação (usado em links de email)",
            type: "url",
            required: false,
            sensitive: false,
            category: "URLs e Ambiente",
            placeholder: "http://localhost:3000",
          },
          NEXT_PUBLIC_APP_URL: {
            label: "URL Pública (Next.js)",
            description: "URL pública acessível pelo cliente (Next.js)",
            type: "url",
            required: false,
            sensitive: false,
            category: "URLs e Ambiente",
            placeholder: "http://localhost:3000",
          },
          PUBLIC_APP_URL: {
            label: "URL Pública",
            description: "URL pública da aplicação",
            type: "url",
            required: false,
            sensitive: false,
            category: "URLs e Ambiente",
            placeholder: "http://localhost:3000",
          },
          NODE_ENV: {
            label: "Ambiente Node.js",
            description: "Ambiente de execução (development, production, test)",
            type: "string",
            required: false,
            sensitive: false,
            category: "URLs e Ambiente",
            placeholder: "development",
            examples: ["development", "production", "test"],
          },
          // Segurança e Usuários
          AUTH_SECRET: {
            label: "Chave Secreta de Autenticação",
            description: "Chave para assinar tokens JWT (mínimo 32 caracteres, gere com: openssl rand -base64 32)",
            type: "password",
            required: true,
            sensitive: true,
            category: "Segurança e Usuários",
            validation: (v) => {
              if (!v) return "Chave secreta é obrigatória";
              if (v.length < 32) return "Chave deve ter no mínimo 32 caracteres";
              return null;
            },
          },
          DEFAULT_USER_EMAIL: {
            label: "Email do Usuário Padrão",
            description: "Email do administrador criado automaticamente",
            type: "email",
            required: false,
            sensitive: false,
            category: "Segurança e Usuários",
            placeholder: "admin@example.com",
          },
          DEFAULT_USER_PASSWORD: {
            label: "Senha do Usuário Padrão",
            description: "Senha do administrador padrão (altere em produção!)",
            type: "password",
            required: false,
            sensitive: true,
            category: "Segurança e Usuários",
            validation: (v) => {
              if (v && v.length < 6) return "Senha deve ter no mínimo 6 caracteres";
              return null;
            },
          },
          DEFAULT_USER_NAME: {
            label: "Nome do Usuário Padrão",
            description: "Nome do administrador padrão",
            type: "string",
            required: false,
            sensitive: false,
            category: "Segurança e Usuários",
            placeholder: "Administrador",
          },
          DEFAULT_USER_TWO_FACTOR: {
            label: "2FA para Usuário Padrão",
            description: "Habilitar autenticação de dois fatores para o usuário padrão",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Segurança e Usuários",
          },
          // Docker
          USE_DOCKER_DB: {
            label: "Usar Docker para PostgreSQL",
            description: "Usar container Docker para o banco de dados",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Docker",
          },
          USE_DOCKER_OLLAMA: {
            label: "Usar Docker para Ollama",
            description: "Usar container Docker para o servidor Ollama",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Docker",
          },
          USE_DOCKER_REDIS: {
            label: "Usar Docker para Redis",
            description: "Usar container Docker para o Redis",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Docker",
          },
          // Operações Avançadas
          ALLOW_GIT_UPDATE: {
            label: "Permitir Atualização via Git",
            description: "Permite atualizar o sistema via git pull pela interface web",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Operações Avançadas",
          },
          ALLOWED_REPO_URL: {
            label: "URL do Repositório Permitido",
            description: "URL do repositório Git permitido para atualização (opcional, mas recomendado)",
            type: "url",
            required: false,
            sensitive: false,
            category: "Operações Avançadas",
            placeholder: "https://github.com/usuario/repositorio.git",
          },
          ALLOW_ENV_EDIT: {
            label: "Permitir Edição de .env",
            description: "Permite editar variáveis de ambiente pela interface web",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Operações Avançadas",
          },
          // Redis
          REDIS_ENABLED: {
            label: "Habilitar Redis",
            description: "Ativa o uso do Redis para cache de sessões e respostas",
            type: "boolean",
            required: false,
            sensitive: false,
            category: "Redis",
          },
          REDIS_HOST: {
            label: "Host do Redis",
            description: "Endereço do servidor Redis",
            type: "string",
            required: false,
            sensitive: false,
            category: "Redis",
            placeholder: "localhost",
          },
          REDIS_PORT: {
            label: "Porta do Redis",
            description: "Porta do servidor Redis (padrão: 6379)",
            type: "number",
            required: false,
            sensitive: false,
            category: "Redis",
            placeholder: "6379",
          },
          REDIS_PASSWORD: {
            label: "Senha do Redis",
            description: "Senha do Redis (opcional, deixe vazio se não usar autenticação)",
            type: "password",
            required: false,
            sensitive: true,
            category: "Redis",
          },
          // Criptografia
          ENCRYPTION_KEY: {
            label: "Chave de Criptografia",
            description: "Chave para criptografar arquivos sensíveis (64 caracteres hex, gere com: openssl rand -hex 32)",
            type: "password",
            required: true,
            sensitive: true,
            category: "Criptografia",
            validation: (v) => {
              if (!v) return "Chave de criptografia é obrigatória";
              if (!/^[0-9a-f]{64}$/i.test(v)) return "Chave deve ter exatamente 64 caracteres hexadecimais";
              return null;
            },
          },
        };

        // Agrupar variáveis por categoria
        const categoriesMap = new Map<string, string[]>();
        Object.entries(envVariablesMetadata).forEach(([key, meta]) => {
          if (!categoriesMap.has(meta.category)) {
            categoriesMap.set(meta.category, []);
          }
          categoriesMap.get(meta.category)!.push(key);
        });

        const envCategories = Array.from(categoriesMap.entries()).map(([title, keys]) => ({
          title,
          keys,
        }));

        // Filtrar variáveis baseado na busca
        const filteredCategories = envCategories.map((cat) => ({
          ...cat,
          keys: cat.keys.filter((key) => {
            const meta = envVariablesMetadata[key];
            const searchLower = envSearchQuery.toLowerCase();
            return (
              envSearchQuery.trim() === "" ||
              key.toLowerCase().includes(searchLower) ||
              meta.label.toLowerCase().includes(searchLower) ||
              meta.description.toLowerCase().includes(searchLower)
            );
          }),
        })).filter((cat) => cat.keys.length > 0);

        // Funções auxiliares
        const toggleCategory = (categoryTitle: string) => {
          setEnvCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryTitle)) {
              next.delete(categoryTitle);
            } else {
              next.add(categoryTitle);
            }
            return next;
          });
        };

        const togglePasswordVisibility = (key: string) => {
          setEnvVisiblePasswords((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return next;
          });
        };

        const validateEnvValue = (key: string, value: string): string | null => {
          const meta = envVariablesMetadata[key];
          if (!meta) return null;
          if (meta.validation) return meta.validation(value);
          if (meta.required && !value.trim()) return "Este campo é obrigatório";
          return null;
        };

        const handleEnvChange = (key: string, value: string) => {
          setEnvConfig((prev) => ({ ...prev, [key]: value }));
          const error = validateEnvValue(key, value);
          setEnvValidationErrors((prev) => {
            const next = { ...prev };
            if (error) {
              next[key] = error;
            } else {
              delete next[key];
            }
            return next;
          });
        };

        const getInputValue = (key: string, meta: typeof envVariablesMetadata[string]): string => {
          const value = envConfig[key] ?? "";
          if (meta.type === "boolean") {
            return value === "true" || value === "1" ? "true" : "false";
          }
          return value;
        };

        const handleBooleanChange = (key: string, checked: boolean) => {
          handleEnvChange(key, checked ? "true" : "false");
        };

        const exportEnvConfig = () => {
          const dataStr = JSON.stringify(envConfig, null, 2);
          const dataBlob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(dataBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `env-config-${new Date().toISOString().split("T")[0]}.json`;
          link.click();
          URL.revokeObjectURL(url);
          toast.showSuccess("Configuração exportada com sucesso!");
        };

        const importEnvConfig = () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const imported = JSON.parse(event.target?.result as string);
                setEnvConfig((prev) => ({ ...prev, ...imported }));
                toast.showSuccess("Configuração importada com sucesso!");
              } catch (err) {
                toast.showError("Erro ao importar configuração. Verifique o formato do arquivo.");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        };

        return (
          <div>
            <SectionHeaderRow>
              <SectionTitle>Configurar ambiente (.env)</SectionTitle>
              <Pill $tone="warning">Avançado</Pill>
            </SectionHeaderRow>
            <SectionSubtitle>
              Gerencie as variáveis de ambiente do sistema. Algumas mudanças exigem reinício do servidor.
            </SectionSubtitle>

            {envError && (
              <Feedback role="alert" $variant="error">
                {envError}
              </Feedback>
            )}

            {envSuccess && (
              <Feedback role="status" $variant="success">
                {envSuccess}
              </Feedback>
            )}

            {envLoading ? (
              <Skeleton aria-hidden />
            ) : (
              <>
                {/* Barra de busca e ações */}
                <EnvToolbar>
                  <Field style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    id="env-search"
                    type="text"
                      placeholder="Buscar por nome, descrição ou valor..."
                    value={envSearchQuery}
                    onChange={(e) => setEnvSearchQuery((e.currentTarget as any).value ?? "")}
                      style={{ marginBottom: 0 }}
                  />
                </Field>
                  <ActionButton type="button" onClick={exportEnvConfig} style={{ marginLeft: 12 }}>
                    📥 Exportar
                  </ActionButton>
                  <ActionButton type="button" onClick={importEnvConfig} style={{ marginLeft: 8 }}>
                    📤 Importar
                  </ActionButton>
                  <ActionButton type="button" onClick={loadEnvConfig} disabled={envLoading} style={{ marginLeft: 8 }}>
                    🔄 Recarregar
                  </ActionButton>
                </EnvToolbar>

                {/* Lista de categorias */}
                <EnvCategoriesGrid>
                  {filteredCategories.map((category) => {
                  const isCollapsed = envCollapsedCategories.has(category.title);
                  const meta = envVariablesMetadata[category.keys[0]];
                  
                  return (
                    <EnvCategoryCard key={category.title} $collapsed={isCollapsed}>
                      <EnvCategoryHeader onClick={() => toggleCategory(category.title)}>
                        <EnvCategoryTitle>
                          <EnvCategoryIcon>{isCollapsed ? "▶" : "▼"}</EnvCategoryIcon>
                          {category.title}
                          <EnvCategoryCount>({category.keys.length})</EnvCategoryCount>
                        </EnvCategoryTitle>
                        <EnvCategoryToggle>{isCollapsed ? "Expandir" : "Recolher"}</EnvCategoryToggle>
                      </EnvCategoryHeader>
                      
                      {!isCollapsed && (
                        <EnvCategoryContent>
                          {category.keys.map((key) => {
                            const meta = envVariablesMetadata[key];
                            if (!meta) return null;
                            
                            const value = getInputValue(key, meta);
                            const isPassword = meta.type === "password";
                            const isVisible = envVisiblePasswords.has(key);
                            const hasError = envValidationErrors[key];
                            const isEmpty = !value || value.trim() === "";

                            return (
                              <EnvFieldWrapper key={key} $hasError={!!hasError} $required={meta.required}>
                                <EnvFieldHeader>
                                  <EnvFieldLabel htmlFor={`env-${key}`}>
                                    {meta.label}
                                    {meta.required && <EnvRequiredBadge> *</EnvRequiredBadge>}
                                    {meta.sensitive && <EnvSensitiveBadge> 🔒</EnvSensitiveBadge>}
                                  </EnvFieldLabel>
                                  {isPassword && (
                                    <EnvTogglePassword
                                      type="button"
                                      onClick={() => togglePasswordVisibility(key)}
                                      title={isVisible ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                      {isVisible ? "👁️" : "👁️‍🗨️"}
                                    </EnvTogglePassword>
                                  )}
                                </EnvFieldHeader>
                                
                                <EnvFieldDescription>{meta.description}</EnvFieldDescription>

                                {meta.type === "boolean" ? (
                                  <CheckboxRow>
                                    <input
                                      type="checkbox"
                          id={`env-${key}`}
                                      checked={value === "true"}
                                      onChange={(e) => handleBooleanChange(key, e.target.checked)}
                                    />
                                    <label htmlFor={`env-${key}`} style={{ marginLeft: 8 }}>
                                      {value === "true" ? "Habilitado" : "Desabilitado"}
                                    </label>
                                  </CheckboxRow>
                                ) : (
                                  <EnvInput
                                    id={`env-${key}`}
                                    type={isPassword && !isVisible ? "password" : meta.type === "number" ? "number" : meta.type === "email" ? "email" : meta.type === "url" ? "url" : "text"}
                                    value={value}
                                    placeholder={meta.placeholder}
                                    onChange={(e) => handleEnvChange(key, (e.currentTarget as any).value ?? "")}
                                    $hasError={!!hasError}
                                    $isEmpty={isEmpty && !meta.required}
                                  />
                                )}

                                {hasError && (
                                  <EnvFieldError role="alert">{hasError}</EnvFieldError>
                                )}

                                {meta.examples && meta.examples.length > 0 && (
                                  <EnvFieldExamples>
                                    <strong>Exemplos:</strong> {meta.examples.join(", ")}
                                  </EnvFieldExamples>
                                )}

                                {isEmpty && meta.required && (
                                  <EnvFieldWarning>⚠️ Este campo é obrigatório</EnvFieldWarning>
                                )}
                              </EnvFieldWrapper>
                            );
                          })}
                        </EnvCategoryContent>
                      )}
                    </EnvCategoryCard>
                  );
                  })}
                </EnvCategoriesGrid>

                {filteredCategories.length === 0 && envSearchQuery.trim() !== "" && (
                  <Muted style={{ textAlign: "center", padding: "40px 20px" }}>
                    Nenhuma variável encontrada para "{envSearchQuery}".
                  </Muted>
                )}

                {/* Ações */}
                <Actions style={{ marginTop: 32 }}>
                  <PrimaryButton 
                    type="button" 
                    onClick={saveEnvConfig} 
                    disabled={envSaving || Object.keys(envValidationErrors).length > 0}
                    style={{ position: "relative" }}
                  >
                    {envSaving && (
                      <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                        <LoadingSpinner size="small" color="#fff" />
                      </span>
                    )}
                    {envSaving ? "Salvando..." : "💾 Salvar configurações"}
                  </PrimaryButton>
                </Actions>

                {Object.keys(envValidationErrors).length > 0 && (
                  <Feedback role="alert" $variant="error" style={{ marginTop: 16 }}>
                    ⚠️ Corrija os erros de validação antes de salvar.
                  </Feedback>
                )}

                <InfoPanel style={{ marginTop: 24 }}>
                  <InfoTitle>ℹ️ Informações importantes</InfoTitle>
                  <HelpList>
                    <li>Após salvar, reinicie o servidor para aplicar as mudanças.</li>
                    <li>Campos marcados com <strong>*</strong> são obrigatórios.</li>
                    <li>Campos com 🔒 contêm informações sensíveis e são mascarados.</li>
                    <li>Certifique-se de que <InlineCode>ALLOW_ENV_EDIT=true</InlineCode> para permitir edição.</li>
                    <li>Use Exportar/Importar para fazer backup das configurações.</li>
                  </HelpList>
                </InfoPanel>
              </>
            )}
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
      case "pages":
        return (
          <div>
            <SectionTitle>Páginas Públicas</SectionTitle>
            <Muted>Crie, gerencie e compartilhe páginas web públicas.
            </Muted>
          </div>
        );
      case "backup":
        return (
          <div>
            {/* Criar Backup */}
            <SectionDivider />
            <SectionSubtitle style={{ marginBottom: 16 }}>Criar Backup</SectionSubtitle>
            <Actions>
              <PrimaryButton
                type="button"
                onClick={createBackup}
                disabled={backupCreating}
                style={{ position: "relative" }}
              >
                {backupCreating && (
                  <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                    <LoadingSpinner size="small" color="#fff" />
                  </span>
                )}
                {backupCreating ? "Criando backup..." : "Criar Backup Agora"}
              </PrimaryButton>
            </Actions>

            {/* Upload de Backup */}
            <SectionDivider />
            <SectionSubtitle style={{ marginBottom: 16 }}>Upload de Backup</SectionSubtitle>
            <Field style={{ position: "relative" }}>
              <Label htmlFor="backup-upload">Selecionar arquivo .sql</Label>
              {backupUploading && (
                <div style={{ position: "absolute", top: "42px", left: "12px", display: "flex", alignItems: "center", gap: 8, zIndex: 1 }}>
                  <LoadingSpinner size="small" />
                  <span style={{ fontSize: "0.875rem", color: "var(--primary-700)" }}>Enviando backup...</span>
                </div>
              )}
              <Input
                id="backup-upload"
                type="file"
                accept=".sql"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    uploadBackup(file);
                    (e.target as HTMLInputElement).value = ""; // Reset input
                  }
                }}
                disabled={backupUploading}
                style={{ marginBottom: 12, padding: "8px", opacity: backupUploading ? 0.5 : 1 }}
              />
            </Field>

            {/* Lista de Backups */}
            <SectionDivider />
            <SectionSubtitle style={{ marginBottom: 16 }}>Backups Disponíveis</SectionSubtitle>
            {backupsLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "20px 0" }}>
                <LoadingSpinner size="medium" />
                <Muted>Carregando backups...</Muted>
              </div>
            ) : backupsList.length === 0 ? (
              <Muted>Nenhum backup disponível</Muted>
            ) : (
              <BackupsTable>
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tamanho</th>
                    <th>Data de Criação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {backupsList.map((backup) => (
                    <tr key={backup.filename}>
                      <td>{backup.filename}</td>
                      <td>{backup.sizeFormatted}</td>
                      <td>{formatDateTime(backup.createdAt)}</td>
                      <td>
                        <Actions style={{ gap: 8 }}>
                          <ActionButton
                            type="button"
                            onClick={() => downloadBackup(backup.filename)}
                          >
                            Download
                          </ActionButton>
                          <ActionButton
                            type="button"
                            onClick={() => restoreBackup(backup.filename)}
                            disabled={backupRestoring}
                            style={{ position: "relative" }}
                          >
                            {backupRestoring && (
                              <span style={{ marginRight: 6, display: "inline-flex", alignItems: "center" }}>
                                <LoadingSpinner size="small" />
                              </span>
                            )}
                            {backupRestoring ? "Restaurando..." : "Restaurar"}
                          </ActionButton>
                          {backupConfig.emailRecipients.length > 0 && (
                            <ActionButton
                              type="button"
                              onClick={() => {
                                sendBackupByEmail(backup.filename, backupConfig.emailRecipients);
                              }}
                              disabled={backupSendingEmail}
                              style={{ position: "relative" }}
                            >
                              {backupSendingEmail && (
                                <span style={{ marginRight: 6, display: "inline-flex", alignItems: "center" }}>
                                  <LoadingSpinner size="small" />
                                </span>
                              )}
                              {backupSendingEmail ? "Enviando..." : "Enviar por Email"}
                            </ActionButton>
                          )}
                        </Actions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </BackupsTable>
            )}

            {/* Configuração de Backup Automático */}
            <SectionDivider />
            <SectionSubtitle style={{ marginBottom: 16 }}>Backup Automático</SectionSubtitle>
            <Field>
              <CheckboxRow>
                <label>
                  <input
                    type="checkbox"
                    checked={backupConfig.enabled}
                    onChange={(e) =>
                      setBackupConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                    }
                  />
                  <span style={{ marginLeft: 8 }}>Habilitar backup automático</span>
                </label>
              </CheckboxRow>
            </Field>

            {backupConfig.enabled && (
              <>
                <Field>
                  <Label htmlFor="backup-schedule">Frequência</Label>
                  <Select
                    id="backup-schedule"
                    value={backupConfig.schedule || ""}
                    onChange={(e) =>
                      setBackupConfig((prev) => ({
                        ...prev,
                        schedule: e.target.value as "daily" | "weekly" | "monthly" | null,
                      }))
                    }
                  >
                    <option value="">Selecione...</option>
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </Select>
                </Field>

                {backupConfig.schedule && (
                  <>
                    <Field>
                      <Label htmlFor="backup-schedule-time">Horário (HH:mm)</Label>
                      <Input
                        id="backup-schedule-time"
                        type="time"
                        value={backupConfig.scheduleTime || "02:00"}
                        onChange={(e) =>
                          setBackupConfig((prev) => ({ ...prev, scheduleTime: e.target.value }))
                        }
                      />
                    </Field>

                    {backupConfig.schedule === "weekly" && (
                      <Field>
                        <Label htmlFor="backup-schedule-day">Dia da Semana (0=Dom, 6=Sáb)</Label>
                        <Input
                          id="backup-schedule-day"
                          type="number"
                          min="0"
                          max="6"
                          value={backupConfig.scheduleDay || 0}
                          onChange={(e) =>
                            setBackupConfig((prev) => ({
                              ...prev,
                              scheduleDay: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </Field>
                    )}

                    {backupConfig.schedule === "monthly" && (
                      <Field>
                        <Label htmlFor="backup-schedule-day-month">Dia do Mês (1-31)</Label>
                        <Input
                          id="backup-schedule-day-month"
                          type="number"
                          min="1"
                          max="31"
                          value={backupConfig.scheduleDay || 1}
                          onChange={(e) =>
                            setBackupConfig((prev) => ({
                              ...prev,
                              scheduleDay: parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </Field>
                    )}
                  </>
                )}

                <Field>
                  <Label htmlFor="backup-keep-days">Manter backups por (dias)</Label>
                  <Input
                    id="backup-keep-days"
                    type="number"
                    min="1"
                    value={backupConfig.keepDays}
                    onChange={(e) =>
                      setBackupConfig((prev) => ({
                        ...prev,
                        keepDays: parseInt(e.target.value) || 30,
                      }))
                    }
                  />
                </Field>

                <Field>
                  <Label htmlFor="backup-email-recipient">Emails para receber backup (um por linha)</Label>
                  <TextArea
                    id="backup-email-recipient"
                    rows={4}
                    value={backupConfig.emailRecipients.join("\n")}
                    onChange={(e) =>
                      setBackupConfig((prev) => ({
                        ...prev,
                        emailRecipients: e.target.value
                          .split("\n")
                          .map((email) => email.trim())
                          .filter((email) => email.includes("@")),
                      }))
                    }
                    placeholder="admin@example.com&#10;backup@example.com"
                  />
                </Field>

                <Actions style={{ marginTop: 16 }}>
                  <PrimaryButton
                    type="button"
                    onClick={saveBackupConfig}
                    disabled={backupConfigSaving}
                    style={{ position: "relative" }}
                  >
                    {backupConfigSaving && (
                      <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                        <LoadingSpinner size="small" color="#fff" />
                      </span>
                    )}
                    {backupConfigSaving ? "Salvando..." : "Salvar Configuração"}
                  </PrimaryButton>
                </Actions>
              </>
            )}

            <InfoPanel style={{ marginTop: 24 }}>
              <InfoTitle>Informações importantes</InfoTitle>
              <HelpList>
                <li>Os backups são salvos no diretório <InlineCode>backups/</InlineCode> do projeto.</li>
                <li>Certifique-se de que o <InlineCode>pg_dump</InlineCode> e <InlineCode>psql</InlineCode> estão instalados para criar e restaurar backups.</li>
                <li>O backup automático requer configuração de cron job ou agendador de tarefas externo.</li>
                <li>Para enviar por email, configure <InlineCode>EMAIL_ENABLED=true</InlineCode> no .env.</li>
              </HelpList>
            </InfoPanel>
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
  }, [section, loading, error, updateFeedback, updateLoading, updateRepoUrl, envLoading, envSaving, envError, envSuccess, envConfig, envSearchQuery, envVisiblePasswords, envCollapsedCategories, envValidationErrors, systemVersion, versionLoading, backupFeedback, backupsLoading, backupsList, backupConfig, backupCreating, backupUploading, backupRestoring, backupSendingEmail, backupConfigSaving]);

  const activeForm = manageFormId ? formsList.find((f) => f.id === manageFormId || f.numericId === manageFormId) ?? null : null;
  const activeWebhook = manageWebhookId ? webhooksList.find((w) => w.id === manageWebhookId) ?? null : null;
  const baseUrl = typeof globalThis !== "undefined" && (globalThis as any).window
    ? ((globalThis as any).window?.location?.origin ?? "")
    : "";

  return (
    <StandardLayout>
      <Toast toasts={toast.toasts} onClose={toast.removeToast} />
        <Content>
          {section !== "forms" && section !== "webhooks" && section !== "backup" && section !== "pages" && (
            <Card aria-labelledby="config-title">
              <CardHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                  <HeaderIcon aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.47-.35.61-.98.33-1.5l-1.92-3.32c-.28-.52-.9-.73-1.42-.5l-2.4.96c-.65-.49-1.35-.9-2.1-1.22l-.36-2.54c-.05-.55-.5-.98-1.05-.98h-3.84c-.55 0-1 .43-1.05.98l-.36 2.54c-.75.32-1.45.73-2.1 1.22l-2.4-.96c-.52-.23-1.14-.02-1.42.5L2.44 8.98c-.28.52-.14 1.15.33 1.5l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.47.35-.61.98-.33 1.5l1.92 3.32c.28.52.9.73 1.42.5l2.4-.96c.65.49 1.35.9 2.1 1.22l.36 2.54c.05.55.5.98 1.05.98h3.84c.55 0 1-.43 1.05-.98l.36-2.54c.75-.32 1.45-.73 2.1-1.22l2.4.96c.52.23 1.14.02 1.42-.5l1.92-3.32c.28-.52.14-1.15-.33-1.5l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                  </HeaderIcon>
                  <div>
                    <CardTitle id="config-title">Configurações</CardTitle>
                    <Muted>Gerencie as opções do sistema por seções.</Muted>
                  </div>
                </div>
              </CardHeader>
              {content}
            </Card>
          )}
          {section === "backup" && (
            <FormsWrapper>
              <Card aria-labelledby="backup-card-title">
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <HeaderIcon aria-hidden>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                      </svg>
                    </HeaderIcon>
                    <div>
                      <CardTitle id="backup-card-title">Backup do Sistema</CardTitle>
                      <Muted>Faça backup do banco de dados, restaure backups existentes e configure backup automático.</Muted>
                    </div>
                  </div>
                  <HeaderActions>
                    <ActionButton type="button" onClick={() => loadBackups()} disabled={backupsLoading}>
                      Recarregar
                    </ActionButton>
                  </HeaderActions>
                </CardHeader>
                {backupFeedback && (
                  <Feedback role="alert" $variant={backupFeedback.type}>
                    {backupFeedback.text}
                  </Feedback>
                )}
                <FormsScroll role="region" aria-label="Gerenciamento de backups">
                  {content}
                </FormsScroll>
              </Card>
            </FormsWrapper>
          )}
          {section === "forms" && (
            <FormsWrapper>
              <Card aria-labelledby="forms-card-title">
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <HeaderIcon aria-hidden>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                      </svg>
                    </HeaderIcon>
                    <div>
                      <CardTitle id="forms-card-title">Formulários públicos</CardTitle>
                      <Muted>Gerencie as estruturas e links compartilhados com os usuários.</Muted>
                    </div>
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
                        <FormsHeaderCell>Aprovação</FormsHeaderCell>
                        <FormsHeaderCell>Criado por</FormsHeaderCell>
                        <FormsHeaderCell>Criado em</FormsHeaderCell>
                        <FormsHeaderCell>Link</FormsHeaderCell>
                        <FormsHeaderCell aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {formsLoading && (
                        <tr>
                          <FormsCell colSpan={7}>
                            <Muted>Carregando formulários...</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!formsLoading && formsList.length === 0 && (
                        <tr>
                          <FormsCell colSpan={7}>
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
                            {form.requiresApproval ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <StatusBadge $tone="warning">Sim</StatusBadge>
                                {form.approvers && form.approvers.length > 0 ? (
                                  <FormMeta style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                                    {form.approvers.length} aprovador(es): {form.approvers.map(a => a.name || a.email).join(", ")}
                                  </FormMeta>
                                ) : (
                                  <FormMeta style={{ fontSize: "0.75rem", marginTop: "2px", color: "#ef4444" }}>
                                    Nenhum aprovador definido
                                  </FormMeta>
                                )}
                              </div>
                            ) : (
                              <StatusBadge $tone="success">Não</StatusBadge>
                            )}
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
                  <HeaderIcon aria-hidden>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                  </HeaderIcon>
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
          {section === "pages" && (
            <FormsWrapper>
              <Card aria-labelledby="pages-card-title">
                <CardHeader>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <HeaderIcon aria-hidden>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </HeaderIcon>
                    <div>
                      <CardTitle id="pages-card-title">Páginas públicas</CardTitle>
                      <Muted>Gerencie páginas web públicas com conteúdo HTML personalizado.</Muted>
                    </div>
                  </div>
                  <HeaderActions>
                    <ActionButton type="button" onClick={() => loadPages()} disabled={pagesLoading}>
                      Recarregar
                    </ActionButton>
                    <PrimaryButton type="button" onClick={() => setCreatePageOpen(true)}>
                      Nova página
                    </PrimaryButton>
                  </HeaderActions>
                </CardHeader>
                {error && (
                  <Feedback role="alert" $variant="error">{error}</Feedback>
                )}
                {pagesFeedback && !managePageOpen && !createPageOpen && (
                  <Feedback role={pagesFeedback.type === "error" ? "alert" : "status"} $variant={pagesFeedback.type}>
                    {pagesFeedback.text}
                  </Feedback>
                )}
                <FormsScroll role="region" aria-label="Lista de páginas">
                  <FormsTable>
                    <thead>
                      <tr>
                        <FormsHeaderCell>Página</FormsHeaderCell>
                        <FormsHeaderCell>Status</FormsHeaderCell>
                        <FormsHeaderCell>Criado por</FormsHeaderCell>
                        <FormsHeaderCell>Atualizado em</FormsHeaderCell>
                        <FormsHeaderCell>Link</FormsHeaderCell>
                        <FormsHeaderCell aria-label="Ações" />
                      </tr>
                    </thead>
                    <tbody>
                      {pagesLoading && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Carregando páginas...</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!pagesLoading && pagesList.length === 0 && (
                        <tr>
                          <FormsCell colSpan={6}>
                            <Muted>Nenhuma página cadastrada ainda.</Muted>
                          </FormsCell>
                        </tr>
                      )}
                      {!pagesLoading && pagesList.map((page) => (
                        <tr key={page.id}>
                          <FormsCell>
                            <FormTitle>
                              <strong>{page.title}</strong>
                              {page.description && <small>{page.description}</small>}
                              <small>Slug: {page.slug}</small>
                            </FormTitle>
                          </FormsCell>
                          <FormsCell>
                            <StatusBadge $tone={page.isPublished ? "success" : "warning"}>
                              {page.isPublished ? "Publicada" : "Rascunho"}
                            </StatusBadge>
                          </FormsCell>
                          <FormsCell>
                            <FormMeta>{page.createdByName || page.createdByEmail || "—"}</FormMeta>
                          </FormsCell>
                          <FormsCell>{formatDateTime(page.updatedAt || page.createdAt)}</FormsCell>
                          <FormsCell>
                            {page.isPublished ? (
                              <FormLink href={`/pages/${page.slug}`} target="_blank" rel="noreferrer">
                                /pages/{page.slug}
                              </FormLink>
                            ) : (
                              <span>-</span>
                            )}
                          </FormsCell>
                          <FormsCell>
                            <ActionButton type="button" onClick={() => {
                              setManagePageId(page.id);
                              setManagePageOpen(true);
                            }}>
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
      {createOpen && (
        <>
          <ModalBackdrop $open={createOpen} onClick={() => {
            setCreateOpen(false);
            setFormTitle("");
            setFormDesc("");
            setFormRequiresApproval(false);
            setFormApproverIds([]);
            setBuilderFields([]);
          }} aria-hidden={!createOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-form-title"
            $open={createOpen}
            onKeyDown={(e) => { 
              if (e.key === "Escape") {
                setCreateOpen(false);
                setFormTitle("");
                setFormDesc("");
                setFormRequiresApproval(false);
                setFormApproverIds([]);
                setBuilderFields([]);
              }
            }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </ModalIcon>
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
              <Field>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formRequiresApproval}
                    onChange={(event) => {
                      const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                      setFormRequiresApproval(checked);
                      if (!checked) {
                        setFormApproverIds([]);
                      }
                    }}
                  />
                  <span>Este formulário requer aprovação antes de criar ticket</span>
                </label>
              </Field>
              {formRequiresApproval && (
                <Field>
                  <Label>Usuários responsáveis pela aprovação (selecione múltiplos)</Label>
                  <select
                    multiple
                    value={formApproverIds.map(String)}
                    onChange={(event) => {
                      const selectedOptions = Array.from(event.currentTarget.selectedOptions);
                      const selectedIds = selectedOptions.map(opt => Number(opt.value)).filter(id => !isNaN(id));
                      setFormApproverIds(selectedIds);
                    }}
                    style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", minHeight: "120px" }}
                  >
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  {formApproverIds.length > 0 && (
                    <Muted style={{ marginTop: "4px", fontSize: "0.875rem" }}>
                      {formApproverIds.length} usuário(s) selecionado(s)
                    </Muted>
                  )}
                </Field>
              )}

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
              <CancelButton type="button" onClick={() => {
                setCreateOpen(false);
                setFormTitle("");
                setFormDesc("");
                setFormRequiresApproval(false);
                setFormApproverIds([]);
                setBuilderFields([]);
              }}>Cancelar</CancelButton>
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
                <InfoLabel>Requer Aprovação</InfoLabel>
                <InfoValue>
                  <StatusBadge $tone={Boolean(activeForm.requiresApproval) ? "warning" : "success"}>
                    {Boolean(activeForm.requiresApproval) ? "Sim" : "Não"}
                  </StatusBadge>
                </InfoValue>
              </div>
              {Boolean(activeForm.requiresApproval) && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <InfoLabel>Usuários Aprovadores</InfoLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                    <select
                      multiple
                      value={(activeForm.approvers || []).map(a => String(a.id))}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.currentTarget.selectedOptions);
                        const selectedIds = selectedOptions.map(opt => Number(opt.value)).filter(id => !isNaN(id));
                        updateApprovers(activeForm, selectedIds);
                      }}
                      disabled={toggleVisibilityLoading}
                      style={{ 
                        width: "100%", 
                        padding: "8px 12px", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border)", 
                        background: "#fff",
                        fontSize: "0.875rem",
                        minHeight: "120px"
                      }}
                    >
                      {usersList.length > 0 ? (
                        usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Carregando usuários...</option>
                      )}
                    </select>
                    {(activeForm.approvers || []).length > 0 && (
                      <Muted style={{ fontSize: "0.75rem" }}>
                        {(activeForm.approvers || []).length} usuário(s) selecionado(s)
                      </Muted>
                    )}
                  </div>
                </div>
              )}
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
                onClick={() => toggleRequiresApproval(activeForm)}
                disabled={toggleVisibilityLoading}
              >
                {toggleVisibilityLoading ? "Atualizando..." : activeForm.requiresApproval ? "Remover aprovação" : "Requerer aprovação"}
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
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
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
                <Field>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editRequiresApproval}
                      onChange={(event) => {
                        const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                        setEditRequiresApproval(checked);
                        if (!checked) {
                          setEditApproverIds([]);
                        }
                      }}
                    />
                    <span>Este formulário requer aprovação antes de criar ticket</span>
                  </label>
                </Field>
                {editRequiresApproval && (
                  <Field>
                    <Label>Usuários responsáveis pela aprovação (selecione múltiplos)</Label>
                    <select
                      multiple
                      value={editApproverIds.map(String)}
                      onChange={(event) => {
                        const selectedOptions = Array.from(event.currentTarget.selectedOptions);
                        const selectedIds = selectedOptions.map(opt => Number(opt.value)).filter(id => !isNaN(id));
                        setEditApproverIds(selectedIds);
                      }}
                      style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", minHeight: "120px" }}
                    >
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                    {editApproverIds.length > 0 && (
                      <Muted style={{ marginTop: "4px", fontSize: "0.875rem" }}>
                        {editApproverIds.length} usuário(s) selecionado(s)
                      </Muted>
                    )}
                  </Field>
                )}
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
                  <PrimaryButton type="button" onClick={saveEditedForm} disabled={editSaving || editLoading} style={{ position: "relative" }}>
                    {editSaving && (
                      <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                        <LoadingSpinner size="small" color="#fff" />
                      </span>
                    )}
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
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
              </ModalIcon>
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
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
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
                  <PrimaryButton type="button" onClick={saveEditedWebhook} disabled={editWebhookSaving || editWebhookLoading} style={{ position: "relative" }}>
                    {editWebhookSaving && (
                      <span style={{ marginRight: 8, display: "inline-flex", alignItems: "center" }}>
                        <LoadingSpinner size="small" color="#fff" />
                      </span>
                    )}
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
                  Um webhook é uma URL especial que permite que outros sistemas enviem notificações para o seu RootDesk. 
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

      {createPageOpen && (
        <>
          <ModalBackdrop $open={createPageOpen} onClick={() => {
            setCreatePageOpen(false);
            setPageTitle("");
            setPageDescription("");
            setPageBlocks([]);
            setPageIsPublished(false);
          }} aria-hidden={!createPageOpen} />
          <PageModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-page-title"
            $open={createPageOpen}
            onKeyDown={(e) => { 
              if (e.key === "Escape") {
                setCreatePageOpen(false);
                setPageTitle("");
                setPageDescription("");
                setPageBlocks([]);
                setPageIsPublished(false);
              }
            }}
          >
            <PageModalHeader>
              <PageModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
              </PageModalIcon>
              <div style={{ flex: 1 }}>
                <PageModalTitle id="create-page-title">Criar Nova Página</PageModalTitle>
                <PageModalSubtitle>Use o editor visual para criar sua página com blocos arrastáveis</PageModalSubtitle>
              </div>
            </PageModalHeader>
            
            <PageModalContent>
              <PageFormSection>
                <PageSectionTitle>Informações Básicas</PageSectionTitle>
                <Field>
                  <Label htmlFor="new-page-title">
                    Título da Página <span style={{ color: "#ef4444" }}>*</span>
                  </Label>
                  <Input
                    id="new-page-title"
                    type="text"
                    placeholder="Ex.: Página de Suporte, Central de Ajuda..."
                    value={pageTitle}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setPageTitle(value);
                    }}
                    style={{ fontSize: "1rem", padding: "12px 16px" }}
                  />
                  <Muted style={{ marginTop: "4px", fontSize: "0.875rem" }}>
                    O título será usado para gerar o link da página (slug)
                  </Muted>
                </Field>
                <Field>
                  <Label htmlFor="new-page-desc">Descrição (Opcional)</Label>
                  <Input
                    id="new-page-desc"
                    type="text"
                    placeholder="Breve descrição do que esta página oferece..."
                    value={pageDescription}
                    onChange={(event) => {
                      const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                      setPageDescription(value);
                    }}
                    style={{ fontSize: "1rem", padding: "12px 16px" }}
                  />
                </Field>
              </PageFormSection>

              <PageFormSection>
                <PageSectionTitle>Conteúdo da Página</PageSectionTitle>
                <PageBuilderContainer>
                  <PageBuilder blocks={pageBlocks} onChange={setPageBlocks} />
                </PageBuilderContainer>
                {pageBlocks.length === 0 && (
                  <EmptyBuilderState>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📝</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px", color: "#0f172a" }}>
                      Comece adicionando blocos
                    </div>
                    <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
                      Arraste blocos da paleta lateral ou clique neles para adicionar
                    </div>
                  </EmptyBuilderState>
                )}
              </PageFormSection>

              <PageFormSection>
                <PageSectionTitle>Configurações</PageSectionTitle>
                <Field>
                  <label style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    cursor: "pointer",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    background: pageIsPublished ? "rgba(34, 197, 94, 0.05)" : "#fff",
                    transition: "all 0.2s ease"
                  }}>
                    <input
                      type="checkbox"
                      checked={pageIsPublished}
                      onChange={(event) => {
                        const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                        setPageIsPublished(checked);
                      }}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "2px" }}>
                        Publicar página imediatamente
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                        A página ficará acessível publicamente após salvar
                      </div>
                    </div>
                  </label>
                </Field>
              </PageFormSection>
            </PageModalContent>

            <PageModalActions>
              <CancelButton type="button" onClick={() => {
                setCreatePageOpen(false);
                setPageTitle("");
                setPageDescription("");
                setPageBlocks([]);
                setPageIsPublished(false);
              }}>
                Cancelar
              </CancelButton>
              <ConfirmButton type="button" onClick={savePage} disabled={savingPage || !pageTitle.trim() || pageBlocks.length === 0} aria-label="Salvar nova página">
                {savingPage ? (
                  <>
                    <LoadingSpinner size="small" color="#fff" style={{ marginRight: "8px" }} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ marginRight: "8px" }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Salvar Página
                  </>
                )}
              </ConfirmButton>
            </PageModalActions>
          </PageModalDialog>
        </>
      )}

      {managePageOpen && managePageId && (() => {
        const activePage = pagesList.find(p => p.id === managePageId);
        if (!activePage) return null;
        return (
          <>
            <ModalBackdrop $open={managePageOpen} onClick={() => {
              setManagePageOpen(false);
              setManagePageId(null);
            }} aria-hidden={!managePageOpen} />
            <ModalDialog
              role="dialog"
              aria-modal="true"
              aria-labelledby="manage-page-title"
              $open={managePageOpen}
              onKeyDown={(e) => { if (e.key === "Escape") {
                setManagePageOpen(false);
                setManagePageId(null);
              }}}
            >
              <ModalHeader>
                <ModalIcon aria-hidden>🔧</ModalIcon>
                <div>
                  <ModalTitle id="manage-page-title">{activePage.title}</ModalTitle>
                  <Muted>Detalhes da página e ações rápidas.</Muted>
                </div>
              </ModalHeader>
              {pagesFeedback && (
                <Feedback role={pagesFeedback.type === "error" ? "alert" : "status"} $variant={pagesFeedback.type}>
                  {pagesFeedback.text}
                </Feedback>
              )}
              <InfoGrid>
                <div>
                  <InfoLabel>ID</InfoLabel>
                  <InfoValue>{activePage.id}</InfoValue>
                </div>
                <div>
                  <InfoLabel>Slug</InfoLabel>
                  <InfoValue>{activePage.slug}</InfoValue>
                </div>
                <div>
                  <InfoLabel>Status</InfoLabel>
                  <InfoValue>
                    <StatusBadge $tone={activePage.isPublished ? "success" : "warning"}>
                      {activePage.isPublished ? "Publicada" : "Rascunho"}
                    </StatusBadge>
                  </InfoValue>
                </div>
                <div>
                  <InfoLabel>Criado por</InfoLabel>
                  <InfoValue>{activePage.createdByName || activePage.createdByEmail || "—"}</InfoValue>
                </div>
                <div>
                  <InfoLabel>Criado em</InfoLabel>
                  <InfoValue>{formatDateTime(activePage.createdAt)}</InfoValue>
                </div>
                <div>
                  <InfoLabel>Atualizado em</InfoLabel>
                  <InfoValue>{formatDateTime(activePage.updatedAt || activePage.createdAt)}</InfoValue>
                </div>
                <div>
                  <InfoLabel>Link público</InfoLabel>
                  <InfoValue>
                    {activePage.isPublished ? (
                      <FormLink href={`/pages/${activePage.slug}`} target="_blank" rel="noreferrer">
                        {`${baseUrl}/pages/${activePage.slug}`}
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
                  onClick={() => togglePageVisibility(activePage.id, activePage.isPublished)}
                >
                  {activePage.isPublished ? "Despublicar página" : "Publicar página"}
                </ActionButton>
                <ActionButton
                  type="button"
                  onClick={() => {
                    setManagePageOpen(false);
                    openEditPage(activePage.id);
                  }}
                >
                  Editar conteúdo
                </ActionButton>
                <DangerButton
                  type="button"
                  onClick={() => deletePage(activePage.id)}
                >
                  Deletar página
                </DangerButton>
                <CancelButton type="button" onClick={() => {
                  setManagePageOpen(false);
                  setManagePageId(null);
                }}>
                  Fechar
                </CancelButton>
              </ModalActions>
            </ModalDialog>
          </>
        );
      })()}

      {editPageOpen && editPageId && (
        <>
          <ModalBackdrop $open={editPageOpen} onClick={() => {
            if (editPageSaving) return;
            setEditPageOpen(false);
            setEditPageId(null);
            setEditPageTitle("");
            setEditPageDescription("");
            setEditPageBlocks([]);
            setEditPageIsPublished(false);
            setEditPageError("");
          }} aria-hidden={!editPageOpen} />
          <PageModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-page-title"
            $open={editPageOpen}
            onKeyDown={(e) => { 
              if (e.key === "Escape" && !editPageSaving) {
                setEditPageOpen(false);
                setEditPageId(null);
                setEditPageTitle("");
                setEditPageDescription("");
                setEditPageBlocks([]);
                setEditPageIsPublished(false);
                setEditPageError("");
              }
            }}
          >
            <PageModalHeader>
              <PageModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </PageModalIcon>
              <div style={{ flex: 1 }}>
                <PageModalTitle id="edit-page-title">Editar Página</PageModalTitle>
                <PageModalSubtitle>Atualize o título, descrição e conteúdo da página usando o editor visual</PageModalSubtitle>
              </div>
            </PageModalHeader>
            
            <PageModalContent>
              {editPageLoading && (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <LoadingSpinner size="medium" />
                  <Muted style={{ marginTop: "16px", display: "block" }}>Carregando página...</Muted>
                </div>
              )}
              {editPageError && (
                <Feedback role="alert" $variant="error">{editPageError}</Feedback>
              )}
              {!editPageLoading && (
                <>
                  <PageFormSection>
                    <PageSectionTitle>Informações Básicas</PageSectionTitle>
                    <Field>
                      <Label htmlFor="edit-page-title">
                        Título da Página <span style={{ color: "#ef4444" }}>*</span>
                      </Label>
                      <Input
                        id="edit-page-title"
                        type="text"
                        placeholder="Ex.: Página de Suporte, Central de Ajuda..."
                        value={editPageTitle}
                        onChange={(event) => {
                          const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                          setEditPageTitle(value);
                        }}
                        style={{ fontSize: "1rem", padding: "12px 16px" }}
                      />
                      <Muted style={{ marginTop: "4px", fontSize: "0.875rem" }}>
                        O título será usado para gerar o link da página (slug)
                      </Muted>
                    </Field>
                    <Field>
                      <Label htmlFor="edit-page-desc">Descrição (Opcional)</Label>
                      <Input
                        id="edit-page-desc"
                        type="text"
                        placeholder="Breve descrição do que esta página oferece..."
                        value={editPageDescription}
                        onChange={(event) => {
                          const value = (event.currentTarget as unknown as { value?: string }).value ?? "";
                          setEditPageDescription(value);
                        }}
                        style={{ fontSize: "1rem", padding: "12px 16px" }}
                      />
                    </Field>
                  </PageFormSection>

                  <PageFormSection>
                    <PageSectionTitle>Conteúdo da Página</PageSectionTitle>
                    <PageBuilderContainer>
                      <PageBuilder blocks={editPageBlocks} onChange={setEditPageBlocks} />
                    </PageBuilderContainer>
                    {editPageBlocks.length === 0 && (
                      <EmptyBuilderState>
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📝</div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px", color: "#0f172a" }}>
                          Comece adicionando blocos
                        </div>
                        <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
                          Arraste blocos da paleta lateral ou clique neles para adicionar
                        </div>
                      </EmptyBuilderState>
                    )}
                  </PageFormSection>

                  <PageFormSection>
                    <PageSectionTitle>Configurações</PageSectionTitle>
                    <Field>
                      <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 12, 
                        cursor: "pointer",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        background: editPageIsPublished ? "rgba(34, 197, 94, 0.05)" : "#fff",
                        transition: "all 0.2s ease"
                      }}>
                        <input
                          type="checkbox"
                          checked={editPageIsPublished}
                          onChange={(event) => {
                            const checked = Boolean((event.currentTarget as unknown as { checked?: boolean }).checked);
                            setEditPageIsPublished(checked);
                          }}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "2px" }}>
                            Publicar página imediatamente
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                            A página ficará acessível publicamente após salvar
                          </div>
                        </div>
                      </label>
                    </Field>
                  </PageFormSection>
                </>
              )}
            </PageModalContent>

            <PageModalActions>
              <CancelButton type="button" onClick={() => {
                if (editPageSaving) return;
                setEditPageOpen(false);
                setEditPageId(null);
                setEditPageTitle("");
                setEditPageDescription("");
                setEditPageBlocks([]);
                setEditPageIsPublished(false);
                setEditPageError("");
              }} disabled={editPageSaving}>
                Cancelar
              </CancelButton>
              <ConfirmButton type="button" onClick={saveEditPage} disabled={editPageSaving || editPageLoading || !editPageTitle.trim() || editPageBlocks.length === 0} aria-label="Salvar alterações">
                {editPageSaving ? (
                  <>
                    <LoadingSpinner size="small" color="#fff" style={{ marginRight: "8px" }} />
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ marginRight: "8px" }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Salvar Alterações
                  </>
                )}
              </ConfirmButton>
            </PageModalActions>
          </PageModalDialog>
        </>
      )}
    </StandardLayout>
  );
}

const SECTIONS: SectionKey[] = ["general", "appearance", "notifications", "security", "integrations", "update", "env", "forms", "webhooks", "backup", "pages"];

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

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;

  @media (min-width: 960px) {
    grid-column: span 8;
    margin-left: auto;
    margin-right: auto;
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
  gap: 12px;
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
  
  svg {
    width: 20px;
    height: 20px;
  }
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
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
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
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 12px;
  color: #0f172a;
`;

const SectionHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
  flex-wrap: wrap;
`;

const SectionSubtitle = styled.p`
  margin: 0 0 20px;
  color: #64748b;
  font-size: 0.875rem;
`;

const SmallMuted = styled.p`
  margin: 6px 0 0;
  color: #94a3b8;
  font-size: 0.8rem;
`;

const TwoColumnGrid = styled.div`
  display: grid;
  gap: 20px;
  margin-top: 12px;

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
`;

const InfoPanel = styled.div`
  border-radius: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.7);
  background: radial-gradient(circle at top left, #eff6ff, #f9fafb);
  padding: 16px 18px;
`;

const EnvSidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const InfoTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
`;

const HelpList = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 0.9rem;
  color: #475569;

  li + li {
    margin-top: 4px;
  }
`;

const InlineCode = styled.code`
  font-family: "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  background: #e2e8f0;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 0.8rem;
`;

const EnvGroup = styled.div`
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 14px 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  margin-bottom: 16px;
`;

const EnvGroupTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
`;

const EnvToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
`;

const EnvCategoriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 24px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EnvCategoryCard = styled.div<{ $collapsed: boolean }>`
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #ffffff;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: fit-content;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: rgba(148, 163, 184, 0.5);
  }
`;

const EnvCategoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  }
`;

const EnvCategoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
`;

const EnvCategoryIcon = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  transition: transform 0.2s ease;
`;

const EnvCategoryCount = styled.span`
  font-size: 0.875rem;
  font-weight: 400;
  color: #64748b;
`;

const EnvCategoryToggle = styled.span`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const EnvCategoryContent = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow-y: auto;
`;

const EnvFieldWrapper = styled.div<{ $hasError: boolean; $required: boolean }>`
  padding: 16px;
  border-radius: 8px;
  background: ${({ $hasError }) => ($hasError ? "#fef2f2" : "#fafafa")};
  border: 1px solid ${({ $hasError, $required }) => 
    $hasError ? "#ef4444" : $required ? "rgba(59, 130, 246, 0.3)" : "rgba(148, 163, 184, 0.2)"};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $hasError }) => ($hasError ? "#ef4444" : "rgba(148, 163, 184, 0.4)")};
    background: ${({ $hasError }) => ($hasError ? "#fee2e2" : "#f8fafc")};
  }
`;

const EnvFieldHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const EnvFieldLabel = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const EnvRequiredBadge = styled.span`
  color: #ef4444;
  font-weight: 700;
`;

const EnvSensitiveBadge = styled.span`
  font-size: 0.875rem;
`;

const EnvTogglePassword = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(148, 163, 184, 0.1);
  }
`;

const EnvFieldDescription = styled.p`
  font-size: 0.8rem;
  color: #64748b;
  margin: 0 0 10px 0;
  line-height: 1.4;
`;

const EnvFieldError = styled.div`
  font-size: 0.8rem;
  color: #ef4444;
  margin-top: 6px;
  font-weight: 500;
`;

const EnvFieldWarning = styled.div`
  font-size: 0.8rem;
  color: #f59e0b;
  margin-top: 6px;
  font-weight: 500;
`;

const EnvFieldExamples = styled.div`
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 8px;
  font-style: italic;
`;

const EnvInput = styled.input<{ $hasError?: boolean; $isEmpty?: boolean }>`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $hasError, $isEmpty }) => 
    $hasError ? "#ef4444" : $isEmpty ? "rgba(148, 163, 184, 0.3)" : "rgba(148, 163, 184, 0.4)"};
  background: #ffffff;
  font-size: 0.9rem;
  color: #0f172a;
  transition: all 0.2s ease;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${({ $hasError }) => ($hasError ? "#ef4444" : "#3b82f6")};
    box-shadow: 0 0 0 3px ${({ $hasError }) => ($hasError ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)")};
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const EnvHintBox = styled.div`
  border-radius: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #ecfdf5, #f0f9ff);
  border: 1px solid rgba(34, 197, 94, 0.4);
`;

const Pill = styled.span<{ $tone: "info" | "warning" }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${(p) => (p.$tone === "info" ? "rgba(59,130,246,0.08)" : "rgba(245,158,11,0.08)")};
  color: ${(p) => (p.$tone === "info" ? "#1d4ed8" : "#b45309")};
  border: 1px solid ${(p) => (p.$tone === "info" ? "rgba(59,130,246,0.35)" : "rgba(245,158,11,0.35)")};
`;

const EnvStatusRow = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const EnvStatusCard = styled.div`
  border-radius: 999px;
  padding: 8px 14px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const EnvStatusLabel = styled.span`
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
`;

const EnvStatusValue = styled.span<{ $active: boolean }>`
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${(p) => (p.$active ? "rgba(22,163,74,0.12)" : "rgba(148,163,184,0.15)")};
  color: ${(p) => (p.$active ? "#166534" : "#475569")};
`;

const EnvSectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
`;

const EnvSectionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: #3b82f6;
    background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
`;

const EnvSectionIcon = styled.div`
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: #3b82f6;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const EnvSectionButtonContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EnvSectionButtonTitle = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
`;

const EnvSectionButtonStatus = styled.span<{ $active: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${(p) => (p.$active ? "#22c55e" : "#64748b")};
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

// Estilos para exibição da versão do sistema
const VersionCard = styled.div`
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
`;

const VersionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const VersionTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
`;

const VersionLoading = styled.span`
  font-size: 0.875rem;
  color: #64748b;
  font-style: italic;
`;

const VersionInfo = styled.div`
  display: grid;
  gap: 12px;
`;

const VersionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const VersionLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  min-width: 80px;
`;

const VersionValue = styled.span`
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 500;
`;

const VersionBadge = styled.span<{ $variant?: "tag" }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 700;
  background: ${(p) => (p.$variant === "tag" ? "rgba(139, 92, 246, 0.15)" : "rgba(59, 130, 246, 0.15)")};
  color: ${(p) => (p.$variant === "tag" ? "#7c3aed" : "#1d4ed8")};
  border: 1px solid ${(p) => (p.$variant === "tag" ? "rgba(139, 92, 246, 0.3)" : "rgba(59, 130, 246, 0.3)")};
`;

const VersionCode = styled.code`
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
  color: #1e293b;
  border: 1px solid rgba(15, 23, 42, 0.15);
`;

const VersionDate = styled.span`
  font-size: 0.8rem;
  color: #64748b;
  margin-left: 4px;
`;

// Estilos do modal de criação/gestão de formulário
const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 25;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  width: min(680px, 96vw);
  max-height: min(80vh, 720px);
  overflow-y: auto;
  padding: 18px;
  transition: opacity .18s ease, transform .18s ease;
  z-index: 26;
`;

const PageModalDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  width: min(95vw, 1400px);
  max-width: 95vw;
  max-height: min(95vh, 900px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: opacity .2s ease, transform .2s ease;
  z-index: 26;
`;

const PageModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
`;

const PageModalIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
`;

const PageModalTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
`;

const PageModalSubtitle = styled.p`
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.4;
`;

const PageModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const PageFormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const PageSectionTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(59, 130, 246, 0.1);
`;

const PageBuilderContainer = styled.div`
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: #f8fafc;
  padding: 20px;
  min-height: 500px;
`;

const EmptyBuilderState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background: #fff;
  border: 2px dashed rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  margin-top: 20px;
`;

const PageModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 32px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: #f8fafc;
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
  
  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
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

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { background: #f8fafc; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const ConfirmButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  font-size: 0.9rem;
  transition: background .15s ease, transform .05s ease;
  &:hover { 
    background: linear-gradient(135deg, var(--primary-700), var(--primary-900));
  }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  font-size: 1rem;
  cursor: pointer;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.06);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
  margin: 32px 0;
`;

const BackupsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);

  thead {
    background: #f8fafc;
    border-bottom: 2px solid var(--border);
  }

  th {
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  tbody tr {
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    transition: background 0.15s ease;

    &:hover {
      background: #f8fafc;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  td {
    padding: 12px 16px;
    font-size: 0.9rem;
    color: #1f2937;
    vertical-align: middle;
  }
`;
