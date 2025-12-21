"use client";

import styled, { css } from "styled-components";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const sizeStyles = {
  sm: css`
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: 600;
    height: 36px;
  `,
  md: css`
    padding: 12px 24px;
    font-size: 0.9375rem;
    font-weight: 600;
    height: 44px;
  `,
  lg: css`
    padding: 16px 32px;
    font-size: 1rem;
    font-weight: 700;
    height: 52px;
  `,
};

const variantStyles = {
  primary: css`
    background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
    color: white;
    box-shadow: 
      0 4px 14px rgba(2, 132, 199, 0.35),
      0 0 0 0 rgba(2, 132, 199, 0.1);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-800) 100%);
      box-shadow: 
        0 8px 20px rgba(2, 132, 199, 0.45),
        0 0 0 4px rgba(2, 132, 199, 0.15);
      transform: translateY(-2px);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 
        0 4px 12px rgba(2, 132, 199, 0.3),
        0 0 0 2px rgba(2, 132, 199, 0.1);
    }
  `,
  secondary: css`
    background: linear-gradient(135deg, var(--secondary-600) 0%, var(--secondary-700) 100%);
    color: white;
    box-shadow: 
      0 4px 14px rgba(147, 51, 234, 0.35),
      0 0 0 0 rgba(147, 51, 234, 0.1);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--secondary-700) 0%, #6d21a8 100%);
      box-shadow: 
        0 8px 20px rgba(147, 51, 234, 0.45),
        0 0 0 4px rgba(147, 51, 234, 0.15);
      transform: translateY(-2px);
    }
  `,
  outline: css`
    background: var(--surface);
    color: var(--primary-700);
    border: 2px solid var(--primary-300);
    box-shadow: var(--shadow-sm);
    
    &:hover:not(:disabled) {
      background: var(--primary-50);
      border-color: var(--primary-500);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--text);
    border: 1px solid transparent;
    
    &:hover:not(:disabled) {
      background: var(--gray-100);
      color: var(--primary-700);
    }
  `,
  danger: css`
    background: linear-gradient(135deg, var(--error-600) 0%, var(--error-700) 100%);
    color: white;
    box-shadow: 
      0 4px 14px rgba(220, 38, 38, 0.35),
      0 0 0 0 rgba(220, 38, 38, 0.1);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--error-700) 0%, #991b1b 100%);
      box-shadow: 
        0 8px 20px rgba(220, 38, 38, 0.45),
        0 0 0 4px rgba(220, 38, 38, 0.15);
      transform: translateY(-2px);
    }
  `,
};

const ButtonBase = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;

  ${(p) => sizeStyles[p.size || "md"]}
  ${(p) => variantStyles[p.variant || "primary"]}

  ${(p) =>
    p.fullWidth &&
    css`
      width: 100%;
    `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  /* Loading spinner */
  ${(p) =>
    p.isLoading &&
    css`
      color: transparent;
      pointer-events: none;

      &::after {
        content: "";
        position: absolute;
        width: 16px;
        height: 16px;
        top: 50%;
        left: 50%;
        margin-left: -8px;
        margin-top: -8px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}
`;

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ButtonBase
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </ButtonBase>
  );
}

