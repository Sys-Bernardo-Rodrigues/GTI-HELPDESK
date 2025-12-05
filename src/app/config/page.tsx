"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";
import StandardLayout from "@/components/StandardLayout";


type SectionKey = "general" | "appearance" | "notifications" | "security" | "integrations" | "forms" | "webhooks" | "update" | "env";

export default function ConfigPage() {
  const params = useSearchParams();
  const router = useRouter();
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

  // Estado de configuração de ambiente (.env) - Nova implementação
  // IMPORTANTE: Declarar antes dos useEffects que o utilizam
  const [envConfig, setEnvConfig] = useState<Record<string, string>>({});
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envSuccess, setEnvSuccess] = useState<string | null>(null);
  const [envSearchQuery, setEnvSearchQuery] = useState("");

  // Estado da atualização via GitHub
  const [updateRepoUrl, setUpdateRepoUrl] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setEnvSuccess(data?.message || "Configurações salvas. Reinicie o servidor para aplicar.");
      setTimeout(() => setEnvSuccess(null), 5000);
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao salvar configurações");
    } finally {
      setEnvSaving(false);
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

  // Carregar ao entrar na seção
  useEffect(() => {
    if (section === "forms") {
      loadUsers();
      loadForms();
    } else if (section === "webhooks") {
      loadWebhooks();
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

  


  function formatDateTime(value?: string): string {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

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
      setUpdateFeedback({
        type: "error",
        text: err?.message || "Erro ao iniciar atualização.",
      });
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
      setEnvSuccess(data?.message || "Configurações salvas. Reinicie o servidor para aplicar.");
      setTimeout(() => setEnvSuccess(null), 5000);
    } catch (err: any) {
      setEnvError(err?.message || "Erro ao salvar configurações");
    } finally {
      setEnvSaving(false);
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
                  >
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
        // Lista de todas as variáveis permitidas, organizadas por categoria
        const envCategories = [
          {
            title: "E-mail (SMTP)",
            keys: ["EMAIL_ENABLED", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM", "EMAIL_FROM_NAME"],
          },
          {
            title: "Inteligência Artificial",
            keys: ["LOCAL_AI_ENABLED", "LOCAL_AI_URL", "LOCAL_AI_MODEL", "LOCAL_AI_TIMEOUT_MS", "LOCAL_AI_PORT"],
          },
          {
            title: "Banco de Dados",
            keys: ["DATABASE_URL", "SHADOW_DATABASE_URL", "DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"],
          },
          {
            title: "URLs e Ambiente",
            keys: ["APP_URL", "NEXT_PUBLIC_APP_URL", "PUBLIC_APP_URL", "NODE_ENV"],
          },
          {
            title: "Segurança e Usuários",
            keys: ["AUTH_SECRET", "DEFAULT_USER_EMAIL", "DEFAULT_USER_PASSWORD", "DEFAULT_USER_NAME", "DEFAULT_USER_TWO_FACTOR"],
          },
          {
            title: "Docker",
            keys: ["USE_DOCKER_DB", "USE_DOCKER_OLLAMA"],
          },
          {
            title: "Operações Avançadas",
            keys: ["ALLOW_GIT_UPDATE", "ALLOWED_REPO_URL", "ALLOW_ENV_EDIT"],
          },
        ];

        // Filtrar variáveis baseado na busca
        const filteredCategories = envCategories.map((cat) => ({
          ...cat,
          keys: cat.keys.filter((key) =>
            envSearchQuery.trim() === "" || key.toLowerCase().includes(envSearchQuery.toLowerCase())
          ),
        })).filter((cat) => cat.keys.length > 0);

        // Determinar tipo de input baseado na chave
        const getInputType = (key: string): string => {
          if (key.includes("PASSWORD") || key.includes("SECRET")) return "password";
          if (key.includes("EMAIL")) return "email";
          if (key.includes("URL")) return "url";
          return "text";
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
                <Field style={{ marginBottom: 20 }}>
                  <Label htmlFor="env-search">Buscar variável</Label>
                  <Input
                    id="env-search"
                    type="text"
                    placeholder="Digite o nome da variável..."
                    value={envSearchQuery}
                    onChange={(e) => setEnvSearchQuery((e.currentTarget as any).value ?? "")}
                  />
                </Field>

                {filteredCategories.map((category) => (
                  <EnvGroup key={category.title} style={{ marginBottom: 20 }}>
                    <EnvGroupTitle>{category.title}</EnvGroupTitle>
                    {category.keys.map((key) => (
                      <Field key={key}>
                        <Label htmlFor={`env-${key}`}>{key}</Label>
                        <Input
                          id={`env-${key}`}
                          type={getInputType(key)}
                          value={envConfig[key] ?? ""}
                          onChange={(e) =>
                            setEnvConfig((prev) => ({
                              ...prev,
                              [key]: (e.currentTarget as any).value ?? "",
                            }))
                          }
                        />
                      </Field>
                    ))}
                  </EnvGroup>
                ))}

                {filteredCategories.length === 0 && envSearchQuery.trim() !== "" && (
                  <Muted>Nenhuma variável encontrada para "{envSearchQuery}".</Muted>
                )}

                <Actions style={{ marginTop: 24 }}>
                  <ActionButton type="button" onClick={loadEnvConfig} disabled={envLoading}>
                    Recarregar
                  </ActionButton>
                  <PrimaryButton type="button" onClick={saveEnvConfig} disabled={envSaving}>
                    {envSaving ? "Salvando..." : "Salvar configurações"}
                  </PrimaryButton>
                </Actions>

                <InfoPanel style={{ marginTop: 24 }}>
                  <InfoTitle>Informações importantes</InfoTitle>
                  <HelpList>
                    <li>Após salvar, reinicie o servidor para aplicar as mudanças.</li>
                    <li>Senhas e chaves secretas são mascaradas por segurança.</li>
                    <li>Certifique-se de que <InlineCode>ALLOW_ENV_EDIT=true</InlineCode> para permitir edição.</li>
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
      case "webhooks":
        return (
          <div>
            <SectionTitle>Webhooks</SectionTitle>
            <Muted>Configure webhooks para receber notificações de outros sistemas e criar tickets automaticamente.
            </Muted>
          </div>
        );
    }
  }, [section, loading, error, updateFeedback, updateLoading, updateRepoUrl, envLoading, envSaving, envError, envSuccess, envConfig, envSearchQuery]);

  const activeForm = manageFormId ? formsList.find((f) => f.id === manageFormId || f.numericId === manageFormId) ?? null : null;
  const activeWebhook = manageWebhookId ? webhooksList.find((w) => w.id === manageWebhookId) ?? null : null;
  const baseUrl = typeof globalThis !== "undefined" && (globalThis as any).window
    ? ((globalThis as any).window?.location?.origin ?? "")
    : "";

  return (
    <StandardLayout>
        <Content>
          {section !== "forms" && section !== "webhooks" && (
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
    </StandardLayout>
  );
}

const SECTIONS: SectionKey[] = ["general", "appearance", "notifications", "security", "integrations", "update", "env", "forms", "webhooks"];

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
