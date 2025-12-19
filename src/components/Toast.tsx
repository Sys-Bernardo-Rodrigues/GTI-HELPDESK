"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ $type: "success" | "error" | "info" | "warning"; $closing: boolean }>`
  min-width: 300px;
  max-width: 450px;
  padding: 14px 18px;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  color: #fff;
  font-size: 0.9rem;
  line-height: 1.5;
  
  @media (max-width: 768px) {
    min-width: auto;
    width: 100%;
    max-width: 100%;
    padding: 12px 16px;
    font-size: 0.85rem;
  }
  background: ${({ $type }) => {
    switch ($type) {
      case "success": return "#16a34a";
      case "error": return "#dc2626";
      case "warning": return "#f59e0b";
      case "info": return "#3b82f6";
      default: return "#64748b";
    }
  }};
  display: flex;
  align-items: center;
  gap: 12px;
  animation: ${({ $closing }) => ($closing ? slideOut : slideIn)} 0.3s ease;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;

const ToastIcon = styled.div`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ToastMessage = styled.div`
  flex: 1;
  font-weight: 500;
`;

const ToastWrapper = styled.div`
  position: fixed;
  right: 16px;
  top: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
  
  @media (max-width: 768px) {
    right: 8px;
    top: 8px;
    left: 8px;
  }
`;

type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastProps = {
  toasts: ToastItem[];
  onClose: (id: string) => void;
};

export function Toast({ toasts, onClose }: ToastProps) {
  if (toasts.length === 0) return null;
  
  return (
    <ToastWrapper>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </ToastWrapper>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const [closing, setClosing] = useState(false);
  const duration = toast.duration ?? 5000;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setClosing(true);
        setTimeout(() => onClose(toast.id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, toast.id, onClose]);

  const handleClick = () => {
    setClosing(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        );
      case "error":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        );
      case "warning":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "info":
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <ToastContainer
      $type={toast.type}
      $closing={closing}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
      style={{ pointerEvents: "auto" }}
    >
      <ToastIcon>{getIcon()}</ToastIcon>
      <ToastMessage>{toast.message}</ToastMessage>
    </ToastContainer>
  );
}

// Hook para usar toasts
let toastIdCounter = 0;

type ToastContextType = {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
};

export function useToast(): ToastContextType {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType = "info", duration?: number) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return {
    showToast,
    showSuccess: (message: string, duration?: number) => showToast(message, "success", duration),
    showError: (message: string, duration?: number) => showToast(message, "error", duration),
    showWarning: (message: string, duration?: number) => showToast(message, "warning", duration),
    showInfo: (message: string, duration?: number) => showToast(message, "info", duration),
  };
}

