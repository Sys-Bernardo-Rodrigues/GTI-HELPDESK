"use client";

import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
  :root {
    /* Cores Principais - Gradiente moderno azul/roxo */
    --primary-50: #f0f9ff;
    --primary-100: #e0f2fe;
    --primary-200: #bae6fd;
    --primary-300: #7dd3fc;
    --primary-400: #38bdf8;
    --primary-500: #0ea5e9;
    --primary-600: #0284c7;
    --primary-700: #0369a1;
    --primary-800: #075985;
    --primary-900: #0c4a6e;
    
    /* Cores Secundárias - Roxo/Violeta */
    --secondary-50: #faf5ff;
    --secondary-100: #f3e8ff;
    --secondary-200: #e9d5ff;
    --secondary-300: #d8b4fe;
    --secondary-400: #c084fc;
    --secondary-500: #a855f7;
    --secondary-600: #9333ea;
    --secondary-700: #7e22ce;
    
    /* Status Colors */
    --success-50: #f0fdf4;
    --success-500: #22c55e;
    --success-600: #16a34a;
    --success-700: #15803d;
    
    --warning-50: #fffbeb;
    --warning-500: #f59e0b;
    --warning-600: #d97706;
    --warning-700: #b45309;
    
    --error-50: #fef2f2;
    --error-500: #ef4444;
    --error-600: #dc2626;
    --error-700: #b91c1c;
    
    --info-50: #eff6ff;
    --info-500: #3b82f6;
    --info-600: #2563eb;
    --info-700: #1d4ed8;
    
    /* Neutros */
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    
    /* Sistema */
    --bg: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    --bg-solid: #f8fafc;
    --surface: #ffffff;
    --surface-elevated: #ffffff;
    --text: #0f172a;
    --text-muted: #64748b;
    --text-subtle: #94a3b8;
    --border: #e2e8f0;
    --border-strong: #cbd5e1;
    --focus-ring: var(--primary-500);
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    
    /* Compatibilidade com código existente - já definidos acima */
    --muted: var(--text-muted);
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  html,
  body,
  #__next {
    height: 100%;
    min-height: 100vh;
  }

  body {
    margin: 0;
    background: var(--bg-solid);
    background-image: var(--bg);
    color: var(--text);
    font-family: 
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      "Helvetica Neue",
      Arial,
      "Noto Sans",
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol";
    font-size: 16px;
    line-height: 1.5;
    letter-spacing: -0.01em;
  }

  a {
    color: var(--primary-600);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  a:hover {
    color: var(--primary-700);
    text-decoration: underline;
  }

  button {
    font: inherit;
    cursor: pointer;
    border: none;
    background: none;
  }

  input,
  textarea,
  select,
  button {
    outline-color: var(--focus-ring);
    outline-offset: 2px;
  }

  input:focus,
  textarea:focus,
  select:focus,
  button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  /* Scrollbar moderno */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: var(--gray-100);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 10px;
    border: 2px solid var(--gray-100);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--gray-400);
  }

  /* Seleção de texto */
  ::selection {
    background: var(--primary-200);
    color: var(--primary-900);
  }

  ::-moz-selection {
    background: var(--primary-200);
    color: var(--primary-900);
  }
`;

export default GlobalStyles;