import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-registry";
import GlobalStyles from "@/ui/GlobalStyles";

export const metadata: Metadata = {
  title: "RootDesk",
  description: "Sistema de Helpdesk RootDesk",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <StyledComponentsRegistry>
          <GlobalStyles />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}