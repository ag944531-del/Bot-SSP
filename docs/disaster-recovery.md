# Plano de Recuperação de Desastre (Disaster Recovery)

Este plano estabelece os procedimentos operacionais de contingência para restaurar a operacionalidade do sistema em situações críticas.

---

## 1. Cenários de Desastre e Ações Imediatas

### Cenário 1: Falha ou Corrupção do Banco de Dados PostgreSQL
1. **Contenção:** Ativar o **Modo de Manutenção** (`/manutencao ativar motivo: "Inconsistência de banco de dados"`) ou suspender o processo do bot para evitar gravações corrompidas.
2. **Diagnóstico:** Verificar logs de erro com `system_error_logs` e conexão com `/status`.
3. **Recuperação:**
   - Restaurar a última cópia válida íntegra conforme instruções em [`docs/backups.md`](file:///c:/Users/Jones/Documents/ideia/Bot%20SSP/docs/backups.md).
   - Executar `npx prisma migrate deploy` para sincronizar o schema com a versão da aplicação.

---

### Cenário 2: Comprometimento de Token de Autenticação do Discord
1. **Revogação Imediata:** Acessar o Portal do Desenvolvedor do Discord (`discord.com/developers/applications`) e clicar em **Reset Token**.
2. **Atualização de Variáveis:** Atualizar o valor de `DISCORD_TOKEN` no arquivo `.env` de produção.
3. **Reinicialização:** Reiniciar o processo do bot (`npm start`).
4. **Auditoria:** Consultar `audit_logs` no período correspondente para auditar e reverter possíveis ações não autorizadas.

---

### Cenário 3: Abuso Administrativo ou Ações em Massa Indevidas
1. **Contenção Imediata:** Ativar o **Modo de Emergência** via `/emergencia ativar motivo: "Ataque ou abuso administrativo em apuração"`.
   - Este comando congela instantaneamente todas as alterações de RH, promoções, exonerações e processos de Corregedoria.
2. **Bloqueio do Ator:** Adicionar o membro suspeito à blacklist via `/blacklist adicionar policial: @Membro status: Bloqueado Administrativamente motivo: "Apuração de abuso"`.
3. **Restauração de Hierarquia:** Utilizar o histórico em `promotion_history`, `demotion_history` e `configuration_history` para reverter o estado funcional dos policiais afetados.
4. **Desativação:** Após estabilizado, desativar o modo de emergência via `/emergencia desativar`.

---

### Cenário 4: Rollback de Versão da Aplicação
1. **Reversão de Código:** Realizar checkout da tag Git da versão estável anterior.
2. **Validação de Schema:** Verificar compatibilidade de migrations do Prisma.
3. **Build:** Executar `npm run build` e reiniciar a aplicação.
