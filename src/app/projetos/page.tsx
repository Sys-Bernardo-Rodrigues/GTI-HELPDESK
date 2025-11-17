"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

type ProjectMember = {
  id: number;
  userId: number;
  role: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

type ProjectItem = {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  progress: number;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  members: ProjectMember[];
  ticketsCount: number;
};

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type ProjectTask = {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedToId: number | null;
  assignedTo: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  createdById: number;
  createdBy: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  parentTaskId: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  subtasksCount: number;
};

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedToId: number | null;
  parentTaskId: number | null;
};

type ProjectFormState = {
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  color: string;
  memberIds: number[];
};

type Feedback = { type: "success" | "error"; text: string };

const emptyProject: ProjectFormState = {
  name: "",
  description: "",
  status: "PLANNING",
  progress: 0,
  startDate: "",
  endDate: "",
  color: "#3b82f6",
  memberIds: [],
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planejamento",
  IN_PROGRESS: "Em Andamento",
  ON_HOLD: "Em Espera",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: "#64748b",
  IN_PROGRESS: "#3b82f6",
  ON_HOLD: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "A Fazer",
  IN_PROGRESS: "Em Andamento",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "#64748b",
  IN_PROGRESS: "#3b82f6",
  DONE: "#10b981",
  CANCELLED: "#ef4444",
};

const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "#64748b",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1"
];

export default function ProjetosPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);
  const [sessionUser, setSessionUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [listLoading, setListLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string; avatarUrl: string | null }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProject);
  const [projectFeedback, setProjectFeedback] = useState<Feedback | null>(null);
  const [savingProject, setSavingProject] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  
  // Tarefas
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [projectTasks, setProjectTasks] = useState<Record<number, ProjectTask[]>>({});
  const [tasksLoading, setTasksLoading] = useState<Record<number, boolean>>({});
  const [selectedTaskProjectId, setSelectedTaskProjectId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    assignedToId: null,
    parentTaskId: null,
  });
  const [taskFeedback, setTaskFeedback] = useState<Feedback | null>(null);
  const [savingTask, setSavingTask] = useState<boolean>(false);
  const [deleteTaskConfirmOpen, setDeleteTaskConfirmOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<{ projectId: number; taskId: number } | null>(null);

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) setSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          const json = await res.json();
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
          const json = await res.json();
          setAvatarUrl(json?.avatarUrl || "");
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

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

  async function loadProjects() {
    setListLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Erro ao carregar projetos");
      const json = await res.json();
      setProjects(json.items || []);
    } catch (error: any) {
      setProjectFeedback({ type: "error", text: error?.message || "Erro ao carregar projetos" });
    } finally {
      setListLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.items || []);
      }
    } catch {}
  }

  function openCreateModal() {
    setSelectedProjectId(null);
    setProjectForm(emptyProject);
    setProjectFeedback(null);
    setModalOpen(true);
  }

  function openEditModal(project: ProjectItem) {
    setSelectedProjectId(project.id);
    setProjectForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      progress: project.progress,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
      color: project.color || "#3b82f6",
      memberIds: project.members.map((m) => m.userId),
    });
    setProjectFeedback(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (savingProject) return;
    setModalOpen(false);
    setProjectFeedback(null);
    setProjectForm(emptyProject);
    setSelectedProjectId(null);
  }

  function updateField<K extends keyof ProjectFormState>(field: K, value: ProjectFormState[K]) {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
    setProjectFeedback(null);
  }

  async function saveProject() {
    if (!projectForm.name.trim()) {
      setProjectFeedback({ type: "error", text: "Nome do projeto é obrigatório" });
      return;
    }

    setSavingProject(true);
    setProjectFeedback(null);

    try {
      const url = selectedProjectId ? `/api/projects/${selectedProjectId}` : "/api/projects";
      const method = selectedProjectId ? "PUT" : "POST";

      const payload: any = {
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
        status: projectForm.status,
        progress: projectForm.progress,
        color: projectForm.color,
        memberIds: projectForm.memberIds,
      };

      if (projectForm.startDate) {
        payload.startDate = projectForm.startDate;
      }
      if (projectForm.endDate) {
        payload.endDate = projectForm.endDate;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar projeto");
      }

      setProjectFeedback({ type: "success", text: selectedProjectId ? "Projeto atualizado com sucesso" : "Projeto criado com sucesso" });
      setTimeout(() => {
        closeModal();
        loadProjects();
      }, 1000);
    } catch (error: any) {
      setProjectFeedback({ type: "error", text: error?.message || "Erro ao salvar projeto" });
    } finally {
      setSavingProject(false);
    }
  }

  function confirmDelete(projectId: number) {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  }

  async function deleteProject() {
    if (!projectToDelete) return;

    try {
      const res = await fetch(`/api/projects/${projectToDelete}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir projeto");
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
      loadProjects();
    } catch (error: any) {
      setProjectFeedback({ type: "error", text: error?.message || "Erro ao excluir projeto" });
    }
  }

  // Funções de Tarefas
  async function loadTasks(projectId: number) {
    setTasksLoading((prev) => ({ ...prev, [projectId]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Erro ao carregar tarefas");
      const json = await res.json();
      setProjectTasks((prev) => ({ ...prev, [projectId]: json.items || [] }));
    } catch (error: any) {
      setProjectFeedback({ type: "error", text: error?.message || "Erro ao carregar tarefas" });
    } finally {
      setTasksLoading((prev) => ({ ...prev, [projectId]: false }));
    }
  }

  function toggleProjectExpanded(projectId: number) {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
        if (!projectTasks[projectId]) {
          loadTasks(projectId);
        }
      }
      return newSet;
    });
  }

  function openCreateTaskModal(projectId: number, parentTaskId: number | null = null) {
    setSelectedTaskProjectId(projectId);
    setSelectedTaskId(null);
    setTaskForm({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assignedToId: null,
      parentTaskId,
    });
    setTaskFeedback(null);
    setTaskModalOpen(true);
  }

  function openEditTaskModal(projectId: number, task: ProjectTask) {
    setSelectedTaskProjectId(projectId);
    setSelectedTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      assignedToId: task.assignedToId,
      parentTaskId: task.parentTaskId,
    });
    setTaskFeedback(null);
    setTaskModalOpen(true);
  }

  function closeTaskModal() {
    if (savingTask) return;
    setTaskModalOpen(false);
    setTaskFeedback(null);
    setTaskForm({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: "",
      assignedToId: null,
      parentTaskId: null,
    });
    setSelectedTaskProjectId(null);
    setSelectedTaskId(null);
  }

  function updateTaskField<K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
    setTaskFeedback(null);
  }

  async function saveTask() {
    if (!selectedTaskProjectId) return;
    if (!taskForm.title.trim()) {
      setTaskFeedback({ type: "error", text: "Título da tarefa é obrigatório" });
      return;
    }

    setSavingTask(true);
    setTaskFeedback(null);

    try {
      const url = selectedTaskId
        ? `/api/projects/${selectedTaskProjectId}/tasks/${selectedTaskId}`
        : `/api/projects/${selectedTaskProjectId}/tasks`;
      const method = selectedTaskId ? "PUT" : "POST";

      const payload: any = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: taskForm.status,
        priority: taskForm.priority,
        assignedToId: taskForm.assignedToId,
        parentTaskId: taskForm.parentTaskId,
      };

      if (taskForm.dueDate) {
        payload.dueDate = taskForm.dueDate;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar tarefa");
      }

      setTaskFeedback({ type: "success", text: selectedTaskId ? "Tarefa atualizada com sucesso" : "Tarefa criada com sucesso" });
      setTimeout(() => {
        closeTaskModal();
        loadTasks(selectedTaskProjectId);
        loadProjects(); // Recarregar projetos para atualizar o progresso
      }, 1000);
    } catch (error: any) {
      setTaskFeedback({ type: "error", text: error?.message || "Erro ao salvar tarefa" });
    } finally {
      setSavingTask(false);
    }
  }

  function confirmDeleteTask(projectId: number, taskId: number) {
    setTaskToDelete({ projectId, taskId });
    setDeleteTaskConfirmOpen(true);
  }

  async function deleteTask() {
    if (!taskToDelete) return;

    try {
      const res = await fetch(`/api/projects/${taskToDelete.projectId}/tasks/${taskToDelete.taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir tarefa");
      setDeleteTaskConfirmOpen(false);
      const { projectId } = taskToDelete;
      setTaskToDelete(null);
      loadTasks(projectId);
      loadProjects(); // Recarregar projetos para atualizar o progresso
    } catch (error: any) {
      setTaskFeedback({ type: "error", text: error?.message || "Erro ao excluir tarefa" });
    }
  }

  function getTasksByParent(projectId: number, parentTaskId: number | null): ProjectTask[] {
    const tasks = projectTasks[projectId] || [];
    return tasks.filter((t) => t.parentTaskId === parentTaskId);
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    window.location.assign("/");
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  }

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

  useEffect(() => {
    if (sidebarOpen && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [sidebarOpen]);

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

  useEffect(() => {
    if (menuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const updatePosition = () => {
      const footerEl = footerRef.current;
      const menuEl = typeof window !== "undefined" && document?.getElementById("user-menu");
      if (footerEl && menuEl) {
        const rect = footerEl.getBoundingClientRect();
        const menu = menuEl as HTMLElement;
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.top - 8}px`;
        menu.style.transform = `translateY(-100%)`;
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
  }, [menuOpen]);

  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
        <TopBarActions>
          <NotificationBell />
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
          onKeyDown={(e) => { if (e.key === "Escape") setSidebarOpen(false); }}
        >
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
              <NavItem href="/aprovacoes" aria-label="Aprovações">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>Aprovações</span>
              </NavItem>
              <NavItem href="/projetos" aria-label="Projetos" aria-current="page">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                </svg>
                <span>Projetos</span>
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
                      href="/users"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/users");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                      Usuários
                    </ConfigSubmenuItem>
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
                    <ConfigSubmenuItem
                      role="menuitem"
                      tabIndex={0}
                      href="/config/perfildeacesso"
                      onClick={() => {
                        setConfigSubmenuOpen(false);
                        router.push("/config/perfildeacesso");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                      </svg>
                      Perfil de Acesso
                    </ConfigSubmenuItem>
                  </ConfigSubmenu>,
                  document.body
                )}
              </div>
            </MenuScroll>
          </nav>
          <UserFooter
            id="user-footer"
            aria-label="Menu do usuário"
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls="user-menu"
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setMenuOpen((v) => !v);
              if (e.key === "Escape") setMenuOpen(false);
              if (e.key === "ArrowDown") setMenuOpen(true);
            }}
            ref={footerRef as any}
          >
            <Avatar aria-label="Foto do usuário" role="img">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" decoding="async" />
              ) : (
                sessionUser?.name ? (sessionUser.name[0] || "U") : "U"
              )}
            </Avatar>
            <UserName aria-label="Nome do usuário">{sessionUser?.name ?? sessionUser?.email ?? "Usuário"}</UserName>
          </UserFooter>
          {typeof window !== "undefined" && document && menuOpen && createPortal(
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
            </UserMenu>,
            document.body
          )}
          {typeof window !== "undefined" && document && confirmOpen && createPortal(
            <ConfirmBackdrop $open={confirmOpen} onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen}>
              <ConfirmDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-exit-title"
                onKeyDown={(e) => { if (e.key === "Escape") setConfirmOpen(false); }}
                onClick={(e) => e.stopPropagation()}
              >
                <ConfirmTitle id="confirm-exit-title">Você deseja realmente sair?</ConfirmTitle>
                <ConfirmActions>
                  <CancelButton type="button" onClick={() => setConfirmOpen(false)}>Não</CancelButton>
                  <ConfirmButton type="button" onClick={onLogout}>Confirmar</ConfirmButton>
                </ConfirmActions>
              </ConfirmDialog>
            </ConfirmBackdrop>,
            document.body
          )}
        </Sidebar>
        <Overlay $show={sidebarOpen} onClick={() => setSidebarOpen(false)} aria-hidden={!sidebarOpen} />
        <Content>
          <Card>
            <CardHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <HeaderIcon aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle>Projetos</CardTitle>
                  <Muted>Gerencie seus projetos de forma profissional e organizada.</Muted>
                </div>
              </div>
              <HeaderActions>
                <ActionButton type="button" onClick={() => loadProjects()} disabled={listLoading}>
                  Recarregar
                </ActionButton>
                <PrimaryButton type="button" onClick={openCreateModal}>
                  + Novo Projeto
                </PrimaryButton>
              </HeaderActions>
            </CardHeader>
            {projectFeedback && !isModalOpen && (
              <Feedback role={projectFeedback.type === "error" ? "alert" : "status"} $variant={projectFeedback.type}>
                {projectFeedback.text}
              </Feedback>
            )}
            {listLoading ? (
              <LoadingState>
                <Muted>Carregando projetos...</Muted>
              </LoadingState>
            ) : projects.length === 0 ? (
              <EmptyState>
                <EmptyIcon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                  </svg>
                </EmptyIcon>
                <EmptyText>Nenhum projeto encontrado.</EmptyText>
                <PrimaryButton onClick={openCreateModal} style={{ marginTop: "16px" }}>
                  + Criar Primeiro Projeto
                </PrimaryButton>
              </EmptyState>
            ) : (
              <ProjectsGrid>
                {projects.map((project) => (
                  <ProjectCard key={project.id} $color={project.color || "#3b82f6"}>
                    <ProjectCardHeader>
                      <ProjectCardTitle>{project.name}</ProjectCardTitle>
                      <ProjectCardMenu>
                        <IconButton
                          onClick={() => openEditModal(project)}
                          aria-label="Editar projeto"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </IconButton>
                        {project.createdBy.id === sessionUser?.id && (
                          <IconButton
                            onClick={() => confirmDelete(project.id)}
                            aria-label="Excluir projeto"
                            $danger
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </IconButton>
                        )}
                      </ProjectCardMenu>
                    </ProjectCardHeader>
                    {project.description && (
                      <ProjectCardDescription>{project.description}</ProjectCardDescription>
                    )}
                    <ProjectCardMeta>
                      <StatusBadge $status={project.status}>
                        {STATUS_LABELS[project.status]}
                      </StatusBadge>
                      <ProgressBar>
                        <ProgressFill $progress={project.progress} $color={project.color || "#3b82f6"} />
                        <ProgressText>{project.progress}%</ProgressText>
                      </ProgressBar>
                    </ProjectCardMeta>
                    <ProjectCardFooter>
                      <ProjectCardInfo>
                        <InfoItem>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                        </InfoItem>
                        <InfoItem>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          <span>{project.members.length + 1} membro{project.members.length !== 0 ? "s" : ""}</span>
                        </InfoItem>
                      </ProjectCardInfo>
                      <ProjectMembers>
                        <MemberAvatar $color={project.color || "#3b82f6"}>
                          {project.createdBy.avatarUrl ? (
                            <img src={resolveAvatarUrl(project.createdBy.avatarUrl)} alt={project.createdBy.name} />
                          ) : (
                            project.createdBy.name?.[0] || "U"
                          )}
                        </MemberAvatar>
                        {project.members.slice(0, 3).map((member) => (
                          <MemberAvatar key={member.id} $color={project.color || "#3b82f6"}>
                            {member.user.avatarUrl ? (
                              <img src={resolveAvatarUrl(member.user.avatarUrl)} alt={member.user.name} />
                            ) : (
                              member.user.name?.[0] || "U"
                            )}
                          </MemberAvatar>
                        ))}
                        {project.members.length > 3 && (
                          <MemberAvatar $color={project.color || "#3b82f6"} $more>
                            +{project.members.length - 3}
                          </MemberAvatar>
                        )}
                      </ProjectMembers>
                    </ProjectCardFooter>
                    <ProjectCardTasks>
                      <TaskHeader>
                        <TaskHeaderButton
                          type="button"
                          onClick={() => toggleProjectExpanded(project.id)}
                          aria-expanded={expandedProjects.has(project.id)}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="16"
                            height="16"
                            style={{
                              transform: expandedProjects.has(project.id) ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 0.2s ease",
                            }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span>Tarefas</span>
                          <TaskCount>
                            {(projectTasks[project.id]?.length || 0) > 0 && `(${projectTasks[project.id]?.length || 0})`}
                          </TaskCount>
                        </TaskHeaderButton>
                        <IconButton
                          onClick={() => openCreateTaskModal(project.id)}
                          aria-label="Nova tarefa"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Nova Tarefa
                        </IconButton>
                      </TaskHeader>
                      {expandedProjects.has(project.id) && (
                        <TasksContainer>
                          {tasksLoading[project.id] ? (
                            <TaskLoadingState>
                              <Muted>Carregando tarefas...</Muted>
                            </TaskLoadingState>
                          ) : getTasksByParent(project.id, null).length === 0 ? (
                            <TaskEmptyState>
                              <Muted>Nenhuma tarefa ainda. Clique em "Nova Tarefa" para começar.</Muted>
                            </TaskEmptyState>
                          ) : (
                            <TasksList>
                              {getTasksByParent(project.id, null).map((task) => (
                                <TaskItem key={task.id} $priority={task.priority}>
                                  <TaskItemHeader>
                                    <TaskItemLeft>
                                      <TaskCheckbox
                                        type="checkbox"
                                        checked={task.status === "DONE"}
                                        onChange={async () => {
                                          const newStatus = task.status === "DONE" ? "TODO" : "DONE";
                                          try {
                                            const res = await fetch(`/api/projects/${project.id}/tasks/${task.id}`, {
                                              method: "PUT",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ ...task, status: newStatus }),
                                            });
                                            if (res.ok) {
                                              loadTasks(project.id);
                                              loadProjects(); // Recarregar projetos para atualizar o progresso
                                            }
                                          } catch {}
                                        }}
                                      />
                                      <TaskTitle $done={task.status === "DONE"}>{task.title}</TaskTitle>
                                      <PriorityBadge $priority={task.priority}>
                                        {TASK_PRIORITY_LABELS[task.priority]}
                                      </PriorityBadge>
                                      <StatusBadge $status={task.status as any} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                                        {TASK_STATUS_LABELS[task.status]}
                                      </StatusBadge>
                                    </TaskItemLeft>
                                    <TaskItemActions>
                                      {task.subtasksCount > 0 && (
                                        <TaskSubtaskCount>
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                          </svg>
                                          {task.subtasksCount}
                                        </TaskSubtaskCount>
                                      )}
                                      <IconButton
                                        onClick={() => openCreateTaskModal(project.id, task.id)}
                                        aria-label="Adicionar subtarefa"
                                        style={{ padding: "4px" }}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                          <line x1="12" y1="5" x2="12" y2="19" />
                                          <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                      </IconButton>
                                      <IconButton
                                        onClick={() => openEditTaskModal(project.id, task)}
                                        aria-label="Editar tarefa"
                                        style={{ padding: "4px" }}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </IconButton>
                                      <IconButton
                                        onClick={() => confirmDeleteTask(project.id, task.id)}
                                        aria-label="Excluir tarefa"
                                        $danger
                                        style={{ padding: "4px" }}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </IconButton>
                                    </TaskItemActions>
                                  </TaskItemHeader>
                                  {task.description && (
                                    <TaskDescription>{task.description}</TaskDescription>
                                  )}
                                  <TaskItemMeta>
                                    {task.assignedTo && (
                                      <TaskAssignee>
                                        <TaskAssigneeAvatar>
                                          {task.assignedTo.avatarUrl ? (
                                            <img src={resolveAvatarUrl(task.assignedTo.avatarUrl)} alt={task.assignedTo.name} />
                                          ) : (
                                            task.assignedTo.name?.[0] || "U"
                                          )}
                                        </TaskAssigneeAvatar>
                                        <span>{task.assignedTo.name}</span>
                                      </TaskAssignee>
                                    )}
                                    {task.dueDate && (
                                      <TaskDueDate $overdue={new Date(task.dueDate) < new Date() && task.status !== "DONE"}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                          <line x1="16" y1="2" x2="16" y2="6" />
                                          <line x1="8" y1="2" x2="8" y2="6" />
                                          <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        {formatDate(task.dueDate)}
                                      </TaskDueDate>
                                    )}
                                  </TaskItemMeta>
                                  {getTasksByParent(project.id, task.id).length > 0 && (
                                    <SubtasksList>
                                      {getTasksByParent(project.id, task.id).map((subtask) => (
                                        <SubtaskItem key={subtask.id} $priority={subtask.priority}>
                                          <SubtaskItemLeft>
                                            <TaskCheckbox
                                              type="checkbox"
                                              checked={subtask.status === "DONE"}
                                              onChange={async () => {
                                                const newStatus = subtask.status === "DONE" ? "TODO" : "DONE";
                                                try {
                                                  const res = await fetch(`/api/projects/${project.id}/tasks/${subtask.id}`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ ...subtask, status: newStatus }),
                                                  });
                                                  if (res.ok) {
                                                    loadTasks(project.id);
                                                    loadProjects(); // Recarregar projetos para atualizar o progresso
                                                  }
                                                } catch {}
                                              }}
                                            />
                                            <TaskTitle $done={subtask.status === "DONE"}>{subtask.title}</TaskTitle>
                                            <PriorityBadge $priority={subtask.priority} style={{ fontSize: "0.65rem", padding: "1px 4px" }}>
                                              {TASK_PRIORITY_LABELS[subtask.priority]}
                                            </PriorityBadge>
                                          </SubtaskItemLeft>
                                          <TaskItemActions>
                                            <IconButton
                                              onClick={() => openEditTaskModal(project.id, subtask)}
                                              aria-label="Editar subtarefa"
                                              style={{ padding: "4px" }}
                                            >
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                              </svg>
                                            </IconButton>
                                            <IconButton
                                              onClick={() => confirmDeleteTask(project.id, subtask.id)}
                                              aria-label="Excluir subtarefa"
                                              $danger
                                              style={{ padding: "4px" }}
                                            >
                                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                              </svg>
                                            </IconButton>
                                          </TaskItemActions>
                                        </SubtaskItem>
                                      ))}
                                    </SubtasksList>
                                  )}
                                </TaskItem>
                              ))}
                            </TasksList>
                          )}
                        </TasksContainer>
                      )}
                    </ProjectCardTasks>
                  </ProjectCard>
                ))}
              </ProjectsGrid>
            )}
          </Card>
        </Content>
      </Shell>

      {isModalOpen && (
        <ModalBackdrop $open={isModalOpen} onClick={closeModal} aria-hidden={!isModalOpen}>
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby={selectedProjectId ? "edit-project-title" : "create-project-title"}
            $open={isModalOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeModal(); }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalIcon aria-hidden $color={projectForm.color}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id={selectedProjectId ? "edit-project-title" : "create-project-title"}>
                  {selectedProjectId ? "Editar Projeto" : "Novo Projeto"}
                </ModalTitle>
                <Muted>{selectedProjectId ? "Atualize as informações do projeto" : "Crie um novo projeto para organizar seu trabalho"}</Muted>
              </div>
              <CloseButton onClick={closeModal} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ModalHeader>
            {projectFeedback && (
              <Feedback role={projectFeedback.type === "error" ? "alert" : "status"} $variant={projectFeedback.type}>
                {projectFeedback.text}
              </Feedback>
            )}
            <ModalBody>
              <FormGrid>
                <Field>
                  <Label htmlFor="project-name">Nome do Projeto *</Label>
                  <Input
                    id="project-name"
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Ex: Sistema de Gestão"
                  />
                </Field>
                <Field>
                  <Label htmlFor="project-description">Descrição</Label>
                  <Textarea
                    id="project-description"
                    value={projectForm.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Descreva o objetivo do projeto..."
                    rows={4}
                  />
                </Field>
                <Field>
                  <Label htmlFor="project-status">Status</Label>
                  <Select
                    id="project-status"
                    value={projectForm.status}
                    onChange={(e) => updateField("status", e.target.value as ProjectStatus)}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="project-progress">Progresso</Label>
                  <Muted style={{ fontSize: "0.8rem", marginTop: "-4px" }}>
                    O progresso é calculado automaticamente com base nas tarefas concluídas do projeto.
                  </Muted>
                  {selectedProjectId && (
                    <div style={{ marginTop: "8px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#475569" }}>Progresso Atual</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1e293b" }}>{projectForm.progress}%</span>
                      </div>
                      <ProgressBar style={{ height: "20px" }}>
                        <ProgressFill $progress={projectForm.progress} $color={projectForm.color} style={{ height: "20px" }} />
                        <ProgressText style={{ fontSize: "0.7rem" }}>{projectForm.progress}%</ProgressText>
                      </ProgressBar>
                    </div>
                  )}
                </Field>
                <Field>
                  <Label htmlFor="project-start-date">Data de Início</Label>
                  <Input
                    id="project-start-date"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="project-end-date">Data de Término</Label>
                  <Input
                    id="project-end-date"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                  />
                </Field>
                <Field>
                  <Label>Cor do Projeto</Label>
                  <ColorPicker>
                    {COLORS.map((color) => (
                      <ColorOption
                        key={color}
                        $color={color}
                        $selected={projectForm.color === color}
                        onClick={() => updateField("color", color)}
                        aria-label={`Cor ${color}`}
                      />
                    ))}
                  </ColorPicker>
                </Field>
                <Field>
                  <Label>Membros do Projeto</Label>
                  <MembersSelect
                    multiple
                    value={projectForm.memberIds.map(String)}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
                      updateField("memberIds", selectedIds);
                    }}
                    size={5}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </MembersSelect>
                  <Muted style={{ marginTop: "4px", fontSize: "0.75rem" }}>
                    Segure Ctrl (ou Cmd no Mac) para selecionar múltiplos membros
                  </Muted>
                </Field>
              </FormGrid>
            </ModalBody>
            <ModalActions>
              <CancelButton type="button" onClick={closeModal} disabled={savingProject}>Cancelar</CancelButton>
              {selectedProjectId && (
                <ActionButton
                  type="button"
                  onClick={() => confirmDelete(selectedProjectId)}
                  disabled={savingProject}
                  style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                >
                  Excluir
                </ActionButton>
              )}
              <PrimaryButton type="button" onClick={saveProject} disabled={savingProject}>
                {savingProject ? "Salvando..." : selectedProjectId ? "Atualizar" : "Criar Projeto"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {deleteConfirmOpen && (
        <>
          <ConfirmBackdrop $open={deleteConfirmOpen} onClick={() => setDeleteConfirmOpen(false)} aria-hidden={!deleteConfirmOpen}>
            <ConfirmDialog
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-delete-title"
              onKeyDown={(e) => { if (e.key === "Escape") setDeleteConfirmOpen(false); }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmTitle id="confirm-delete-title">Excluir Projeto?</ConfirmTitle>
              <ConfirmMessage>Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.</ConfirmMessage>
              <ConfirmActions>
                <CancelButton type="button" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</CancelButton>
                <ConfirmButton type="button" onClick={deleteProject}>Excluir</ConfirmButton>
              </ConfirmActions>
            </ConfirmDialog>
          </ConfirmBackdrop>
        </>
      )}

      {isTaskModalOpen && (
        <ModalBackdrop $open={isTaskModalOpen} onClick={closeTaskModal} aria-hidden={!isTaskModalOpen}>
          <ModalDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby={selectedTaskId ? "edit-task-title" : "create-task-title"}
            $open={isTaskModalOpen}
            onKeyDown={(e) => { if (e.key === "Escape") closeTaskModal(); }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalIcon aria-hidden $color="#3b82f6">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 11l3 3L22 4l-1.5-1.5L12 10.5 7.5 6 6 7.5 9 11zm-6 7h18v2H3v-2z"/>
                </svg>
              </ModalIcon>
              <div>
                <ModalTitle id={selectedTaskId ? "edit-task-title" : "create-task-title"}>
                  {selectedTaskId ? "Editar Tarefa" : "Nova Tarefa"}
                </ModalTitle>
                <Muted>{selectedTaskId ? "Atualize as informações da tarefa" : "Crie uma nova tarefa para o projeto"}</Muted>
              </div>
              <CloseButton onClick={closeTaskModal} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ModalHeader>
            {taskFeedback && (
              <Feedback role={taskFeedback.type === "error" ? "alert" : "status"} $variant={taskFeedback.type}>
                {taskFeedback.text}
              </Feedback>
            )}
            <ModalBody>
              <FormGrid>
                <Field>
                  <Label htmlFor="task-title">Título da Tarefa *</Label>
                  <Input
                    id="task-title"
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => updateTaskField("title", e.target.value)}
                    placeholder="Ex: Implementar funcionalidade X"
                  />
                </Field>
                <Field>
                  <Label htmlFor="task-description">Descrição</Label>
                  <Textarea
                    id="task-description"
                    value={taskForm.description}
                    onChange={(e) => updateTaskField("description", e.target.value)}
                    placeholder="Descreva os detalhes da tarefa..."
                    rows={4}
                  />
                </Field>
                <Field>
                  <Label htmlFor="task-status">Status</Label>
                  <Select
                    id="task-status"
                    value={taskForm.status}
                    onChange={(e) => updateTaskField("status", e.target.value as TaskStatus)}
                  >
                    {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="task-priority">Prioridade</Label>
                  <Select
                    id="task-priority"
                    value={taskForm.priority}
                    onChange={(e) => updateTaskField("priority", e.target.value as TaskPriority)}
                  >
                    {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="task-due-date">Data de Vencimento</Label>
                  <Input
                    id="task-due-date"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => updateTaskField("dueDate", e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="task-assigned-to">Atribuído a</Label>
                  <Select
                    id="task-assigned-to"
                    value={taskForm.assignedToId || ""}
                    onChange={(e) => updateTaskField("assignedToId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Ninguém</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </Select>
                </Field>
                {selectedTaskProjectId && (
                  <Field>
                    <Label htmlFor="task-parent">Tarefa Pai (Sub-tarefa de)</Label>
                    <Select
                      id="task-parent"
                      value={taskForm.parentTaskId || ""}
                      onChange={(e) => updateTaskField("parentTaskId", e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">Nenhuma (Tarefa Principal)</option>
                      {(projectTasks[selectedTaskProjectId] || [])
                        .filter((t) => !t.parentTaskId && (!selectedTaskId || t.id !== selectedTaskId))
                        .map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                    </Select>
                  </Field>
                )}
              </FormGrid>
            </ModalBody>
            <ModalActions>
              <CancelButton type="button" onClick={closeTaskModal} disabled={savingTask}>Cancelar</CancelButton>
              {selectedTaskId && (
                <ActionButton
                  type="button"
                  onClick={() => selectedTaskProjectId && confirmDeleteTask(selectedTaskProjectId, selectedTaskId)}
                  disabled={savingTask}
                  style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                >
                  Excluir
                </ActionButton>
              )}
              <PrimaryButton type="button" onClick={saveTask} disabled={savingTask}>
                {savingTask ? "Salvando..." : selectedTaskId ? "Atualizar" : "Criar Tarefa"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {deleteTaskConfirmOpen && (
        <ConfirmBackdrop $open={deleteTaskConfirmOpen} onClick={() => setDeleteTaskConfirmOpen(false)} aria-hidden={!deleteTaskConfirmOpen}>
          <ConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-task-title"
            onKeyDown={(e) => { if (e.key === "Escape") setDeleteTaskConfirmOpen(false); }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmTitle id="confirm-delete-task-title">Excluir Tarefa?</ConfirmTitle>
            <ConfirmMessage>Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</ConfirmMessage>
            <ConfirmActions>
              <CancelButton type="button" onClick={() => setDeleteTaskConfirmOpen(false)}>Cancelar</CancelButton>
              <ConfirmButton type="button" onClick={deleteTask}>Excluir</ConfirmButton>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmBackdrop>
      )}
    </Page>
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
  z-index: 10000;
  isolation: isolate;

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

const UserMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.12);
  min-width: 200px;
  padding: 8px;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 10000;
  isolation: isolate;

  @media (max-width: 960px) {
    left: 16px !important;
    top: auto !important;
    bottom: 96px !important;
    transform: none !important;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Card = styled.section`
  background: linear-gradient(180deg, #ffffff, #fcfcff);
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 18px 40px rgba(20, 93, 191, 0.08), 0 6px 18px rgba(0,0,0,0.06);
  position: relative;
  background-clip: padding-box;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(from 180deg, #c9d7ff, #e6edff, #cfe0ff, #c9d7ff);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

const CardHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
`;

const HeaderIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.2);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  
  svg {
    width: 28px;
    height: 28px;
  }
`;

const CardTitle = styled.h1`
  font-size: 1.6rem;
  margin: 0;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.02em;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0;
  font-size: 0.875rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  margin-left: auto;
  align-items: center;
  flex-wrap: wrap;
`;

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

const PrimaryButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 0;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 6px 12px rgba(20, 93, 191, 0.2);
  font-weight: 600;
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(20, 93, 191, 0.3);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const Feedback = styled.p<{ $variant: "success" | "error" }>`
  margin: 0 0 16px 0;
  padding: 12px 14px;
  border-radius: 10px;
  font-weight: 600;
  background: ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(220, 38, 38, 0.12)")};
  color: ${(p) => (p.$variant === "success" ? "#047857" : "#B91C1C")};
  border: 1px solid ${(p) => (p.$variant === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(220, 38, 38, 0.4)")};
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
`;

const EmptyIcon = styled.div`
  display: grid;
  place-items: center;
  margin-bottom: 16px;
  opacity: 0.5;
  
  svg {
    width: 64px;
    height: 64px;
    color: #94a3b8;
  }
`;

const EmptyText = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin: 0;
`;

const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const ProjectCard = styled.div<{ $color: string }>`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid ${(p) => p.$color}15;
  border-left: 5px solid ${(p) => p.$color};
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${(p) => p.$color}, ${(p) => p.$color}80);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border-color: ${(p) => p.$color}30;
    
    &::before {
      opacity: 1;
    }
  }
`;

const ProjectCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
`;

const ProjectCardTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0;
  color: #0f172a;
  flex: 1;
  line-height: 1.3;
  letter-spacing: -0.02em;
`;

const ProjectCardMenu = styled.div`
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: all 0.2s ease;
  transform: translateX(4px);
  
  ${ProjectCard}:hover & {
    opacity: 1;
    transform: translateX(0);
  }
`;

const IconButton = styled.button<{ $danger?: boolean }>`
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: ${(p) => (p.$danger ? "#ef4444" : "#64748b")};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${(p) => (p.$danger ? "#fee2e2" : "#f3f4f6")};
    color: ${(p) => (p.$danger ? "#dc2626" : "#1e293b")};
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProjectCardDescription = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin: 0 0 20px 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ProjectCardMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
`;

const StatusBadge = styled.span<{ $status: ProjectStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  background: ${(p) => STATUS_COLORS[p.$status]}15;
  color: ${(p) => STATUS_COLORS[p.$status]};
  border: 1px solid ${(p) => STATUS_COLORS[p.$status]}30;
  width: fit-content;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${(p) => STATUS_COLORS[p.$status]};
  }
`;

const ProgressBar = styled.div`
  position: relative;
  width: 100%;
  height: 28px;
  background: #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
`;

const ProgressFill = styled.div<{ $progress: number; $color: string }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${(p) => p.$progress}%;
  background: linear-gradient(90deg, ${(p) => p.$color}, ${(p) => p.$color}cc);
  border-radius: 14px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const ProgressText = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  font-weight: 800;
  color: #1e293b;
  z-index: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
`;

const ProjectCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
`;

const ProjectCardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #475569;
  font-weight: 500;
  
  svg {
    flex-shrink: 0;
    opacity: 0.8;
    color: #64748b;
  }
`;

const ProjectMembers = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
`;

const MemberAvatar = styled.div<{ $color: string; $more?: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  border: 3px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
  margin-left: -10px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, z-index 0.2s ease;
  position: relative;
  
  &:first-child {
    margin-left: 0;
  }
  
  &:hover {
    transform: scale(1.1);
    z-index: 10;
  }
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 10001;
  position: relative;
`;

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  border-radius: 16px 16px 0 0;
`;

const ModalIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${(p) => p.$color};
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #0f172a;
  flex: 1;
`;

const CloseButton = styled.button`
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:hover {
    background: #f3f4f6;
    color: #1e293b;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const Field = styled.div`
  display: grid;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  font-size: 0.875rem;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ProgressInput = styled.input`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #f1f5f9;
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-600);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-600);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0,0, 0.2);
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const ColorOption = styled.button<{ $color: string; $selected?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 3px solid ${(p) => (p.$selected ? "#1e293b" : "transparent")};
  background: ${(p) => p.$color};
  cursor: pointer;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  &:hover {
    transform: scale(1.1);
  }
`;

const MembersSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ModalActions = styled.div`
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: #fff;
  border-radius: 0 0 16px 16px;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  &:hover {
    background: #f8fafc;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ConfirmDialog = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  z-index: 10001;
  position: relative;
  padding: 24px;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1e293b;
`;

const ConfirmMessage = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 20px 0;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: #dc2626;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  &:hover {
    background: #b91c1c;
  }
`;

// Task Components
const ProjectCardTasks = styled.div`
  border-top: 2px solid #f1f5f9;
  margin-top: 20px;
  padding-top: 20px;
`;

const TaskHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 10px;
`;

const TaskHeaderButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateX(2px);
  }
  
  svg {
    transition: transform 0.2s ease;
  }
`;

const TaskCount = styled.span`
  color: #64748b;
  font-weight: 600;
  background: #e2e8f0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
`;

const TasksContainer = styled.div`
  margin-top: 12px;
`;

const TaskLoadingState = styled.div`
  padding: 32px 20px;
  text-align: center;
`;

const TaskEmptyState = styled.div`
  padding: 32px 20px;
  text-align: center;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
`;

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TaskItem = styled.div<{ $priority: TaskPriority }>`
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-left: 4px solid ${(p) => TASK_PRIORITY_COLORS[p.$priority]};
  border: 1px solid #e2e8f0;
  border-left: 4px solid ${(p) => TASK_PRIORITY_COLORS[p.$priority]};
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  
  &:hover {
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transform: translateX(4px);
  }
`;

const TaskItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const TaskItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const TaskCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
`;

const TaskTitle = styled.span<{ $done: boolean }>`
  font-weight: 500;
  color: #1e293b;
  text-decoration: ${(p) => (p.$done ? "line-through" : "none")};
  opacity: ${(p) => (p.$done ? 0.6 : 1)};
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PriorityBadge = styled.span<{ $priority: TaskPriority }>`
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  background: ${(p) => TASK_PRIORITY_COLORS[p.$priority]}15;
  color: ${(p) => TASK_PRIORITY_COLORS[p.$priority]};
  border: 1px solid ${(p) => TASK_PRIORITY_COLORS[p.$priority]}30;
  flex-shrink: 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const TaskItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const TaskSubtaskCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e2e8f0;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 500;
`;

const TaskDescription = styled.p`
  margin: 8px 0 0 26px;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.5;
`;

const TaskItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  margin-left: 26px;
  flex-wrap: wrap;
`;

const TaskAssignee = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #64748b;
`;

const TaskAssigneeAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 600;
  color: #475569;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const TaskDueDate = styled.div<{ $overdue: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: ${(p) => (p.$overdue ? "#dc2626" : "#64748b")};
  font-weight: ${(p) => (p.$overdue ? 600 : 400)};
`;

const SubtasksList = styled.div`
  margin-top: 8px;
  margin-left: 26px;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SubtaskItem = styled.div<{ $priority: TaskPriority }>`
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  border-left: 2px solid ${(p) => TASK_PRIORITY_COLORS[p.$priority]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const SubtaskItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

