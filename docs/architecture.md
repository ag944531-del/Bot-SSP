# Arquitetura Global do Sistema (Bot SSP)

Este documento apresenta a arquitetura corporativa em camadas do **Bot Institucional de Segurança Pública para Discord**, projetada para escalabilidade, governança e integração futura com Dashboard Web.

---

## 1. Visão Arquitetural em Camadas

```text
┌────────────────────────────────────────────────────────┐
│               CAMADA DE APRESENTAÇÃO                  │
│   • Discord Gateway (Slash Commands, Botões, Modais)  │
│   • Futuro: Dashboard Web / API RESTful               │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              MIDDLEWARES & SALVAGUARDAS                │
│   • PermissionService (RBAC + Hierarquia)             │
│   • BlacklistService (Bloqueios Preventivos)          │
│   • AntiAbuseService (Rate Limits & Ações em Massa)   │
│   • ConcurrencyLock (Mutex para Ações Críticas)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              CAMADA DE SERVIÇOS & NEGÓCIO              │
│   • RHService             • CorregedoriaService       │
│   • OperationalService    • CopomService              │
│   • AcademyService        • ApprovalService           │
│   • DocumentService       • SignatureService          │
│   • ShiftService          • AuditService              │
│   • BackupService         • SearchService             │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             INFRAESTRUTURA, CACHE & FILAS              │
│   • CacheService (Memory / Redis Cache-Aside)         │
│   • JobQueueService (Background Processing)           │
│   • PostgreSQL (Prisma ORM com Transações ACID)       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Princípios de Isolamento e Multi-Guild
- **Escopo Estrito por Servidor:** Todas as consultas, configurações, históricos e auditorias filtram rigorosamente por `guildId`.
- **Separação entre Regra de Negócio e Discord:** Os serviços operam de forma desacoplada da biblioteca do Discord, permitindo que a mesma lógica de negócio seja consumida pela futura API REST e pelo Dashboard Web.

---

## 3. Integridade e Idempotência
- **Idempotência:** Geração atômica de protocolos via `ProtocolService` e locks exclusivos via `ConcurrencyLockManager`.
- **Transações ACID:** Alterações simultâneas de banco e histórico funcional são executadas dentro de `prisma.$transaction`.
- **Soft Delete:** Modelos críticos possuem `deletedAt`, `deletedBy` e `archiveReason` para prevenir perda definitiva de dados institucionais.
