"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";

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

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: #f8fafc;
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
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  &:focus { outline: none; }
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
  const [open, setOpen] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [configSubmenuOpen, setConfigSubmenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: number; email: string; name: string | null } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
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
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);
  const configButtonRef = useRef<HTMLButtonElement | null>(null);
  const configSubmenuRef = useRef<HTMLDivElement | null>(null);

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
        }
      } catch {}
    })();
  }, []);

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

  useEffect(() => {
    const doc = getBrowserDocument();
    if (!doc) return;
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as any;
      const menuEl = menuRef.current as any;
      const footerEl = footerRef.current as any;
      if (target && menuEl && footerEl && !menuEl.contains(target) && !footerEl.contains(target)) {
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
              <NavItem href="/aprovacoes" aria-label="Aprovações" aria-current="page">
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
                  aria-label="Configurações"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
                  <span>Config</span>
                </NavItemButton>
                {typeof window !== "undefined" && document && configSubmenuOpen && createPortal(
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
            }}
            ref={footerRef as any}
          >
            <Avatar aria-label="Foto do usuário" role="img">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" decoding="async" />
              ) : (
                user?.name ? (user.name[0] || "U") : "U"
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
          {confirmOpen && !confirmAction && typeof window !== "undefined" && createPortal(
            <ConfirmBackdrop $open={confirmOpen} onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen}>
              <ConfirmDialog
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-exit-title"
                $open={confirmOpen}
                onKeyDown={(e) => { if (e.key === "Escape") setConfirmOpen(false); }}
                onClick={(e) => e.stopPropagation()}
              >
                <ConfirmTitle id="confirm-exit-title">Você deseja realmente sair?</ConfirmTitle>
                <ConfirmActions>
                  <CancelButton type="button" onClick={() => setConfirmOpen(false)}>Cancelar</CancelButton>
                  <ConfirmButton type="button" onClick={onLogout}>Confirmar</ConfirmButton>
                </ConfirmActions>
              </ConfirmDialog>
            </ConfirmBackdrop>,
            document.body
          )}
        </Sidebar>
        <Overlay $show={open} onClick={() => setOpen(false)} aria-hidden={!open} />
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
      </Shell>
      
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
    </Page>
  );
}
