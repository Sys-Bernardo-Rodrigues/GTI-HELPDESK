/**
 * Breakpoints e media queries compartilhadas para responsividade
 */

export const breakpoints = {
  mobile: "480px",
  tablet: "768px",
  desktop: "960px",
  wide: "1280px",
} as const;

/**
 * Media query helpers para styled-components
 */
export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile})`,
  tablet: `@media (max-width: ${breakpoints.tablet})`,
  desktop: `@media (max-width: ${breakpoints.desktop})`,
  aboveMobile: `@media (min-width: ${parseInt(breakpoints.mobile) + 1}px)`,
  aboveTablet: `@media (min-width: ${parseInt(breakpoints.tablet) + 1}px)`,
  aboveDesktop: `@media (min-width: ${parseInt(breakpoints.desktop) + 1}px)`,
} as const;

/**
 * Tamanho mínimo recomendado para elementos tocáveis em mobile (WCAG)
 */
export const TOUCH_TARGET_SIZE = "44px";

