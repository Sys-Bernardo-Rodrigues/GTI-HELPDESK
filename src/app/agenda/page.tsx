"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import NotificationBell from "@/components/NotificationBell";
import StandardLayout from "@/components/StandardLayout";

type EventItem = {
  id: number | string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  color: string;
  isAllDay: boolean;
  type?: "event" | "ticket" | "project-deadline" | "task-deadline";
  ticketId?: number;
  ticketStatus?: string;
  projectId?: number;
  taskId?: number;
  userId?: number;
  userAvatar?: string | null;
  userName?: string | null;
  assignedToId?: number | null;
  assignedToAvatar?: string | null;
  assignedToName?: string | null;
};

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
    z-index: 101;
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

const CalendarCard = styled.section`
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.08),
    0 8px 24px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  position: relative;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 
      0 24px 72px rgba(0, 0, 0, 0.1),
      0 12px 32px rgba(0, 0, 0, 0.06),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  }

  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 20px;
  }
`;

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  box-shadow: 0 10px 20px rgba(20, 93, 191, 0.25);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  flex-shrink: 0;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const CalendarTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
`;

const CalendarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  transition: all 0.2s ease;
  &:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled.button`
  padding: 8px 16px;
  border: none;
  background: var(--primary-600);
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  &:hover {
    background: var(--primary-700);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const CalendarDayHeader = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 14px 8px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
`;

const CalendarDay = styled.div<{ $isToday?: boolean; $isOtherMonth?: boolean; $hasEvents?: boolean }>`
  background: #fff;
  min-height: 120px;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-right: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  
  ${(p) => p.$isToday && `
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 2px solid var(--primary-600);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    z-index: 1;
  `}
  ${(p) => p.$isOtherMonth && `
    background: #fafbfc;
    opacity: 0.6;
  `}
  &:hover {
    background: ${(p) => p.$isToday ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)" : "#f8fafc"};
    transform: ${(p) => p.$isToday ? "scale(1.02)" : "scale(1.01)"};
    z-index: 2;
    box-shadow: ${(p) => p.$isToday ? "0 8px 16px rgba(59, 130, 246, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.08)"};
  }
  
  &:last-child {
    border-right: none;
  }
`;

const DayNumber = styled.div<{ $isToday?: boolean }>`
  font-size: 0.9rem;
  font-weight: ${(p) => (p.$isToday ? "700" : "600")};
  color: ${(p) => (p.$isToday ? "var(--primary-700)" : "#1e293b")};
  margin-bottom: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${(p) => (p.$isToday ? "rgba(59, 130, 246, 0.1)" : "transparent")};
`;

const EventBadge = styled.div<{ $color: string }>`
  background: ${(p) => p.$color};
  color: #fff;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  &:hover {
    opacity: 0.95;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }
`;

const EventAvatar = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const FilterToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  user-select: none;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8fafc;
    color: #1e293b;
  }
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary-600);
  }
`;

const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 25;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalDialog = styled.div<{ $open: boolean }>`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  display: ${(p) => (p.$open ? "block" : "none")};
  z-index: 26;
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
`;

const CloseButton = styled.button`
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #64748b;
  &:hover {
    background: #f3f4f6;
    color: #1e293b;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const FormField = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: var(--primary-600);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColorOption = styled.button<{ $color: string; $selected?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid ${(p) => (p.$selected ? "#1e293b" : "transparent")};
  background: ${(p) => p.$color};
  cursor: pointer;
  transition: transform 0.2s ease;
  &:hover {
    transform: scale(1.1);
  }
`;

const ModalActions = styled.div`
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  &:hover {
    background: #f8fafc;
  }
`;

const Feedback = styled.div<{ $variant: "success" | "error" }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  background: ${(p) => (p.$variant === "success" ? "#dcfce7" : "#fee2e2")};
  color: ${(p) => (p.$variant === "success" ? "#166534" : "#991b1b")};
  font-size: 0.875rem;
`;

const ConfirmBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: ${(p) => (p.$open ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ConfirmDialog = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  z-index: 10001;
  position: relative;
`;

const ConfirmTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: #1e293b;
  padding: 20px 24px 0 24px;
`;

const ConfirmActions = styled.div`
  padding: 20px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ConfirmButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: #dc2626;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  &:hover {
    background: #b91c1c;
  }
`;

const DayViewModal = styled.div<{ $open: boolean }>`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  overflow-y: auto;
  display: ${(p) => (p.$open ? "block" : "none")};
  z-index: 1001;
`;

const DayViewHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
  border-radius: 16px 16px 0 0;
`;

const DayViewTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
`;

const DayViewBody = styled.div`
  padding: 24px;
`;

const DayViewDate = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 4px;
`;

const EventsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
`;

const EventCard = styled.div<{ $color: string }>`
  background: #fff;
  border: 2px solid ${(p) => p.$color};
  border-left: 4px solid ${(p) => p.$color};
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const EventCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const EventCardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
`;

const EventCardTime = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
`;

const EventCardDescription = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 8px 0 0 0;
  line-height: 1.5;
`;

const EventCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
`;

const EventCardUser = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #64748b;
`;

const EventCardUserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const EventCardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const IconButton = styled.button`
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #1e293b;
  }
  
  svg {
    width: 16px;
    height: 16px;
  }
`;

const EmptyDay = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
`;

const EmptyDayIcon = styled.div`
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  
  svg {
    width: 48px;
    height: 48px;
    color: #94a3b8;
    opacity: 0.6;
  }
`;


const EmptyDayText = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"
];

export default function AgendaPage() {
  const router = useRouter();

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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [scheduledTickets, setScheduledTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterMyEvents, setFilterMyEvents] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [dayViewOpen, setDayViewOpen] = useState<boolean>(false);
  const [selectedDayForView, setSelectedDayForView] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    color: "#3b82f6",
    isAllDay: false,
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);


  useEffect(() => {
    loadEvents();
    loadScheduledTickets();
  }, [currentDate, filterMyEvents]);



  function loadEvents() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    
    setLoading(true);
    const onlyMineParam = filterMyEvents ? "&onlyMine=true" : "";
    fetch(`/api/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}${onlyMineParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          // Os eventos já vêm com o tipo correto da API
          setEvents(data.items);
        }
      })
      .catch((err) => {
        console.error(err);
        setFeedback({ type: "error", message: "Erro ao carregar eventos" });
      })
      .finally(() => setLoading(false));
  }

  function loadScheduledTickets() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          let scheduled = data.items.filter((ticket: any) => {
            if (!ticket.scheduledAt) return false;
            const scheduledDate = new Date(ticket.scheduledAt);
            return scheduledDate >= start && scheduledDate <= end;
          });
          
          // Filtrar apenas tickets do usuário se o filtro estiver ativo
          // Inclui tickets criados pelo usuário OU atribuídos ao usuário
          if (filterMyEvents && user) {
            scheduled = scheduled.filter((ticket: any) => {
              const isCreatedByUser = ticket.userId === user.id;
              const isAssignedToUser = ticket.assignedTo?.id === user.id;
              return isCreatedByUser || isAssignedToUser;
            });
          }
          
          setScheduledTickets(scheduled);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const days: Date[] = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  const allCalendarItems = useMemo(() => {
    const items: EventItem[] = [...events];
    
    // Converter tickets agendados para formato de evento
    scheduledTickets.forEach((ticket) => {
      if (ticket.scheduledAt) {
        const scheduledDate = new Date(ticket.scheduledAt);
        const endDate = new Date(scheduledDate);
        endDate.setHours(scheduledDate.getHours() + 1); // Duração padrão de 1 hora
        
        // Determinar qual usuário mostrar (assignedTo tem prioridade, senão o criador)
        const displayUser = ticket.assignedTo || ticket.requester;
        
        items.push({
          id: ticket.id + 1000000, // Offset para evitar conflito com IDs de eventos
          title: ticket.title, // Removido emoji, tickets são compromissos normais
          description: ticket.scheduledNote || ticket.description || null,
          startDate: scheduledDate.toISOString(),
          endDate: endDate.toISOString(),
          location: null,
          color: "#3b82f6", // Mesma cor azul dos eventos padrão - tickets são compromissos
          isAllDay: false,
          type: "ticket",
          ticketId: ticket.id,
          ticketStatus: ticket.status,
          userId: ticket.userId,
          userAvatar: ticket.requester?.avatarUrl || null,
          userName: ticket.requester?.name || null,
          assignedToId: ticket.assignedTo?.id || null,
          assignedToAvatar: ticket.assignedTo?.avatarUrl || null,
          assignedToName: ticket.assignedTo?.name || null,
        });
      }
    });
    
    return items;
  }, [events, scheduledTickets]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    allCalendarItems.forEach((item) => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const current = new Date(start);
      
      while (current <= end) {
        const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [allCalendarItems]);

  function getEventsForDate(date: Date): EventItem[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventsByDate.get(key) || [];
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function isOtherMonth(date: Date): boolean {
    return date.getMonth() !== currentDate.getMonth();
  }

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openCreateModal(date?: Date) {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split("T")[0];
    setFormData({
      title: "",
      description: "",
      startDate: dateStr,
      startTime: "09:00",
      endDate: dateStr,
      endTime: "10:00",
      location: "",
      color: "#3b82f6",
      isAllDay: false,
    });
    setEditingEvent(null);
    setSelectedDate(targetDate);
    setModalOpen(true);
    setDayViewOpen(false);
    setFeedback(null);
  }

  function closeDayView() {
    setDayViewOpen(false);
    setSelectedDayForView(null);
  }

  function getDayEvents(day: Date | null): EventItem[] {
    if (!day) return [];
    return getEventsForDate(day);
  }

  function formatDayDate(date: Date): string {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatEventTime(event: EventItem): string {
    if (event.isAllDay) return "Dia inteiro";
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    return `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function openEditModal(event: EventItem) {
    // Não permitir editar tickets através do modal de eventos
    if (event.type === "ticket") {
      window.location.href = `/tickets`;
      return;
    }
    
    // Não permitir editar deadlines de projetos e tarefas (são automáticos)
    if (event.type === "project-deadline" || event.type === "task-deadline") {
      // Redirecionar para a página de projetos se for deadline de projeto ou tarefa
      window.location.href = `/projetos`;
      return;
    }
    
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    setFormData({
      title: event.title,
      description: event.description || "",
      startDate: start.toISOString().split("T")[0],
      startTime: event.isAllDay ? "" : start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split("T")[0],
      endTime: event.isAllDay ? "" : end.toTimeString().slice(0, 5),
      location: event.location || "",
      color: event.color,
      isAllDay: event.isAllDay,
    });
    setEditingEvent(event);
    setModalOpen(true);
    setFeedback(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      location: "",
      color: "#3b82f6",
      isAllDay: false,
    });
  }

  async function saveEvent() {
    if (!formData.title.trim()) {
      setFeedback({ type: "error", message: "Título é obrigatório" });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const startDate = formData.isAllDay
        ? new Date(formData.startDate + "T00:00:00")
        : new Date(formData.startDate + "T" + formData.startTime + ":00");
      const endDate = formData.isAllDay
        ? new Date(formData.endDate + "T23:59:59")
        : new Date(formData.endDate + "T" + formData.endTime + ":00");

      if (endDate < startDate) {
        setFeedback({ type: "error", message: "Data de fim deve ser posterior à data de início" });
        setSaving(false);
        return;
      }

      const url = editingEvent ? `/api/events/${editingEvent.id}` : "/api/events";
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          location: formData.location.trim() || null,
          color: formData.color,
          isAllDay: formData.isAllDay,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar evento");
      }

      setFeedback({ type: "success", message: editingEvent ? "Evento atualizado com sucesso" : "Evento criado com sucesso" });
      setTimeout(() => {
        closeModal();
        loadEvents();
        loadScheduledTickets();
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao salvar evento" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(eventId: number | string) {
    // Não permitir excluir deadlines de projetos e tarefas (são automáticos)
    if (typeof eventId === "string" && (eventId.startsWith("project-") || eventId.startsWith("task-"))) {
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir evento");
      loadEvents();
      loadScheduledTickets();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao excluir evento" });
    }
  }

  function formatMonthYear(date: Date): string {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }


  return (
    <StandardLayout>
          <CalendarCard>
            <CalendarHeader>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <HeaderIcon aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z"/>
                  </svg>
                </HeaderIcon>
                <CalendarTitle>{formatMonthYear(currentDate)}</CalendarTitle>
              </div>
              <CalendarActions>
                <FilterToggle>
                  <input
                    type="checkbox"
                    checked={filterMyEvents}
                    onChange={(e) => setFilterMyEvents(e.target.checked)}
                  />
                  <span>Meus compromissos</span>
                </FilterToggle>
                <ActionButton onClick={previousMonth}>‹ Anterior</ActionButton>
                <ActionButton onClick={goToToday}>Hoje</ActionButton>
                <ActionButton onClick={nextMonth}>Próximo ›</ActionButton>
                <PrimaryButton onClick={() => openCreateModal()}>+ Novo Evento</PrimaryButton>
              </CalendarActions>
            </CalendarHeader>
            <CalendarGrid>
              {WEEKDAYS.map((day) => (
                <CalendarDayHeader key={day}>{day}</CalendarDayHeader>
              ))}
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDate(day);
                return (
                  <CalendarDay
                    key={idx}
                    $isToday={isToday(day)}
                    $isOtherMonth={isOtherMonth(day)}
                    $hasEvents={dayEvents.length > 0}
                    onClick={() => {
                      setSelectedDayForView(day);
                      setDayViewOpen(true);
                    }}
                  >
                    <DayNumber $isToday={isToday(day)}>{day.getDate()}</DayNumber>
                    {dayEvents.slice(0, 3).map((event) => {
                      // Determinar qual avatar mostrar (assignedTo tem prioridade para tickets, senão o criador)
                      const displayAvatar = event.type === "ticket" 
                        ? (event.assignedToAvatar || event.userAvatar)
                        : event.userAvatar;
                      const displayName = event.type === "ticket"
                        ? (event.assignedToName || event.userName)
                        : event.userName;
                      
                      return (
                        <EventBadge
                          key={`${event.type || "event"}-${event.id}`}
                          $color={event.color}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (event.type === "ticket" && event.ticketId) {
                              window.location.href = `/tickets`;
                            } else if (event.type === "project-deadline" || event.type === "task-deadline") {
                              window.location.href = `/projetos`;
                            } else {
                              openEditModal(event);
                            }
                          }}
                          title={event.title}
                        >
                          {displayAvatar ? (
                            <EventAvatar>
                              <img src={resolveAvatarUrl(displayAvatar)} alt={displayName || ""} />
                            </EventAvatar>
                          ) : displayName ? (
                            <EventAvatar>
                              {displayName[0].toUpperCase()}
                            </EventAvatar>
                          ) : null}
                          <span>
                            {event.isAllDay ? event.title : `${new Date(event.startDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${event.title}`}
                          </span>
                        </EventBadge>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <EventBadge $color="#64748b" title={`Mais ${dayEvents.length - 3} eventos`}>
                        +{dayEvents.length - 3}
                      </EventBadge>
                    )}
                  </CalendarDay>
                );
              })}
            </CalendarGrid>
          </CalendarCard>

      {modalOpen && (
        <ModalBackdrop $open={modalOpen} onClick={closeModal}>
          <ModalDialog $open={modalOpen} onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</ModalTitle>
              <CloseButton onClick={closeModal} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              {feedback && <Feedback $variant={feedback.type}>{feedback.message}</Feedback>}
              <FormField>
                <Label htmlFor="event-title">Título *</Label>
                <Input
                  id="event-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do evento"
                />
              </FormField>
              <FormField>
                <Label htmlFor="event-description">Descrição</Label>
                <Textarea
                  id="event-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do evento"
                />
              </FormField>
              <FormField>
                <CheckboxLabel>
                  <Checkbox
                    type="checkbox"
                    checked={formData.isAllDay}
                    onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                  />
                  <span>Dia inteiro</span>
                </CheckboxLabel>
              </FormField>
              <FormField>
                <Label htmlFor="event-start-date">Data de Início *</Label>
                <Input
                  id="event-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </FormField>
              {!formData.isAllDay && (
                <FormField>
                  <Label htmlFor="event-start-time">Hora de Início</Label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </FormField>
              )}
              <FormField>
                <Label htmlFor="event-end-date">Data de Fim *</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </FormField>
              {!formData.isAllDay && (
                <FormField>
                  <Label htmlFor="event-end-time">Hora de Fim</Label>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </FormField>
              )}
              <FormField>
                <Label htmlFor="event-location">Localização</Label>
                <Input
                  id="event-location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Onde será o evento?"
                />
              </FormField>
              <FormField>
                <Label>Cor</Label>
                <ColorPicker>
                  {COLORS.map((color) => (
                    <ColorOption
                      key={color}
                      $color={color}
                      $selected={formData.color === color}
                      onClick={() => setFormData({ ...formData, color })}
                      aria-label={`Cor ${color}`}
                    />
                  ))}
                </ColorPicker>
              </FormField>
            </ModalBody>
            <ModalActions>
              <CancelButton onClick={closeModal} disabled={saving}>Cancelar</CancelButton>
              {editingEvent && (
                <ActionButton
                  onClick={() => deleteEvent(editingEvent.id)}
                  disabled={saving}
                  style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                >
                  Excluir
                </ActionButton>
              )}
              <PrimaryButton onClick={saveEvent} disabled={saving}>
                {saving ? "Salvando..." : editingEvent ? "Atualizar" : "Criar"}
              </PrimaryButton>
            </ModalActions>
          </ModalDialog>
        </ModalBackdrop>
      )}

      {dayViewOpen && selectedDayForView && (
        <ModalBackdrop $open={dayViewOpen} onClick={closeDayView}>
          <DayViewModal $open={dayViewOpen} onClick={(e) => e.stopPropagation()}>
            <DayViewHeader>
              <div>
                <DayViewTitle>Compromissos do Dia</DayViewTitle>
                <DayViewDate>{formatDayDate(selectedDayForView)}</DayViewDate>
              </div>
              <CloseButton onClick={closeDayView} aria-label="Fechar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </CloseButton>
            </DayViewHeader>
            <DayViewBody>
              {getDayEvents(selectedDayForView).length === 0 ? (
                <EmptyDay>
                  <EmptyDayIcon>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5zm7 6H7v-2h5v2z"/>
                    </svg>
                  </EmptyDayIcon>
                  <EmptyDayText>Nenhum compromisso agendado para este dia</EmptyDayText>
                  <PrimaryButton 
                    onClick={() => {
                      openCreateModal(selectedDayForView);
                      closeDayView();
                    }}
                    style={{ marginTop: "20px" }}
                  >
                    + Criar Compromisso
                  </PrimaryButton>
                </EmptyDay>
              ) : (
                <>
                  <EventsList>
                    {getDayEvents(selectedDayForView).map((event) => {
                      const displayAvatar = event.type === "ticket"
                        ? (event.assignedToAvatar || event.userAvatar)
                        : event.userAvatar;
                      const displayName = event.type === "ticket"
                        ? (event.assignedToName || event.userName)
                        : event.userName;

                      return (
                        <EventCard
                          key={`${event.type || "event"}-${event.id}`}
                          $color={event.color}
                          onClick={() => {
                            if (event.type === "ticket" && event.ticketId) {
                              window.location.href = `/tickets`;
                            } else if (event.type === "project-deadline" || event.type === "task-deadline") {
                              window.location.href = `/projetos`;
                            } else {
                              closeDayView();
                              openEditModal(event);
                            }
                          }}
                        >
                          <EventCardHeader>
                            <EventCardTitle>{event.title}</EventCardTitle>
                            <EventCardTime>{formatEventTime(event)}</EventCardTime>
                          </EventCardHeader>
                          {event.description && (
                            <EventCardDescription>{event.description}</EventCardDescription>
                          )}
                          {event.location && (
                            <EventCardDescription style={{ marginTop: "4px" }}>
                              📍 {event.location}
                            </EventCardDescription>
                          )}
                          <EventCardMeta>
                            {displayAvatar && (
                              <EventCardUser>
                                <EventCardUserAvatar>
                                  <img src={resolveAvatarUrl(displayAvatar)} alt={displayName || ""} />
                                </EventCardUserAvatar>
                                <span>{displayName}</span>
                              </EventCardUser>
                            )}
                            {!displayAvatar && displayName && (
                              <EventCardUser>
                                <EventCardUserAvatar>
                                  {displayName[0].toUpperCase()}
                                </EventCardUserAvatar>
                                <span>{displayName}</span>
                              </EventCardUser>
                            )}
                            {event.type === "ticket" && (
                              <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "auto" }}>
                                Ticket #{event.ticketId}
                              </span>
                            )}
                            {event.type !== "ticket" && (
                              <EventCardActions>
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    closeDayView();
                                    openEditModal(event);
                                  }}
                                  aria-label="Editar evento"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </IconButton>
                              </EventCardActions>
                            )}
                          </EventCardMeta>
                        </EventCard>
                      );
                    })}
                  </EventsList>
                  <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                    <PrimaryButton
                      onClick={() => {
                        openCreateModal(selectedDayForView);
                        closeDayView();
                      }}
                    >
                      + Adicionar Compromisso
                    </PrimaryButton>
                  </div>
                </>
              )}
            </DayViewBody>
          </DayViewModal>
        </ModalBackdrop>
      )}
    </StandardLayout>
  );
}

