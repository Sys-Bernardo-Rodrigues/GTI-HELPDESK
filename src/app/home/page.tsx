"use client";

import styled from "styled-components";

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--bg);
`;

const TopBar = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
`;

const Brand = styled.div`
  font-weight: 800;
  color: var(--primary-700);
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  padding: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  position: sticky;
  top: 72px;
  align-self: start;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 12px;

  @media (max-width: 960px) {
    position: static;
  }
`;

const NavItem = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  &:hover { background: #f3f4f6; }
`;

const Content = styled.main`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
`;

const Card = styled.section`
  grid-column: span 12;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.04);

  @media (min-width: 960px) {
    grid-column: span 6;
  }
`;

const CardTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 8px;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0;
`;

export default function HomePage() {
  return (
    <Page>
      <TopBar role="navigation" aria-label="Barra de navegação">
        <Brand>Helpdesk</Brand>
      </TopBar>
      <Shell>
        <Sidebar aria-label="Menu">
          <nav>
            <NavItem href="#" aria-label="Início">Início</NavItem>
            <NavItem href="#" aria-label="Tickets">Tickets</NavItem>
            <NavItem href="#" aria-label="Usuários">Usuários</NavItem>
            <NavItem href="#" aria-label="Configurações">Configurações</NavItem>
          </nav>
        </Sidebar>
        <Content>
          <Card>
            <CardTitle>Tickets Abertos</CardTitle>
            <Muted>Resumo de tickets abertos no momento.</Muted>
          </Card>
          <Card>
            <CardTitle>Estatísticas</CardTitle>
            <Muted>Métricas de atendimento recentes.</Muted>
          </Card>
          <Card>
            <CardTitle>Atalhos</CardTitle>
            <Muted>Ações rápidas e favoritos.</Muted>
          </Card>
        </Content>
      </Shell>
    </Page>
  );
}