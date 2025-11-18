"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";
import NotificationBell from "@/components/NotificationBell";
import Link from "next/link";
import StandardLayout from "@/components/StandardLayout";

type DocumentItem = {
  id: number;
  title: string;
  content: string;
  category: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
};

type FileItem = {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  category: string | null;
  tags: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
};

type DocumentFormState = {
  title: string;
  content: string;
  category: string;
  tags: string;
};

type FileFormState = {
  category: string;
  tags: string;
  description: string;
};

type PasswordItem = {
  id: number;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  category: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string | null; email: string | null } | null;
};

type PasswordFormState = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
  tags: string;
};

type Feedback = { type: "success" | "error"; text: string };

const emptyDocument: DocumentFormState = {
  title: "",
  content: "",
  category: "",
  tags: "",
};

const FADE_IN = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function BasePage() {

  const [activeTab, setActiveTab] = useState<"documents" | "files" | "passwords">("documents");
  
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [documentItems, setDocumentItems] = useState<DocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [viewDocumentId, setViewDocumentId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DocumentFormState>(emptyDocument);
  const [editFeedback, setEditFeedback] = useState<Feedback | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [isEditOpen, setEditOpen] = useState<boolean>(false);

  const [createForm, setCreateForm] = useState<DocumentFormState>(emptyDocument);
  const [createFeedback, setCreateFeedback] = useState<Feedback | null>(null);
  const [creatingDocument, setCreatingDocument] = useState<boolean>(false);
  const [isCreateOpen, setCreateOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estados para arquivos
  const [filesLoading, setFilesLoading] = useState<boolean>(false);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [viewFileId, setViewFileId] = useState<number | null>(null);
  const [fileEditForm, setFileEditForm] = useState<FileFormState>({ category: "", tags: "", description: "" });
  const [fileEditFeedback, setFileEditFeedback] = useState<Feedback | null>(null);
  const [savingFileEdit, setSavingFileEdit] = useState<boolean>(false);
  const [isFileEditOpen, setFileEditOpen] = useState<boolean>(false);
  const [isFileUploadOpen, setFileUploadOpen] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadForm, setFileUploadForm] = useState<FileFormState>({ category: "", tags: "", description: "" });
  const [fileUploadFeedback, setFileUploadFeedback] = useState<Feedback | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>("");
  const [fileFilterCategory, setFileFilterCategory] = useState<string>("");
  const [fileSortBy, setFileSortBy] = useState<"updatedAt" | "createdAt" | "originalName" | "size">("updatedAt");
  const [fileSortOrder, setFileSortOrder] = useState<"asc" | "desc">("desc");
  const [fileFilterType, setFileFilterType] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Estados para senhas
  const [passwordsLoading, setPasswordsLoading] = useState<boolean>(false);
  const [passwordItems, setPasswordItems] = useState<PasswordItem[]>([]);
  const [selectedPasswordId, setSelectedPasswordId] = useState<number | null>(null);
  const [viewPasswordId, setViewPasswordId] = useState<number | null>(null);
  const [passwordEditForm, setPasswordEditForm] = useState<PasswordFormState>({ title: "", username: "", password: "", url: "", notes: "", category: "", tags: "" });
  const [passwordEditFeedback, setPasswordEditFeedback] = useState<Feedback | null>(null);
  const [savingPasswordEdit, setSavingPasswordEdit] = useState<boolean>(false);
  const [isPasswordEditOpen, setPasswordEditOpen] = useState<boolean>(false);
  const [isPasswordCreateOpen, setPasswordCreateOpen] = useState<boolean>(false);
  const [passwordCreateForm, setPasswordCreateForm] = useState<PasswordFormState>({ title: "", username: "", password: "", url: "", notes: "", category: "", tags: "" });
  const [passwordCreateFeedback, setPasswordCreateFeedback] = useState<Feedback | null>(null);
  const [creatingPassword, setCreatingPassword] = useState<boolean>(false);
  const [passwordSearchQuery, setPasswordSearchQuery] = useState<string>("");
  const [passwordFilterCategory, setPasswordFilterCategory] = useState<string>("");
  const [passwordSortBy, setPasswordSortBy] = useState<"updatedAt" | "createdAt" | "title">("updatedAt");
  const [passwordSortOrder, setPasswordSortOrder] = useState<"asc" | "desc">("desc");
  const [passwordVisibility, setPasswordVisibility] = useState<Record<number, boolean>>({});


  useEffect(() => {
    if (activeTab === "documents") {
      loadDocuments();
    } else if (activeTab === "files") {
      loadFiles();
    } else if (activeTab === "passwords") {
      loadPasswords();
    }
  }, [activeTab]);




  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        loadDocuments(false);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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

  function mapDocument(item: any): DocumentItem {
    return {
      id: Number(item.id),
      title: String(item.title || ""),
      content: String(item.content || ""),
      category: item.category ? String(item.category) : null,
      tags: item.tags ? String(item.tags) : null,
      createdAt: String(item.createdAt || ""),
      updatedAt: String(item.updatedAt || ""),
      createdBy: item.createdBy ? {
        id: Number(item.createdBy.id),
        name: item.createdBy.name ? String(item.createdBy.name) : null,
        email: item.createdBy.email ? String(item.createdBy.email) : null,
      } : null,
    };
  }

  async function loadDocuments(withSpinner = true) {
    if (withSpinner) setListLoading(true);
    try {
      const res = await fetch("/api/base");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao carregar documentos.");
      }
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = items.map(mapDocument);
      setDocumentItems(mapped);
      if (selectedDocumentId) {
        const current = mapped.find((item) => item.id === selectedDocumentId);
        if (current) {
          setEditForm({
            title: current.title,
            content: current.content,
            category: current.category || "",
            tags: current.tags || "",
          });
        } else {
          setSelectedDocumentId(null);
          setEditForm(emptyDocument);
          setEditOpen(false);
        }
      }
      setEditFeedback(null);
    } catch (error: any) {
      setEditFeedback({ type: "error", text: error?.message || "Erro ao carregar documentos." });
    } finally {
      setListLoading(false);
    }
  }

  function openViewModal(documentId: number) {
    setViewDocumentId(documentId);
  }

  function closeViewModal() {
    setViewDocumentId(null);
  }

  function openEditModal(documentId: number) {
    const item = documentItems.find((d) => d.id === documentId);
    if (!item) return;
    setSelectedDocumentId(documentId);
    setEditForm({
      title: item.title,
      content: item.content,
      category: item.category || "",
      tags: item.tags || "",
    });
    setEditFeedback(null);
    setEditOpen(true);
  }

  function closeEditModal() {
    if (savingEdit) return;
    setEditOpen(false);
    setEditFeedback(null);
  }

  function updateEditField<K extends keyof DocumentFormState>(field: K, value: DocumentFormState[K]) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditFeedback(null);
  }

  async function saveDocument() {
    if (!selectedDocumentId) return;
    if (!editForm.title.trim()) {
      setEditFeedback({ type: "error", text: "Informe o título do documento." });
      return;
    }
    setSavingEdit(true);
    setEditFeedback(null);
    try {
      const res = await fetch(`/api/base/${selectedDocumentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao salvar documento.");
      }
      const updated = mapDocument(await res.json());
      setDocumentItems((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedDocumentId(updated.id);
      setEditForm({
        title: updated.title,
        content: updated.content,
        category: updated.category || "",
        tags: updated.tags || "",
      });
      setEditFeedback({ type: "success", text: "Documento atualizado com sucesso." });
      setTimeout(() => setEditOpen(false), 1000);
    } catch (error: any) {
      setEditFeedback({ type: "error", text: error?.message || "Erro ao salvar documento." });
    } finally {
      setSavingEdit(false);
    }
  }

  function updateCreateField<K extends keyof DocumentFormState>(field: K, value: DocumentFormState[K]) {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateFeedback(null);
  }

  function openCreateModal() {
    setCreateForm(emptyDocument);
    setCreateFeedback(null);
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (creatingDocument) return;
    setCreateOpen(false);
    setCreateFeedback(null);
  }

  async function createDocument() {
    if (!createForm.title.trim()) {
      setCreateFeedback({ type: "error", text: "Informe o título do documento." });
      return;
    }
    if (!createForm.content.trim()) {
      setCreateFeedback({ type: "error", text: "Informe o conteúdo do documento." });
      return;
    }

    setCreatingDocument(true);
    setCreateFeedback(null);
    try {
      const payload = {
        title: createForm.title,
        content: createForm.content,
        category: createForm.category || null,
        tags: createForm.tags || null,
      };
      const res = await fetch("/api/base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao criar documento.");
      }
      const created = mapDocument(await res.json());
      setDocumentItems((items) => [created, ...items]);
      setSelectedDocumentId(created.id);
      setEditForm({
        title: created.title,
        content: created.content,
        category: created.category || "",
        tags: created.tags || "",
      });
      setCreateFeedback({ type: "success", text: "Documento criado com sucesso." });
      setCreateForm(emptyDocument);
      setTimeout(() => setCreateOpen(false), 1000);
    } catch (error: any) {
      setCreateFeedback({ type: "error", text: error?.message || "Erro ao criar documento." });
    } finally {
      setCreatingDocument(false);
    }
  }

  async function deleteDocument(documentId: number) {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      const res = await fetch(`/api/base/${documentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao excluir documento.");
      }
      setDocumentItems((items) => items.filter((item) => item.id !== documentId));
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(null);
        setEditForm(emptyDocument);
        setEditOpen(false);
      }
      if (viewDocumentId === documentId) {
        setViewDocumentId(null);
      }
    } catch (error: any) {
      alert(error?.message || "Erro ao excluir documento.");
    }
  }


  function formatDateTime(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return "-";
    try {
      const d = new Date(value);
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
    } catch {
      return String(value);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  function mapPassword(item: any): PasswordItem {
    return {
      id: Number(item.id),
      title: String(item.title || ""),
      username: item.username ? String(item.username) : null,
      password: String(item.password || ""),
      url: item.url ? String(item.url) : null,
      notes: item.notes ? String(item.notes) : null,
      category: item.category ? String(item.category) : null,
      tags: item.tags ? String(item.tags) : null,
      createdAt: String(item.createdAt || ""),
      updatedAt: String(item.updatedAt || ""),
      createdBy: item.createdBy ? {
        id: Number(item.createdBy.id),
        name: item.createdBy.name ? String(item.createdBy.name) : null,
        email: item.createdBy.email ? String(item.createdBy.email) : null,
      } : null,
    };
  }

  async function loadPasswords(withSpinner = true) {
    if (withSpinner) setPasswordsLoading(true);
    try {
      const res = await fetch("/api/base/passwords");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao carregar senhas.");
      }
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = items.map(mapPassword);
      setPasswordItems(mapped);
      if (selectedPasswordId) {
        const current = mapped.find((item) => item.id === selectedPasswordId);
        if (current) {
          setPasswordEditForm({
            title: current.title,
            username: current.username || "",
            password: current.password,
            url: current.url || "",
            notes: current.notes || "",
            category: current.category || "",
            tags: current.tags || "",
          });
        } else {
          setSelectedPasswordId(null);
          setPasswordEditForm({ title: "", username: "", password: "", url: "", notes: "", category: "", tags: "" });
          setPasswordEditOpen(false);
        }
      }
      setPasswordEditFeedback(null);
    } catch (error: any) {
      setPasswordEditFeedback({ type: "error", text: error?.message || "Erro ao carregar senhas." });
    } finally {
      setPasswordsLoading(false);
    }
  }

  function openPasswordView(passwordId: number) {
    setViewPasswordId(passwordId);
  }

  function closePasswordView() {
    setViewPasswordId(null);
  }

  function openPasswordEditModal(passwordId: number) {
    const item = passwordItems.find((p) => p.id === passwordId);
    if (!item) return;
    setSelectedPasswordId(passwordId);
    setPasswordEditForm({
      title: item.title,
      username: item.username || "",
      password: item.password,
      url: item.url || "",
      notes: item.notes || "",
      category: item.category || "",
      tags: item.tags || "",
    });
    setPasswordEditFeedback(null);
    setPasswordEditOpen(true);
  }

  function closePasswordEditModal() {
    if (savingPasswordEdit) return;
    setPasswordEditOpen(false);
    setPasswordEditFeedback(null);
  }

  function updatePasswordEditField<K extends keyof PasswordFormState>(field: K, value: PasswordFormState[K]) {
    setPasswordEditForm((prev) => ({ ...prev, [field]: value }));
    setPasswordEditFeedback(null);
  }

  async function savePassword() {
    if (!selectedPasswordId) return;
    if (!passwordEditForm.title.trim()) {
      setPasswordEditFeedback({ type: "error", text: "Informe o título da senha." });
      return;
    }
    if (!passwordEditForm.password.trim()) {
      setPasswordEditFeedback({ type: "error", text: "Informe a senha." });
      return;
    }
    setSavingPasswordEdit(true);
    setPasswordEditFeedback(null);
    try {
      const res = await fetch(`/api/base/passwords/${selectedPasswordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordEditForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao salvar senha.");
      }
      const updated = mapPassword(await res.json());
      setPasswordItems((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedPasswordId(updated.id);
      setPasswordEditForm({
        title: updated.title,
        username: updated.username || "",
        password: updated.password,
        url: updated.url || "",
        notes: updated.notes || "",
        category: updated.category || "",
        tags: updated.tags || "",
      });
      setPasswordEditFeedback({ type: "success", text: "Senha atualizada com sucesso!" });
      setTimeout(() => {
        closePasswordEditModal();
        loadPasswords(false);
      }, 1000);
    } catch (error: any) {
      setPasswordEditFeedback({ type: "error", text: error?.message || "Erro ao salvar senha." });
    } finally {
      setSavingPasswordEdit(false);
    }
  }

  function openPasswordCreateModal() {
    setPasswordCreateForm({ title: "", username: "", password: "", url: "", notes: "", category: "", tags: "" });
    setPasswordCreateFeedback(null);
    setPasswordCreateOpen(true);
  }

  function closePasswordCreateModal() {
    if (creatingPassword) return;
    setPasswordCreateOpen(false);
    setPasswordCreateFeedback(null);
  }

  function updatePasswordCreateField<K extends keyof PasswordFormState>(field: K, value: PasswordFormState[K]) {
    setPasswordCreateForm((prev) => ({ ...prev, [field]: value }));
    setPasswordCreateFeedback(null);
  }

  async function createPassword() {
    if (!passwordCreateForm.title.trim()) {
      setPasswordCreateFeedback({ type: "error", text: "Informe o título da senha." });
      return;
    }
    if (!passwordCreateForm.password.trim()) {
      setPasswordCreateFeedback({ type: "error", text: "Informe a senha." });
      return;
    }
    setCreatingPassword(true);
    setPasswordCreateFeedback(null);
    try {
      const res = await fetch("/api/base/passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordCreateForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao criar senha.");
      }
      const created = mapPassword(await res.json());
      setPasswordItems((items) => [created, ...items]);
      setPasswordCreateFeedback({ type: "success", text: "Senha criada com sucesso!" });
      setTimeout(() => {
        closePasswordCreateModal();
        loadPasswords(false);
      }, 1000);
    } catch (error: any) {
      setPasswordCreateFeedback({ type: "error", text: error?.message || "Erro ao criar senha." });
    } finally {
      setCreatingPassword(false);
    }
  }

  async function deletePassword(passwordId: number) {
    if (!confirm("Tem certeza que deseja excluir esta senha?")) return;
    try {
      const res = await fetch(`/api/base/passwords/${passwordId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao excluir senha.");
      }
      setPasswordItems((items) => items.filter((item) => item.id !== passwordId));
      if (selectedPasswordId === passwordId) {
        setSelectedPasswordId(null);
        setPasswordEditForm({ title: "", username: "", password: "", url: "", notes: "", category: "", tags: "" });
        setPasswordEditOpen(false);
      }
      if (viewPasswordId === passwordId) {
        setViewPasswordId(null);
      }
    } catch (error: any) {
      alert(error?.message || "Erro ao excluir senha.");
    }
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password).then(() => {
      // Feedback visual pode ser adicionado aqui
    }).catch(() => {
      alert("Erro ao copiar senha.");
    });
  }

  function togglePasswordVisibility(passwordId: number) {
    setPasswordVisibility((prev) => ({ ...prev, [passwordId]: !prev[passwordId] }));
  }

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📽️";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("gzip")) return "📦";
    return "📎";
  }

  function mapFile(item: any): FileItem {
    return {
      id: Number(item.id),
      name: String(item.name || ""),
      originalName: String(item.originalName || ""),
      mimeType: String(item.mimeType || ""),
      size: Number(item.size || 0),
      path: String(item.path || ""),
      category: item.category ? String(item.category) : null,
      tags: item.tags ? String(item.tags) : null,
      description: item.description ? String(item.description) : null,
      createdAt: String(item.createdAt || ""),
      updatedAt: String(item.updatedAt || ""),
      createdBy: item.createdBy ? {
        id: Number(item.createdBy.id),
        name: item.createdBy.name ? String(item.createdBy.name) : null,
        email: item.createdBy.email ? String(item.createdBy.email) : null,
      } : null,
    };
  }

  async function loadFiles(withSpinner = true) {
    if (withSpinner) setFilesLoading(true);
    try {
      const res = await fetch("/api/base/files");
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao carregar arquivos.");
      }
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      const mapped = items.map(mapFile);
      setFileItems(mapped);
      if (selectedFileId) {
        const current = mapped.find((item) => item.id === selectedFileId);
        if (current) {
          setFileEditForm({
            category: current.category || "",
            tags: current.tags || "",
            description: current.description || "",
          });
        } else {
          setSelectedFileId(null);
          setFileEditForm({ category: "", tags: "", description: "" });
          setFileEditOpen(false);
        }
      }
      setFileEditFeedback(null);
    } catch (error: any) {
      setFileEditFeedback({ type: "error", text: error?.message || "Erro ao carregar arquivos." });
    } finally {
      setFilesLoading(false);
    }
  }

  function openFileUploadModal() {
    setSelectedFile(null);
    setFileUploadForm({ category: "", tags: "", description: "" });
    setFileUploadFeedback(null);
    setUploadProgress(0);
    setFileUploadOpen(true);
  }

  function closeFileUploadModal() {
    if (uploadingFile) return;
    setFileUploadOpen(false);
    setSelectedFile(null);
    setFileUploadForm({ category: "", tags: "", description: "" });
    setFileUploadFeedback(null);
    setUploadProgress(0);
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileUploadFeedback(null);
    }
  }

  async function uploadFile() {
    if (!selectedFile) {
      setFileUploadFeedback({ type: "error", text: "Selecione um arquivo para enviar." });
      return;
    }

    setUploadingFile(true);
    setFileUploadFeedback(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (fileUploadForm.category) formData.append("category", fileUploadForm.category);
      if (fileUploadForm.tags) formData.append("tags", fileUploadForm.tags);
      if (fileUploadForm.description) formData.append("description", fileUploadForm.description);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<FileItem>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              resolve(mapFile(json));
            } catch (error) {
              reject(new Error("Resposta inválida do servidor"));
            }
          } else {
            try {
              const json = JSON.parse(xhr.responseText);
              reject(new Error(json?.error || "Erro ao fazer upload"));
            } catch {
              reject(new Error("Erro ao fazer upload"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Erro de conexão")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelado")));
      });

      xhr.open("POST", "/api/base/files");
      xhr.send(formData);

      const uploaded = await uploadPromise;
      setFileItems((items) => [uploaded, ...items]);
      setFileUploadFeedback({ type: "success", text: "Arquivo enviado com sucesso!" });
      setSelectedFile(null);
      setFileUploadForm({ category: "", tags: "", description: "" });
      setTimeout(() => {
        closeFileUploadModal();
        setUploadProgress(0);
      }, 1500);
    } catch (error: any) {
      setFileUploadFeedback({ type: "error", text: error?.message || "Erro ao fazer upload do arquivo." });
      setUploadProgress(0);
    } finally {
      setUploadingFile(false);
    }
  }

  function openFileEditModal(fileId: number) {
    const item = fileItems.find((f) => f.id === fileId);
    if (!item) return;
    setSelectedFileId(fileId);
    setFileEditForm({
      category: item.category || "",
      tags: item.tags || "",
      description: item.description || "",
    });
    setFileEditFeedback(null);
    setFileEditOpen(true);
  }

  function closeFileEditModal() {
    if (savingFileEdit) return;
    setFileEditOpen(false);
    setFileEditFeedback(null);
  }

  function updateFileEditField<K extends keyof FileFormState>(field: K, value: FileFormState[K]) {
    setFileEditForm((prev) => ({ ...prev, [field]: value }));
    setFileEditFeedback(null);
  }

  async function saveFile() {
    if (!selectedFileId) return;
    setSavingFileEdit(true);
    setFileEditFeedback(null);
    try {
      const res = await fetch(`/api/base/files/${selectedFileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileEditForm),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao salvar arquivo.");
      }
      const updated = mapFile(await res.json());
      setFileItems((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedFileId(updated.id);
      setFileEditForm({
        category: updated.category || "",
        tags: updated.tags || "",
        description: updated.description || "",
      });
      setFileEditFeedback({ type: "success", text: "Arquivo atualizado com sucesso." });
      setTimeout(() => setFileEditOpen(false), 1000);
    } catch (error: any) {
      setFileEditFeedback({ type: "error", text: error?.message || "Erro ao salvar arquivo." });
    } finally {
      setSavingFileEdit(false);
    }
  }

  async function deleteFile(fileId: number) {
    if (!confirm("Tem certeza que deseja excluir este arquivo?")) return;
    try {
      const res = await fetch(`/api/base/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erro ao excluir arquivo.");
      }
      setFileItems((items) => items.filter((item) => item.id !== fileId));
      if (selectedFileId === fileId) {
        setSelectedFileId(null);
        setFileEditForm({ category: "", tags: "", description: "" });
        setFileEditOpen(false);
      }
      if (viewFileId === fileId) {
        setViewFileId(null);
      }
    } catch (error: any) {
      alert(error?.message || "Erro ao excluir arquivo.");
    }
  }

  function openFileView(fileId: number) {
    setViewFileId(fileId);
  }

  function closeFileView() {
    setViewFileId(null);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (activeTab === "files" && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileUploadForm({ category: "", tags: "", description: "" });
      setFileUploadFeedback(null);
      setUploadProgress(0);
      setFileUploadOpen(true);
    }
  }

  const categories = Array.from(new Set(documentItems.map((d) => d.category).filter((c): c is string => !!c)));
  const filteredDocuments = documentItems
    .filter((doc) => {
      const matchesSearch = !searchQuery || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.tags && doc.tags.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !filterCategory || doc.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "title") {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (sortBy === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  const fileCategories = Array.from(new Set(fileItems.map((f) => f.category).filter((c): c is string => !!c)));
  const fileTypes = Array.from(new Set(fileItems.map((f) => {
    if (f.mimeType.startsWith("image/")) return "Imagem";
    if (f.mimeType.startsWith("video/")) return "Vídeo";
    if (f.mimeType === "application/pdf") return "PDF";
    if (f.mimeType.includes("word") || f.mimeType.includes("document")) return "Documento";
    if (f.mimeType.includes("excel") || f.mimeType.includes("spreadsheet") || f.mimeType === "text/csv") return "Planilha";
    if (f.mimeType.includes("powerpoint") || f.mimeType.includes("presentation")) return "Apresentação";
    if (f.mimeType.includes("zip") || f.mimeType.includes("rar") || f.mimeType.includes("7z")) return "Arquivo Compactado";
    return "Outro";
  })));
  
  const filteredFiles = fileItems
    .filter((file) => {
      const matchesSearch = !fileSearchQuery || 
        file.originalName.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
        (file.description && file.description.toLowerCase().includes(fileSearchQuery.toLowerCase())) ||
        (file.tags && file.tags.toLowerCase().includes(fileSearchQuery.toLowerCase()));
      const matchesCategory = !fileFilterCategory || file.category === fileFilterCategory;
      const matchesType = !fileFilterType || (() => {
        const type = file.mimeType.startsWith("image/") ? "Imagem" :
          file.mimeType.startsWith("video/") ? "Vídeo" :
          file.mimeType === "application/pdf" ? "PDF" :
          file.mimeType.includes("word") || file.mimeType.includes("document") ? "Documento" :
          file.mimeType.includes("excel") || file.mimeType.includes("spreadsheet") || file.mimeType === "text/csv" ? "Planilha" :
          file.mimeType.includes("powerpoint") || file.mimeType.includes("presentation") ? "Apresentação" :
          file.mimeType.includes("zip") || file.mimeType.includes("rar") || file.mimeType.includes("7z") ? "Arquivo Compactado" :
          "Outro";
        return type === fileFilterType;
      })();
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      if (fileSortBy === "originalName") {
        aVal = a.originalName.toLowerCase();
        bVal = b.originalName.toLowerCase();
      } else if (fileSortBy === "size") {
        aVal = a.size;
        bVal = b.size;
      } else if (fileSortBy === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }
      if (fileSortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  const passwordCategories = Array.from(new Set(passwordItems.map((p) => p.category).filter((c): c is string => !!c)));
  const filteredPasswords = passwordItems
    .filter((password) => {
      const matchesSearch = !passwordSearchQuery || 
        password.title.toLowerCase().includes(passwordSearchQuery.toLowerCase()) ||
        (password.username && password.username.toLowerCase().includes(passwordSearchQuery.toLowerCase())) ||
        (password.url && password.url.toLowerCase().includes(passwordSearchQuery.toLowerCase())) ||
        (password.notes && password.notes.toLowerCase().includes(passwordSearchQuery.toLowerCase())) ||
        (password.tags && password.tags.toLowerCase().includes(passwordSearchQuery.toLowerCase()));
      const matchesCategory = !passwordFilterCategory || password.category === passwordFilterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;
      if (passwordSortBy === "title") {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else if (passwordSortBy === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      } else {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }
      if (passwordSortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  const viewDocument = viewDocumentId ? documentItems.find(d => d.id === viewDocumentId) : null;
  const viewFile = viewFileId ? fileItems.find(f => f.id === viewFileId) : null;
  const viewPassword = viewPasswordId ? passwordItems.find(p => p.id === viewPasswordId) : null;

  return (
    <StandardLayout>
      <Content>
          <MainCard>
            <CardHeader>
              <HeaderSection>
                <HeaderIcon aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle>Base de Conhecimento</CardTitle>
                </div>
              </HeaderSection>
              <HeaderActions>
                <ActionButton 
                  type="button" 
                  onClick={() => {
                    if (activeTab === "documents") loadDocuments();
                    else if (activeTab === "files") loadFiles();
                    else if (activeTab === "passwords") loadPasswords();
                  }} 
                  disabled={activeTab === "documents" ? listLoading : activeTab === "files" ? filesLoading : passwordsLoading} 
                  title="Recarregar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Recarregar
                </ActionButton>
                {activeTab === "documents" ? (
                  <PrimaryButton type="button" onClick={openCreateModal}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Novo documento
                  </PrimaryButton>
                ) : activeTab === "files" ? (
                  <PrimaryButton type="button" onClick={openFileUploadModal}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Enviar arquivo
                  </PrimaryButton>
                ) : (
                  <PrimaryButton type="button" onClick={openPasswordCreateModal}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Nova senha
                  </PrimaryButton>
                )}
              </HeaderActions>
            </CardHeader>
            <TabsContainer>
              <TabButton 
                type="button"
                $active={activeTab === "documents"}
                onClick={() => setActiveTab("documents")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Documentos
              </TabButton>
              <TabButton 
                type="button"
                $active={activeTab === "files"}
                onClick={() => setActiveTab("files")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Arquivos
              </TabButton>
              <TabButton 
                type="button"
                $active={activeTab === "passwords"}
                onClick={() => setActiveTab("passwords")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Senhas
              </TabButton>
            </TabsContainer>
            {(editFeedback || fileEditFeedback || passwordEditFeedback || passwordCreateFeedback) && !isEditOpen && !isCreateOpen && !isFileEditOpen && !isFileUploadOpen && !isPasswordEditOpen && !isPasswordCreateOpen && (
              <Feedback role={(editFeedback || fileEditFeedback || passwordEditFeedback || passwordCreateFeedback)?.type === "error" ? "alert" : "status"} $variant={(editFeedback || fileEditFeedback || passwordEditFeedback || passwordCreateFeedback)?.type || "success"}>
                {(editFeedback || fileEditFeedback || passwordEditFeedback || passwordCreateFeedback)?.text}
              </Feedback>
            )}
            {activeTab === "documents" ? (
              <>
                <FiltersBar>
                  <SearchWrapper>
                    <SearchIcon>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Buscar documentos por título, conteúdo ou tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </SearchWrapper>
                  {categories.length > 0 && (
                    <CategorySelect
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <option value="">Todas as categorias</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </CategorySelect>
                  )}
                  <SortSelect
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="updatedAt">Data de atualização</option>
                    <option value="createdAt">Data de criação</option>
                    <option value="title">Título</option>
                  </SortSelect>
                  <SortOrderButton
                    type="button"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {sortOrder === "asc" ? (
                        <path d="M12 5v14M5 12l7-7 7 7"/>
                      ) : (
                        <path d="M12 19V5M5 12l7 7 7-7"/>
                      )}
                    </svg>
                  </SortOrderButton>
                </FiltersBar>

                {listLoading ? (
              <LoadingState>
                <LoadingSpinner />
                <Muted>Carregando documentos...</Muted>
              </LoadingState>
            ) : filteredDocuments.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </EmptyIcon>
                <EmptyTitle>Nenhum documento encontrado</EmptyTitle>
                <EmptyText>
                  {searchQuery || filterCategory 
                    ? "Tente ajustar os filtros de busca para encontrar documentos."
                    : "Comece criando seu primeiro documento na base de conhecimento."}
                </EmptyText>
                {!searchQuery && !filterCategory && (
                  <PrimaryButton type="button" onClick={openCreateModal} style={{ marginTop: "16px" }}>
                    Criar primeiro documento
                  </PrimaryButton>
                )}
              </EmptyState>
            ) : (
              <DocumentsGrid>
                {filteredDocuments.map((item, index) => (
                  <DocumentCard key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                    <CardTop>
                      {item.category && (
                        <CategoryBadge>{item.category}</CategoryBadge>
                      )}
                      <CardActions>
                        <IconButton type="button" onClick={() => openViewModal(item.id)} title="Visualizar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </IconButton>
                        <IconButton type="button" onClick={() => openEditModal(item.id)} title="Editar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </IconButton>
                        <IconButton type="button" onClick={() => deleteDocument(item.id)} $danger title="Excluir">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </IconButton>
                      </CardActions>
                    </CardTop>
                    <CardBody onClick={() => openViewModal(item.id)}>
                      <DocumentTitle>{item.title}</DocumentTitle>
                      <DocumentPreview>{item.content.substring(0, 150)}{item.content.length > 150 ? "..." : ""}</DocumentPreview>
                      {item.tags && (
                        <TagsContainer>
                          {item.tags.split(",").map((tag, idx) => (
                            <Tag key={idx}>{tag.trim()}</Tag>
                          ))}
                        </TagsContainer>
                      )}
                    </CardBody>
                    <CardFooter>
                      <FooterInfo>
                        <AuthorInfo>
                          <AuthorAvatar>
                            {item.createdBy?.name?.[0] || item.createdBy?.email?.[0] || "?"}
                          </AuthorAvatar>
                          <AuthorName>{item.createdBy?.name || item.createdBy?.email || "Desconhecido"}</AuthorName>
                        </AuthorInfo>
                        <DateInfo>{formatDate(item.updatedAt)}</DateInfo>
                      </FooterInfo>
                    </CardFooter>
                  </DocumentCard>
                ))}
              </DocumentsGrid>
                )}
              </>
            ) : activeTab === "files" ? (
              <>
                <DropZone
                  $isDragging={isDragging}
                  $active={activeTab === "files"}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {isDragging && (
                    <DropZoneOverlay>
                      <DropZoneContent>
                        <DropZoneIcon>📤</DropZoneIcon>
                        <DropZoneText>Solte o arquivo aqui para fazer upload</DropZoneText>
                      </DropZoneContent>
                    </DropZoneOverlay>
                  )}
                </DropZone>
                <FiltersBar>
                  <SearchWrapper>
                    <SearchIcon>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Buscar arquivos por nome, descrição ou tags..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                    />
                  </SearchWrapper>
                  {fileCategories.length > 0 && (
                    <CategorySelect
                      value={fileFilterCategory}
                      onChange={(e) => setFileFilterCategory(e.target.value)}
                    >
                      <option value="">Todas as categorias</option>
                      {fileCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </CategorySelect>
                  )}
                  {fileTypes.length > 0 && (
                    <CategorySelect
                      value={fileFilterType}
                      onChange={(e) => setFileFilterType(e.target.value)}
                    >
                      <option value="">Todos os tipos</option>
                      {fileTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </CategorySelect>
                  )}
                  <SortSelect
                    value={fileSortBy}
                    onChange={(e) => setFileSortBy(e.target.value as any)}
                  >
                    <option value="updatedAt">Data de atualização</option>
                    <option value="createdAt">Data de criação</option>
                    <option value="originalName">Nome</option>
                    <option value="size">Tamanho</option>
                  </SortSelect>
                  <SortOrderButton
                    type="button"
                    onClick={() => setFileSortOrder(fileSortOrder === "asc" ? "desc" : "asc")}
                    title={fileSortOrder === "asc" ? "Crescente" : "Decrescente"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {fileSortOrder === "asc" ? (
                        <path d="M12 5v14M5 12l7-7 7 7"/>
                      ) : (
                        <path d="M12 19V5M5 12l7 7 7-7"/>
                      )}
                    </svg>
                  </SortOrderButton>
                </FiltersBar>

                {filesLoading ? (
                  <LoadingState>
                    <LoadingSpinner />
                    <Muted>Carregando arquivos...</Muted>
                  </LoadingState>
                ) : filteredFiles.length === 0 ? (
                  <EmptyState>
                    <EmptyIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    </EmptyIcon>
                    <EmptyTitle>Nenhum arquivo encontrado</EmptyTitle>
                    <EmptyText>
                      {fileSearchQuery || fileFilterCategory 
                        ? "Tente ajustar os filtros de busca para encontrar arquivos."
                        : "Comece enviando seu primeiro arquivo para a base de conhecimento."}
                    </EmptyText>
                    {!fileSearchQuery && !fileFilterCategory && (
                      <PrimaryButton type="button" onClick={openFileUploadModal} style={{ marginTop: "16px" }}>
                        Enviar primeiro arquivo
                      </PrimaryButton>
                    )}
                  </EmptyState>
                ) : (
                  <FilesGrid>
                    {filteredFiles.map((item, index) => (
                      <FileCard key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <FileCardTop>
                          <FileIcon>{getFileIcon(item.mimeType)}</FileIcon>
                          <FileCardActions>
                            <IconButton type="button" onClick={() => openFileView(item.id)} title="Visualizar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </IconButton>
                            <IconButton type="button" onClick={() => openFileEditModal(item.id)} title="Editar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </IconButton>
                            <IconButton type="button" onClick={() => deleteFile(item.id)} $danger title="Excluir">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </IconButton>
                          </FileCardActions>
                        </FileCardTop>
                        <FileCardBody onClick={() => openFileView(item.id)}>
                          {item.category && (
                            <CategoryBadge style={{ marginBottom: "8px" }}>{item.category}</CategoryBadge>
                          )}
                          <FileName>{item.originalName}</FileName>
                          <FileSize>{formatFileSize(item.size)}</FileSize>
                          {item.description && (
                            <FileDescription>{item.description.substring(0, 100)}{item.description.length > 100 ? "..." : ""}</FileDescription>
                          )}
                          {item.tags && (
                            <TagsContainer style={{ marginTop: "8px" }}>
                              {item.tags.split(",").map((tag, idx) => (
                                <Tag key={idx}>{tag.trim()}</Tag>
                              ))}
                            </TagsContainer>
                          )}
                        </FileCardBody>
                        <FileCardFooter>
                          <FooterInfo>
                            <AuthorInfo>
                              <AuthorAvatar>
                                {item.createdBy?.name?.[0] || item.createdBy?.email?.[0] || "?"}
                              </AuthorAvatar>
                              <AuthorName>{item.createdBy?.name || item.createdBy?.email || "Desconhecido"}</AuthorName>
                            </AuthorInfo>
                            <DateInfo>{formatDate(item.updatedAt)}</DateInfo>
                          </FooterInfo>
                        </FileCardFooter>
                      </FileCard>
                    ))}
                  </FilesGrid>
                )}
              </>
            ) : (
              <>
                <FiltersBar>
                  <SearchWrapper>
                    <SearchIcon>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                    </SearchIcon>
                    <SearchInput
                      type="text"
                      placeholder="Buscar senhas por título, usuário, URL ou tags..."
                      value={passwordSearchQuery}
                      onChange={(e) => setPasswordSearchQuery(e.target.value)}
                    />
                  </SearchWrapper>
                  {passwordCategories.length > 0 && (
                    <CategorySelect
                      value={passwordFilterCategory}
                      onChange={(e) => setPasswordFilterCategory(e.target.value)}
                    >
                      <option value="">Todas as categorias</option>
                      {passwordCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </CategorySelect>
                  )}
                  <SortSelect
                    value={passwordSortBy}
                    onChange={(e) => setPasswordSortBy(e.target.value as any)}
                  >
                    <option value="updatedAt">Data de atualização</option>
                    <option value="createdAt">Data de criação</option>
                    <option value="title">Título</option>
                  </SortSelect>
                  <SortOrderButton
                    type="button"
                    onClick={() => setPasswordSortOrder(passwordSortOrder === "asc" ? "desc" : "asc")}
                    title={passwordSortOrder === "asc" ? "Crescente" : "Decrescente"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {passwordSortOrder === "asc" ? (
                        <path d="M12 5v14M5 12l7-7 7 7"/>
                      ) : (
                        <path d="M12 19V5M5 12l7 7 7-7"/>
                      )}
                    </svg>
                  </SortOrderButton>
                </FiltersBar>

                {passwordsLoading ? (
                  <LoadingState>
                    <LoadingSpinner />
                    <Muted>Carregando senhas...</Muted>
                  </LoadingState>
                ) : filteredPasswords.length === 0 ? (
                  <EmptyState>
                    <EmptyIcon>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </EmptyIcon>
                    <EmptyTitle>Nenhuma senha encontrada</EmptyTitle>
                    <EmptyText>
                      {passwordSearchQuery || passwordFilterCategory 
                        ? "Tente ajustar os filtros de busca para encontrar senhas."
                        : "Comece criando sua primeira senha no cofre."}
                    </EmptyText>
                    {!passwordSearchQuery && !passwordFilterCategory && (
                      <PrimaryButton type="button" onClick={openPasswordCreateModal} style={{ marginTop: "16px" }}>
                        Criar primeira senha
                      </PrimaryButton>
                    )}
                  </EmptyState>
                ) : (
                  <DocumentsGrid>
                    {filteredPasswords.map((item, index) => (
                      <DocumentCard key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <CardTop>
                          {item.category && (
                            <CategoryBadge>{item.category}</CategoryBadge>
                          )}
                          <CardActions>
                            <IconButton type="button" onClick={() => openPasswordView(item.id)} title="Visualizar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </IconButton>
                            <IconButton type="button" onClick={() => openPasswordEditModal(item.id)} title="Editar">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </IconButton>
                            <IconButton type="button" onClick={() => deletePassword(item.id)} $danger title="Excluir">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </IconButton>
                          </CardActions>
                        </CardTop>
                        <CardBody onClick={() => openPasswordView(item.id)}>
                          <DocumentTitle>{item.title}</DocumentTitle>
                          {item.username && (
                            <DocumentPreview style={{ marginTop: "8px", fontSize: "14px", color: "var(--muted)" }}>
                              👤 {item.username}
                            </DocumentPreview>
                          )}
                          {item.url && (
                            <DocumentPreview style={{ marginTop: "4px", fontSize: "13px", color: "var(--muted)" }}>
                              🔗 {item.url.length > 50 ? item.url.substring(0, 50) + "..." : item.url}
                            </DocumentPreview>
                          )}
                          {item.tags && (
                            <TagsContainer style={{ marginTop: "12px" }}>
                              {item.tags.split(",").map((tag, idx) => (
                                <Tag key={idx}>{tag.trim()}</Tag>
                              ))}
                            </TagsContainer>
                          )}
                        </CardBody>
                        <CardFooter>
                          <FooterInfo>
                            <AuthorInfo>
                              <AuthorAvatar>
                                {item.createdBy?.name?.[0] || item.createdBy?.email?.[0] || "?"}
                              </AuthorAvatar>
                              <AuthorName>{item.createdBy?.name || item.createdBy?.email || "Desconhecido"}</AuthorName>
                            </AuthorInfo>
                            <DateInfo>{formatDate(item.updatedAt)}</DateInfo>
                          </FooterInfo>
                        </CardFooter>
                      </DocumentCard>
                    ))}
                  </DocumentsGrid>
                )}
              </>
            )}
          </MainCard>

      {viewDocument && (
        <>
          <ModalBackdrop $open={!!viewDocument} onClick={closeViewModal} aria-hidden={!viewDocument} />
          <ViewModal $open={!!viewDocument} onKeyDown={(e) => { if (e.key === "Escape") closeViewModal(); }}>
            <ViewModalHeader>
              <div>
                <ViewModalTitle>{viewDocument.title}</ViewModalTitle>
                <ViewModalMeta>
                  {viewDocument.category && <CategoryBadge>{viewDocument.category}</CategoryBadge>}
                  <MetaText>Criado por {viewDocument.createdBy?.name || viewDocument.createdBy?.email || "Desconhecido"}</MetaText>
                  <MetaText>Atualizado em {formatDateTime(viewDocument.updatedAt)}</MetaText>
                </ViewModalMeta>
              </div>
              <CloseButton type="button" onClick={closeViewModal} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ViewModalHeader>
            <ViewModalContent>
              <ContentText>{viewDocument.content}</ContentText>
              {viewDocument.tags && (
                <TagsContainer style={{ marginTop: "24px" }}>
                  {viewDocument.tags.split(",").map((tag, idx) => (
                    <Tag key={idx}>{tag.trim()}</Tag>
                  ))}
                </TagsContainer>
              )}
            </ViewModalContent>
            <ViewModalActions>
              <ActionButton type="button" onClick={() => { closeViewModal(); openEditModal(viewDocument.id); }}>
                Editar documento
              </ActionButton>
              <PrimaryButton type="button" onClick={closeViewModal}>
                Fechar
              </PrimaryButton>
            </ViewModalActions>
          </ViewModal>
        </>
      )}

      {isEditOpen && (
        <>
          <ModalBackdrop $open={isEditOpen} onClick={closeEditModal} aria-hidden={!isEditOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-document-title"
            $open={isEditOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeEditModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="edit-document-title">Editar documento</ModalTitle>
                <Muted>Ajuste os dados e salve para atualizar o documento.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {editFeedback && (
                <Feedback role={editFeedback.type === "error" ? "alert" : "status"} $variant={editFeedback.type}>
                  {editFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => updateEditField("title", e.target.value)}
                  placeholder="Ex: Como configurar VPN"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-category">Categoria</Label>
                <Input
                  id="edit-category"
                  type="text"
                  value={editForm.category}
                  onChange={(e) => updateEditField("category", e.target.value)}
                  placeholder="Ex: Redes, Software, Hardware"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => updateEditField("tags", e.target.value)}
                  placeholder="Ex: vpn, rede, configuração (separadas por vírgula)"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-content">Conteúdo *</Label>
                <Textarea
                  id="edit-content"
                  rows={12}
                  value={editForm.content}
                  onChange={(e) => updateEditField("content", e.target.value)}
                  placeholder="Digite o conteúdo do documento..."
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeEditModal} disabled={savingEdit}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={saveDocument} disabled={savingEdit}>
                {savingEdit ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {isCreateOpen && (
        <>
          <ModalBackdrop $open={isCreateOpen} onClick={closeCreateModal} aria-hidden={!isCreateOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-document-title"
            $open={isCreateOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeCreateModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="create-document-title">Novo documento</ModalTitle>
                <Muted>Preencha os dados para criar um novo documento na base de conhecimento.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {createFeedback && (
                <Feedback role={createFeedback.type === "error" ? "alert" : "status"} $variant={createFeedback.type}>
                  {createFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="new-title">Título *</Label>
                <Input
                  id="new-title"
                  type="text"
                  value={createForm.title}
                  onChange={(e) => updateCreateField("title", e.target.value)}
                  placeholder="Ex: Como configurar VPN"
                />
              </Field>
              <Field>
                <Label htmlFor="new-category">Categoria</Label>
                <Input
                  id="new-category"
                  type="text"
                  value={createForm.category}
                  onChange={(e) => updateCreateField("category", e.target.value)}
                  placeholder="Ex: Redes, Software, Hardware"
                />
              </Field>
              <Field>
                <Label htmlFor="new-tags">Tags</Label>
                <Input
                  id="new-tags"
                  type="text"
                  value={createForm.tags}
                  onChange={(e) => updateCreateField("tags", e.target.value)}
                  placeholder="Ex: vpn, rede, configuração (separadas por vírgula)"
                />
              </Field>
              <Field>
                <Label htmlFor="new-content">Conteúdo *</Label>
                <Textarea
                  id="new-content"
                  rows={12}
                  value={createForm.content}
                  onChange={(e) => updateCreateField("content", e.target.value)}
                  placeholder="Digite o conteúdo do documento..."
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeCreateModal} disabled={creatingDocument}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={createDocument} disabled={creatingDocument}>
                {creatingDocument ? "Criando..." : "Criar documento"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {viewFile && (
        <>
          <ModalBackdrop $open={!!viewFile} onClick={closeFileView} aria-hidden={!viewFile} />
          <ViewModal $open={!!viewFile} onKeyDown={(e) => { if (e.key === "Escape") closeFileView(); }}>
            <ViewModalHeader>
              <div>
                <ViewModalTitle>{viewFile.originalName}</ViewModalTitle>
                <ViewModalMeta>
                  {viewFile.category && <CategoryBadge>{viewFile.category}</CategoryBadge>}
                  <MetaText>{formatFileSize(viewFile.size)}</MetaText>
                  <MetaText>{getFileIcon(viewFile.mimeType)} {viewFile.mimeType}</MetaText>
                  <MetaText>Criado por {viewFile.createdBy?.name || viewFile.createdBy?.email || "Desconhecido"}</MetaText>
                  <MetaText>Atualizado em {formatDateTime(viewFile.updatedAt)}</MetaText>
                </ViewModalMeta>
              </div>
              <CloseButton type="button" onClick={closeFileView} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ViewModalHeader>
            <ViewModalContent>
              {viewFile.description && (
                <ContentText style={{ marginBottom: "24px" }}>{viewFile.description}</ContentText>
              )}
              {viewFile.tags && (
                <TagsContainer style={{ marginBottom: "24px" }}>
                  {viewFile.tags.split(",").map((tag, idx) => (
                    <Tag key={idx}>{tag.trim()}</Tag>
                  ))}
                </TagsContainer>
              )}
              
              {/* Preview do arquivo */}
              {(() => {
                const previewUrl = `/api/base/files/${viewFile.id}/preview`;
                const csvPreviewUrl = `/api/base/files/${viewFile.id}/csv-preview`;
                const isImage = viewFile.mimeType.startsWith("image/");
                const isPDF = viewFile.mimeType === "application/pdf";
                const isVideo = viewFile.mimeType.startsWith("video/");
                const isAudio = viewFile.mimeType.startsWith("audio/");
                const isCSV = viewFile.mimeType === "text/csv" || viewFile.originalName.toLowerCase().endsWith(".csv");
                const isText = viewFile.mimeType === "text/plain";
                const supportsPreview = isImage || isPDF || isVideo || isAudio || isText || isCSV;

                if (supportsPreview) {
                  return (
                    <div style={{ 
                      marginTop: "24px", 
                      marginBottom: "24px",
                      borderRadius: "12px", 
                      overflow: "hidden",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      background: "#f8fafc"
                    }}>
                      {isImage && (
                        <img 
                          src={previewUrl} 
                          alt={viewFile.originalName}
                          style={{
                            width: "100%",
                            height: "auto",
                            maxHeight: "600px",
                            objectFit: "contain",
                            display: "block"
                          }}
                        />
                      )}
                      {isPDF && (
                        <iframe
                          src={previewUrl}
                          style={{
                            width: "100%",
                            height: "600px",
                            border: "none"
                          }}
                          title={viewFile.originalName}
                        />
                      )}
                      {isVideo && (
                        <video
                          src={previewUrl}
                          controls
                          style={{
                            width: "100%",
                            maxHeight: "600px",
                            display: "block"
                          }}
                        >
                          Seu navegador não suporta o elemento de vídeo.
                        </video>
                      )}
                      {isAudio && (
                        <div style={{ padding: "24px", textAlign: "center" }}>
                          <audio
                            src={previewUrl}
                            controls
                            style={{
                              width: "100%",
                              maxWidth: "500px"
                            }}
                          >
                            Seu navegador não suporta o elemento de áudio.
                          </audio>
                        </div>
                      )}
                      {isCSV && (
                        <iframe
                          src={csvPreviewUrl}
                          style={{
                            width: "100%",
                            height: "600px",
                            border: "none",
                            background: "#fff"
                          }}
                          title={viewFile.originalName}
                        />
                      )}
                      {isText && (
                        <iframe
                          src={previewUrl}
                          style={{
                            width: "100%",
                            height: "400px",
                            border: "none",
                            background: "#fff"
                          }}
                          title={viewFile.originalName}
                        />
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{ marginTop: "24px", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.2)", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <a 
                  href={`/api/base/files/${viewFile.id}/download`}
                  download={viewFile.originalName}
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "8px",
                    padding: "12px 20px",
                    background: "linear-gradient(135deg, var(--primary-600), var(--primary-800))",
                    color: "#fff",
                    borderRadius: "10px",
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(20, 93, 191, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Baixar arquivo
                </a>
              </div>
            </ViewModalContent>
            <ViewModalActions>
              <ActionButton type="button" onClick={() => { closeFileView(); openFileEditModal(viewFile.id); }}>
                Editar informações
              </ActionButton>
              <PrimaryButton type="button" onClick={closeFileView}>
                Fechar
              </PrimaryButton>
            </ViewModalActions>
          </ViewModal>
        </>
      )}
      </Content>

      {isFileUploadOpen && (
        <>
          <ModalBackdrop $open={isFileUploadOpen} onClick={closeFileUploadModal} aria-hidden={!isFileUploadOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-file-title"
            $open={isFileUploadOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeFileUploadModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="upload-file-title">Enviar arquivo</ModalTitle>
                <Muted>Selecione um arquivo para adicionar à base de conhecimento.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {fileUploadFeedback && (
                <Feedback role={fileUploadFeedback.type === "error" ? "alert" : "status"} $variant={fileUploadFeedback.type}>
                  {fileUploadFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="file-input">Arquivo *</Label>
                <FileInputWrapper>
                  <FileInput
                    id="file-input"
                    type="file"
                    onChange={handleFileSelect}
                    disabled={uploadingFile}
                  />
                  {selectedFile && (
                    <FileInfo>
                      <span>{selectedFile.name}</span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </FileInfo>
                  )}
                </FileInputWrapper>
              </Field>
              {uploadProgress > 0 && (
                <Field>
                  <ProgressBar>
                    <ProgressFill $progress={uploadProgress} />
                    <ProgressText>{Math.round(uploadProgress)}%</ProgressText>
                  </ProgressBar>
                </Field>
              )}
              <Field>
                <Label htmlFor="upload-category">Categoria</Label>
                <Input
                  id="upload-category"
                  type="text"
                  value={fileUploadForm.category}
                  onChange={(e) => setFileUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ex: Manuais, Vídeos, Documentos"
                  disabled={uploadingFile}
                />
              </Field>
              <Field>
                <Label htmlFor="upload-tags">Tags</Label>
                <Input
                  id="upload-tags"
                  type="text"
                  value={fileUploadForm.tags}
                  onChange={(e) => setFileUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="Ex: tutorial, manual, guia (separadas por vírgula)"
                  disabled={uploadingFile}
                />
              </Field>
              <Field>
                <Label htmlFor="upload-description">Descrição</Label>
                <Textarea
                  id="upload-description"
                  rows={4}
                  value={fileUploadForm.description}
                  onChange={(e) => setFileUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o conteúdo do arquivo..."
                  disabled={uploadingFile}
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeFileUploadModal} disabled={uploadingFile}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={uploadFile} disabled={uploadingFile || !selectedFile}>
                {uploadingFile ? "Enviando..." : "Enviar arquivo"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {isFileEditOpen && (
        <>
          <ModalBackdrop $open={isFileEditOpen} onClick={closeFileEditModal} aria-hidden={!isFileEditOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-file-title"
            $open={isFileEditOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeFileEditModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="edit-file-title">Editar informações do arquivo</ModalTitle>
                <Muted>Ajuste as informações e salve para atualizar.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {fileEditFeedback && (
                <Feedback role={fileEditFeedback.type === "error" ? "alert" : "status"} $variant={fileEditFeedback.type}>
                  {fileEditFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="file-edit-category">Categoria</Label>
                <Input
                  id="file-edit-category"
                  type="text"
                  value={fileEditForm.category}
                  onChange={(e) => updateFileEditField("category", e.target.value)}
                  placeholder="Ex: Manuais, Vídeos, Documentos"
                />
              </Field>
              <Field>
                <Label htmlFor="file-edit-tags">Tags</Label>
                <Input
                  id="file-edit-tags"
                  type="text"
                  value={fileEditForm.tags}
                  onChange={(e) => updateFileEditField("tags", e.target.value)}
                  placeholder="Ex: tutorial, manual, guia (separadas por vírgula)"
                />
              </Field>
              <Field>
                <Label htmlFor="file-edit-description">Descrição</Label>
                <Textarea
                  id="file-edit-description"
                  rows={6}
                  value={fileEditForm.description}
                  onChange={(e) => updateFileEditField("description", e.target.value)}
                  placeholder="Descreva o conteúdo do arquivo..."
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closeFileEditModal} disabled={savingFileEdit}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={saveFile} disabled={savingFileEdit}>
                {savingFileEdit ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {viewPassword && (
        <>
          <ModalBackdrop $open={!!viewPassword} onClick={closePasswordView} aria-hidden={!viewPassword} />
          <ViewModal $open={!!viewPassword} onKeyDown={(e) => { if (e.key === "Escape") closePasswordView(); }}>
            <ViewModalHeader>
              <div>
                <ViewModalTitle>{viewPassword.title}</ViewModalTitle>
                <ViewModalMeta>
                  {viewPassword.category && <CategoryBadge>{viewPassword.category}</CategoryBadge>}
                  <MetaText>Criado por {viewPassword.createdBy?.name || viewPassword.createdBy?.email || "Desconhecido"}</MetaText>
                  <MetaText>Atualizado em {formatDateTime(viewPassword.updatedAt)}</MetaText>
                </ViewModalMeta>
              </div>
              <CloseButton type="button" onClick={closePasswordView} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ViewModalHeader>
            <ViewModalContent>
              <div style={{ display: "grid", gap: "16px" }}>
                {viewPassword.username && (
                  <div>
                    <Label style={{ marginBottom: "8px", display: "block" }}>Usuário</Label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Input type="text" value={viewPassword.username} readOnly style={{ flex: 1 }} />
                      <IconButton type="button" onClick={() => copyPassword(viewPassword.username!)} title="Copiar usuário">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </IconButton>
                    </div>
                  </div>
                )}
                <div>
                  <Label style={{ marginBottom: "8px", display: "block" }}>Senha</Label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Input 
                      type={passwordVisibility[viewPassword.id] ? "text" : "password"} 
                      value={viewPassword.password} 
                      readOnly 
                      style={{ flex: 1, fontFamily: "monospace" }} 
                    />
                    <IconButton type="button" onClick={() => togglePasswordVisibility(viewPassword.id)} title={passwordVisibility[viewPassword.id] ? "Ocultar senha" : "Mostrar senha"}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {passwordVisibility[viewPassword.id] ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </>
                        )}
                      </svg>
                    </IconButton>
                    <IconButton type="button" onClick={() => copyPassword(viewPassword.password)} title="Copiar senha">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </IconButton>
                  </div>
                </div>
                {viewPassword.url && (
                  <div>
                    <Label style={{ marginBottom: "8px", display: "block" }}>URL</Label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Input type="text" value={viewPassword.url} readOnly style={{ flex: 1 }} />
                      <ActionButton type="button" onClick={() => window.open(viewPassword.url!, "_blank")} title="Abrir URL">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        Abrir
                      </ActionButton>
                    </div>
                  </div>
                )}
                {viewPassword.notes && (
                  <div>
                    <Label style={{ marginBottom: "8px", display: "block" }}>Notas</Label>
                    <ContentText>{viewPassword.notes}</ContentText>
                  </div>
                )}
                {viewPassword.tags && (
                  <TagsContainer style={{ marginTop: "8px" }}>
                    {viewPassword.tags.split(",").map((tag, idx) => (
                      <Tag key={idx}>{tag.trim()}</Tag>
                    ))}
                  </TagsContainer>
                )}
              </div>
            </ViewModalContent>
            <ViewModalActions>
              <ActionButton type="button" onClick={() => { closePasswordView(); openPasswordEditModal(viewPassword.id); }}>
                Editar senha
              </ActionButton>
              <PrimaryButton type="button" onClick={closePasswordView}>
                Fechar
              </PrimaryButton>
            </ViewModalActions>
          </ViewModal>
        </>
      )}

      {isPasswordCreateOpen && (
        <>
          <ModalBackdrop $open={isPasswordCreateOpen} onClick={closePasswordCreateModal} aria-hidden={!isPasswordCreateOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-password-title"
            $open={isPasswordCreateOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closePasswordCreateModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="create-password-title">Nova senha</ModalTitle>
                <Muted>Preencha os dados para criar uma nova senha no cofre.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {passwordCreateFeedback && (
                <Feedback role={passwordCreateFeedback.type === "error" ? "alert" : "status"} $variant={passwordCreateFeedback.type}>
                  {passwordCreateFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="new-password-title">Título *</Label>
                <Input
                  id="new-password-title"
                  type="text"
                  value={passwordCreateForm.title}
                  onChange={(e) => updatePasswordCreateField("title", e.target.value)}
                  placeholder="Ex: Servidor VPN"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-username">Usuário</Label>
                <Input
                  id="new-password-username"
                  type="text"
                  value={passwordCreateForm.username}
                  onChange={(e) => updatePasswordCreateField("username", e.target.value)}
                  placeholder="Ex: admin"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-password">Senha *</Label>
                <Input
                  id="new-password-password"
                  type="password"
                  value={passwordCreateForm.password}
                  onChange={(e) => updatePasswordCreateField("password", e.target.value)}
                  placeholder="Digite a senha"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-url">URL</Label>
                <Input
                  id="new-password-url"
                  type="url"
                  value={passwordCreateForm.url}
                  onChange={(e) => updatePasswordCreateField("url", e.target.value)}
                  placeholder="Ex: https://exemplo.com"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-category">Categoria</Label>
                <Input
                  id="new-password-category"
                  type="text"
                  value={passwordCreateForm.category}
                  onChange={(e) => updatePasswordCreateField("category", e.target.value)}
                  placeholder="Ex: Servidores, Aplicações"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-tags">Tags</Label>
                <Input
                  id="new-password-tags"
                  type="text"
                  value={passwordCreateForm.tags}
                  onChange={(e) => updatePasswordCreateField("tags", e.target.value)}
                  placeholder="Ex: vpn, servidor, produção (separadas por vírgula)"
                />
              </Field>
              <Field>
                <Label htmlFor="new-password-notes">Notas</Label>
                <Textarea
                  id="new-password-notes"
                  rows={4}
                  value={passwordCreateForm.notes}
                  onChange={(e) => updatePasswordCreateField("notes", e.target.value)}
                  placeholder="Informações adicionais sobre esta senha..."
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closePasswordCreateModal} disabled={creatingPassword}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={createPassword} disabled={creatingPassword}>
                {creatingPassword ? "Criando..." : "Criar senha"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

      {isPasswordEditOpen && (
        <>
          <ModalBackdrop $open={isPasswordEditOpen} onClick={closePasswordEditModal} aria-hidden={!isPasswordEditOpen} />
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-password-title"
            $open={isPasswordEditOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closePasswordEditModal(); }}
          >
            <ModalHeader>
              <ModalIcon aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id="edit-password-title">Editar senha</ModalTitle>
                <Muted>Ajuste os dados e salve para atualizar a senha.</Muted>
              </div>
            </ModalHeader>
            <FormGrid>
              {passwordEditFeedback && (
                <Feedback role={passwordEditFeedback.type === "error" ? "alert" : "status"} $variant={passwordEditFeedback.type}>
                  {passwordEditFeedback.text}
                </Feedback>
              )}
              <Field>
                <Label htmlFor="edit-password-title">Título *</Label>
                <Input
                  id="edit-password-title"
                  type="text"
                  value={passwordEditForm.title}
                  onChange={(e) => updatePasswordEditField("title", e.target.value)}
                  placeholder="Ex: Servidor VPN"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-username">Usuário</Label>
                <Input
                  id="edit-password-username"
                  type="text"
                  value={passwordEditForm.username}
                  onChange={(e) => updatePasswordEditField("username", e.target.value)}
                  placeholder="Ex: admin"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-password">Senha *</Label>
                <Input
                  id="edit-password-password"
                  type="password"
                  value={passwordEditForm.password}
                  onChange={(e) => updatePasswordEditField("password", e.target.value)}
                  placeholder="Digite a senha"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-url">URL</Label>
                <Input
                  id="edit-password-url"
                  type="url"
                  value={passwordEditForm.url}
                  onChange={(e) => updatePasswordEditField("url", e.target.value)}
                  placeholder="Ex: https://exemplo.com"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-category">Categoria</Label>
                <Input
                  id="edit-password-category"
                  type="text"
                  value={passwordEditForm.category}
                  onChange={(e) => updatePasswordEditField("category", e.target.value)}
                  placeholder="Ex: Servidores, Aplicações"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-tags">Tags</Label>
                <Input
                  id="edit-password-tags"
                  type="text"
                  value={passwordEditForm.tags}
                  onChange={(e) => updatePasswordEditField("tags", e.target.value)}
                  placeholder="Ex: vpn, servidor, produção (separadas por vírgula)"
                />
              </Field>
              <Field>
                <Label htmlFor="edit-password-notes">Notas</Label>
                <Textarea
                  id="edit-password-notes"
                  rows={4}
                  value={passwordEditForm.notes}
                  onChange={(e) => updatePasswordEditField("notes", e.target.value)}
                  placeholder="Informações adicionais sobre esta senha..."
                />
              </Field>
            </FormGrid>
            <ModalActions>
              <CancelButton type="button" onClick={closePasswordEditModal} disabled={savingPasswordEdit}>Cancelar</CancelButton>
              <PrimaryButton type="button" onClick={savePassword} disabled={savingPasswordEdit}>
                {savingPasswordEdit ? "Salvando..." : "Salvar alterações"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </>
      )}

    </StandardLayout>
  );
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
  }
`;

const MenuScroll = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding-right: 4px;
`;

const NavItem = styled(Link)`
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

const StatsGrid = styled.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  }
`;

const StatIcon = styled.div<{ $color?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${(p) => p.$color ? `${p.$color}15` : "rgba(37, 99, 235, 0.1)"};
  color: ${(p) => p.$color || "#2563eb"};
  display: grid;
  place-items: center;
  flex-shrink: 0;
  svg {
    width: 24px;
    height: 24px;
  }
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
`;

const MainCard = styled.section`
  grid-column: span 12;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  position: relative;
  z-index: 1;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 
      0 24px 72px rgba(0, 0, 0, 0.1),
      0 12px 32px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  }

  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 20px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const CardTitle = styled.h1`
  font-size: 1.75rem;
  margin: 0 0 6px;
  color: #0f172a;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

const Muted = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const FiltersBar = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
  padding: 20px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.6));
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(8px);
`;

const SearchWrapper = styled.div`
  flex: 1;
  min-width: 280px;
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  width: 20px;
  height: 20px;
  pointer-events: none;
  transition: color 0.2s ease;
  
  ${SearchWrapper}:focus-within & {
    color: var(--primary-600);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 16px 14px 48px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 
      0 0 0 4px rgba(37, 99, 235, 0.1),
      0 4px 12px rgba(37, 99, 235, 0.15);
    background: #fff;
    transform: translateY(-1px);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const CategorySelect = styled.select`
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  min-width: 200px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 
      0 0 0 4px rgba(37, 99, 235, 0.1),
      0 4px 12px rgba(37, 99, 235, 0.15);
    background: #fff;
    transform: translateY(-1px);
  }
  
  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
  }
`;

const DocumentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const DocumentCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${FADE_IN} 0.4s ease forwards;
  opacity: 0;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  
  &:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.12),
      0 8px 16px rgba(37, 99, 235, 0.1),
      0 0 0 1px rgba(37, 99, 235, 0.2);
    border-color: rgba(37, 99, 235, 0.4);
  }
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  padding-bottom: 12px;
`;

const CardActions = styled.div`
  display: flex;
  gap: 4px;
`;

const IconButton = styled.button<{ $danger?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1.5px solid ${(p) => p.$danger ? "rgba(220, 38, 38, 0.25)" : "rgba(148, 163, 184, 0.25)"};
  background: ${(p) => p.$danger ? "rgba(220, 38, 38, 0.08)" : "rgba(255, 255, 255, 0.95)"};
  color: ${(p) => p.$danger ? "#dc2626" : "#475569"};
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  backdrop-filter: blur(8px);
  
  &:hover {
    background: ${(p) => p.$danger ? "rgba(220, 38, 38, 0.15)" : "linear-gradient(135deg, #f8fafc, #f1f5f9)"};
    border-color: ${(p) => p.$danger ? "#dc2626" : "rgba(37, 99, 235, 0.4)"};
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 8px ${(p) => p.$danger ? "rgba(220, 38, 38, 0.2)" : "rgba(37, 99, 235, 0.15)"};
    color: ${(p) => p.$danger ? "#b91c1c" : "var(--primary-700)"};
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.08));
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid rgba(37, 99, 235, 0.25);
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const CardBody = styled.div`
  padding: 0 16px 16px;
  flex: 1;
  cursor: pointer;
`;

const DocumentTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 10px;
  line-height: 1.4;
  letter-spacing: -0.01em;
`;

const DocumentPreview = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 12px;
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  
  &:hover {
    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
    border-color: rgba(37, 99, 235, 0.3);
    transform: translateY(-1px);
  }
`;

const CardFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.6));
  backdrop-filter: blur(8px);
`;

const FooterInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AuthorAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.7rem;
  font-weight: 700;
`;

const AuthorName = styled.span`
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
`;

const DateInfo = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(37, 99, 235, 0.1);
  border-top-color: var(--primary-600);
  border-right-color: var(--primary-600);
  border-radius: 50%;
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.6), rgba(241, 245, 249, 0.4));
  border-radius: 20px;
  border: 2px dashed rgba(148, 163, 184, 0.2);
  margin: 20px 0;
`;

const EmptyIcon = styled.div`
  margin-bottom: 24px;
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 48px;
    height: 48px;
    color: #94a3b8;
  }
`;

const OldEmptyIcon = styled.div`
  font-size: 5rem;
  margin-bottom: 24px;
  opacity: 0.6;
  filter: grayscale(0.2);
  transition: transform 0.3s ease;
  
  ${EmptyState}:hover & {
    transform: scale(1.1) rotate(5deg);
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
`;

const EmptyText = styled.p`
  color: #64748b;
  margin: 0;
  max-width: 450px;
  font-size: 1rem;
  line-height: 1.6;
`;

const ViewModal = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.96)}) translateY(${(p) => (p.$open ? "0" : "10px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.2),
    0 16px 32px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  width: min(90vw, 900px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: 33;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
`;

const ViewModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
`;

const ViewModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
`;

const ViewModalMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const MetaText = styled.span`
  font-size: 0.875rem;
  color: #64748b;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  color: #475569;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  
  &:hover {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-color: rgba(220, 38, 38, 0.4);
    color: #dc2626;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 8px rgba(220, 38, 38, 0.15);
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
`;

const ViewModalContent = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const ContentText = styled.div`
  font-size: 1rem;
  line-height: 1.8;
  color: #334155;
  white-space: pre-wrap;
`;

const ViewModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
`;

const FormGrid = styled.div`
  display: grid;
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(241, 245, 249, 0.5);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(148, 163, 184, 0.5);
    }
  }
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #334155;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 
      0 0 0 4px rgba(37, 99, 235, 0.1),
      0 4px 12px rgba(37, 99, 235, 0.15);
    background: #fff;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(148, 163, 184, 0.4);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  resize: vertical;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.7;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 
      0 0 0 4px rgba(37, 99, 235, 0.1),
      0 4px 12px rgba(37, 99, 235, 0.15);
    background: #fff;
    transform: translateY(-1px);
  }
  
  &:hover:not(:focus) {
    border-color: rgba(148, 163, 184, 0.4);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const PrimaryButton = styled.button`
  padding: 14px 24px;
  border-radius: 14px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  box-shadow: 
    0 4px 14px rgba(37, 99, 235, 0.35),
    0 0 0 0 rgba(37, 99, 235, 0.1);
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 
      0 8px 20px rgba(37, 99, 235, 0.45),
      0 0 0 4px rgba(37, 99, 235, 0.15);
    
    &::before {
      opacity: 1;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 
      0 4px 12px rgba(37, 99, 235, 0.3),
      0 0 0 2px rgba(37, 99, 235, 0.1);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ActionButton = styled.button`
  padding: 12px 20px;
  border-radius: 12px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-color: rgba(37, 99, 235, 0.3);
    color: var(--primary-700);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Feedback = styled.p<{ $variant: "success" | "error" }>`
  margin: 0 0 20px;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
  background: ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(220, 38, 38, 0.12)")};
  color: ${(p) => (p.$variant === "success" ? "#047857" : "#B91C1C")};
  border: 1px solid ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(220, 38, 38, 0.4)")};
  flex-shrink: 0;
`;

const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 32;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.96)}) translateY(${(p) => (p.$open ? "0" : "10px")});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.2),
    0 16px 32px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  width: min(90vw, 700px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: 33;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  flex-shrink: 0;
`;

const ModalIcon = styled.div`
  display: grid;
  place-items: center;
  
  svg {
    width: 24px;
    height: 24px;
    color: currentColor;
  }
`;


const ModalTitle = styled.h2`
  font-size: 1.3rem;
  margin: 0 0 4px;
  color: #0f172a;
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.98);
`;

const CancelButton = styled.button`
  padding: 14px 24px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: #475569;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-color: rgba(148, 163, 184, 0.4);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .2s ease;
  z-index: 32;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  opacity: ${(p) => (p.$open ? 1 : 0)};
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
  width: min(90vw, 400px);
  padding: 24px;
  z-index: 33;
  transition: opacity .2s ease, transform .2s ease;
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
`;

const ConfirmTitle = styled.h2`
  font-size: 1.2rem;
  margin: 0 0 20px;
  color: #0f172a;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 12px 20px;
  border-radius: 12px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
  font-weight: 600;
  font-size: 0.95rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
  }
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
    bottom: 96px !important;
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

const TabsContainer = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 32px;
  border-bottom: 2px solid rgba(148, 163, 184, 0.12);
  background: rgba(248, 250, 252, 0.5);
  padding: 4px;
  border-radius: 12px 12px 0 0;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 14px 24px;
  border: 0;
  background: ${(p) => (p.$active ? "linear-gradient(135deg, #ffffff, #f8fafc)" : "transparent")};
  color: ${(p) => (p.$active ? "var(--primary-700)" : "#64748b")};
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  font-size: 0.95rem;
  cursor: pointer;
  border-bottom: 3px solid ${(p) => (p.$active ? "var(--primary-600)" : "transparent")};
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: -2px;
  border-radius: 10px 10px 0 0;
  position: relative;
  box-shadow: ${(p) => (p.$active ? "0 2px 8px rgba(37, 99, 235, 0.15)" : "none")};
  
  &:hover {
    color: var(--primary-700);
    background: ${(p) => (p.$active ? "linear-gradient(135deg, #ffffff, #f8fafc)" : "rgba(37, 99, 235, 0.05)")};
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

const FilesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const FileCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${FADE_IN} 0.4s ease forwards;
  opacity: 0;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(0, 0, 0, 0.02);
  
  &:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.12),
      0 8px 16px rgba(37, 99, 235, 0.1),
      0 0 0 1px rgba(37, 99, 235, 0.2);
    border-color: rgba(37, 99, 235, 0.4);
  }
`;

const FileCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  padding-bottom: 12px;
`;

const FileIcon = styled.div`
  font-size: 2rem;
  line-height: 1;
`;

const FileCardActions = styled.div`
  display: flex;
  gap: 4px;
`;

const FileCardBody = styled.div`
  padding: 0 16px 16px;
  flex: 1;
  cursor: pointer;
`;

const FileName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  line-height: 1.4;
  word-break: break-word;
`;

const FileSize = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 8px;
`;

const FileDescription = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
`;

const FileCardFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.6));
  backdrop-filter: blur(8px);
`;

const FileInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FileInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: #fff;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

const FileInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #475569;
`;

const ProgressBar = styled.div`
  position: relative;
  width: 100%;
  height: 32px;
  background: #f1f5f9;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
`;

const ProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${(p) => p.$progress}%;
  background: linear-gradient(90deg, var(--primary-600), var(--primary-800));
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.85rem;
  font-weight: 600;
  color: #0f172a;
  z-index: 1;
`;

const SortSelect = styled.select`
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  min-width: 180px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  font-weight: 500;
  
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 
      0 0 0 4px rgba(37, 99, 235, 0.1),
      0 4px 12px rgba(37, 99, 235, 0.15);
    background: #fff;
    transform: translateY(-1px);
  }
  
  &:hover {
    border-color: rgba(37, 99, 235, 0.4);
  }
`;

const SortOrderButton = styled.button`
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 14px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  color: #475569;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  
  &:hover {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-color: var(--primary-600);
    color: var(--primary-700);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.15);
  }
  
  &:active {
    transform: translateY(0) scale(0.98);
  }
`;

const DropZone = styled.div<{ $isDragging: boolean; $active: boolean }>`
  position: relative;
  margin-bottom: 24px;
  border-radius: 16px;
  border: 2px dashed ${(p) => (p.$isDragging ? "var(--primary-600)" : "rgba(148, 163, 184, 0.3)")};
  background: ${(p) => (p.$isDragging ? "rgba(37, 99, 235, 0.05)" : "transparent")};
  transition: all 0.3s ease;
  min-height: ${(p) => (p.$isDragging ? "200px" : "0")};
  ${(p) => !p.$active && "pointer-events: none; opacity: 0.5;"}
`;

const DropZoneOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 16px;
  z-index: 10;
`;

const DropZoneContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  padding: 40px;
`;

const DropZoneIcon = styled.div`
  font-size: 4rem;
  line-height: 1;
`;

const DropZoneText = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-700);
`;
