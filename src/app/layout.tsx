import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-registry";
import GlobalStyles from "@/ui/GlobalStyles";

export const metadata: Metadata = {
  title: "GTI Helpdesk",
  description: "Sistema de Helpdesk",
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