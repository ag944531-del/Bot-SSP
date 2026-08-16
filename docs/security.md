# Arquitetura e Políticas de Segurança Institucional

Este documento detalha os mecanismos de segurança cibernética, governança e salvaguardas implementadas no Bot SSP.

---

## 1. Pilares de Segurança
1. **Rastreabilidade Imutável (Auditoria):** Toda e qualquer ação de modificação no sistema é registrada com executor, cargo, módulo, valor anterior, novo valor, protocolo, canal e horário.
2. **Defesa em Profundidade:**
   - Validação de permissões no frontend (Discord UI - botões habilitados/desabilitados).
   - Validação rigorosa no backend (`PermissionService.hasPermission`).
   - Validação hierárquica (`PermissionService.canActOnTarget`).
   - Proteção contra Conflito de Interesse (proibição de julgar próprios processos ou conceder próprias promoções).
3. **Blacklist Institucional Transversal:** Bloqueio preventivo automático para usuários suspensos ou exonerados em rotinas como bater ponto, assumir viaturas, iniciar patrulhas ou ingressar em cursos.
4. **Proteção Antiabuso:** Detecção em tempo real de disparos sucessivos ou alterações em massa em janelas curtas de tempo.
5. **Modos de Contingência:** `/emergencia` e `/manutencao` para isolamento imediato de subsistemas em situações de crise.
