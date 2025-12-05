# 🚀 Guia de Deploy em Produção

Este guia explica como colocar seu servidor em produção usando os scripts já configurados, **sem alterar nada do que já existe**.

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

### 3. Gere o Cliente Prisma

```bash
npm run db:generate
```

### 4. Aplique as Migrações do Banco de Dados

```bash
npm run db:deploy
```

Este comando aplica todas as migrações pendentes no banco de dados de produção.

### 5. Faça o Build da Aplicação

```bash
npm run build
```

Este comando:
- Gera o cliente Prisma (`prebuild`)
- Compila o Next.js para produção
- Otimiza assets e código
- Cria a pasta `.next` com os arquivos otimizados

### 6. Inicie o Servidor de Produção

```bash
npm run start
```

Este comando:
- Gera o cliente Prisma (`prestart`)
- Aplica migrações (`prisma migrate deploy`)
- Inicia o servidor Next.js em modo produção na porta 3000

## 🎯 Comando Único (Build + Start)

Se preferir fazer tudo de uma vez:

```bash
npm run prod
```

Este comando executa:
1. `npm run prod:build` → `npm run build`
2. `npm run prod:start` → `npm run start`

## 🔄 Atualizando em Produção

Quando precisar atualizar o sistema:

```bash
# 1. Pare o servidor (Ctrl+C)

# 2. Atualize o código (se usar git)
git pull

# 3. Instale novas dependências (se houver)
npm install

# 4. Refaça o build
npm run build

# 5. Inicie novamente
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

## ⚠️ Diferenças entre Dev e Produção

| Aspecto | Desenvolvimento (`npm run dev`) | Produção (`npm run start`) |
|---------|--------------------------------|---------------------------|
| **Hot Reload** | ✅ Sim | ❌ Não |
| **Otimizações** | ❌ Não | ✅ Sim |
| **Source Maps** | ✅ Sim | ❌ Não (ou limitado) |
| **Performance** | Mais lento | Otimizado |
| **Erros** | Detalhados | Resumidos |
| **Porta** | 3000 | 3000 (ou configurada) |

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

- [ ] `NODE_ENV=production` no `.env`
- [ ] URLs configuradas corretamente
- [ ] `AUTH_SECRET` forte gerado
- [ ] `ENCRYPTION_KEY` forte gerado
- [ ] Banco de dados de produção configurado
- [ ] Migrações aplicadas (`npm run db:deploy`)
- [ ] Build realizado com sucesso (`npm run build`)
- [ ] Servidor iniciado (`npm run start`)
- [ ] Process manager configurado (PM2/systemd)
- [ ] HTTPS configurado (Nginx/Caddy)
- [ ] Firewall configurado
- [ ] Backups do banco de dados configurados
- [ ] Monitoramento configurado

## 📝 Resumo dos Comandos

```bash
# Desenvolvimento (como você já usa)
npm run dev

# Produção - Build
npm run build

# Produção - Start
npm run start

# Produção - Build + Start (tudo de uma vez)
npm run prod

# Banco de Dados
npm run db:generate    # Gera cliente Prisma
npm run db:deploy      # Aplica migrações (produção)
```

---

**Pronto!** Seu servidor está configurado para produção. Os scripts já existem e funcionam perfeitamente. Basta seguir os passos acima! 🎉
