# Guia de Implantação e Deploy (Deployment Guide)

Este documento orienta a configuração e execução da plataforma em ambientes de Desenvolvimento, Staging e Produção.

---

## 1. Requisitos de Sistema
- **Node.js:** Versão 20.x ou superior (LTS)
- **PostgreSQL:** Versão 15 ou 16
- **Docker & Docker Compose** (opcional, para deploy containerizado)
- **Redis** (opcional, para cache de alta performance)

---

## 2. Configuração de Variáveis de Ambiente (`.env`)

Crie o arquivo `.env` a partir do modelo:
```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui
GUILD_ID=seu_guild_id_aqui
DATABASE_URL="postgresql://usuario:senha@localhost:5432/ssp_database?schema=public"
NODE_ENV=production
```

---

## 3. Deploy com Docker Compose (Recomendado)

1. Clone o repositório e configure o `.env`.
2. Execute a subida dos containers:
```bash
docker-compose up -d --build
```
3. Acompanhe os logs:
```bash
docker-compose logs -f bot-ssp
```

---

## 4. Deploy Manual (Bare Metal / VPS)

```bash
# 1. Instalar dependências
npm ci

# 2. Gerar cliente do Prisma e executar migrations
npx prisma generate
npx prisma migrate deploy

# 3. Compilar TypeScript
npm run build

# 4. Registrar comandos Slash na API do Discord
npm run deploy:commands

# 5. Iniciar processo (utilize PM2 para resiliência)
pm2 start dist/index.js --name "bot-ssp"
```
