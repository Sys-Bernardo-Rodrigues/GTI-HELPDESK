"use client";

import styled from "styled-components";
import LoadingSpinner from "./LoadingSpinner";

const Overlay = styled.div<{ $open: boolean }>`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: inherit;
  opacity: ${(p) => (p.$open ? 1 : 0)};
  pointer-events: ${(p) => (p.$open ? "auto" : "none")};
  transition: opacity 0.2s ease;
`;

const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const LoadingText = styled.span`
  font-size: 0.9rem;
  color: var(--primary-700);
  font-weight: 500;
`;

type LoadingOverlayProps = {
  loading: boolean;
  text?: string;
  "aria-label"?: string;
};

export default function LoadingOverlay({ 
  loading, 
  text,
  "aria-label": ariaLabel 
}: LoadingOverlayProps) {
  if (!loading) return null;

  return (
    <Overlay $open={loading} role="status" aria-label={ariaLabel || text || "Carregando"} aria-live="polite">
      <LoadingContent>
        <LoadingSpinner size="large" />
        {text && <LoadingText>{text}</LoadingText>}
      </LoadingContent>
    </Overlay>
  );
}

