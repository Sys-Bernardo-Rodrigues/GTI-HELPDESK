"use client";

import { useEffect, useRef, useState } from "react";
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

const Overlay = styled.div<{ $show: boolean }>`
  @media (min-width: 961px) { display: none; }
  position: fixed;
  inset: 56px 0 0 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 15;
`;

const Content = styled.main`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ProfileHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 32px;
  color: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.3;
  }
`;

const ProfileHeaderContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ProfileAvatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid rgba(255, 255, 255, 0.3);
  display: grid;
  place-items: center;
  font-size: 3rem;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const ProfileName = styled.h1`
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 8px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const ProfileMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 0.9rem;
  opacity: 0.95;
`;

const ProfileMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section<{ $span?: number }>`
  background: #fff;
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
  grid-column: span 12;

  ${(p) => p.$span && `
    @media (min-width: 960px) {
      grid-column: span ${p.$span};
    }
  `}

  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const HeaderIcon = styled.div`
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

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
`;

const Muted = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  margin-bottom: 24px;
`;

const AvatarDisplay = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid var(--primary-600);
  display: grid;
  place-items: center;
  font-size: 4rem;
  font-weight: 700;
  color: var(--primary-600);
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarActions = styled.div`
  display: flex;
  gap: 12px;
`;

const AvatarButton = styled.label`
  padding: 10px 20px;
  border-radius: 10px;
  background: var(--primary-600);
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: var(--primary-700);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const RemoveButton = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  background: #fee2e2;
  color: #dc2626;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: #fecaca;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const FormGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:hover {
    border-color: #d1d5db;
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--primary-600);
  }

  span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }
`;

const PrimaryButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FormMessage = styled.div<{ $variant?: "success" | "error" }>`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-top: 16px;
  background: ${(p) => (p.$variant === "error" ? "#fee2e2" : "#dcfce7")};
  color: ${(p) => (p.$variant === "error" ? "#991b1b" : "#166534")};
  border: 1px solid ${(p) => (p.$variant === "error" ? "#fecaca" : "#bbf7d0")};
`;

const InlineInfo = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 0.875rem;
  margin-top: 12px;
  border: 1px solid #bfdbfe;
`;

const VerificationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const VerificationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
`;

const VerificationLabel = styled.span`
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
`;

const VerificationStatus = styled.span<{ $verified: boolean }>`
  font-weight: 700;
  font-size: 0.875rem;
  color: ${(p) => (p.$verified ? "#047857" : "#b45309")};
  padding: 4px 12px;
  border-radius: 6px;
  background: ${(p) => (p.$verified ? "#d1fae5" : "#fef3c7")};
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  padding: 24px;
  z-index: 1001;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: #0f172a;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;

  &:hover {
    background: #f8fafc;
  }
`;

const ConfirmButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: #dc2626;
  color: #fff;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;

  &:hover {
    background: #b91c1c;
  }
`;

type Profile = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  account: { twoFactor: boolean; newsletter: boolean };
  avatarUrl: string;
  discordTag: string;
  phoneVerified: boolean;
  pendingEmail: string;
  emailVerifiedAt: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [imgLoading, setImgLoading] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const [emailNew, setEmailNew] = useState<string>("");
  const [emailSaving, setEmailSaving] = useState<boolean>(false);
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [pwdCurrent, setPwdCurrent] = useState<string>("");
  const [pwdNew, setPwdNew] = useState<string>("");
  const [pwdConfirm, setPwdConfirm] = useState<string>("");
  const [pwdSaving, setPwdSaving] = useState<boolean>(false);
  const [pwdMessage, setPwdMessage] = useState<string>("");
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          setAvatarUrl(resolveAvatarUrl(json?.avatarUrl || ""));
          setProfile(json as Profile);
          setAvatarPreview(resolveAvatarUrl((json as Profile).avatarUrl) || "");
          const url = (json as Profile).avatarUrl || "";
          if (url) {
            setImgLoading(true);
            setImgError(false);
          } else {
            setImgLoading(false);
            setImgError(true);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

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

  function toggleUserMenu() {
    setMenuOpen((v) => !v);
  }

  async function onLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setMenuOpen(false);
    setConfirmOpen(false);
    window.location.assign("/");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          jobTitle: profile.jobTitle,
          company: profile.company,
          avatarUrl: avatarPreview,
          account: profile.account,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao salvar");
      setProfile(json as Profile);
      setMessage("Alterações salvas com sucesso.");
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onAvatarChange(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result || ""));
    reader.readAsDataURL(file);

    setImgLoading(true);
    setImgError(false);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json?.avatarUrl) {
        setAvatarPreview(resolveAvatarUrl(json.avatarUrl));
        setProfile((p) => (p ? { ...p, avatarUrl: json.avatarUrl } : p));
        setImgLoading(false);
      } else {
        setMessage(json?.error || "Falha ao enviar avatar");
        setImgLoading(false);
        setImgError(true);
      }
    } catch (e: any) {
      setMessage(e?.message || String(e));
      setImgLoading(false);
      setImgError(true);
    }
  }

  async function onRemoveAvatar() {
    setAvatarPreview("");
    setImgLoading(false);
    setImgError(true);
    setMessage("");
    if (!profile) return;
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          jobTitle: profile.jobTitle,
          company: profile.company,
          avatarUrl: "",
          account: profile.account,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao remover avatar");
      setProfile(json as Profile);
      setMessage("Foto removida.");
    } catch (err: any) {
      setMessage(err?.message || String(err));
    }
  }

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailNew) { setEmailMessage("Informe o novo e-mail."); return; }
    setEmailSaving(true);
    setEmailMessage("");
    try {
      const res = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: emailNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao atualizar e-mail");
      setProfile((p) => (p ? { ...p, pendingEmail: emailNew } : p));
      setEmailMessage("Verificação enviada para o novo e-mail.");
      setEmailNew("");
    } catch (err: any) {
      setEmailMessage(err?.message || String(err));
    } finally {
      setEmailSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage("");
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdMessage("Preencha todos os campos.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdMessage("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMessage("As senhas não coincidem.");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao alterar senha");
      setPwdMessage("Senha alterada com sucesso.");
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (err: any) {
      setPwdMessage(err?.message || String(err));
    } finally {
      setPwdSaving(false);
    }
  }

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
        <Overlay $show={open} onClick={() => setOpen(false)} aria-hidden={!open} />
        <Content>
          <ProfileHeader>
            <ProfileHeaderContent>
              <ProfileAvatar>
                {avatarPreview && !imgError ? (
                  <img src={avatarPreview} alt="Avatar" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />
                ) : (
                  <span>{(profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase()}</span>
                )}
              </ProfileAvatar>
              <ProfileInfo>
                <ProfileName>{profile?.name || "Usuário"}</ProfileName>
                <Muted style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "1rem" }}>{profile?.email || "email não informado"}</Muted>
                <ProfileMeta>
                  {profile?.jobTitle && (
                    <ProfileMetaItem>
                      <span>💼</span>
                      <span>{profile.jobTitle}</span>
                    </ProfileMetaItem>
                  )}
                  {profile?.company && (
                    <ProfileMetaItem>
                      <span>🏢</span>
                      <span>{profile.company}</span>
                    </ProfileMetaItem>
                  )}
                  {profile?.phone && (
                    <ProfileMetaItem>
                      <span>📱</span>
                      <span>{profile.phone}</span>
                    </ProfileMetaItem>
                  )}
                </ProfileMeta>
              </ProfileInfo>
            </ProfileHeaderContent>
          </ProfileHeader>

          <ProfileGrid>
            <Card>
              <CardHeader>
                <HeaderIcon>👤</HeaderIcon>
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <Muted>Atualize suas informações pessoais e preferências de conta</Muted>
                </div>
              </CardHeader>

              <AvatarSection>
                <AvatarDisplay>
                  {avatarPreview && !imgError ? (
                    <img src={avatarPreview} alt="Avatar" onLoad={() => setImgLoading(false)} onError={() => { setImgLoading(false); setImgError(true); }} />
                  ) : (
                    <span>{(profile?.name?.[0] || profile?.email?.[0] || "U").toUpperCase()}</span>
                  )}
                </AvatarDisplay>
                <AvatarActions>
                  <AvatarButton>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Alterar foto
                    <HiddenInput type="file" accept="image/*" onChange={(event) => onAvatarChange(event.target.files?.[0])} />
                  </AvatarButton>
                  {avatarPreview && (
                    <RemoveButton type="button" onClick={onRemoveAvatar}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Remover
                    </RemoveButton>
                  )}
                </AvatarActions>
              </AvatarSection>

              <form onSubmit={onSave}>
                <FormGrid>
                  <Field>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      value={profile?.name ?? ""}
                      onChange={(event) => setProfile((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                      placeholder="Seu nome completo"
                    />
                  </Field>

                  <FieldRow>
                    <Field>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profile?.phone ?? ""}
                        onChange={(event) => setProfile((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                        placeholder="(00) 00000-0000"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="discord">Discord</Label>
                      <Input
                        id="discord"
                        value={profile?.discordTag ?? ""}
                        onChange={(event) => setProfile((prev) => (prev ? { ...prev, discordTag: event.target.value } : prev))}
                        placeholder="usuario#0000"
                      />
                    </Field>
                  </FieldRow>

                  <FieldRow>
                    <Field>
                      <Label htmlFor="job">Cargo</Label>
                      <Input
                        id="job"
                        value={profile?.jobTitle ?? ""}
                        onChange={(event) => setProfile((prev) => (prev ? { ...prev, jobTitle: event.target.value } : prev))}
                        placeholder="Ex: Analista de TI"
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="company">Empresa</Label>
                      <Input
                        id="company"
                        value={profile?.company ?? ""}
                        onChange={(event) => setProfile((prev) => (prev ? { ...prev, company: event.target.value } : prev))}
                        placeholder="Nome da empresa"
                      />
                    </Field>
                  </FieldRow>

                  <div style={{ marginTop: "8px" }}>
                    <Label style={{ marginBottom: "12px", display: "block" }}>Preferências da conta</Label>
                    <CheckboxList>
                      <CheckboxItem htmlFor="twoFactor">
                        <input
                          id="twoFactor"
                          type="checkbox"
                          checked={!!profile?.account?.twoFactor}
                          onChange={() => setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, twoFactor: !prev.account?.twoFactor } } : prev))}
                        />
                        <span>Autenticação em dois fatores</span>
                      </CheckboxItem>
                      <CheckboxItem htmlFor="newsletter">
                        <input
                          id="newsletter"
                          type="checkbox"
                          checked={!!profile?.account?.newsletter}
                          onChange={() => setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, newsletter: !prev.account?.newsletter } } : prev))}
                        />
                        <span>Receber novidades e comunicados</span>
                      </CheckboxItem>
                    </CheckboxList>
                  </div>

                  {message && (
                    <FormMessage $variant={message.includes("sucesso") || message.includes("removida") ? "success" : "error"}>
                      {message}
                    </FormMessage>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <PrimaryButton type="submit" disabled={saving || !profile}>
                      {saving ? "Salvando..." : "Salvar alterações"}
                    </PrimaryButton>
                  </div>
                </FormGrid>
              </form>
            </Card>

            <Card $span={6}>
              <CardHeader>
                <HeaderIcon>📧</HeaderIcon>
                <div>
                  <CardTitle>Atualizar e-mail</CardTitle>
                  <Muted>Altere seu endereço de e-mail</Muted>
                </div>
              </CardHeader>
              <form onSubmit={onChangeEmail}>
                <Field>
                  <Label htmlFor="new-email">Novo e-mail</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailNew}
                    onChange={(event) => setEmailNew(event.target.value)}
                    placeholder="novo@email.com"
                  />
                </Field>
                {profile?.pendingEmail && (
                  <InlineInfo>
                    Verificação pendente para <strong>{profile.pendingEmail}</strong>
                  </InlineInfo>
                )}
                {emailMessage && (
                  <FormMessage $variant={emailMessage.includes("enviada") ? "success" : "error"}>
                    {emailMessage}
                  </FormMessage>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <PrimaryButton type="submit" disabled={emailSaving}>
                    {emailSaving ? "Enviando..." : "Enviar verificação"}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

            <Card $span={6}>
              <CardHeader>
                <HeaderIcon>🔐</HeaderIcon>
                <div>
                  <CardTitle>Alterar senha</CardTitle>
                  <Muted>Use uma senha forte com pelo menos 8 caracteres</Muted>
                </div>
              </CardHeader>
              <form onSubmit={onChangePassword}>
                <FormGrid>
                  <Field>
                    <Label htmlFor="pwd-current">Senha atual</Label>
                    <Input
                      id="pwd-current"
                      type="password"
                      value={pwdCurrent}
                      onChange={(event) => setPwdCurrent(event.target.value)}
                      placeholder="Digite sua senha atual"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="pwd-new">Nova senha</Label>
                    <Input
                      id="pwd-new"
                      type="password"
                      value={pwdNew}
                      onChange={(event) => setPwdNew(event.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                    <Input
                      id="pwd-confirm"
                      type="password"
                      value={pwdConfirm}
                      onChange={(event) => setPwdConfirm(event.target.value)}
                      placeholder="Digite novamente"
                    />
                  </Field>
                </FormGrid>
                {pwdMessage && (
                  <FormMessage $variant={pwdMessage.includes("sucesso") ? "success" : "error"}>
                    {pwdMessage}
                  </FormMessage>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <PrimaryButton type="submit" disabled={pwdSaving}>
                    {pwdSaving ? "Alterando..." : "Alterar senha"}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <HeaderIcon>✅</HeaderIcon>
                <div>
                  <CardTitle>Verificações</CardTitle>
                  <Muted>Status das confirmações da sua conta</Muted>
                </div>
              </CardHeader>
              <VerificationList>
                <VerificationItem>
                  <VerificationLabel>E-mail principal</VerificationLabel>
                  <VerificationStatus $verified={!!profile?.emailVerifiedAt}>
                    {profile?.emailVerifiedAt ? "Verificado" : "Pendente"}
                  </VerificationStatus>
                </VerificationItem>
                <VerificationItem>
                  <VerificationLabel>Telefone</VerificationLabel>
                  <VerificationStatus $verified={!!profile?.phoneVerified}>
                    {profile?.phoneVerified ? "Verificado" : "Pendente"}
                  </VerificationStatus>
                </VerificationItem>
              </VerificationList>
            </Card>
          </ProfileGrid>
        </Content>
      </Shell>
    </Page>
  );
}
