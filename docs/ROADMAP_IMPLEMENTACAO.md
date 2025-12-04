# 🗺️ Roadmap de Implementação - RootDesk

## 📊 Visão Geral

Este documento detalha o plano de implementação das melhorias identificadas na revisão do sistema, organizadas por prioridade e complexidade.

---

## 🎯 FASE 1: FUNDAÇÕES (Semanas 1-8)

### Sprint 1-2: Melhorias no Dobby assistente virtual (Beta) ✅ **CONCLUÍDO**
**Objetivo**: Reintroduzir e melhorar a IA local

#### Tarefas:
- [x] **1.1** Reintroduzir integração com Ollama (`src/lib/localAi.ts`) ✅
  - ✅ Restaurar funções `callLocalAi`, `isLocalAiEnabled`
  - ⏳ Adicionar suporte a streaming de respostas (pendente)
  - ✅ Implementar cache de respostas similares (cache em memória com TTL)
  - **Status**: Concluído (streaming pode ser adicionado depois)
  - **Data de conclusão**: 2024

- [x] **1.2** Melhorar detecção de intenção (`src/app/api/chat/route.ts`) ✅
  - ✅ Reintroduzir sistema de sinônimos expandidos (8 grupos de sinônimos)
  - ✅ Adicionar detecção de entidades (datas, nomes, IDs, URLs, emails)
  - ✅ Implementar contexto de conversa persistente (até 8 mensagens)
  - ✅ Melhorar extração de datas (hoje, amanhã, ontem, semana passada, etc.)
  - **Status**: Concluído
  - **Data de conclusão**: 2024

- [x] **1.3** Adicionar ações diretas no Dobby assistente virtual (Beta) ✅
  - ✅ Criar endpoint `/api/chat/actions` para executar ações
  - ✅ Implementar parser de comandos ("Fechar ticket #123", "Criar documento sobre X")
  - ✅ Suporte a: fechar ticket, atualizar status, criar documento
  - ✅ Validação de permissões (criador, atribuído ou admin)
  - ⏳ Adicionar confirmação para ações destrutivas (pendente - pode ser modal)
  - **Status**: Concluído (confirmação pode ser adicionada depois)
  - **Data de conclusão**: 2024

- [x] **1.4** Sistema de feedback para respostas ✅
  - ✅ Adicionar botões "Útil" / "Não útil" nas respostas
  - ✅ Criar tabela `ChatFeedback` no schema Prisma
  - ✅ Endpoint `/api/chat/feedback` para receber feedback
  - ✅ Armazenar: isHelpful, comment, intent, source
  - ⏳ Usar feedback para melhorar respostas futuras (pendente - análise futura)
  - **Status**: Concluído (uso do feedback para melhorias pode ser implementado depois)
  - **Data de conclusão**: 2024

**Total Sprint 1-2**: ✅ **CONCLUÍDO** (~11 dias úteis estimados)

#### Melhorias Adicionais Implementadas:
- ✅ **Sugestões contextuais**: Após cada resposta, o Dobby assistente virtual (Beta) sugere perguntas relacionadas
- ✅ **Cache inteligente**: Cache em memória com TTL de 5 minutos, limpeza automática
- ✅ **Fallback inteligente**: Se IA local falhar, usa resposta baseada em regras
- ✅ **Melhorias na UI**: Tags de fonte (IA Local, Cache, Ação executada), feedback visual

---

### Sprint 3-4: Sistema de Permissões
**Objetivo**: Implementar UI completa para gerenciar perfis de acesso

#### Tarefas:
- [ ] **2.1** Criar página de gerenciamento de perfis (`src/app/admin/profiles/page.tsx`)
  - Listar perfis existentes
  - Criar/editar/deletar perfis
  - Atribuir perfis a usuários
  - **Estimativa**: 3 dias

- [ ] **2.2** Implementar middleware de permissões (`src/lib/permissions.ts`)
  - Função `checkPermission(userId, resource, action)`
  - Middleware para rotas protegidas
  - Cache de permissões do usuário
  - **Estimativa**: 3 dias

- [ ] **2.3** Adicionar verificação de permissões em todas as rotas API
  - Revisar todas as rotas `/api/*`
  - Adicionar checks de permissão
  - Retornar 403 quando não autorizado
  - **Estimativa**: 4 dias

- [ ] **2.4** UI para configurar permissões por página
  - Interface drag-and-drop para selecionar páginas
  - Visualização de permissões por perfil
  - **Estimativa**: 2 dias

**Total Sprint 3-4**: ~12 dias úteis

---

### Sprint 5-6: Notificações e Alertas
**Objetivo**: Sistema completo de notificações

#### Tarefas:
- [ ] **3.1** Integrar notificações por email (`src/lib/email.ts`)
  - Usar SMTP já configurado
  - Templates de email para diferentes eventos
  - Fila de emails (usar queue simples ou Bull)
  - **Estimativa**: 3 dias

- [ ] **3.2** Central de notificações na UI (`src/components/NotificationCenter.tsx`)
  - Listar todas as notificações
  - Marcar como lida/não lida
  - Filtros e busca
  - **Estimativa**: 3 dias

- [ ] **3.3** Preferências de notificação (`src/app/profile/notifications/page.tsx`)
  - Permitir escolher tipos de notificação
  - Configurar horários de silêncio
  - **Estimativa**: 2 dias

- [ ] **3.4** Alertas de SLA e inatividade
  - Job agendado (cron) para verificar SLAs
  - Notificar quando ticket está próximo do prazo
  - Alertar tickets sem atualização há X dias
  - **Estimativa**: 3 dias

**Total Sprint 5-6**: ~11 dias úteis

---

### Sprint 7-8: Busca e Performance
**Objetivo**: Melhorar busca e adicionar cache

#### Tarefas:
- [ ] **4.1** Implementar busca full-text no MariaDB
  - Adicionar índices FULLTEXT em Document, Ticket, File
  - Criar função de busca unificada
  - Suportar operadores (AND, OR, NOT)
  - **Estimativa**: 3 dias

- [ ] **4.2** Adicionar Redis para cache
  - Configurar Redis (Docker Compose)
  - Criar wrapper `src/lib/cache.ts`
  - Cachear buscas frequentes, estatísticas
  - **Estimativa**: 2 dias

- [ ] **4.3** Otimizar queries do Prisma
  - Revisar queries N+1
  - Adicionar `select` específico onde necessário
  - Adicionar índices adicionais no schema
  - **Estimativa**: 3 dias

- [ ] **4.4** Paginação eficiente
  - Implementar cursor-based pagination onde fizer sentido
  - Adicionar limites e offsets consistentes
  - **Estimativa**: 2 dias

**Total Sprint 7-8**: ~10 dias úteis

**Total Fase 1**: ~44 dias úteis (~9 semanas)

---

## 🚀 FASE 2: FUNCIONALIDADES AVANÇADAS (Semanas 9-16)

### Sprint 9-10: Dashboard e Relatórios
**Objetivo**: Dashboard customizável e relatórios avançados

#### Tarefas:
- [ ] **5.1** Dashboard customizável
  - Sistema de widgets arrastáveis (react-grid-layout)
  - Salvar layout por usuário
  - Widgets: estatísticas, gráficos, listas
  - **Estimativa**: 5 dias

- [ ] **5.2** Gráficos interativos
  - Integrar Chart.js ou Recharts
  - Gráficos de tickets por status, categoria, tempo
  - Gráficos de produtividade
  - **Estimativa**: 3 dias

- [ ] **5.3** Sistema de relatórios
  - Criar relatórios customizáveis
  - Exportar PDF (usar puppeteer ou similar)
  - Exportar Excel/CSV
  - **Estimativa**: 4 dias

- [ ] **5.4** Agendamento de relatórios
  - Agendar envio automático de relatórios
  - Enviar por email
  - **Estimativa**: 2 dias

**Total Sprint 9-10**: ~14 dias úteis

---

### Sprint 11-12: Automação e Workflows
**Objetivo**: Sistema de automação básico

#### Tarefas:
- [ ] **6.1** Sistema de workflows (`src/app/admin/workflows/page.tsx`)
  - Criar regras "se-então"
  - Triggers: novo ticket, atualização, status mudou
  - Ações: atribuir, mudar status, enviar email, criar ticket
  - **Estimativa**: 6 dias

- [ ] **6.2** Templates de resposta
  - Criar/editar templates
  - Usar variáveis dinâmicas ({{ticket.id}}, {{user.name}})
  - Aplicar template em tickets
  - **Estimativa**: 3 dias

- [ ] **6.3** Ações em massa
  - Selecionar múltiplos tickets
  - Aplicar ações em lote (fechar, atribuir, mudar categoria)
  - **Estimativa**: 2 dias

**Total Sprint 11-12**: ~11 dias úteis

---

### Sprint 13-14: Integrações
**Objetivo**: Integrações com sistemas externos

#### Tarefas:
- [ ] **7.1** API REST pública documentada
  - Criar documentação Swagger/OpenAPI
  - Endpoints públicos com autenticação por token
  - Rate limiting por token
  - **Estimativa**: 4 dias

- [ ] **7.2** Integração com Slack
  - Bot do Slack
  - Comandos: criar ticket, listar tickets, status
  - Notificações no Slack
  - **Estimativa**: 4 dias

- [ ] **7.3** Integração com Microsoft Teams
  - Similar ao Slack
  - Notificações e comandos
  - **Estimativa**: 3 dias

- [ ] **7.4** Webhooks de saída melhorados
  - UI para configurar webhooks
  - Testar webhooks
  - Logs de webhooks disparados
  - **Estimativa**: 2 dias

**Total Sprint 13-14**: ~13 dias úteis

---

### Sprint 15-16: Backup e Segurança
**Objetivo**: Backup automático e melhorias de segurança

#### Tarefas:
- [ ] **8.1** Sistema de backup automático
  - Script de backup do banco (mysqldump)
  - Backup de arquivos (uploads/)
  - Agendar backups (cron ou node-cron)
  - **Estimativa**: 3 dias

- [ ] **8.2** Integração com S3/Cloud Storage
  - Upload de backups para nuvem
  - Retenção configurável
  - **Estimativa**: 2 dias

- [ ] **8.3** Auditoria de acesso
  - Tabela `AuditLog` no schema
  - Log de todas as ações importantes
  - UI para visualizar logs
  - **Estimativa**: 4 dias

- [ ] **8.4** Melhorias de segurança
  - Rate limiting avançado
  - IP whitelist (opcional)
  - Validação de inputs mais rigorosa
  - **Estimativa**: 3 dias

**Total Sprint 15-16**: ~12 dias úteis

**Total Fase 2**: ~50 dias úteis (~10 semanas)

---

## 🎨 FASE 3: UX E MOBILE (Semanas 17-24)

### Sprint 17-18: PWA e Offline
**Objetivo**: Transformar em Progressive Web App

#### Tarefas:
- [ ] **9.1** Service Worker
  - Cache de assets estáticos
  - Cache de API responses
  - Estratégia de cache (Cache First, Network First)
  - **Estimativa**: 3 dias

- [ ] **9.2** Funcionalidade offline
  - Fazer ações offline (criar ticket, comentar)
  - Sincronizar quando online
  - Indicador de status online/offline
  - **Estimativa**: 4 dias

- [ ] **9.3** Notificações push
  - Configurar service worker para push
  - Registrar usuários para push
  - Enviar notificações push
  - **Estimativa**: 3 dias

- [ ] **9.4** Manifest e instalação
  - Manifest.json completo
  - Ícones em múltiplos tamanhos
  - Splash screen
  - **Estimativa**: 2 dias

**Total Sprint 17-18**: ~12 dias úteis

---

### Sprint 19-20: Melhorias de UI
**Objetivo**: Tema, acessibilidade, animações

#### Tarefas:
- [ ] **10.1** Tema escuro/claro
  - Context para tema
  - Persistir preferência
  - Variáveis CSS para cores
  - **Estimativa**: 3 dias

- [ ] **10.2** Acessibilidade
  - ARIA labels em todos os componentes
  - Navegação por teclado
  - Alto contraste
  - **Estimativa**: 4 dias

- [ ] **10.3** Animações e transições
  - Animações suaves (framer-motion)
  - Loading states melhorados
  - Feedback visual em ações
  - **Estimativa**: 2 dias

- [ ] **10.4** Responsividade mobile
  - Revisar todas as páginas
  - Menu mobile otimizado
  - Touch gestures
  - **Estimativa**: 3 dias

**Total Sprint 19-20**: ~12 dias úteis

---

### Sprint 21-22: Colaboração
**Objetivo**: Funcionalidades de colaboração em tempo real

#### Tarefas:
- [ ] **11.1** WebSocket para tempo real
  - Configurar WebSocket (Socket.io ou similar)
  - Comentários em tempo real nos tickets
  - Indicador de "digitando..."
  - **Estimativa**: 4 dias

- [ ] **11.2** Mentions e notificações
  - Sistema de @mentions
  - Notificar usuário mencionado
  - **Estimativa**: 2 dias

- [ ] **11.3** Compartilhamento de documentos
  - Gerar links temporários
  - Controle de acesso (leitura, edição)
  - Expiração de links
  - **Estimativa**: 3 dias

**Total Sprint 21-22**: ~9 dias úteis

---

### Sprint 23-24: Analytics e Monitoramento
**Objetivo**: Analytics de uso e monitoramento

#### Tarefas:
- [ ] **12.1** Tracking de eventos
  - Sistema de eventos (PostHog ou custom)
  - Track de ações importantes
  - Dashboard de analytics
  - **Estimativa**: 4 dias

- [ ] **12.2** Métricas de sistema
  - Coletar métricas de performance
  - Dashboard de saúde do sistema
  - Alertas de problemas
  - **Estimativa**: 3 dias

- [ ] **12.3** Logs estruturados
  - JSON logs com níveis
  - Centralização (opcional: ELK)
  - **Estimativa**: 2 dias

**Total Sprint 23-24**: ~9 dias úteis

**Total Fase 3**: ~42 dias úteis (~8 semanas)

---

## 📋 RESUMO GERAL

| Fase | Duração | Principais Entregas | Status |
|------|---------|---------------------|--------|
| **Fase 1** | 9 semanas | Dobby assistente virtual (Beta) melhorado, Permissões, Notificações, Busca | 🟡 Em andamento |
| **Fase 2** | 10 semanas | Dashboard, Automação, Integrações, Backup | ⚪ Não iniciado |
| **Fase 3** | 8 semanas | PWA, UI melhorada, Colaboração, Analytics | ⚪ Não iniciado |
| **TOTAL** | **27 semanas** (~6 meses) | Sistema completo e robusto | 🟡 12% concluído |

### 📊 Progresso Detalhado

#### ✅ Sprint 1-2: Melhorias no Dobby assistente virtual (Beta) - **100% CONCLUÍDO**
- ✅ Integração com IA local (Ollama)
- ✅ Sistema de sinônimos expandidos
- ✅ Detecção de entidades nomeadas
- ✅ Contexto de conversa persistente
- ✅ Cache de respostas
- ✅ Ações diretas (fechar ticket, criar documento)
- ✅ Sistema de feedback
- ✅ Sugestões contextuais

#### ⏳ Próximos Sprints
- Sprint 3-4: Sistema de Permissões (0%)
- Sprint 5-6: Notificações e Alertas (0%)
- Sprint 7-8: Busca e Performance (0%)

---

## 🎯 PRIORIZAÇÃO ALTERNATIVA (MVP Rápido)

Se precisar de um MVP mais rápido, focar em:

1. **Sprint 1-2**: Dobby assistente virtual (Beta) melhorado (sem ações diretas)
2. **Sprint 3**: Permissões básicas (UI simples)
3. **Sprint 4**: Notificações por email
4. **Sprint 5**: Busca full-text
5. **Sprint 6**: Dashboard básico (sem customização)

**Total MVP**: ~6 semanas

---

## 📝 NOTAS DE IMPLEMENTAÇÃO

### Tecnologias Sugeridas:
- **Cache**: Redis (Docker)
- **Queue**: Bull (Redis-based) ou node-cron para jobs simples
- **WebSocket**: Socket.io
- **Gráficos**: Recharts ou Chart.js
- **PDF**: Puppeteer ou jsPDF
- **Drag & Drop**: react-grid-layout
- **Animações**: framer-motion
- **Analytics**: PostHog (self-hosted) ou custom

### Considerações:
- Testar cada feature antes de avançar
- Manter documentação atualizada
- Code review para todas as PRs
- Deploy incremental (não tudo de uma vez)

---

## 📝 CHANGELOG

### 2024 - Sprint 1-2 Concluído ✅

#### Melhorias Implementadas:
1. **IA Local Reintroduzida**
   - Integração com Ollama restaurada
   - Fallback inteligente para respostas baseadas em regras
   - Cache de respostas para melhor performance

2. **Sistema de Sinônimos**
   - 8 grupos de sinônimos expandidos
   - Melhora significativa no recall de busca
   - Suporte a: tickets, documentos, senhas, arquivos, agenda, histórico, estatísticas, relatórios

3. **Detecção de Entidades**
   - Extração de IDs, URLs, emails, datas
   - Melhorias na detecção de datas relativas (hoje, amanhã, semana passada, etc.)
   - Função `extractNamedEntities` para múltiplas entidades

4. **Contexto de Conversa**
   - Histórico persistente de até 8 mensagens
   - Suporte a follow-ups e perguntas contextuais
   - Histórico enviado para IA local quando disponível

5. **Ações Diretas**
   - Comandos: "Fechar ticket #X", "Criar documento sobre Y"
   - Validação de permissões automática
   - Criação de histórico de atualizações

6. **Sistema de Feedback**
   - Botões "Útil" / "Não útil" em todas as respostas
   - Armazenamento no banco de dados
   - Interface visual clara e intuitiva

7. **Sugestões Contextuais**
   - Geração automática de sugestões baseadas na resposta
   - Sugestões clicáveis para facilitar navegação
   - Máximo de 3 sugestões por resposta

#### Arquivos Modificados:
- `src/app/api/chat/route.ts` - Lógica principal do chat melhorada
- `src/lib/localAi.ts` - Integração com Ollama
- `src/app/api/chat/feedback/route.ts` - Novo endpoint de feedback
- `src/app/api/chat/actions/route.ts` - Novo endpoint de ações
- `src/app/home/page.tsx` - UI melhorada com feedback e sugestões
- `prisma/schema.prisma` - Nova tabela `ChatFeedback`

#### Próximos Passos:
- Implementar streaming de respostas da IA (opcional)
- Adicionar confirmação modal para ações destrutivas (opcional)
- Usar feedback coletado para melhorar respostas (análise futura)
- Iniciar Sprint 3-4: Sistema de Permissões

---

**Última atualização**: 2024
**Próxima revisão**: Após conclusão do Sprint 3-4

