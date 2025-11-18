"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import StandardLayout from "@/components/StandardLayout";

type ApprovalItem = {
  id: number;
  submissionId: number;
  formId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt?: string | null;
  formTitle: string;
  formSlug: string;
  submissionData: Record<string, any>;
  formFields: Array<{ id: number; label: string; type: string }>;
  reviewedByName?: string | null;
  reviewedByEmail?: string | null;
};

const Content = styled.main`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const PageSubtitle = styled.p`
  font-size: 1.0625rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
  max-width: 600px;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9375rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  
  &:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #cbd5e1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    width: 18px;
    height: 18px;
    transition: transform 0.3s ease;
  }
  
  &:hover:not(:disabled) svg {
    transform: rotate(180deg);
  }
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 12px 24px;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  color: ${(p) => (p.$active ? "#f59e0b" : "#64748b")};
  cursor: pointer;
  border-bottom: 2px solid ${(p) => (p.$active ? "#f59e0b" : "transparent")};
  margin-bottom: -2px;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    color: ${(p) => (p.$active ? "#f59e0b" : "#475569")};
  }
  
  &:focus {
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid #f59e0b;
    outline-offset: 2px;
  }
`;

const TabsAndSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
  gap: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ItemsPerPageSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  label {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
    white-space: nowrap;
  }
  
  select {
    padding: 8px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 0.875rem;
    font-weight: 500;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      border-color: #cbd5e1;
    }
    
    &:focus {
      outline: none;
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    }
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border-top: 1.5px solid #e2e8f0;
  background: #f8fafc;
`;

const PaginationButton = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  padding: 8px 12px;
  border: 1.5px solid ${(p) => (p.$active ? "#f59e0b" : "#e2e8f0")};
  border-radius: 8px;
  background: ${(p) => (p.$active ? "#f59e0b" : "#fff")};
  color: ${(p) => (p.$active ? "#fff" : p.$disabled ? "#cbd5e1" : "#0f172a")};
  font-size: 0.875rem;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover:not(:disabled) {
    border-color: ${(p) => (p.$active ? "#d97706" : "#cbd5e1")};
    background: ${(p) => (p.$active ? "#d97706" : "#f8fafc")};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 8px;
  white-space: nowrap;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 28px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f59e0b, #d97706);
  }
  
  &:hover {
    border-color: #f59e0b;
    box-shadow: 0 8px 24px rgba(245, 158, 11, 0.12);
    transform: translateY(-2px);
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${(p) => p.$color}15;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  
  svg {
    width: 28px;
    height: 28px;
    color: ${(p) => p.$color};
  }
`;

const StatContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const StatValue = styled.div`
  font-size: 2.25rem;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: 0.9375rem;
  color: #64748b;
  font-weight: 600;
`;

const Card = styled.section`
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 32px;
  border-bottom: 1.5px solid #e2e8f0;
  background: linear-gradient(135deg, #fffbeb 0%, #fff 100%);
`;

const HeaderContentWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const HeaderIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 8px 16px rgba(245, 158, 11, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  flex-shrink: 0;
  
  svg {
    width: 28px;
    height: 28px;
  }
`;

const HeaderText = styled.div`
  flex: 1;
`;

const CardTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px 0;
  letter-spacing: -0.01em;
`;

const CardDescription = styled.p`
  font-size: 0.9375rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
`;

const FeedbackBanner = styled.div<{ $type: "success" | "error" }>`
  margin: 0 32px 24px 32px;
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.9375rem;
  font-weight: 600;
  background: ${(p) => (p.$type === "success" ? "#dcfce7" : "#fee2e2")};
  color: ${(p) => (p.$type === "success" ? "#166534" : "#991b1b")};
  border: 1.5px solid ${(p) => (p.$type === "success" ? "#86efac" : "#fecaca")};
  animation: slideDown 0.3s ease;
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }
`;

const CardBody = styled.div`
  padding: 32px;
  
  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 100px 32px;
  color: #94a3b8;
`;

const EmptyIcon = styled.div`
  margin: 0 auto 32px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  display: grid;
  place-items: center;
  
  svg {
    width: 56px;
    height: 56px;
    color: #94a3b8;
    opacity: 0.5;
  }
`;

const EmptyTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #475569;
  margin: 0 0 12px 0;
`;

const EmptyText = styled.p`
  font-size: 1rem;
  margin: 0;
  color: #64748b;
  line-height: 1.6;
  max-width: 500px;
  margin: 0 auto;
`;

const LoadingState = styled.div`
  padding: 80px 32px;
  text-align: center;
  color: #64748b;
  font-size: 1rem;
  font-weight: 500;
`;

const ApprovalList = styled.div`
  display: grid;
  gap: 12px;
`;

const ApprovalCard = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, #f59e0b, #d97706);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    
    &::before {
      opacity: 1;
    }
  }
`;

const ApprovalCardHeader = styled.div`
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const ApprovalHeaderLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const ApprovalTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  line-height: 1.4;
`;

const ApprovalBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  
  svg {
    width: 10px;
    height: 10px;
    flex-shrink: 0;
  }
`;

const ApprovalMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.75rem;
  color: #64748b;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
  
  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    color: #94a3b8;
  }
`;

const ApprovalCardBody = styled.div`
  padding: 16px 20px;
`;

const ApprovalFields = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const ApprovalField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.6875rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: "";
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #cbd5e1;
    flex-shrink: 0;
  }
`;

const FieldValue = styled.div`
  font-size: 0.875rem;
  color: #0f172a;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  line-height: 1.5;
  word-break: break-word;
  min-height: 36px;
  display: flex;
  align-items: center;
  
  &:empty::before {
    content: "—";
    color: #94a3b8;
    font-style: italic;
  }
`;

const ImagePreview = styled.div`
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #f1f5f9;
  overflow: hidden;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`;

const ImageLink = styled.a`
  display: block;
  padding: 8px 12px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ImageModal = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: ${(p) => (p.$open ? "fadeIn 0.2s ease" : "none")};
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ImageModalContent = styled.div`
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ImageModalImg = styled.img`
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const ImageModalClose = styled.button`
  position: absolute;
  top: -48px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ApprovalActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ActionButton = styled.button<{ $variant: "approve" | "reject" }>`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  ${(p) => p.$variant === "approve" ? `
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: #fff;
    box-shadow: 0 2px 6px rgba(22, 163, 74, 0.2);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #15803d, #166534);
      box-shadow: 0 4px 10px rgba(22, 163, 74, 0.3);
    }
  ` : `
    background: #fff;
    color: #dc2626;
    border: 1.5px solid #dc2626;
    
    &:hover:not(:disabled) {
      background: #fee2e2;
      border-color: #b91c1c;
    }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity .18s ease;
  z-index: 30;
`;

const ConfirmDialog = styled.div<{ $open: boolean }>`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${(p) => (p.$open ? 1 : 0.98)});
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.16);
  width: min(90vw, 420px);
  padding: 16px;
  z-index: 31;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: transform .18s ease, opacity .18s ease;
`;

const ConfirmHeader = styled.div`
  padding: 32px 32px 24px;
  border-bottom: 1.5px solid #e2e8f0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ConfirmIcon = styled.div<{ $type: "approve" | "reject" }>`
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: ${(p) => (p.$type === "approve" ? "#dcfce7" : "#fee2e2")};
  display: grid;
  place-items: center;
  margin-bottom: 20px;
  
  svg {
    width: 32px;
    height: 32px;
    color: ${(p) => (p.$type === "approve" ? "#16a34a" : "#dc2626")};
  }
`;

const ConfirmTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 12px;
`;

const ConfirmDescription = styled.p`
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.7;
  text-align: center;
  max-width: 100%;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ $variant?: "approve" | "reject" }>`
  padding: 10px 14px;
  border-radius: 10px;
  border: ${(p) => p.$variant === "reject" ? "1px solid #FF0000" : p.$variant === "approve" ? "none" : "1px solid #FF0000"};
  background: ${(p) => p.$variant === "reject" ? "#FF0000" : p.$variant === "approve" ? "linear-gradient(135deg, #16a34a, #15803d)" : "#FF0000"};
  color: #fff;
  cursor: pointer;
  &:hover { 
    filter: ${(p) => p.$variant === "approve" ? "none" : "brightness(1.05)"};
    background: ${(p) => p.$variant === "approve" ? "linear-gradient(135deg, #15803d, #166534)" : undefined};
  }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

const CancelButton = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  &:hover { background: #f3f4f6; }
  &:focus { outline: none; }
  &:focus-visible { outline: none; }
`;

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", { 
      dateStyle: "short", 
      timeStyle: "short" 
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "-";
  try {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return formatDate(value);
  } catch {
    return formatDate(value);
  }
}

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

function resolveImageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
    return `${origin}/${trimmed}`;
  }
  return trimmed;
}

function isImageUrl(value: any, fieldType?: string): boolean {
  if (!value || typeof value !== "string") return false;
  const str = String(value).trim();
  if (!str || str === "null" || str === "-") return false;
  
  // Se o campo é do tipo FILE, assume que é imagem
  if (fieldType === "FILE") return true;
  
  // Verifica se é uma URL de imagem (começa com /uploads/forms/ ou é data:image)
  if (str.startsWith("/uploads/forms/")) return true;
  if (str.startsWith("data:image/")) return true;
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(str)) return true;
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(str)) return true;
  
  return false;
}

function getBrowserWindow(): any {
  if (typeof globalThis !== "undefined" && (globalThis as any).window) {
    return (globalThis as any).window;
  }
  return undefined;
}

function getBrowserDocument(): any {
  const win = getBrowserWindow();
  if (win?.document) return win.document;
  if (typeof globalThis !== "undefined" && (globalThis as any).document) {
    return (globalThis as any).document;
  }
  return undefined;
}

export default function AprovacoesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [historyApprovals, setHistoryApprovals] = useState<ApprovalItem[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(4);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "approve" | "reject" } | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [imageModalSrc, setImageModalSrc] = useState<string>("");

  useEffect(() => {
    if (activeTab === "pending") {
      loadApprovals();
    } else {
      loadHistory();
    }
    setCurrentPage(1); // Resetar para primeira página ao trocar de aba
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1); // Resetar para primeira página ao mudar itemsPerPage
  }, [itemsPerPage]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const res = await fetch("/api/approvals?status=PENDING");
      if (res.ok) {
        const json = await res.json();
        setApprovals(json.items || []);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao carregar aprovações" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      // Buscar aprovações aprovadas e rejeitadas
      const [approvedRes, rejectedRes] = await Promise.all([
        fetch("/api/approvals?status=APPROVED"),
        fetch("/api/approvals?status=REJECTED"),
      ]);
      
      const approvedJson = approvedRes.ok ? await approvedRes.json() : { items: [] };
      const rejectedJson = rejectedRes.ok ? await rejectedRes.json() : { items: [] };
      
      const allHistory = [...(approvedJson.items || []), ...(rejectedJson.items || [])];
      // Ordenar por data de revisão (mais recente primeiro)
      allHistory.sort((a, b) => {
        const dateA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
        const dateB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setHistoryApprovals(allHistory);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao carregar histórico" });
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    if (activeTab === "pending") {
      await loadApprovals();
    } else {
      await loadHistory();
    }
  }

  async function handleApprove(id: number) {
    setProcessingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Erro ao aprovar");
      }
      setFeedback({ type: "success", message: "Formulário aprovado e ticket criado com sucesso!" });
      await loadApprovals();
      // Recarregar histórico também se estiver na aba de histórico
      if (activeTab === "history") {
        await loadHistory();
      }
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao aprovar formulário" });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setProcessingId(null);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  }

  async function handleReject(id: number) {
    setProcessingId(id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Erro ao rejeitar");
      }
      setFeedback({ type: "success", message: "Formulário rejeitado" });
      await loadApprovals();
      // Recarregar histórico também se estiver na aba de histórico
      if (activeTab === "history") {
        await loadHistory();
      }
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Erro ao rejeitar formulário" });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setProcessingId(null);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  }

  function openConfirm(id: number, action: "approve" | "reject") {
    setConfirmAction({ id, action });
    setConfirmOpen(true);
  }

  function openImageModal(src: string) {
    setImageModalSrc(resolveImageUrl(src));
    setImageModalOpen(true);
  }



  useEffect(() => {
    const doc = getBrowserDocument();
    if (!doc) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && imageModalOpen) {
        setImageModalOpen(false);
      }
    }
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [imageModalOpen]);

  return (
    <StandardLayout>
        <Content>
          <div>
            <PageHeader>
              <RefreshButton onClick={handleRefresh} disabled={refreshing || (activeTab === "pending" ? loading : historyLoading)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {refreshing ? "Atualizando..." : "Atualizar"}
              </RefreshButton>
            </PageHeader>
          </div>

          <Card>
            <CardHeader>
              <HeaderContentWrapper>
                <HeaderIcon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </HeaderIcon>
                <HeaderText>
                  <CardTitle>{activeTab === "pending" ? "Solicitações Pendentes" : "Histórico de Aprovações"}</CardTitle>
                  <CardDescription>
                    {activeTab === "pending" 
                      ? "Formulários aguardando sua revisão e aprovação"
                      : "Registro de todas as aprovações e rejeições processadas"}
                  </CardDescription>
                </HeaderText>
              </HeaderContentWrapper>
            </CardHeader>
            
            <TabsAndSelector>
              <TabsContainer>
                <TabButton 
                  $active={activeTab === "pending"} 
                  onClick={() => setActiveTab("pending")}
                  aria-selected={activeTab === "pending"}
                  role="tab"
                >
                  Pendentes
                </TabButton>
                <TabButton 
                  $active={activeTab === "history"} 
                  onClick={() => setActiveTab("history")}
                  aria-selected={activeTab === "history"}
                  role="tab"
                >
                  Histórico
                </TabButton>
              </TabsContainer>
              <ItemsPerPageSelector>
                <label htmlFor="items-per-page">Mostrar:</label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={4}>4</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </ItemsPerPageSelector>
            </TabsAndSelector>
            
            {feedback && (
              <FeedbackBanner $type={feedback.type}>
                {feedback.type === "success" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
                {feedback.message}
              </FeedbackBanner>
            )}
            
            <CardBody>
              {activeTab === "pending" ? (
                <>
                  {loading ? (
                    <LoadingState>Carregando aprovações...</LoadingState>
                  ) : approvals.length === 0 ? (
                    <EmptyState>
                      <EmptyIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                      </EmptyIcon>
                      <EmptyTitle>Nenhuma aprovação pendente</EmptyTitle>
                      <EmptyText>
                        Todas as solicitações foram processadas. Novas aprovações aparecerão aqui automaticamente quando formulários forem submetidos.
                      </EmptyText>
                    </EmptyState>
                  ) : (
                    <>
                      <ApprovalList>
                        {approvals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((approval) => {
                    const fieldMap = new Map<string, string>();
                    approval.formFields.forEach((field) => {
                      fieldMap.set(`field_${field.id}`, field.label);
                    });
                    
                    return (
                      <ApprovalCard key={approval.id}>
                        <ApprovalCardHeader>
                          <ApprovalHeaderLeft>
                            <ApprovalTitle>
                              {approval.formTitle}
                              <ApprovalBadge>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                Pendente
                              </ApprovalBadge>
                            </ApprovalTitle>
                            <ApprovalMeta>
                              <MetaItem>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                {formatRelativeTime(approval.createdAt)}
                              </MetaItem>
                              <MetaItem>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                  <line x1="16" y1="2" x2="16" y2="6"/>
                                  <line x1="8" y1="2" x2="8" y2="6"/>
                                  <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                {formatDate(approval.createdAt)}
                              </MetaItem>
                            </ApprovalMeta>
                          </ApprovalHeaderLeft>
                        </ApprovalCardHeader>
                        
                        <ApprovalCardBody>
                          <ApprovalFields>
                            {Array.from(fieldMap.entries()).map(([key, label]) => {
                              const value = approval.submissionData[key];
                              if (value === null || value === undefined || value === "") return null;
                              
                              // Encontrar o tipo do campo
                              const field = approval.formFields.find(f => `field_${f.id}` === key);
                              const fieldType = field?.type;
                              
                              // Verificar se é uma imagem
                              const isImage = isImageUrl(value, fieldType);
                              
                              let displayValue = String(value);
                              if (typeof value === "boolean") {
                                displayValue = value ? "Sim" : "Não";
                              } else if (Array.isArray(value)) {
                                displayValue = value.join(", ");
                              }
                              
                              const imageUrl = isImage ? resolveImageUrl(displayValue) : null;
                              
                              return (
                                <ApprovalField key={key}>
                                  <FieldLabel>{label}</FieldLabel>
                                  {isImage && imageUrl ? (
                                    <>
                                      <FieldValue style={{ padding: 0, minHeight: "auto", background: "transparent", border: "none" }}>
                                        <ImagePreview>
                                          <ImageWrapper>
                                            <Image 
                                              src={imageUrl} 
                                              alt={label}
                                              onClick={() => openImageModal(displayValue)}
                                              loading="lazy"
                                              onError={(e) => {
                                                // Se a imagem falhar ao carregar, mostrar fallback
                                                const target = e.target as HTMLImageElement;
                                                const wrapper = target.parentElement;
                                                if (wrapper) {
                                                  wrapper.innerHTML = `
                                                    <div style="
                                                      position: absolute;
                                                      inset: 0;
                                                      display: flex;
                                                      flex-direction: column;
                                                      align-items: center;
                                                      justify-content: center;
                                                      padding: 24px;
                                                      color: #64748b;
                                                      text-align: center;
                                                      background: #f8fafc;
                                                    ">
                                                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 12px; opacity: 0.5;">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                                        <polyline points="21 15 16 10 5 21"/>
                                                      </svg>
                                                      <div style="font-size: 0.875rem; font-weight: 500;">Imagem não disponível</div>
                                                      <div style="font-size: 0.75rem; margin-top: 4px; word-break: break-all;">${displayValue}</div>
                                                    </div>
                                                  `;
                                                }
                                              }}
                                            />
                                          </ImageWrapper>
                                          <ImageLink 
                                            href={imageUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                              <polyline points="15 3 21 3 21 9"/>
                                              <line x1="10" y1="14" x2="21" y2="3"/>
                                            </svg>
                                            Abrir em nova aba
                                          </ImageLink>
                                        </ImagePreview>
                                      </FieldValue>
                                    </>
                                  ) : (
                                    <FieldValue>{displayValue}</FieldValue>
                                  )}
                                </ApprovalField>
                              );
                            })}
                          </ApprovalFields>
                          
                          <ApprovalActions>
                            <ActionButton
                              $variant="approve"
                              onClick={() => openConfirm(approval.id, "approve")}
                              disabled={processingId === approval.id}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              {processingId === approval.id ? "Aprovando..." : "Aprovar"}
                            </ActionButton>
                            <ActionButton
                              $variant="reject"
                              onClick={() => openConfirm(approval.id, "reject")}
                              disabled={processingId === approval.id}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                              {processingId === approval.id ? "Rejeitando..." : "Rejeitar"}
                            </ActionButton>
                          </ApprovalActions>
                        </ApprovalCardBody>
                      </ApprovalCard>
                    );
                  })}
                      </ApprovalList>
                      {approvals.length > itemsPerPage && (
                        <PaginationContainer>
                          <PaginationButton
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            $disabled={currentPage === 1}
                            aria-label="Página anterior"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="15 18 9 12 15 6"/>
                            </svg>
                          </PaginationButton>
                          {Array.from({ length: Math.ceil(approvals.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                            <PaginationButton
                              key={page}
                              $active={currentPage === page}
                              onClick={() => setCurrentPage(page)}
                              aria-label={`Ir para página ${page}`}
                              aria-current={currentPage === page ? "page" : undefined}
                            >
                              {page}
                            </PaginationButton>
                          ))}
                          <PaginationButton
                            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(approvals.length / itemsPerPage), p + 1))}
                            disabled={currentPage >= Math.ceil(approvals.length / itemsPerPage)}
                            $disabled={currentPage >= Math.ceil(approvals.length / itemsPerPage)}
                            aria-label="Próxima página"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </PaginationButton>
                          <PaginationInfo>
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, approvals.length)} de {approvals.length}
                          </PaginationInfo>
                        </PaginationContainer>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {historyLoading ? (
                    <LoadingState>Carregando histórico...</LoadingState>
                  ) : historyApprovals.length === 0 ? (
                    <EmptyState>
                      <EmptyIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                        </svg>
                      </EmptyIcon>
                      <EmptyTitle>Nenhum histórico disponível</EmptyTitle>
                      <EmptyText>
                        Ainda não há aprovações ou rejeições processadas. O histórico aparecerá aqui após você aprovar ou rejeitar formulários.
                      </EmptyText>
                    </EmptyState>
                  ) : (
                    <>
                      <ApprovalList>
                        {historyApprovals.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((approval) => {
                        const fieldMap = new Map<string, string>();
                        approval.formFields.forEach((field) => {
                          fieldMap.set(`field_${field.id}`, field.label);
                        });
                        
                        const isApproved = approval.status === "APPROVED";
                        
                        return (
                          <ApprovalCard key={approval.id}>
                            <ApprovalCardHeader>
                              <ApprovalHeaderLeft>
                                <ApprovalTitle>
                                  {approval.formTitle}
                                  <ApprovalBadge style={{ 
                                    background: isApproved ? "rgba(16, 185, 129, 0.15)" : "rgba(220, 38, 38, 0.15)",
                                    color: isApproved ? "#047857" : "#B91C1C"
                                  }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      {isApproved ? (
                                        <polyline points="20 6 9 17 4 12"/>
                                      ) : (
                                        <>
                                          <circle cx="12" cy="12" r="10"/>
                                          <line x1="15" y1="9" x2="9" y2="15"/>
                                          <line x1="9" y1="9" x2="15" y2="15"/>
                                        </>
                                      )}
                                    </svg>
                                    {isApproved ? "Aprovado" : "Rejeitado"}
                                  </ApprovalBadge>
                                </ApprovalTitle>
                                <ApprovalMeta>
                                  <MetaItem>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/>
                                      <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    {approval.reviewedAt ? formatRelativeTime(approval.reviewedAt) : formatRelativeTime(approval.createdAt)}
                                  </MetaItem>
                                  <MetaItem>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                      <line x1="16" y1="2" x2="16" y2="6"/>
                                      <line x1="8" y1="2" x2="8" y2="6"/>
                                      <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    {approval.reviewedAt ? formatDate(approval.reviewedAt) : formatDate(approval.createdAt)}
                                  </MetaItem>
                                  {approval.reviewedByName && (
                                    <MetaItem>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                      </svg>
                                      Por {approval.reviewedByName}
                                    </MetaItem>
                                  )}
                                </ApprovalMeta>
                              </ApprovalHeaderLeft>
                            </ApprovalCardHeader>
                            
                            <ApprovalCardBody>
                              <ApprovalFields>
                                {Array.from(fieldMap.entries()).map(([key, label]) => {
                                  const value = approval.submissionData[key];
                                  if (value === null || value === undefined || value === "") return null;
                                  
                                  const field = approval.formFields.find(f => `field_${f.id}` === key);
                                  const fieldType = field?.type;
                                  const isImage = isImageUrl(value, fieldType);
                                  
                                  let displayValue = String(value);
                                  if (typeof value === "boolean") {
                                    displayValue = value ? "Sim" : "Não";
                                  } else if (Array.isArray(value)) {
                                    displayValue = value.join(", ");
                                  }
                                  
                                  const imageUrl = isImage ? resolveImageUrl(displayValue) : null;
                                  
                                  return (
                                    <ApprovalField key={key}>
                                      <FieldLabel>{label}</FieldLabel>
                                      {isImage && imageUrl ? (
                                        <>
                                          <FieldValue style={{ padding: 0, minHeight: "auto", background: "transparent", border: "none" }}>
                                            <ImagePreview>
                                              <ImageWrapper>
                                                <Image 
                                                  src={imageUrl} 
                                                  alt={label}
                                                  onClick={() => openImageModal(displayValue)}
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = "none";
                                                    const parent = target.parentElement;
                                                    if (parent) {
                                                      const errorDiv = document.createElement("div");
                                                      errorDiv.style.cssText = "padding: 12px; text-align: center; color: #64748b; font-size: 0.875rem;";
                                                      errorDiv.innerHTML = `
                                                        <svg style="width: 24px; height: 24px; margin: 0 auto 8px; color: #cbd5e1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                          <polyline points="17 8 12 3 7 8"/>
                                                          <line x1="12" y1="3" x2="12" y2="15"/>
                                                        </svg>
                                                        <div>Imagem não disponível</div>
                                                      `;
                                                      parent.appendChild(errorDiv);
                                                    }
                                                  }}
                                                />
                                              </ImageWrapper>
                                              <ImageLink href={imageUrl} target="_blank" rel="noopener noreferrer">
                                                Abrir imagem em nova aba
                                              </ImageLink>
                                            </ImagePreview>
                                          </FieldValue>
                                        </>
                                      ) : (
                                        <FieldValue>{displayValue}</FieldValue>
                                      )}
                                    </ApprovalField>
                                  );
                                })}
                              </ApprovalFields>
                            </ApprovalCardBody>
                          </ApprovalCard>
                        );
                      })}
                      </ApprovalList>
                      {historyApprovals.length > itemsPerPage && (
                        <PaginationContainer>
                          <PaginationButton
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            $disabled={currentPage === 1}
                            aria-label="Página anterior"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="15 18 9 12 15 6"/>
                            </svg>
                          </PaginationButton>
                          {Array.from({ length: Math.ceil(historyApprovals.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                            <PaginationButton
                              key={page}
                              $active={currentPage === page}
                              onClick={() => setCurrentPage(page)}
                              aria-label={`Ir para página ${page}`}
                              aria-current={currentPage === page ? "page" : undefined}
                            >
                              {page}
                            </PaginationButton>
                          ))}
                          <PaginationButton
                            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(historyApprovals.length / itemsPerPage), p + 1))}
                            disabled={currentPage >= Math.ceil(historyApprovals.length / itemsPerPage)}
                            $disabled={currentPage >= Math.ceil(historyApprovals.length / itemsPerPage)}
                            aria-label="Próxima página"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </PaginationButton>
                          <PaginationInfo>
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, historyApprovals.length)} de {historyApprovals.length}
                          </PaginationInfo>
                        </PaginationContainer>
                      )}
                    </>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Content>
      
      {confirmOpen && confirmAction && typeof window !== "undefined" && createPortal(
        <ConfirmBackdrop $open={confirmOpen} onClick={() => { setConfirmOpen(false); setConfirmAction(null); }} aria-hidden={!confirmOpen}>
          <ConfirmDialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-action-title"
            $open={confirmOpen}
            onKeyDown={(e) => { if (e.key === "Escape") { setConfirmOpen(false); setConfirmAction(null); } }}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfirmHeader>
              <ConfirmIcon $type={confirmAction.action}>
                {confirmAction.action === "approve" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
              </ConfirmIcon>
              <ConfirmTitle id="confirm-action-title">
                {confirmAction.action === "approve" 
                  ? "Aprovar este formulário?" 
                  : "Rejeitar este formulário?"}
              </ConfirmTitle>
              <ConfirmDescription>
                {confirmAction.action === "approve"
                  ? "Ao aprovar, um novo ticket será criado automaticamente com os dados do formulário. Esta ação não pode ser desfeita."
                  : "Ao rejeitar, esta solicitação será descartada e não será criado nenhum ticket. Esta ação não pode ser desfeita."}
              </ConfirmDescription>
            </ConfirmHeader>
            <ConfirmActions>
              <CancelButton 
                type="button" 
                onClick={() => { setConfirmOpen(false); setConfirmAction(null); }}
              >
                Cancelar
              </CancelButton>
              <ConfirmButton
                type="button"
                onClick={() => {
                  if (confirmAction.action === "approve") {
                    handleApprove(confirmAction.id);
                  } else {
                    handleReject(confirmAction.id);
                  }
                }}
                $variant={confirmAction.action}
              >
                {confirmAction.action === "approve" ? "Aprovar" : "Rejeitar"}
              </ConfirmButton>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmBackdrop>,
        document.body
      )}
      
      {imageModalOpen && (
        <ImageModal 
          $open={imageModalOpen} 
          onClick={() => setImageModalOpen(false)}
        >
          <ImageModalContent onClick={(e) => e.stopPropagation()}>
            <ImageModalClose 
              onClick={() => setImageModalOpen(false)}
              aria-label="Fechar preview"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </ImageModalClose>
            <ImageModalImg 
              src={imageModalSrc} 
              alt="Preview"
              onClick={() => setImageModalOpen(false)}
            />
          </ImageModalContent>
        </ImageModal>
      )}
    </StandardLayout>
  );
}
