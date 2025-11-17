"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type Permission = {
  id: number;
  key: string;
  name: string;
  description?: string | null;
  category: string;
  granted: boolean;
};

// Reutilizar os mesmos styled components da página /config
const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--bg);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
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
  z-index: 10000 !important;
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
  &:focus-visible { outline: 2px solid var(--primary-500); outline-offset: 2px; }
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
  grid-template-columns: auto 1fr auto;
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
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const CardTitle = styled.h1`
  font-size: 1.5rem;
  margin: 0;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0 0 12px;
  font-size: 0.9rem;
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

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  margin-left: auto;
  flex-wrap: wrap;
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
  &:active {
    transform: translateY(0);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
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

const UsersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const UserCard = styled.div<{ $selected?: boolean }>`
  background: #fff;
  border: 2px solid ${(p) => (p.$selected ? "var(--primary-500)" : "rgba(148, 163, 184, 0.2)")};
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: ${(p) => (p.$selected ? "var(--primary-600)" : "#cbd5e1")};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const UserCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 700;
  font-size: 1.2rem;
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserNameText = styled.div`
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserEmail = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PermissionsSection = styled.div`
  margin-top: 24px;
`;

const PermissionsHeader = styled.div`
  margin-bottom: 20px;
`;

const PermissionsTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
`;

const PermissionsSubtitle = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
`;

const PermissionsByCategory = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CategorySection = styled.div`
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
`;

const CategoryTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 12px 0;
  text-transform: capitalize;
`;

const PermissionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PermissionItem = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    border-color: var(--primary-300);
    background: #f8fafc;
  }
`;

const PermissionCheckbox = styled.input`
  margin-top: 2px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
`;

const PermissionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const PermissionName = styled.div`
  font-weight: 500;
  color: #0f172a;
  margin-bottom: 4px;
  font-size: 0.95rem;
`;

const PermissionDescription = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.4;
`;

const FormsScroll = styled.div`
  flex: 1;
  overflow: auto;
  margin-top: 12px;
  padding-bottom: 12px;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 0;
  scrollbar-width: thin;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: ${(p) => (p.$active ? "var(--primary-600)" : "#64748b")};
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  font-size: 0.9375rem;
  cursor: pointer;
  border-bottom: 2px solid ${(p) => (p.$active ? "var(--primary-600)" : "transparent")};
  margin-bottom: -2px;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  
  &:hover {
    color: ${(p) => (p.$active ? "var(--primary-700)" : "#475569")};
    background: ${(p) => (p.$active ? "transparent" : "#f8fafc")};
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

const TabContent = styled.div`
  animation: fadeIn 0.2s ease;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export default function PerfilDeAcessoPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const configButtonRef = useRef<HTMLButtonElement | null>(null);
  const configSubmenuRef = useRef<HTMLDivElement | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");

  useEffect(() => {
    const storage = typeof globalThis !== "undefined" ? (globalThis as any).localStorage : undefined;
    if (!storage) return;
    const saved = storage.getItem("sidebar_open");
    if (saved !== null) setOpen(saved === "true");
  }, []);

  useEffect(() => {
    if (typeof globalThis === "undefined") return;
    const storage = (globalThis as any).localStorage;
    if (storage) storage.setItem("sidebar_open", String(open));
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

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId);
    } else {
      setPermissions([]);
    }
  }, [selectedUserId]);

  // Posicionar menu do usuário dinamicamente
  useEffect(() => {
    if (!menuOpen || !footerRef.current || !menuRef.current) return;
    const updatePosition = () => {
      const footerEl = footerRef.current;
      const menu = menuRef.current;
      if (!footerEl || !menu) return;
      const rect = footerEl.getBoundingClientRect();
      menu.style.left = `${rect.left}px`;
      menu.style.top = `${rect.bottom + 8}px`;
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

  // Posicionar ConfigSubmenu dinamicamente
  useEffect(() => {
    if (!configSubmenuOpen || !configButtonRef.current || !configSubmenuRef.current) return;
    const updatePosition = () => {
      const buttonEl = configButtonRef.current;
      const submenu = configSubmenuRef.current;
      if (!buttonEl || !submenu) return;
      const rect = buttonEl.getBoundingClientRect();
      submenu.style.left = `${rect.left + rect.width + 8}px`;
      submenu.style.top = `${rect.top}px`;
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
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Fechar menu ao clicar fora
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
      const configSubmenuContains = (configSubmenuRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      const configButtonContains = (configButtonRef.current as unknown as { contains?: (el: HTMLElement) => boolean })?.contains?.(target);
      if (!configSubmenuContains && !configButtonContains) {
        setConfigSubmenuOpen(false);
      }
    }
    doc.addEventListener("mousedown", onDocDown);
    doc.addEventListener("touchstart", onDocDown);
    return () => {
      doc.removeEventListener("mousedown", onDocDown);
      doc.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  function loadUsers() {
    setLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setUsers(data.items);
        }
      })
      .catch((err) => {
        console.error(err);
        setFeedback({ type: "error", message: "Erro ao carregar usuários" });
      })
      .finally(() => setLoading(false));
  }

  function loadUserPermissions(userId: number) {
    setLoading(true);
    fetch(`/api/users/${userId}/permissions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setPermissions(data.items);
        }
      })
      .catch((err) => {
        console.error(err);
        setFeedback({ type: "error", message: "Erro ao carregar permissões" });
      })
      .finally(() => setLoading(false));
  }

  function togglePermission(permissionId: number) {
    setPermissions((prev) =>
      prev.map((p) => (p.id === permissionId ? { ...p, granted: !p.granted } : p))
    );
  }

  async function savePermissions() {
    if (!selectedUserId) return;

    setSaving(true);
    setFeedback(null);

    try {
      const permissionsToSave = permissions.map((p) => ({
        permissionId: p.id,
        granted: p.granted,
      }));

      const res = await fetch(`/api/users/${selectedUserId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permissionsToSave }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar permissões");
      }

      setFeedback({ type: "success", message: "Permissões salvas com sucesso!" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao salvar permissões" });
    } finally {
      setSaving(false);
    }
  }

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Mapeamento de abas para permissões
  const tabPermissionsMap: Record<string, string[]> = {
    home: ["page.home", "dobby.use"],
    tickets: ["page.tickets", "tickets.view", "tickets.create", "tickets.edit", "tickets.delete", "tickets.assign"],
    base: ["page.base", "knowledge.view", "knowledge.documents.view", "knowledge.files.view", "knowledge.create", "knowledge.edit", "knowledge.delete", "knowledge.passwords.manage"],
    agenda: ["page.agenda"],
    history: ["page.history"],
    reports: ["page.reports", "reports.view", "reports.export"],
    approvals: ["page.approvals"],
    projects: ["page.projects", "projects.view", "projects.create", "projects.edit", "projects.delete", "projects.manage_members"],
    users: ["page.users", "users.view", "users.create", "users.edit", "users.delete"],
    config: ["page.config", "config.view", "config.forms", "config.webhooks", "config.permissions"],
  };

  const tabLabels: Record<string, string> = {
    home: "Início",
    tickets: "Tickets",
    base: "Base de Conhecimento",
    agenda: "Agenda",
    history: "Histórico",
    reports: "Relatórios",
    approvals: "Aprovações",
    projects: "Projetos",
    users: "Usuários",
    config: "Configurações",
  };

  // Filtrar permissões da aba ativa
  const activeTabPermissions = permissions.filter((perm) => {
    const tabPerms = tabPermissionsMap[activeTab] || [];
    return tabPerms.includes(perm.key);
  });

  // Separar permissões de página das outras na aba ativa
  const pagePerms = activeTabPermissions.filter((p) => p.key.startsWith("page."));
  const otherPerms = activeTabPermissions.filter((p) => !p.key.startsWith("page."));

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Page>
      <TopBar>
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
            <NavItem href="/home" aria-label="Início">
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
            <NavItem href="/projetos" aria-label="Projetos">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
              </svg>
              <span>Projetos</span>
            </NavItem>
            <div style={{ position: "relative" }}>
              <NavItemButton
                type="button"
                ref={configButtonRef}
                onClick={() => setConfigSubmenuOpen(!configSubmenuOpen)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                <span>Config</span>
              </NavItemButton>
              {typeof globalThis !== "undefined" && (globalThis as any).document && configSubmenuOpen && createPortal(
                <ConfigSubmenu
                  ref={configSubmenuRef}
                  $open={configSubmenuOpen}
                >
                  <ConfigSubmenuItem
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
                    href="/config/perfildeacesso"
                    onClick={() => {
                      setConfigSubmenuOpen(false);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                    </svg>
                    Perfil de Acesso
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
        </Sidebar>

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
              onClick={() => { setMenuOpen(false); router.push("/profile"); }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Meu Perfil
            </UserMenuItem>
            <UserMenuItem
              role="menuitem"
              tabIndex={0}
              $variant="danger"
              onClick={async () => {
                setMenuOpen(false);
                try {
                  await fetch("/api/logout", { method: "POST" });
                } catch {}
                window.location.assign("/");
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              Sair
            </UserMenuItem>
          </UserMenu>,
          document.body
        )}

        <Overlay $show={open} onClick={() => setOpen(false)} />

        <Content>
          <FormsWrapper>
            <Card aria-labelledby="permissions-title">
              <CardHeader>
                <HeaderIcon aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                </HeaderIcon>
                <div>
                  <CardTitle id="permissions-title">Perfil de Acesso</CardTitle>
                  <Muted>Configure as permissões de acesso para cada usuário do sistema</Muted>
                </div>
                <HeaderActions>
                  <ActionButton type="button" onClick={() => loadUsers()} disabled={loading}>
                    Recarregar
                  </ActionButton>
                </HeaderActions>
              </CardHeader>

              {feedback && (
                <Feedback role={feedback.type === "error" ? "alert" : "status"} $variant={feedback.type}>
                  {feedback.message}
                </Feedback>
              )}

              <FormsScroll>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", color: "#0f172a" }}>
                    Selecione um usuário
                  </h3>
                  {loading && !selectedUserId ? (
                    <Muted>Carregando usuários...</Muted>
                  ) : users.length === 0 ? (
                    <Muted>Nenhum usuário encontrado</Muted>
                  ) : (
                    <UsersGrid>
                      {users.map((u) => (
                        <UserCard
                          key={u.id}
                          $selected={selectedUserId === u.id}
                          onClick={() => setSelectedUserId(u.id)}
                        >
                          <UserCardHeader>
                            <UserAvatar>
                              {u.avatarUrl ? (
                                <img src={resolveAvatarUrl(u.avatarUrl)} alt={u.name} />
                              ) : (
                                getInitials(u.name)
                              )}
                            </UserAvatar>
                            <UserInfo>
                              <UserNameText>{u.name}</UserNameText>
                              <UserEmail>{u.email}</UserEmail>
                            </UserInfo>
                          </UserCardHeader>
                        </UserCard>
                      ))}
                    </UsersGrid>
                  )}

                  {selectedUserId && (
                    <PermissionsSection>
                      <PermissionsHeader>
                        <PermissionsTitle>
                          Permissões de {selectedUser?.name || "Usuário"}
                        </PermissionsTitle>
                        <PermissionsSubtitle>
                          Selecione as permissões que este usuário pode acessar em cada seção
                        </PermissionsSubtitle>
                      </PermissionsHeader>

                      {loading ? (
                        <Muted>Carregando permissões...</Muted>
                      ) : permissions.length === 0 ? (
                        <Muted>Nenhuma permissão disponível</Muted>
                      ) : (
                        <>
                          <TabsContainer>
                            {Object.keys(tabLabels).map((tabKey) => (
                              <Tab
                                key={tabKey}
                                $active={activeTab === tabKey}
                                onClick={() => setActiveTab(tabKey)}
                              >
                                {tabLabels[tabKey]}
                              </Tab>
                            ))}
                          </TabsContainer>

                          <TabContent>
                            {activeTabPermissions.length === 0 ? (
                              <Muted>Nenhuma permissão disponível para esta seção</Muted>
                            ) : (
                              <PermissionsByCategory>
                                {/* Exibir permissões de página primeiro */}
                                {pagePerms.length > 0 && (
                                  <CategorySection key="page-access">
                                    <CategoryTitle>Acesso à Página</CategoryTitle>
                                    <p style={{ marginTop: "8px", marginBottom: "16px", fontSize: "0.875rem", color: "#64748b" }}>
                                      Controla se esta página aparece no menu lateral para este usuário
                                    </p>
                                    <PermissionsList>
                                      {pagePerms.map((perm) => (
                                        <PermissionItem key={perm.id}>
                                          <PermissionCheckbox
                                            type="checkbox"
                                            checked={perm.granted}
                                            onChange={() => togglePermission(perm.id)}
                                          />
                                          <PermissionInfo>
                                            <PermissionName>{perm.name}</PermissionName>
                                            {perm.description && (
                                              <PermissionDescription>{perm.description}</PermissionDescription>
                                            )}
                                          </PermissionInfo>
                                        </PermissionItem>
                                      ))}
                                    </PermissionsList>
                                  </CategorySection>
                                )}
                                
                                {/* Exibir outras permissões da seção */}
                                {otherPerms.length > 0 && (
                                  <CategorySection key="section-permissions">
                                    <CategoryTitle>Permissões de {tabLabels[activeTab]}</CategoryTitle>
                                    <p style={{ marginTop: "8px", marginBottom: "16px", fontSize: "0.875rem", color: "#64748b" }}>
                                      Controla as ações que este usuário pode realizar nesta seção
                                    </p>
                                    <PermissionsList>
                                      {otherPerms.map((perm) => (
                                        <PermissionItem key={perm.id}>
                                          <PermissionCheckbox
                                            type="checkbox"
                                            checked={perm.granted}
                                            onChange={() => togglePermission(perm.id)}
                                          />
                                          <PermissionInfo>
                                            <PermissionName>{perm.name}</PermissionName>
                                            {perm.description && (
                                              <PermissionDescription>{perm.description}</PermissionDescription>
                                            )}
                                          </PermissionInfo>
                                        </PermissionItem>
                                      ))}
                                    </PermissionsList>
                                  </CategorySection>
                                )}
                              </PermissionsByCategory>
                            )}
                          </TabContent>
                          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                            <PrimaryButton onClick={savePermissions} disabled={saving}>
                              {saving ? "Salvando..." : "Salvar Permissões"}
                            </PrimaryButton>
                          </div>
                        </>
                      )}
                    </PermissionsSection>
                  )}
                </div>
              </FormsScroll>
            </Card>
          </FormsWrapper>
        </Content>
      </Shell>
    </Page>
  );
}
