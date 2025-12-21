"use client";

import styled, { css } from "styled-components";
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  size?: "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeStyles = {
  sm: css`
    padding: 8px 12px;
    font-size: 0.875rem;
    height: 36px;
  `,
  md: css`
    padding: 12px 16px;
    font-size: 0.9375rem;
    height: 44px;
  `,
  lg: css`
    padding: 16px 20px;
    font-size: 1rem;
    height: 52px;
  `,
};

const InputWrapper = styled.div<{ $hasLeftIcon: boolean; $hasRightIcon: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  ${(p) =>
    p.$hasLeftIcon &&
    css`
      > input {
        padding-left: 44px;
      }
    `}

  ${(p) =>
    p.$hasRightIcon &&
    css`
      > input {
        padding-right: 44px;
      }
    `}
`;

const IconLeft = styled.div`
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  z-index: 1;
  pointer-events: none;
`;

const IconRight = styled.div`
  position: absolute;
  right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  z-index: 1;
  pointer-events: none;
`;

const InputBase = styled.input<InputProps>`
  width: 100%;
  border-radius: 12px;
  border: 2px solid ${(p) => (p.error ? "var(--error-500)" : "var(--border)")};
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);

  ${(p) => sizeStyles[p.size || "md"]}

  &::placeholder {
    color: var(--text-subtle);
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${(p) => (p.error ? "var(--error-600)" : "var(--border-strong)")};
  }

  &:focus {
    outline: none;
    border-color: ${(p) => (p.error ? "var(--error-600)" : "var(--primary-500)")};
    box-shadow: 
      0 0 0 4px ${(p) => (p.error ? "rgba(239, 68, 68, 0.1)" : "rgba(2, 132, 199, 0.1)")},
      var(--shadow-md);
    background: var(--surface-elevated);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--gray-100);
  }
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, size = "md", error, ...props }, ref) => {
    return (
      <InputWrapper $hasLeftIcon={!!leftIcon} $hasRightIcon={!!rightIcon}>
        {leftIcon && <IconLeft>{leftIcon}</IconLeft>}
        <InputBase ref={ref} size={size} error={error} {...props} />
        {rightIcon && <IconRight>{rightIcon}</IconRight>}
      </InputWrapper>
    );
  }
);

Input.displayName = "Input";

export const Textarea = styled.textarea<{ error?: boolean; size?: "sm" | "md" | "lg" }>`
  width: 100%;
  border-radius: 12px;
  border: 2px solid ${(p) => (p.error ? "var(--error-500)" : "var(--border)")};
  background: var(--surface);
  color: var(--text);
  font-family: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
  resize: vertical;
  line-height: 1.6;

  ${(p) => {
    switch (p.size || "md") {
      case "sm":
        return css`
          padding: 8px 12px;
          font-size: 0.875rem;
          min-height: 80px;
        `;
      case "md":
        return css`
          padding: 12px 16px;
          font-size: 0.9375rem;
          min-height: 100px;
        `;
      case "lg":
        return css`
          padding: 16px 20px;
          font-size: 1rem;
          min-height: 120px;
        `;
    }
  }}

  &::placeholder {
    color: var(--text-subtle);
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${(p) => (p.error ? "var(--error-600)" : "var(--border-strong)")};
  }

  &:focus {
    outline: none;
    border-color: ${(p) => (p.error ? "var(--error-600)" : "var(--primary-500)")};
    box-shadow: 
      0 0 0 4px ${(p) => (p.error ? "rgba(239, 68, 68, 0.1)" : "rgba(2, 132, 199, 0.1)")},
      var(--shadow-md);
    background: var(--surface-elevated);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--gray-100);
  }
`;

