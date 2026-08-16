# Manual de Instalação e Integração Nativa FiveM ↔ Bot SSP

Este documento orienta a instalação do resource `security_bridge` no seu servidor FiveM e a configuração do mapeamento de patentes e grupos.

---

## 1. Estrutura do Resource FiveM (`security_bridge`)

A pasta `resources/security_bridge` contém o resource server-side completo.

### Passo 1: Copiar a Pasta do Resource
Copie a pasta `resources/security_bridge` para a pasta de resources do seu servidor FiveM:
```text
seu_servidor_fivem/resources/[scripts]/security_bridge/
```

### Passo 2: Configurar o `config.lua`
Abra `security_bridge/config.lua` e configure sua chave secreta e o framework:
```lua
Config.ApiKey = "CHAVE_SECRETA_INSTITUCIONAL_SSP_FIVEM_2026"
Config.Framework = "vrp" -- ou "creative", "qbcore", "esx"
```

### Passo 3: Iniciar no `server.cfg`
Adicione no seu `server.cfg`:
```cfg
ensure security_bridge
```

---

## 2. Variáveis de Ambiente no Bot (`.env` ou Render)

Adicione as variáveis correspondentes no `.env` do bot:
```env
FIVEM_FRAMEWORK=vrp
FIVEM_BRIDGE_URL=http://ip_do_seu_servidor_fivem:30120/security_bridge
FIVEM_API_KEY=CHAVE_SECRETA_INSTITUCIONAL_SSP_FIVEM_2026
```

---

## 3. Comandos de Gerenciamento no Discord

| Comando | Descrição |
| :--- | :--- |
| `/fivem status` | Verifica latência, players online e status da ponte. |
| `/fivem verificar passaporte:152` | Consulta dados do personagem no FiveM e vínculo institucional. |
| `/fivem vincular membro:@Policial passaporte:152` | Cria o vínculo entre o Discord e o passaporte da cidade. |
| `/fivem desvincular passaporte:152` | Remove o vínculo. |
| `/fivem sincronizar` | Executa a varredura de reconciliação para encontrar divergências. |
| `/fivem divergencias` | Exibe as inconsistências detectadas entre Discord e FiveM. |

---

## 4. Fluxo de Operações de RH Sincronizadas

1. **`/cadastrar`**: Valida a existência do passaporte no FiveM, cria o perfil policial e adiciona o grupo `Policia` + patente no FiveM.
2. **`/promover`**: Troca o grupo de patente antiga para a nova patente no FiveM em tempo real (mesmo com o player conectado).
3. **`/exonerar`**: Remove todos os grupos policiais no FiveM, desliga pontos ativos e remove cargos no Discord.
