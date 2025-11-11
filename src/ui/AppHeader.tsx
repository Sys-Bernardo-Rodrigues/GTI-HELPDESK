"use client";

import styled from "styled-components";
import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export default function AppHeader({ open, onToggle }: Props) {
  const [name, setName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const json = await res.json();
          setName(json?.name || json?.email || "Usuário");
          setAvatarUrl(resolveAvatarUrl(json?.avatarUrl || ""));
        }
      } catch {}
    })();
  }, []);

  return (
    <TopBar role="navigation" aria-label="Barra de navegação">
      <Brand>Helpdesk</Brand>
      <MainNav aria-label="Navegação principal">
        <NavLink href="/home" aria-label="Início">Início</NavLink>
        <NavLink href="/tickets" aria-label="Tickets">Tickets</NavLink>
        <NavLink href="/users" aria-label="Usuários">Usuários</NavLink>
        <NavLink href="/history" aria-label="Histórico">Histórico</NavLink>
        <NavLink href="/config" aria-label="Configurações">Configurações</NavLink>
      </MainNav>
      <UserArea aria-label="Usuário" role="button" tabIndex={0} aria-haspopup="false">
        <Avatar role="img" aria-label="Foto do usuário">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" decoding="async" />
          ) : (
            (name?.[0] || "U")
          )}
        </Avatar>
        <UserName>{name || "Usuário"}</UserName>
      </UserArea>
      <MenuToggle
        aria-label={open ? "Fechar menu lateral" : "Abrir menu lateral"}
        aria-controls="sidebar"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? "Fechar menu" : "Abrir menu"}
      </MenuToggle>
    </TopBar>
  );
}

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const MainNav = styled.nav`
  display: none;
  gap: 10px;
  margin-left: 20px;
  @media (min-width: 961px) {
    display: inline-flex;
  }
`;

const NavLink = styled(Link)`
  padding: 8px 10px;
  border-radius: 8px;
  color: inherit;
  text-decoration: none;
  &:hover { background: #f3f4f6; }
`;

const UserArea = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eef2f7;
  display: grid;
  place-items: center;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserName = styled.span`
  font-size: 12px;
  color: #374151;
`;

const MenuToggle = styled.button`
  margin-left: 8px;
  border: 1px solid var(--border);
  background: #fff;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  @media (min-width: 961px) {
    display: none;
  }
`;

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