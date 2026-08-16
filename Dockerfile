# ==========================================
# ETAPA 1: BUILD & COMPILAÇÃO
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para compilação nativa
RUN apk add --no-cache openssl python3 make g++

# Copiar arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies)
RUN npm ci

# Gerar Prisma Client
RUN npx prisma generate

# Copiar código-fonte e configurações
COPY tsconfig.json ./
COPY src ./src/

# Compilar TypeScript para JavaScript em dist/
RUN npm run build

# Limpar devDependencies para imagem de produção
RUN npm prune --production

# ==========================================
# ETAPA 2: RUNTIME DE PRODUÇÃO (LEVE & SEGURO)
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar bibliotecas de sistema necessárias para runtime
RUN apk add --no-cache openssl tzdata

# Configurar fuso horário para América/São Paulo
ENV TZ=America/Sao_Paulo

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sspbot -u 1001

# Copiar build e dependências de produção
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Criar diretório de logs e backups com permissões adequadas
RUN mkdir -p /app/logs /app/backups && \
    chown -R sspbot:nodejs /app

USER sspbot

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
