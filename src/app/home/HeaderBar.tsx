"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import type { AuthUser } from "@/lib/auth";

type Props = { user: AuthUser };

export default function HeaderBar({ user }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) close();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [close]);

  return (
    <header className="home-nav" data-open={open}>
      <div className="home-brand">GTI Helpdesk</div>

      <nav className="home-menu" aria-label="Navegação principal">
        <Link href="/home" className="active" onClick={close}>Início</Link>
        <a href="#" onClick={close}>Tickets</a>
        <a href="#" onClick={close}>Relatórios</a>
        <a href="#" onClick={close}>Configurações</a>
      </nav>

      <button
        className="menu-toggle"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={toggle}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      <div className="home-profile">
        <span
          className="avatar"
          role="button"
          tabIndex={0}
          aria-label="Abrir perfil"
          onClick={() => router.push("/profile")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push("/profile");
          }}
        >
          {user.name?.[0] ?? user.email[0]}
        </span>
        <div className="details" />
        <LogoutButton />
      </div>

      <nav id="mobile-nav" className="mobile-nav" aria-label="Navegação principal (mobile)">
        <Link href="/home" className="active" onClick={close}>Início</Link>
        <a href="#" onClick={close}>Tickets</a>
        <a href="#" onClick={close}>Relatórios</a>
        <a href="#" onClick={close}>Configurações</a>
      </nav>
    </header>
  );
}