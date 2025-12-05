# 🚀 Guia de Deploy em Produção

Este guia explica como colocar seu servidor em produção usando os scripts otimizados e configurados.

## 📋 Pré-requisitos

1. **Servidor configurado e funcional** (com `npm run dev` funcionando)
2. **Variáveis de ambiente** configuradas no arquivo `.env`
3. **Banco de dados** PostgreSQL rodando e acessível
4. **Node.js 18+** instalado

## 🔧 Passo a Passo para Produção

### 1. Configure as Variáveis de Ambiente para Produção

Edite seu arquivo `.env` e ajuste as seguintes variáveis:

```env
# Ambiente - MUDAR PARA PRODUCTION
NODE_ENV=production

# URLs - MUDAR PARA SUA URL DE PRODUÇÃO
APP_URL=https://seusistema.com
NEXT_PUBLIC_APP_URL=https://seusistema.com
PUBLIC_APP_URL=https://seusistema.com

# Segurança - GERE CHAVES FORTES
AUTH_SECRET="sua-chave-secreta-forte-minimo-32-caracteres"
# Gere com: openssl rand -base64 32

ENCRYPTION_KEY="sua-chave-de-criptografia-64-caracteres-hexadecimais"
# Gere com: node scripts/generate-encryption-key.js
# ou: openssl rand -hex 32

# Banco de Dados - CONFIGURE COM SUAS CREDENCIAIS DE PRODUÇÃO
DATABASE_URL="postgresql://usuario:senha@host:5432/banco?schema=public"

# Desabilitar recursos perigosos em produção
ALLOW_GIT_UPDATE=false
ALLOW_ENV_EDIT=false
```

### 2. Instale as Dependências (se ainda não fez)

```bash
npm install
```

### 3. Verifique o Ambiente (Recomendado)

Antes de iniciar, verifique se tudo está configurado corretamente:

```bash
npm run prod:check
```

Este script verifica:
- ✅ Variáveis de ambiente essenciais
- ✅ Configurações de segurança
- ✅ Conexão com banco de dados
- ✅ Existência do build
- ✅ URLs configuradas corretamente

**Se houver erros, corrija antes de continuar!**

### 4. Gere o Cliente Prisma

```bash
npm run db:generate
```

### 5. Aplique as Migrações do Banco de Dados

```bash
npm run db:deploy
```

Este comando aplica todas as migrações pendentes no banco de dados de produção.

### 6. Faça o Build da Aplicação

```bash
npm run build
```

Este comando:
- Gera o cliente Prisma automaticamente (`prebuild`)
- Compila o Next.js para produção
- Otimiza assets e código
- Cria a pasta `.next` com os arquivos otimizados

### 7. Inicie o Servidor de Produção

```bash
npm run start
```

Este comando:
- Aplica migrações automaticamente (`prestart` - otimizado, sem gerar Prisma novamente)
- Inicia o servidor Next.js em modo produção na porta 3000

## 🎯 Comandos de Deploy

### Opção 1: Deploy Completo e Seguro ⭐ RECOMENDADO

```bash
npm run prod:deploy
```

Este é o comando mais seguro e recomendado. Ele executa:
1. ✅ **Verificação do ambiente** (`prod:check`) - valida tudo antes de iniciar
2. ✅ **Build da aplicação** (`prod:build`)
3. ✅ **Inicia o servidor** (`prod:start`)

**Vantagens:**
- Valida o ambiente antes de iniciar
- Detecta problemas antecipadamente
- Mais seguro para produção

### Opção 2: Build + Start (Sem Verificação)

```bash
npm run prod
```

Este comando executa:
1. `npm run prod:build` → `npm run build`
2. `npm run prod:start` → `npm run start`

**Use quando:** Você já sabe que tudo está configurado corretamente.

### Opção 3: Apenas Verificar

```bash
npm run prod:check
```

Verifica se o ambiente está pronto para produção sem fazer build ou iniciar o servidor.

## 🔄 Atualizando em Produção

Quando precisar atualizar o sistema:

### Método Recomendado (Com Verificação)

```bash
# 1. Pare o servidor (Ctrl+C ou PM2/systemd)

# 2. Atualize o código (se usar git)
git pull

# 3. Instale novas dependências (se houver)
npm install

# 4. Deploy completo com verificação
npm run prod:deploy
```

### Método Rápido (Sem Verificação)

```bash
# 1. Pare o servidor

# 2. Atualize o código
git pull

# 3. Instale dependências (se necessário)
npm install

# 4. Build e start
npm run prod
```

### Apenas Reiniciar (Sem Mudanças no Código)

```bash
npm run start
```

## 🌐 Configurando um Process Manager (Recomendado)

Para manter o servidor rodando automaticamente e reiniciar em caso de falha, use um process manager:

### Opção 1: PM2 (Recomendado)

```bash
# Instale o PM2 globalmente
npm install -g pm2

# Inicie o servidor com PM2
pm2 start npm --name "helpdesk" -- run start

# Salve a configuração
pm2 save

# Configure para iniciar no boot
pm2 startup
```

### Opção 2: systemd (Linux)

Crie um arquivo `/etc/systemd/system/helpdesk.service`:

```ini
[Unit]
Description=RootDesk Helpdesk
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/GTI-HELPDESK
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable helpdesk
sudo systemctl start helpdesk
```

## 🔒 Configurações de Segurança Adicionais

### 1. Configure HTTPS

Use um reverse proxy como **Nginx** ou **Caddy**:

**Exemplo Nginx:**
```nginx
server {
    listen 80;
    server_name seusistema.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seusistema.com;

    ssl_certificate /caminho/para/certificado.crt;
    ssl_certificate_key /caminho/para/chave.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Configure Firewall

```bash
# Permita apenas portas necessárias
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Configure Variáveis Sensíveis

Nunca commite o arquivo `.env`. Use variáveis de ambiente do sistema ou um gerenciador de secrets.

## 📊 Monitoramento

### Verificar se está rodando

```bash
# Com PM2
pm2 status
pm2 logs helpdesk

# Com systemd
sudo systemctl status helpdesk
sudo journalctl -u helpdesk -f
```

### Verificar saúde da aplicação

Acesse: `https://seusistema.com/api/health`

### Verificar Ambiente de Produção

```bash
# Verifica configurações, variáveis e conexões
npm run prod:check
```

Este comando é útil para:
- Diagnosticar problemas antes de iniciar
- Verificar se tudo está configurado corretamente
- Validar após mudanças no `.env`

## ⚠️ Diferenças entre Dev e Produção

| Aspecto | Desenvolvimento (`npm run dev`) | Produção (`npm run start`) |
|---------|--------------------------------|---------------------------|
| **Hot Reload** | ✅ Sim | ❌ Não |
| **Otimizações** | ❌ Não | ✅ Sim |
| **Source Maps** | ✅ Sim | ❌ Não (ou limitado) |
| **Performance** | Mais lento | Otimizado |
| **Erros** | Detalhados | Resumidos |
| **Porta** | 3000 | 3000 (ou configurada) |
| **Prisma Generate** | Executado no predev | Executado apenas no build |
| **Migrações** | `db push` (desenvolvimento) | `migrate deploy` (produção) |
| **Validação** | Manual | Automática (`prod:check`) |

## 🚀 Melhorias nos Scripts de Produção

Os scripts foram otimizados para serem mais rápidos, seguros e confiáveis:

### ✅ Otimizações Implementadas

1. **Geração do Prisma Otimizada**
   - Antes: Prisma era gerado tanto no build quanto no start
   - Agora: Gerado apenas no build, evitando redundância
   - Benefício: Inicialização mais rápida

2. **Script de Verificação Pré-Produção**
   - Novo script `prod:check` valida o ambiente antes de iniciar
   - Detecta problemas antecipadamente
   - Valida variáveis, conexões e configurações

3. **Deploy Seguro**
   - Novo script `prod:deploy` inclui verificação automática
   - Mais seguro para produção
   - Evita iniciar com configurações incorretas

### 📋 Scripts Disponíveis

| Script | Descrição | Quando Usar |
|--------|-----------|-------------|
| `prod:check` | Verifica ambiente | Antes de qualquer deploy |
| `prod:build` | Faz build | Quando código mudou |
| `prod:start` | Inicia servidor | Para iniciar/reiniciar |
| `prod:deploy` | Verificação + Build + Start | ⭐ Deploy completo recomendado |
| `prod` | Build + Start | Quando já sabe que está tudo OK |

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
npm install
npm run db:generate
```

### Erro: "Database connection failed"
- Verifique se o PostgreSQL está rodando
- Verifique as credenciais no `.env`
- Teste a conexão: `npm run db:generate && tsx scripts/check-db.ts`
- Use o verificador: `npm run prod:check`

### Erro: "Port 3000 already in use"
```bash
# Encontre o processo
lsof -i :3000

# Mate o processo ou use outra porta
PORT=3001 npm run start
```

### Build falha
```bash
# Limpe o cache
rm -rf .next node_modules
npm install
npm run build
```

## ✅ Checklist de Produção

### Configuração Inicial
- [ ] `NODE_ENV=production` no `.env`
- [ ] URLs configuradas corretamente (não localhost)
- [ ] `AUTH_SECRET` forte gerado (mínimo 32 caracteres)
- [ ] `ENCRYPTION_KEY` forte gerado (64 caracteres hexadecimais)
- [ ] Banco de dados de produção configurado
- [ ] `ALLOW_GIT_UPDATE=false` em produção
- [ ] `ALLOW_ENV_EDIT=false` em produção

### Deploy
- [ ] Dependências instaladas (`npm install`)
- [ ] Cliente Prisma gerado (`npm run db:generate`)
- [ ] Migrações aplicadas (`npm run db:deploy`)
- [ ] Verificação do ambiente passou (`npm run prod:check`)
- [ ] Build realizado com sucesso (`npm run build`)
- [ ] Servidor iniciado (`npm run start` ou `npm run prod:deploy`)

### Infraestrutura
- [ ] Process manager configurado (PM2/systemd)
- [ ] HTTPS configurado (Nginx/Caddy)
- [ ] Firewall configurado
- [ ] Backups do banco de dados configurados
- [ ] Monitoramento configurado

## 📝 Resumo dos Comandos

### Desenvolvimento
```bash
npm run dev              # Inicia servidor de desenvolvimento
npm run dev:network      # Inicia com acesso de rede
```

### Produção - Verificação
```bash
npm run prod:check       # ✅ Verifica se ambiente está pronto
```

### Produção - Build
```bash
npm run build            # Build de produção
npm run prod:build       # Alias para build
```

### Produção - Iniciar
```bash
npm run start            # Inicia servidor (aplica migrações automaticamente)
npm run prod:start       # Alias para start
```

### Produção - Deploy Completo
```bash
npm run prod:deploy      # ⭐ RECOMENDADO - Verificação + Build + Start
npm run prod             # Build + Start (sem verificação)
```

### Banco de Dados
```bash
npm run db:generate      # Gera cliente Prisma
npm run db:deploy        # Aplica migrações (produção)
npm run db:migrate       # Cria migração (desenvolvimento)
npm run db:push          # Sincroniza schema (desenvolvimento)
```

### Docker
```bash
npm run docker:up        # Inicia containers
npm run docker:down      # Para containers
npm run docker:logs      # Visualiza logs
```

## 🎯 Fluxo Recomendado

### Primeira Vez / Deploy Inicial
```bash
# 1. Configure o .env
# 2. Instale dependências
npm install

# 3. Deploy completo (recomendado)
npm run prod:deploy
```

### Atualizações
```bash
# Método recomendado
git pull
npm install
npm run prod:deploy

# Método rápido (quando já sabe que está tudo OK)
git pull
npm run prod
```

### Apenas Reiniciar
```bash
npm run start
```

## 🔍 Script de Verificação (`prod:check`)

O script de verificação valida automaticamente:

- ✅ **NODE_ENV** - Deve ser "production"
- ✅ **Variáveis Essenciais** - DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY
- ✅ **Segurança** - ALLOW_GIT_UPDATE, ALLOW_ENV_EDIT desabilitados
- ✅ **URLs** - Configuradas e não apontando para localhost
- ✅ **Banco de Dados** - Conexão estabelecida
- ✅ **Build** - Diretório .next existe

**Use sempre antes de fazer deploy em produção!**

---

**Pronto!** Seu servidor está configurado para produção com scripts otimizados e verificações automáticas. Use `npm run prod:deploy` para o deploy mais seguro! 🎉
