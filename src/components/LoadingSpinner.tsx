"use client";

import styled, { keyframes } from "styled-components";

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.div<{ $size?: "small" | "medium" | "large"; $color?: string }>`
  display: inline-block;
  width: ${(p) => {
    switch (p.$size) {
      case "small": return "16px";
      case "large": return "32px";
      default: return "20px";
    }
  }};
  height: ${(p) => {
    switch (p.$size) {
      case "small": return "16px";
      case "large": return "32px";
      default: return "20px";
    }
  }};
  border: 2px solid ${(p) => p.$color || "rgba(148, 163, 184, 0.3)"};
  border-top-color: ${(p) => p.$color || "var(--primary-600)"};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

type LoadingSpinnerProps = {
  size?: "small" | "medium" | "large";
  color?: string;
  "aria-label"?: string;
};

export default function LoadingSpinner({ 
  size = "medium", 
  color,
  "aria-label": ariaLabel = "Carregando..." 
}: LoadingSpinnerProps) {
  return <Spinner $size={size} $color={color} aria-label={ariaLabel} role="status" aria-live="polite" />;
}

