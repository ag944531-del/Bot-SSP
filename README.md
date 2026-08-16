# 🏛️ ERP Institucional de Segurança Pública — Plataforma para Discord (v1.4.2)

Plataforma profissional e institucional de gestão policial, governança, recursos humanos, corregedoria, COPOM, academia militar, inteligência, auditoria avançada, segurança da informação e escalabilidade para Discord, construída com arquitetura modular desacoplada em **Node.js, TypeScript estrito, discord.js v14, PostgreSQL e Prisma ORM**.

---

## 📁 Estrutura do Projeto

```text
Bot SSP/
├── docs/                      # Documentação Técnica e Manuais de Contingência
│   ├── architecture.md        # Arquitetura em camadas e princípios multi-guild
│   ├── backups.md             # Rotinas de backup, retenção e guia de restauração
│   ├── disaster-recovery.md   # Procedimentos operacionais de recuperação de desastres
│   ├── deployment.md          # Guia de implantação em produção e VPS
│   └── security.md            # Arquitetura de segurança, auditoria e antiabuso
├── prisma/
│   └── schema.prisma          # Modelagem relacional completa (Fases 1 a 10)
├── src/
│   ├── @types/                # Tipagens TypeScript customizadas
│   ├── config/                # Variáveis de ambiente e constantes institucionais
│   ├── database/              # Instância singleton do Prisma Client
│   ├── events/                # Event listeners (ready, interactionCreate, guildCreate)
│   ├── handlers/              # Carregadores recursivos de comandos, botões e modais
│   ├── commands/              # Slash Commands modulares por setor
│   │   ├── admin/             # /comando, /consultar, /escala, /documento, /backup, /seguranca, /blacklist, /emergencia, /manutencao, /alertas, /exportar, /metas, /configurar, /patente, /unidade
│   │   ├── rh/                # /cadastrar, /promover, /rebaixar, /transferir, /afastar, /reintegrar, /exonerar, /historico, /rh, /medalha
│   │   ├── corregedoria/      # /corregedoria, /ipm, /pdo, /convocar, /sancao
│   │   ├── academy/           # /academia, /curso, /certificado, /instrutor
│   │   ├── operational/       # /tablet, /ponto, /copom, /viatura, /prisao, /multa, /apreensao, /ocorrencia, /operacao, /dejem, /ausencia
│   │   └── public/            # /status, /validar, /ping, /comunicado, /sugestao
│   ├── interactions/          # Handlers para botões, selects e modais
│   │   ├── buttons/           # approvalButtons, shiftButtons, searchButtons, securityButtons, tabletButtons
│   │   ├── selects/           # Menus de seleção dinâmica
│   │   └── modals/            # Formulários modais de entrada de dados
│   ├── permissions/           # RBAC institucional, hierarquia, blacklist e permissões temporárias
│   ├── services/              # Camada de serviços de negócio desacoplada (pronta para Web)
│   │   ├── AuditService.ts            • ProtocolService.ts
│   │   ├── ApprovalService.ts         • SearchService.ts
│   │   ├── DocumentService.ts         • SignatureService.ts
│   │   ├── ShiftService.ts            • TimelineService.ts
│   │   ├── BackupService.ts           • BlacklistService.ts
│   │   ├── AntiAbuseService.ts        • EmergencyModeService.ts
│   │   ├── HealthService.ts           • CacheService.ts
│   │   ├── JobQueueService.ts         • ExportService.ts
│   │   └── ExecutiveDashboardService.ts
│   └── utils/                 # EmbedBuilder, ConcurrencyLock, Logger
├── tests/                     # Suíte de Testes Automatizados Unitários
│   └── unit/                  # protocols.test.ts, cache.test.ts, jobQueue.test.ts
├── .github/workflows/         # Pipeline de Integração Contínua (CI/CD)
│   └── ci.yml
├── Dockerfile                 # Multi-stage build otimizado
├── docker-compose.yml         # Orquestração do Bot, PostgreSQL e Redis
├── package.json
└── tsconfig.json
```

---

## 🚀 Guia Rápido de Instalação e Execução

### Opção 1: Via Docker Compose (Recomendado)
```bash
# 1. Configurar variáveis de ambiente no .env
cp .env.example .env

# 2. Subir todos os serviços (Bot + PostgreSQL + Redis)
docker-compose up -d --build
```

### Opção 2: Instalação Manual
```bash
# 1. Instalar dependências
npm ci

# 2. Gerar Prisma Client e aplicar migrações
npx prisma generate
npx prisma migrate dev

# 3. Executar a suíte de testes
npm test

# 4. Registrar comandos Slash na API do Discord
npm run deploy:commands

# 5. Iniciar em modo de desenvolvimento ou produção
npm run dev
# ou para produção:
npm run build && npm start
```

---

## 🛡️ Segurança & Auditoria
- **Rastreabilidade Total:** Registro imutável de todas as ações administrativas na tabela `audit_logs` com protocolo e valores anterior/novo.
- **Proteção Antiabuso:** Bloqueio automático de disparos sucessivos ou alterações em massa em janelas curtas de tempo.
- **Salvaguardas de Emergência:** Comandos `/emergencia` e `/manutencao` para isolamento de sistemas em crises.
- **Conflito de Interesse:** Bloqueio automático de auto-promoções, condecorações próprias e julgamento de processos em que o usuário seja parte envolvida.
- **Assinaturas Digitais:** Emissão e validação de autenticidade criptográfica de documentos oficiais com código `SIG-2026-XXXXXX` via `/validar`.
