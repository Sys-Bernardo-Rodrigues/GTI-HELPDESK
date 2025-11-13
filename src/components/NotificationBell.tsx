"use client";

import { useEffect, useState, useRef } from "react";
import styled, { keyframes, css } from "styled-components";

type NotificationItem = {
  id: string;
  type: "new-ticket" | "ticket-assigned" | "ticket-overdue" | "ticket-scheduled";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  ticketId?: number;
};

const BELL_ANIMATION = keyframes`
  0%, 100% { transform: rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
  20%, 40%, 60%, 80% { transform: rotate(10deg); }
`;

const NotificationBellContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const BellButton = styled.button<{ $hasUnread: boolean }>`
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $hasUnread }) => ($hasUnread ? "#3b82f6" : "#64748b")};
  transition: color 0.2s ease;
  border-radius: 8px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #3b82f6;
  }

  ${({ $hasUnread }) =>
    $hasUnread &&
    css`
      animation: ${BELL_ANIMATION} 0.5s ease-in-out;
    `}

  svg {
    width: 24px;
    height: 24px;
    stroke-width: 2;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 380px;
  max-width: calc(100vw - 32px);
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 1000;
  display: ${({ $open }) => ($open ? "block" : "none")};
  max-height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const DropdownHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DropdownTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const MarkAllReadButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    color: #9ca3af;
    cursor: not-allowed;
  }
`;

const NotificationsList = styled.div`
  overflow-y: auto;
  max-height: 500px;
`;

const NotificationItem = styled.div<{ $unread: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s ease;
  background: ${({ $unread }) => ($unread ? "#eff6ff" : "white")};

  &:hover {
    background: ${({ $unread }) => ($unread ? "#dbeafe" : "#f9fafb")};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
`;

const NotificationTitle = styled.div`
  font-size: 14px;
  font-weight: ${({ $unread }) => ($unread ? 600 : 500)};
  color: #111827;
  flex: 1;
`;

const NotificationTime = styled.div`
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
`;

const NotificationMessage = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.4;
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #9ca3af;
`;

const EmptyStateIcon = styled.div`
  margin: 0 auto 12px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const EmptyStateText = styled.p`
  margin: 0;
  font-size: 14px;
`;

interface NotificationBellProps {
  onNotificationClick?: (ticketId?: number) => void;
}

export default function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar notificações do localStorage
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem("notifications");
        if (stored) {
          const parsed = JSON.parse(stored) as NotificationItem[];
          // Filtrar notificações antigas (mais de 7 dias)
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          const filtered = parsed.filter((n) => n.timestamp > sevenDaysAgo);
          setNotifications(filtered);
          if (filtered.length !== parsed.length) {
            localStorage.setItem("notifications", JSON.stringify(filtered));
          }
        }
      } catch (e) {
        console.warn("Erro ao carregar notificações:", e);
      }
    };

    loadNotifications();

    // Escutar eventos de nova notificação
    const handleNewNotification = (event: CustomEvent) => {
      const newNotification: NotificationItem = {
        id: `${Date.now()}-${Math.random()}`,
        type: event.detail.type,
        title: event.detail.title,
        message: event.detail.message,
        timestamp: Date.now(),
        read: false,
        ticketId: event.detail.ticketId,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Manter apenas as últimas 50 notificações
        const limited = updated.slice(0, 50);
        try {
          localStorage.setItem("notifications", JSON.stringify(limited));
        } catch (e) {
          console.warn("Erro ao salvar notificações:", e);
        }
        return limited;
      });
    };

    window.addEventListener("notification-created" as any, handleNewNotification as EventListener);

    return () => {
      window.removeEventListener("notification-created" as any, handleNewNotification as EventListener);
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch (e) {
        console.warn("Erro ao salvar notificações:", e);
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem("notifications", JSON.stringify(updated));
      } catch (e) {
        console.warn("Erro ao salvar notificações:", e);
      }
      return updated;
    });
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification.id);
    setDropdownOpen(false);
    if (onNotificationClick && notification.ticketId) {
      onNotificationClick(notification.ticketId);
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <NotificationBellContainer ref={containerRef}>
      <BellButton
        $hasUnread={unreadCount > 0}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
        aria-expanded={dropdownOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
      </BellButton>
      {dropdownOpen && (
        <Dropdown ref={dropdownRef} $open={dropdownOpen}>
          <DropdownHeader>
            <DropdownTitle>Notificações</DropdownTitle>
            <MarkAllReadButton onClick={markAllAsRead} disabled={unreadCount === 0}>
              Marcar todas como lidas
            </MarkAllReadButton>
          </DropdownHeader>
          <NotificationsList>
            {notifications.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </EmptyStateIcon>
                <EmptyStateText>Nenhuma notificação</EmptyStateText>
              </EmptyState>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  $unread={!notification.read}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationHeader>
                    <NotificationTitle $unread={!notification.read}>{notification.title}</NotificationTitle>
                    <NotificationTime>{formatTime(notification.timestamp)}</NotificationTime>
                  </NotificationHeader>
                  {notification.message && (
                    <NotificationMessage>{notification.message}</NotificationMessage>
                  )}
                </NotificationItem>
              ))
            )}
          </NotificationsList>
        </Dropdown>
      )}
    </NotificationBellContainer>
  );
}

