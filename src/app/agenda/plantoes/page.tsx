"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import StandardLayout from "@/components/StandardLayout";
import { isHoliday, getHolidayName } from "@/lib/holidays";
import { getUserColor } from "@/lib/userColors";
import { resolveAvatarUrl } from "@/lib/assets";

type ShiftItem = {
  id: number;
  userId: number;
  date: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    avatarUrl: string | null;
    jobTitle: string | null;
  };
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

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
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);
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
  background: #10b981;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  &:hover {
    background: #059669;
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

const CalendarDay = styled.div<{ $isToday?: boolean; $isOtherMonth?: boolean; $hasShifts?: boolean; $isHoliday?: boolean }>`
  background: #fff;
  min-height: 120px;
  padding: 10px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-right: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  
  ${(p) => p.$isToday && `
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 2px solid #10b981;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
    z-index: 1;
  `}
  ${(p) => p.$isOtherMonth && `
    background: #fafbfc;
    opacity: 0.6;
  `}
  ${(p) => p.$isHoliday && !p.$isToday && `
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-left: 3px solid #f59e0b;
  `}
  ${(p) => p.$isHoliday && p.$isToday && `
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border-left: 3px solid #f59e0b;
  `}
  &:hover {
    background: ${(p) => {
      if (p.$isHoliday && p.$isToday) return "linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%)";
      if (p.$isHoliday && !p.$isToday) return "linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)";
      if (p.$isToday) return "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)";
      return "#f8fafc";
    }};
    transform: ${(p) => p.$isToday ? "scale(1.02)" : "scale(1.01)"};
    z-index: 2;
    box-shadow: ${(p) => p.$isToday ? "0 8px 16px rgba(16, 185, 129, 0.2)" : "0 2px 8px rgba(0, 0, 0, 0.08)"};
  }
  
  &:last-child {
    border-right: none;
  }
`;

const DayNumber = styled.div<{ $isToday?: boolean; $isHoliday?: boolean }>`
  font-size: 0.9rem;
  font-weight: ${(p) => (p.$isToday ? "700" : "600")};
  color: ${(p) => {
    if (p.$isToday) return "#059669";
    if (p.$isHoliday) return "#f59e0b";
    return "#1e293b";
  }};
  margin-bottom: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: ${(p) => {
    if (p.$isToday) return "rgba(16, 185, 129, 0.1)";
    if (p.$isHoliday) return "rgba(245, 158, 11, 0.1)";
    return "transparent";
  }};
`;

const HolidayIndicator = styled.span`
  font-size: 0.65rem;
  color: #f59e0b;
  font-weight: 700;
  margin-left: 4px;
  display: inline-flex;
  align-items: center;
`;

const ShiftBadge = styled.div<{ $color?: string }>`
  background: ${(p) => p.$color || "#10b981"};
  color: #fff;
  padding: 4px 8px;
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

const ShiftAvatar = styled.div`
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
  max-width: 600px;
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
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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

const ShiftsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
`;

const ShiftCard = styled.div<{ $color?: string }>`
  background: #fff;
  border: 2px solid ${(p) => p.$color || "#10b981"};
  border-left: 4px solid ${(p) => p.$color || "#10b981"};
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

const ShiftCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const ShiftCardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  flex: 1;
`;

const ShiftCardTime = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
`;

const ShiftCardDescription = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 8px 0 0 0;
  line-height: 1.5;
`;

const ShiftCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
`;

const ShiftCardUser = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #64748b;
`;

const ShiftCardUserAvatar = styled.div`
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

const ShiftCardActions = styled.div`
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

const ReportModal = styled.div<{ $open: boolean }>`
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  display: ${(p) => (p.$open ? "block" : "none")};
  z-index: 1001;
  
  @media print {
    max-width: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
`;

const ReportHeader = styled.div`
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

const ReportTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
`;

const ReportBody = styled.div`
  padding: 24px;
`;

const ReportSection = styled.div`
  margin-bottom: 32px;
`;

const ReportSectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #10b981;
`;

const ReportTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }
  
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid #e2e8f0;
    border-bottom: 2px solid #10b981;
  }
  
  td {
    color: #1e293b;
    font-size: 0.875rem;
    border-left: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
  }
  
  tbody tr:nth-child(even) {
    background: #f8fafc;
  }
  
  tbody tr:hover {
    background: #f1f5f9;
  }
`;

const ReportSummary = styled.div`
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 20px;
  margin-top: 24px;
`;

const ReportSummaryTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #065f46;
  margin: 0 0 16px 0;
`;

const ReportSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #d1fae5;
  
  &:last-child {
    border-bottom: none;
    font-weight: 600;
    font-size: 1.125rem;
    margin-top: 8px;
    padding-top: 16px;
    border-top: 2px solid #10b981;
  }
`;

const ReportSummaryLabel = styled.span`
  color: #065f46;
  font-weight: 500;
`;

const ReportSummaryValue = styled.span`
  color: #047857;
  font-weight: 600;
`;

const ReportDateRange = styled.div`
  color: #64748b;
  font-size: 0.875rem;
  margin-top: 8px;
`;

const PrintButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: #10b981;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: #059669;
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

// Estilos de impressão serão aplicados via CSS global ou style tag

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PlantaoesPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [dayViewOpen, setDayViewOpen] = useState<boolean>(false);
  const [selectedDayForView, setSelectedDayForView] = useState<Date | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [formData, setFormData] = useState({
    userId: "",
    date: "",
    endDate: "",
    startTime: "",
    endTime: "",
    notes: "",
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [reportOpen, setReportOpen] = useState<boolean>(false);
  const [reportShifts, setReportShifts] = useState<ShiftItem[]>([]);

  useEffect(() => {
    loadShifts();
    loadUsers();
  }, [currentDate]);


  function loadShifts() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    
    setLoading(true);
    fetch(`/api/shifts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setShifts(data.items);
        }
      })
      .catch((err) => {
        console.error(err);
        setFeedback({ type: "error", message: "Erro ao carregar plantões" });
      })
      .finally(() => setLoading(false));
  }

  function loadUsers() {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setUsers(data.items.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            avatarUrl: u.avatarUrl,
            jobTitle: u.jobTitle,
          })));
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

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftItem[]>();
    shifts.forEach((shift) => {
      const startDate = new Date(shift.date);
      const endDate = shift.endDate ? new Date(shift.endDate) : startDate;
      
      // Adicionar o plantão em todas as datas que ele abrange
      const current = new Date(startDate);
      while (current <= endDate) {
        const key = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(shift);
        current.setDate(current.getDate() + 1);
      }
    });
    return map;
  }, [shifts]);

  function getShiftsForDate(date: Date): ShiftItem[] {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return shiftsByDate.get(key) || [];
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

  function formatMonthYear(date: Date): string {
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  function openCreateModal(date?: Date) {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split("T")[0];
    setFormData({
      userId: "",
      date: dateStr,
      endDate: dateStr, // Por padrão, mesma data (pode ser alterado se for plantão que cruza dias)
      startTime: "",
      endTime: "",
      notes: "",
    });
    setEditingShift(null);
    setSelectedDate(targetDate);
    setModalOpen(true);
    setDayViewOpen(false);
    setFeedback(null);
  }

  function openEditModal(shift: ShiftItem) {
    const date = new Date(shift.date);
    const dateStr = date.toISOString().split("T")[0];
    const endDateStr = shift.endDate ? new Date(shift.endDate).toISOString().split("T")[0] : dateStr;
    setFormData({
      userId: String(shift.userId),
      date: dateStr,
      endDate: endDateStr,
      startTime: shift.startTime || "",
      endTime: shift.endTime || "",
      notes: shift.notes || "",
    });
    setEditingShift(shift);
    setSelectedDate(date);
    setModalOpen(true);
    setFeedback(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingShift(null);
    setFormData({
      userId: "",
      date: "",
      endDate: "",
      startTime: "",
      endTime: "",
      notes: "",
    });
  }

  async function saveShift() {
    if (!formData.userId) {
      setFeedback({ type: "error", message: "Funcionário é obrigatório" });
      return;
    }

    if (!formData.date) {
      setFeedback({ type: "error", message: "Data de início é obrigatória" });
      return;
    }
    
    if (formData.endDate && formData.endDate < formData.date) {
      setFeedback({ type: "error", message: "A data de fim não pode ser anterior à data de início" });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const url = editingShift ? `/api/shifts/${editingShift.id}` : "/api/shifts";
      const method = editingShift ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(formData.userId),
          date: formData.date,
          endDate: formData.endDate && formData.endDate !== formData.date ? formData.endDate : null,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar plantão");
      }

      setFeedback({ type: "success", message: editingShift ? "Plantão atualizado com sucesso" : "Plantão criado com sucesso" });
      setTimeout(() => {
        closeModal();
        loadShifts();
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao salvar plantão" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(shiftId: number) {
    if (!confirm("Tem certeza que deseja excluir este plantão?")) return;

    try {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir plantão");
      loadShifts();
      if (dayViewOpen) {
        setDayViewOpen(false);
        setSelectedDayForView(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Erro ao excluir plantão" });
    }
  }

  function openDayView(date: Date) {
    setSelectedDayForView(date);
    setDayViewOpen(true);
  }

  function closeDayView() {
    setDayViewOpen(false);
    setSelectedDayForView(null);
  }

  function formatDayDate(date: Date): string {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatShiftTime(shift: ShiftItem): string {
    const startDateStr = formatReportDate(shift.date);
    const endDateStr = shift.endDate ? formatReportDate(shift.endDate) : null;
    
    let timeStr = "";
    if (shift.startTime && shift.endTime) {
      timeStr = `${shift.startTime} - ${shift.endTime}`;
    } else if (shift.startTime) {
      timeStr = `A partir de ${shift.startTime}`;
    } else if (shift.endTime) {
      timeStr = `Até ${shift.endTime}`;
    } else {
      return "Horário não definido";
    }
    
    // Se a data fim for diferente da data início, mostrar ambas
    if (endDateStr && endDateStr !== startDateStr) {
      return `${startDateStr} ${shift.startTime || ""} - ${endDateStr} ${shift.endTime || ""}`.trim();
    }
    
    return timeStr;
  }

  // Função para calcular horas trabalhadas
  function calculateHours(shift: ShiftItem): number {
    if (!shift.startTime || !shift.endTime) return 0;
    
    const startDate = new Date(shift.date);
    const endDate = shift.endDate ? new Date(shift.endDate) : startDate;
    
    const [startHour, startMin] = shift.startTime.split(":").map(Number);
    const [endHour, endMin] = shift.endTime.split(":").map(Number);
    
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHour, startMin, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(endHour, endMin, 0, 0);
    
    // Se o horário de fim for menor que o de início E for o mesmo dia, assume que é no dia seguinte
    if (startDate.getTime() === endDate.getTime() && endHour < startHour) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    return diffMs / (1000 * 60 * 60); // Converter para horas
  }

  // Função para formatar horas (ex: 8.5 -> "8h30min")
  function formatHours(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    return `${wholeHours}h${minutes}min`;
  }

  // Função para abrir relatório
  function openReport() {
    // Carregar todos os plantões do mês atual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    
    fetch(`/api/shifts?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          // Ordenar por data e depois por nome do funcionário
          const sorted = data.items.sort((a: ShiftItem, b: ShiftItem) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.user.name.localeCompare(b.user.name);
          });
          setReportShifts(sorted);
          setReportOpen(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setFeedback({ type: "error", message: "Erro ao carregar dados do relatório" });
      });
  }

  function closeReport() {
    setReportOpen(false);
    setReportShifts([]);
  }

  function handlePrint() {
    window.print();
  }

  // Agrupar plantões por funcionário para o resumo
  const shiftsByUser = useMemo(() => {
    const map = new Map<number, { user: ShiftItem["user"]; shifts: ShiftItem[]; totalHours: number }>();
    
    reportShifts.forEach((shift) => {
      if (!map.has(shift.userId)) {
        map.set(shift.userId, {
          user: shift.user,
          shifts: [],
          totalHours: 0,
        });
      }
      
      const entry = map.get(shift.userId)!;
      entry.shifts.push(shift);
      entry.totalHours += calculateHours(shift);
    });
    
    return Array.from(map.values()).sort((a, b) => a.user.name.localeCompare(b.user.name));
  }, [reportShifts]);

  const totalHoursAll = useMemo(() => {
    return shiftsByUser.reduce((sum, entry) => sum + entry.totalHours, 0);
  }, [shiftsByUser]);

  function formatReportDate(date: string): string {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <StandardLayout>
      <CalendarCard>
        <CalendarHeader>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <HeaderIcon aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </HeaderIcon>
            <CalendarTitle>Agenda de Plantões</CalendarTitle>
          </div>
          <CalendarActions>
            <ActionButton onClick={() => router.push("/agenda")}>
              Agenda
            </ActionButton>
            <ActionButton onClick={previousMonth}>‹ Anterior</ActionButton>
            <ActionButton onClick={goToToday}>Hoje</ActionButton>
            <ActionButton onClick={nextMonth}>Próximo ›</ActionButton>
            <ActionButton onClick={openReport} style={{ background: "#6366f1", color: "#fff", borderColor: "#6366f1" }}>
              📊 Relatório
            </ActionButton>
            <PrimaryButton onClick={() => openCreateModal()}>+ Novo Plantão</PrimaryButton>
          </CalendarActions>
        </CalendarHeader>
        <CalendarGrid>
          {WEEKDAYS.map((day) => (
            <CalendarDayHeader key={day}>{day}</CalendarDayHeader>
          ))}
          {calendarDays.map((day, idx) => {
            const dayShifts = getShiftsForDate(day);
            const holiday = isHoliday(day);
            const holidayName = holiday ? getHolidayName(day) : null;
            return (
              <CalendarDay
                key={idx}
                $isToday={isToday(day)}
                $isOtherMonth={isOtherMonth(day)}
                $hasShifts={dayShifts.length > 0}
                $isHoliday={holiday}
                onClick={() => openDayView(day)}
                title={holidayName || undefined}
              >
                <DayNumber $isToday={isToday(day)} $isHoliday={holiday}>
                  {day.getDate()}
                  {holiday && <HolidayIndicator>🎉</HolidayIndicator>}
                </DayNumber>
                {dayShifts.slice(0, 3).map((shift) => (
                  <ShiftBadge
                    key={shift.id}
                    $color={getUserColor(shift.user.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(shift);
                    }}
                    title={shift.user.name}
                  >
                    {shift.user.avatarUrl ? (
                      <ShiftAvatar>
                        <img src={resolveAvatarUrl(shift.user.avatarUrl)} alt={shift.user.name} />
                      </ShiftAvatar>
                    ) : (
                      <ShiftAvatar>
                        {shift.user.name[0].toUpperCase()}
                      </ShiftAvatar>
                    )}
                    <span>{shift.user.name}</span>
                  </ShiftBadge>
                ))}
                {dayShifts.length > 3 && (
                  <ShiftBadge $color="#64748b" title={`Mais ${dayShifts.length - 3} plantões`}>
                    +{dayShifts.length - 3}
                  </ShiftBadge>
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
              <ModalTitle>{editingShift ? "Editar Plantão" : "Novo Plantão"}</ModalTitle>
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
                <Label htmlFor="shift-user">Funcionário *</Label>
                <Select
                  id="shift-user"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  disabled={saving}
                >
                  <option value="">Selecione um funcionário</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} {user.jobTitle ? `- ${user.jobTitle}` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField>
                <Label htmlFor="shift-date">Data de Início *</Label>
                <Input
                  id="shift-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={saving}
                />
              </FormField>
              <FormField>
                <Label htmlFor="shift-end-date">Data de Fim (para plantões que cruzam dias)</Label>
                <Input
                  id="shift-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={saving}
                  min={formData.date}
                />
                {formData.endDate && formData.endDate < formData.date && (
                  <div style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "4px" }}>
                    A data de fim não pode ser anterior à data de início
                  </div>
                )}
              </FormField>
              <FormField>
                <Label htmlFor="shift-start-time">Horário de Início (HH:mm)</Label>
                <Input
                  id="shift-start-time"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  disabled={saving}
                />
              </FormField>
              <FormField>
                <Label htmlFor="shift-end-time">Horário de Fim (HH:mm)</Label>
                <Input
                  id="shift-end-time"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  disabled={saving}
                />
              </FormField>
              <FormField>
                <Label htmlFor="shift-notes">Observações</Label>
                <Textarea
                  id="shift-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o plantão"
                  disabled={saving}
                />
              </FormField>
            </ModalBody>
            <ModalActions>
              <CancelButton onClick={closeModal} disabled={saving}>Cancelar</CancelButton>
              {editingShift && (
                <ActionButton
                  onClick={() => deleteShift(editingShift.id)}
                  disabled={saving}
                  style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca" }}
                >
                  Excluir
                </ActionButton>
              )}
              <PrimaryButton onClick={saveShift} disabled={saving}>
                {saving ? "Salvando..." : editingShift ? "Atualizar" : "Criar"}
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
                <DayViewTitle>Plantões do Dia</DayViewTitle>
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
              {getShiftsForDate(selectedDayForView).length === 0 ? (
                <EmptyDay>
                  <EmptyDayIcon>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </EmptyDayIcon>
                  <EmptyDayText>Nenhum plantão agendado para este dia</EmptyDayText>
                  <PrimaryButton 
                    onClick={() => {
                      openCreateModal(selectedDayForView);
                      closeDayView();
                    }}
                    style={{ marginTop: "20px" }}
                  >
                    + Criar Plantão
                  </PrimaryButton>
                </EmptyDay>
              ) : (
                <>
                  <ShiftsList>
                    {getShiftsForDate(selectedDayForView).map((shift) => (
                      <ShiftCard
                        key={shift.id}
                        $color={getUserColor(shift.user.id)}
                        onClick={() => {
                          closeDayView();
                          openEditModal(shift);
                        }}
                      >
                        <ShiftCardHeader>
                          <ShiftCardTitle>{shift.user.name}</ShiftCardTitle>
                          <ShiftCardTime>{formatShiftTime(shift)}</ShiftCardTime>
                        </ShiftCardHeader>
                        {shift.notes && (
                          <ShiftCardDescription>{shift.notes}</ShiftCardDescription>
                        )}
                        {shift.user.jobTitle && (
                          <ShiftCardDescription style={{ marginTop: "4px" }}>
                            💼 {shift.user.jobTitle}
                          </ShiftCardDescription>
                        )}
                        <ShiftCardMeta>
                          {shift.user.avatarUrl && (
                            <ShiftCardUser>
                              <ShiftCardUserAvatar>
                                <img src={resolveAvatarUrl(shift.user.avatarUrl)} alt={shift.user.name} />
                              </ShiftCardUserAvatar>
                            </ShiftCardUser>
                          )}
                          {!shift.user.avatarUrl && (
                            <ShiftCardUser>
                              <ShiftCardUserAvatar>
                                {shift.user.name[0].toUpperCase()}
                              </ShiftCardUserAvatar>
                            </ShiftCardUser>
                          )}
                          <ShiftCardActions>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                closeDayView();
                                openEditModal(shift);
                              }}
                              aria-label="Editar plantão"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </IconButton>
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteShift(shift.id);
                              }}
                              aria-label="Excluir plantão"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </IconButton>
                          </ShiftCardActions>
                        </ShiftCardMeta>
                      </ShiftCard>
                    ))}
                  </ShiftsList>
                  <div style={{ marginTop: "24px", display: "flex", justifyContent: "center" }}>
                    <PrimaryButton
                      onClick={() => {
                        openCreateModal(selectedDayForView);
                        closeDayView();
                      }}
                    >
                      + Adicionar Plantão
                    </PrimaryButton>
                  </div>
                </>
              )}
            </DayViewBody>
          </DayViewModal>
        </ModalBackdrop>
      )}

      {reportOpen && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 1.5cm;
              }
              
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              
              body * {
                visibility: hidden;
              }
              
              .report-content,
              .report-content * {
                visibility: visible !important;
              }
              
              .report-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                height: auto !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                background: white !important;
              }
              
              .report-modal-backdrop {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                display: block !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              
              .report-header-print {
                display: block !important;
                padding: 15px 0 10px 0 !important;
                border-bottom: 2px solid #10b981 !important;
                margin-bottom: 15px !important;
                page-break-after: avoid;
                page-break-inside: avoid;
              }
              
              .report-header-print h2 {
                font-size: 1.5rem !important;
                margin: 0 0 6px 0 !important;
                color: #0f172a !important;
                font-weight: 700 !important;
              }
              
              .report-header-print .report-date {
                font-size: 0.875rem !important;
                color: #64748b !important;
              }
              
              .report-body-print > .report-section:first-of-type {
                margin-top: 0 !important;
              }
              
              .report-body-print > .report-section:first-of-type .report-section-title {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              
              .no-print {
                display: none !important;
              }
              
              .report-body-print {
                padding: 0 !important;
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
              }
              
              .report-section {
                page-break-inside: auto;
                margin-bottom: 20px;
                margin-top: 0;
                overflow: visible !important;
              }
              
              .report-section-title {
                margin-top: 0 !important;
                margin-bottom: 12px !important;
                padding-bottom: 6px !important;
                font-size: 1rem !important;
              }
              
              .report-table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-bottom: 20px !important;
                margin-top: 0 !important;
                page-break-inside: auto !important;
                display: table !important;
                overflow: visible !important;
                font-size: 0.8125rem !important;
              }
              
              .report-table th {
                padding: 8px 6px !important;
                font-size: 0.7rem !important;
              }
              
              .report-table td {
                padding: 6px !important;
                font-size: 0.8125rem !important;
              }
              
              .report-table thead {
                display: table-header-group !important;
              }
              
              .report-table tbody {
                display: table-row-group !important;
              }
              
              .report-table tr {
                display: table-row !important;
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              .report-table th,
              .report-table td {
                display: table-cell !important;
              }
              
              .report-table th {
                background: #f8fafc !important;
                color: #475569 !important;
                font-weight: 600;
                padding: 10px;
                border: 1px solid #e2e8f0;
                font-size: 0.75rem;
                text-transform: uppercase;
              }
              
              .report-table td {
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                font-size: 0.875rem;
                color: #1e293b;
              }
              
              .report-table tbody tr:nth-child(even) {
                background: #f8fafc !important;
              }
              
              .report-footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #10b981;
                font-size: 0.75rem;
                color: #64748b;
                text-align: center;
                page-break-inside: avoid;
              }
              
              .report-stats {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 12px !important;
                margin-bottom: 15px !important;
                margin-top: 0 !important;
                page-break-inside: avoid;
                page-break-after: avoid;
              }
              
              .report-stats .report-stat-card {
                padding: 12px !important;
              }
              
              .report-stats .report-stat-value {
                font-size: 1.25rem !important;
              }
              
              .report-stat-card {
                background: #f8fafc !important;
                border: 1px solid #e2e8f0 !important;
                border-radius: 8px !important;
                padding: 16px !important;
                text-align: center !important;
              }
              
              .report-stat-label {
                font-size: 0.75rem !important;
                color: #64748b !important;
                text-transform: uppercase !important;
                letter-spacing: 0.05em !important;
                margin-bottom: 8px !important;
              }
              
              .report-stat-value {
                font-size: 1.5rem !important;
                font-weight: 700 !important;
                color: #10b981 !important;
              }
              
              .report-footer {
                display: block !important;
                margin-top: 30px !important;
                padding-top: 20px !important;
                border-top: 2px solid #10b981 !important;
                font-size: 0.75rem !important;
                color: #64748b !important;
                text-align: center !important;
                page-break-inside: avoid;
              }
              
              @page {
                @bottom-center {
                  content: "Página " counter(page) " de " counter(pages);
                  font-size: 0.75rem;
                  color: #64748b;
                  margin-bottom: 1cm;
                }
              }
              
              .report-summary {
                page-break-inside: avoid;
                background: #f0fdf4 !important;
                border: 2px solid #10b981 !important;
                padding: 16px !important;
                margin-top: 20px;
              }
              
              .report-summary-title {
                font-size: 1rem !important;
                font-weight: 600 !important;
                color: #065f46 !important;
                margin-bottom: 12px !important;
              }
              
              .report-summary-row {
                padding: 6px 0 !important;
                border-bottom: 1px solid #d1fae5 !important;
              }
              
              .report-summary-row:last-child {
                border-top: 2px solid #10b981 !important;
                padding-top: 12px !important;
                margin-top: 8px !important;
                font-weight: 600 !important;
              }
            }
          `}} />
          <ModalBackdrop $open={reportOpen} onClick={closeReport} className="report-modal-backdrop">
            <ReportModal $open={reportOpen} onClick={(e) => e.stopPropagation()} className="report-content">
            <ReportHeader className="no-print">
              <div>
                <ReportTitle>Relatório de Plantões</ReportTitle>
                <ReportDateRange>
                  {formatMonthYear(currentDate)}
                </ReportDateRange>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <PrintButton onClick={handlePrint}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Imprimir
                </PrintButton>
                <CloseButton onClick={closeReport} aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </CloseButton>
              </div>
            </ReportHeader>
            
            <ReportBody className="report-body-print">
              {/* Cabeçalho para impressão - aparece apenas na impressão */}
              <div className="report-header-print" style={{ display: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h2 style={{ margin: "0 0 4px 0", fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>RootDesk</h2>
                    <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1e293b", marginBottom: "2px" }}>Relatório de Plantões</div>
                    <div className="report-date" style={{ fontSize: "0.8125rem", color: "#64748b" }}>{formatMonthYear(currentDate)}</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.7rem", color: "#64748b" }}>
                    <div>Gerado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
                
                {/* Estatísticas rápidas */}
                {reportShifts.length > 0 && (
                  <div className="report-stats">
                    <div className="report-stat-card">
                      <div className="report-stat-label">Total de Plantões</div>
                      <div className="report-stat-value">{reportShifts.length}</div>
                    </div>
                    <div className="report-stat-card">
                      <div className="report-stat-label">Funcionários</div>
                      <div className="report-stat-value">{shiftsByUser.length}</div>
                    </div>
                    <div className="report-stat-card">
                      <div className="report-stat-label">Total de Horas</div>
                      <div className="report-stat-value">{formatHours(totalHoursAll)}</div>
                    </div>
                  </div>
                )}
              </div>
              {reportShifts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  <p>Nenhum plantão encontrado para este período.</p>
                </div>
              ) : (
                <>
                  <ReportSection className="report-section">
                    <ReportSectionTitle>Plantões do Mês</ReportSectionTitle>
                    <ReportTable className="report-table">
                      <thead>
                        <tr>
                          <th style={{ width: "12%" }}>Data</th>
                          <th style={{ width: "20%" }}>Funcionário</th>
                          <th style={{ width: "18%" }}>Cargo</th>
                          <th style={{ width: "18%" }}>Horário</th>
                          <th style={{ width: "12%", textAlign: "center" }}>Horas</th>
                          <th style={{ width: "20%" }}>Observações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportShifts.map((shift) => {
                          const hours = calculateHours(shift);
                          const dateRange = shift.endDate && shift.endDate !== shift.date 
                            ? `${formatReportDate(shift.date)} - ${formatReportDate(shift.endDate)}`
                            : formatReportDate(shift.date);
                          return (
                            <tr key={shift.id}>
                              <td>{dateRange}</td>
                              <td style={{ fontWeight: 500 }}>{shift.user.name}</td>
                              <td style={{ color: "#64748b" }}>{shift.user.jobTitle || "-"}</td>
                              <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{formatShiftTime(shift)}</td>
                              <td style={{ textAlign: "center", fontWeight: 600, color: "#10b981" }}>{hours > 0 ? formatHours(hours) : "-"}</td>
                              <td style={{ fontSize: "0.8125rem", color: "#64748b" }}>{shift.notes || "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </ReportTable>
                  </ReportSection>
                </>
              )}

              {reportShifts.length > 0 && (
                <>
                  <ReportSummary className="report-summary">
                    <ReportSummaryTitle className="report-summary-title">Resumo por Funcionário</ReportSummaryTitle>
                    {shiftsByUser.map((entry) => (
                      <ReportSummaryRow key={entry.user.id} className="report-summary-row">
                        <ReportSummaryLabel>
                          {entry.user.name}
                          {entry.user.jobTitle && <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "8px", fontWeight: 400 }}>({entry.user.jobTitle})</span>}
                        </ReportSummaryLabel>
                        <ReportSummaryValue>
                          {entry.shifts.length} plantão{entry.shifts.length !== 1 ? "ões" : ""} - {formatHours(entry.totalHours)} total
                        </ReportSummaryValue>
                      </ReportSummaryRow>
                    ))}
                    <ReportSummaryRow className="report-summary-row">
                      <ReportSummaryLabel style={{ fontSize: "1.125rem", fontWeight: 700 }}>TOTAL GERAL</ReportSummaryLabel>
                      <ReportSummaryValue style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                        {reportShifts.length} plantão{reportShifts.length !== 1 ? "ões" : ""} - {formatHours(totalHoursAll)} total
                      </ReportSummaryValue>
                    </ReportSummaryRow>
                  </ReportSummary>
                  
                  {/* Rodapé para impressão */}
                  <div className="report-footer">
                    <div style={{ marginBottom: "8px" }}>
                      Este relatório foi gerado automaticamente pelo sistema RootDesk
                    </div>
                    <div>
                      Período: {formatMonthYear(currentDate)} | Total de registros: {reportShifts.length} | Total de horas: {formatHours(totalHoursAll)}
                    </div>
                  </div>
                </>
              )}
            </ReportBody>
          </ReportModal>
        </ModalBackdrop>
        </>
      )}
    </StandardLayout>
  );
}

