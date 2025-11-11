"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import { useRouter, useSearchParams } from "next/navigation";

type SectionKey = "general" | "appearance" | "notifications" | "security" | "integrations" | "forms";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  activeKey: SectionKey;
  onSelect: (key: SectionKey) => void;
};

export default function SettingsSideMenu({ open, setOpen, activeKey, onSelect }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const firstLinkRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_open");
    if (saved !== null) setOpen(saved === "true");
  }, [setOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar_open", String(open));
  }, [open]);

  useEffect(() => {
    if (open && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [open]);

  function navigate(key: SectionKey) {
    onSelect(key);
    const current = new URLSearchParams(params?.toString());
    current.set("section", key);
    router.replace(`/config?${current.toString()}`);
  }

  return (
    <Sidebar id="sidebar" aria-label="Menu lateral" aria-expanded={open} aria-hidden={!open} $open={open}>
      <nav role="navigation" aria-label="Navegação de configurações">
        <MenuScroll>
          <NavItem
            ref={firstLinkRef as any}
            onClick={() => navigate("general")}
            aria-label="Geral"
            aria-current={activeKey === "general" ? "page" : undefined}
          >
            🛠️ Geral
          </NavItem>
          <NavItem
            onClick={() => navigate("appearance")}
            aria-label="Aparência"
            aria-current={activeKey === "appearance" ? "page" : undefined}
          >
            🎨 Aparência
          </NavItem>
          <NavItem
            onClick={() => navigate("notifications")}
            aria-label="Notificações"
            aria-current={activeKey === "notifications" ? "page" : undefined}
          >
            🔔 Notificações
          </NavItem>
          <NavItem
            onClick={() => navigate("security")}
            aria-label="Segurança"
            aria-current={activeKey === "security" ? "page" : undefined}
          >
            🔒 Segurança
          </NavItem>
          <NavItem
            onClick={() => navigate("integrations")}
            aria-label="Integrações"
            aria-current={activeKey === "integrations" ? "page" : undefined}
          >
            🔗 Integrações
          </NavItem>
          <NavItem
            onClick={() => navigate("forms")}
            aria-label="Formulários"
            aria-current={activeKey === "forms" ? "page" : undefined}
          >
            📝 Formulários
          </NavItem>
        </MenuScroll>
      </nav>
    </Sidebar>
  );
}

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

const NavItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: inherit;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
  &[aria-current="page"] { background: #eef2f7; font-weight: 600; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;