"use client";

import { createGlobalStyle } from "styled-components";

const GlobalStyles = createGlobalStyle`
  :root {
    --bg: #f7f9fc;
    --surface: #ffffff;
    --primary-600: #0a0b0cff; /* blue 600 */
    --primary-700: #08090aff; /* blue 700 */
    --primary-800: #090a10ff; /* blue 800 */
    --focus-ring: #080808ff; /* accessible focus color */
    --text: #1f2937;
    --muted: #6b7280;
    --border: #e5e7eb;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body, #__next { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a { color: var(--primary-700); text-decoration: none; }
  a:hover { text-decoration: underline; }

  button { font: inherit; }
  input, button { outline-color: var(--focus-ring); }
`;

export default GlobalStyles;