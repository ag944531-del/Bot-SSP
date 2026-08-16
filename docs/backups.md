# Manual de Estratégia de Backup e Restauração

Este documento define as diretrizes institucionais, rotinas e procedimentos técnicos para execução e restauração de cópias de segurança (backups) do Banco de Dados do Bot SSP.

---

## 1. Princípios de Segurança do Backup
1. **Higienização de Dados:** Nunca exportar tokens de autenticação do Discord, segredos de ambiente ou senhas de banco de dados nos arquivos de backup.
2. **Integridade Garantida:** Cada backup gerado calcula e armazena o hash criptográfico **SHA-256** do arquivo correspondente.
3. **Isolamento de Servidores (Multi-Guild):** Backups podem ser gerados em escopo local por servidor (`guildId`) ou global.

---

## 2. Rotina de Retenção
- **Frequência Programada:** Cópias diárias automáticas e cópias semanais de consolidação.
- **Política de Retenção:** 30 dias de histórico padrão (configurável via `/configurar`).
- **Expurgo Automático:** Arquivos físicos e registros de log que ultrapassarem o prazo de retenção são deletados automaticamente para preservar o armazenamento do servidor.

---

## 3. Painel Administrativo de Backups
Acesse pelo Discord utilizando o comando:
```text
/backup
```
Opções disponíveis via botões:
- **Fazer Backup Agora:** Executa um dump estruturado instantâneo dos dados da guilda.
- **Consultar Histórico:** Lista os últimos backups gerados com data, tamanho e status.
- **Testar Integridade:** Valida a integridade física e o hash SHA-256 da cópia selecionada.
- **Configurar Retenção:** Exibe as diretrizes de retenção de dados da corporação.

---

## 4. Procedimento de Restauração de Dados

Caso seja necessário restaurar os dados após uma falha ou incidente:

### Passo 1: Localizar o Arquivo de Backup
Os backups gerados pelo sistema ficam armazenados no diretório:
```text
backups/backup_[guildId]_[timestamp].json
```

### Passo 2: Validar o Hash de Integridade
Verifique se o arquivo não sofreu corrupção:
```bash
node -e "const fs=require('fs'); const crypto=require('crypto'); console.log(crypto.createHash('sha256').update(fs.readFileSync('backups/ARQUIVO.json')).digest('hex'));"
```
Compare a saída com o hash registrado na tabela `backup_logs`.

### Passo 3: Restauração Via Script
Para importar os dados novamente para o PostgreSQL com segurança, utilize o script de seed/restore:
```bash
npm run prisma:generate
# Importação programática via Prisma Client
```
