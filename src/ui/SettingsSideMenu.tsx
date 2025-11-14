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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.47-.35.61-.98.33-1.5l-1.92-3.32c-.28-.52-.9-.73-1.42-.5l-2.4.96c-.65-.49-1.35-.9-2.1-1.22l-.36-2.54c-.05-.55-.5-.98-1.05-.98h-3.84c-.55 0-1 .43-1.05.98l-.36 2.54c-.75.32-1.45.73-2.1 1.22l-2.4-.96c-.52-.23-1.14-.02-1.42.5L2.44 8.98c-.28.52-.14 1.15.33 1.5l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.47.35-.61.98-.33 1.5l1.92 3.32c.28.52.9.73 1.42.5l2.4-.96c.65.49 1.35.9 2.1 1.22l.36 2.54c.05.55.5.98 1.05.98h3.84c.55 0 1-.43 1.05-.98l.36-2.54c.75-.32 1.45-.73 2.1-1.22l2.4.96c.52.23 1.14.02 1.42-.5l1.92-3.32c.28-.52.14-1.15-.33-1.5l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            Geral
          </NavItem>
          <NavItem
            onClick={() => navigate("appearance")}
            aria-label="Aparência"
            aria-current={activeKey === "appearance" ? "page" : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5 11 5.67 11 6.5 10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5 16 5.67 16 6.5 15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9 19 9.67 19 10.5 18.33 12 17.5 12z"/>
            </svg>
            Aparência
          </NavItem>
          <NavItem
            onClick={() => navigate("notifications")}
            aria-label="Notificações"
            aria-current={activeKey === "notifications" ? "page" : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            Notificações
          </NavItem>
          <NavItem
            onClick={() => navigate("security")}
            aria-label="Segurança"
            aria-current={activeKey === "security" ? "page" : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            Segurança
          </NavItem>
          <NavItem
            onClick={() => navigate("integrations")}
            aria-label="Integrações"
            aria-current={activeKey === "integrations" ? "page" : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
            Integrações
          </NavItem>
          <NavItem
            onClick={() => navigate("forms")}
            aria-label="Formulários"
            aria-current={activeKey === "forms" ? "page" : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            Formulários
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
  
  svg {
    flex-shrink: 0;
    opacity: 0.8;
  }
  
  &:hover { 
    background: #f3f4f6; 
    svg {
      opacity: 1;
    }
  }
  
  &[aria-current="page"] { 
    background: #eef2f7; 
    font-weight: 600;
    svg {
      opacity: 1;
    }
  }
  
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;