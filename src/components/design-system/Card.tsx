"use client";

import styled, { css } from "styled-components";

interface CardProps {
  variant?: "default" | "elevated" | "outlined" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles = {
  none: css`
    padding: 0;
  `,
  sm: css`
    padding: 16px;
  `,
  md: css`
    padding: 24px;
  `,
  lg: css`
    padding: 32px;
  `,
};

const variantStyles = {
  default: css`
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  `,
  elevated: css`
    background: var(--surface-elevated);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
  `,
  outlined: css`
    background: var(--surface);
    border: 2px solid var(--border-strong);
    box-shadow: none;
  `,
  gradient: css`
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-md);
  `,
};

export const Card = styled.div<CardProps>`
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  ${(p) => variantStyles[p.variant || "default"]}
  ${(p) => paddingStyles[p.padding || "md"]}

  ${(p) =>
    p.hover &&
    css`
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-xl);
        border-color: var(--primary-300);
      }
    `}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
`;

export const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: -0.02em;
`;

export const CardBody = styled.div`
  color: var(--text-muted);
  line-height: 1.6;
`;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
`;

