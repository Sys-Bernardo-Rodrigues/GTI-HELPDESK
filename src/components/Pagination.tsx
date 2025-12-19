"use client";

import styled from "styled-components";

const PaginationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  margin-top: 16px;
`;

const PaginationInfo = styled.div`
  font-size: 0.875rem;
  color: var(--muted);
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const PaginationButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  border: ${(p) => (p.$active ? "2px solid var(--primary-600)" : "1px solid var(--border)")};
  background: ${(p) => (p.$active ? "var(--primary-600)" : "#fff")};
  color: ${(p) => (p.$active ? "#fff" : "var(--text)")};
  border-radius: 6px;
  cursor: pointer;
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  transition: all 0.2s ease;
  font-size: 0.875rem;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$active ? "var(--primary-700)" : "#f8fafc")};
    border-color: ${(p) => (p.$active ? "var(--primary-700)" : "var(--border)")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text);
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Calcular páginas para exibir
  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <PaginationContainer>
      <PaginationInfo>
        Mostrando {startItem} a {endItem} de {totalItems} itens
      </PaginationInfo>
      <PaginationControls>
        <ActionButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
        >
          ‹ Anterior
        </ActionButton>
        {getPageNumbers().map((pageNum) => (
          <PaginationButton
            key={pageNum}
            $active={currentPage === pageNum}
            onClick={() => onPageChange(pageNum)}
            disabled={loading}
          >
            {pageNum}
          </PaginationButton>
        ))}
        <ActionButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
        >
          Próximo ›
        </ActionButton>
      </PaginationControls>
    </PaginationContainer>
  );
}

