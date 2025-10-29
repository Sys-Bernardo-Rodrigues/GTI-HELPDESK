"use client";

import styled from "styled-components";

const Wrapper = styled.main`
  min-height: 100dvh;
  display: grid;
  padding: 24px;
`;

const Card = styled.section`
  max-width: 720px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.04);
`;

const Title = styled.h1`
  font-size: 1.4rem;
  margin: 0 0 8px;
`;

const Muted = styled.p`
  color: var(--muted);
  margin: 0 0 12px;
`;

export default function ProfilePage() {
  return (
    <Wrapper>
      <Card aria-labelledby="profile-title">
        <Title id="profile-title">Perfil do Usuário</Title>
        <Muted>Em breve: edição de nome, avatar, e contatos.</Muted>
      </Card>
    </Wrapper>
  );
}