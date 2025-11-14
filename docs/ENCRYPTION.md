# 🔐 Sistema de Criptografia da Base de Conhecimento

## Visão Geral

Todos os documentos e arquivos armazenados na base de conhecimento são criptografados usando **AES-256-GCM**, um algoritmo de criptografia simétrica considerado extremamente seguro e amplamente utilizado em aplicações críticas.

## O que é Criptografado

- ✅ **Conteúdo dos documentos** - Todo o texto dos documentos é criptografado antes de ser salvo no banco de dados
- ✅ **Arquivos enviados** - Todos os arquivos (PDF, vídeos, imagens, etc.) são criptografados antes de serem salvos no disco
- ✅ **Descrições de arquivos** - As descrições dos arquivos também são criptografadas

## O que NÃO é Criptografado (por design)

- Títulos de documentos (para facilitar busca e listagem)
- Categorias e tags (para filtros e organização)
- Metadados (datas, autor, etc.)

## Configuração da Chave de Criptografia

### ⚠️ IMPORTANTE: Configuração Obrigatória

Para máxima segurança, você **DEVE** configurar uma chave de criptografia única em produção.

### Gerar uma Chave Segura

Execute o script de geração de chave:

```bash
node scripts/generate-encryption-key.js
```

Isso gerará uma chave hexadecimal de 64 caracteres. **Guarde esta chave em local seguro!**

### Configurar a Chave

Adicione a chave ao seu arquivo `.env`:

```env
ENCRYPTION_KEY=sua_chave_hexadecimal_aqui_64_caracteres
```

### ⚠️ AVISOS CRÍTICOS

1. **NUNCA** commite a chave no Git
2. **NUNCA** compartilhe a chave publicamente
3. **SEMPRE** faça backup seguro da chave
4. **SEM** a chave, os dados criptografados **NÃO PODERÃO** ser recuperados
5. Se perder a chave, todos os dados criptografados serão **PERMANENTEMENTE INACESSÍVEIS**

## Como Funciona

### Criptografia de Documentos

1. Quando um documento é criado/editado, o conteúdo é criptografado usando AES-256-GCM
2. O conteúdo criptografado é salvo no banco de dados
3. Ao recuperar, o conteúdo é descriptografado automaticamente
4. O processo é transparente para o usuário

### Criptografia de Arquivos

1. Quando um arquivo é enviado, ele é lido em memória
2. O arquivo completo é criptografado usando AES-256-GCM
3. O arquivo criptografado é salvo no disco com extensão `.enc`
4. Ao baixar, o arquivo é descriptografado em tempo real e servido ao usuário

### Detalhes Técnicos

- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Tamanho da chave**: 256 bits (32 bytes)
- **IV (Initialization Vector)**: 16 bytes, gerado aleatoriamente para cada operação
- **Salt**: 64 bytes, gerado aleatoriamente para cada operação
- **Tag de autenticação**: 16 bytes (GCM garante integridade)
- **Derivação de chave**: PBKDF2 com 100.000 iterações e SHA-512

## Compatibilidade com Dados Antigos

O sistema possui fallback para documentos/arquivos criados antes da implementação da criptografia:
- Se a descriptografia falhar, o sistema tenta retornar os dados como texto simples
- Isso garante que dados antigos continuem acessíveis

## Segurança Adicional

### Recomendações

1. **Backup da chave**: Armazene a chave em um gerenciador de senhas seguro
2. **Rotação de chaves**: Considere implementar rotação periódica de chaves (requer re-criptografia de todos os dados)
3. **Monitoramento**: Monitore logs para detectar tentativas de descriptografia falhadas
4. **Acesso ao servidor**: Restrinja acesso físico e lógico ao servidor onde os arquivos estão armazenados
5. **Backup dos arquivos**: Faça backup regular dos arquivos criptografados (eles permanecerão criptografados)

### Proteção do Diretório de Uploads

Os arquivos estão em `public/uploads/base/` mas são criptografados. Para segurança adicional, considere:

1. Mover para fora de `public/` (requer mudanças nas rotas)
2. Configurar `.htaccess` ou regras do servidor web para bloquear acesso direto
3. Usar um serviço de armazenamento externo (S3, Azure Blob, etc.) com criptografia adicional

## Troubleshooting

### Erro: "Erro ao descriptografar"

- Verifique se `ENCRYPTION_KEY` está configurada corretamente
- Certifique-se de que a chave usada para criptografar é a mesma usada para descriptografar
- Dados antigos não criptografados podem causar este erro (o sistema tenta fallback automaticamente)

### Arquivos não podem ser baixados

- Verifique se a rota `/api/base/files/[id]/download` está acessível
- Verifique permissões de leitura no diretório `public/uploads/base/`
- Verifique logs do servidor para erros de descriptografia

## Testes

Para testar a criptografia:

1. Crie um documento ou envie um arquivo
2. Verifique no banco de dados que o conteúdo está criptografado (será uma string base64)
3. Verifique que ao recuperar, o conteúdo é descriptografado corretamente
4. Tente acessar diretamente um arquivo `.enc` - ele deve estar ilegível

## Suporte

Em caso de problemas ou dúvidas sobre segurança, consulte a documentação do sistema ou entre em contato com a equipe de desenvolvimento.

