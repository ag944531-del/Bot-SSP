import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { BackupService } from '../../services/BackupService.js';
import { BlacklistService } from '../../services/BlacklistService.js';
import { TemporaryPermissionService } from '../../services/TemporaryPermissionService.js';
import { prisma } from '../../database/prisma.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const securityButtons: ButtonInteractionHandler[] = [
  {
    customId: 'backup:now',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        const result = await BackupService.createBackup({
          guildId,
          executorId: interaction.user.id,
          backupType: 'MANUAL'
        });

        const embed = EmbedPresets.success(
          'BACKUP GERADO COM SUCESSO',
          `Uma cópia completa dos dados institucionais foi gerada e salva com segurança.`
        );

        embed.addFields(
          { name: 'Arquivo', value: `\`${result.fileName}\``, inline: true },
          { name: 'Tamanho', value: `${(result.sizeBytes / 1024).toFixed(1)} KB`, inline: true },
          { name: 'Hash Integridade (SHA-256)', value: `\`${result.hashIntegrity.substring(0, 24)}...\``, inline: false }
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('FALHA NO BACKUP', error.message || 'Erro ao gerar cópia de segurança.')]
        });
      }
    }
  },
  {
    customId: 'backup:history',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const history = await BackupService.getBackupHistory(guildId, 5);

      if (history.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('HISTÓRICO VAZIO', 'Nenhum registro de backup recente localizado.')]
        });
      }

      const embed = EmbedPresets.primary(
        'HISTÓRICO RECENTE DE BACKUPS',
        'Últimas cópias de segurança geradas no sistema:'
      );

      for (const b of history) {
        const size = (b.fileSizeBytes / 1024).toFixed(1);
        embed.addFields({
          name: `💾 ${b.fileName} (${b.status})`,
          value: `**Data:** ${b.createdAt.toLocaleString('pt-BR')} • **Tamanho:** ${size} KB • **Tipo:** ${b.backupType}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'backup:integrity',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const logId = parts[2];

      if (!logId || logId === 'none') {
        return interaction.reply({ content: 'Nenhum backup disponível para teste.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const test = await BackupService.testIntegrity(logId);

      const embed = test.valid
        ? EmbedPresets.success('INTEGRIDADE VERIFICADA', test.message)
        : EmbedPresets.denied('FALHA DE INTEGRIDADE', test.message);

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'backup:retention',
    async execute(interaction: ButtonInteraction) {
      return interaction.reply({
        embeds: [
          EmbedPresets.primary(
            'POLÍTICA DE RETENÇÃO DE BACKUPS',
            '• **Retenção padrão:** 30 dias com expurgo automático de arquivos legados.\n' +
            '• **Frequência:** Diária e Semanal conforme agendamento.\n' +
            '• **Armazenamento:** Local criptografado com isolamento de credenciais.'
          )
        ],
        ephemeral: true
      });
    }
  },
  {
    customId: 'sec:blacklist',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const list = await BlacklistService.listBlacklist(guildId, true);

      if (list.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.success('LISTA LIMPA', 'Nenhum usuário consta na blacklist da corporação.')]
        });
      }

      const embed = EmbedPresets.denied(
        'USUÁRIOS NA BLACKLIST INSTITUCIONAL',
        'Quadro de membros sob impedimento funcional ou disciplinar:'
      );

      for (const item of list.slice(0, 10)) {
        embed.addFields({
          name: `🚫 <@${item.userId}> (${item.status})`,
          value: `**Motivo:** ${item.reason}\n**Inserido por:** <@${item.addedById}> em ${item.createdAt.toLocaleDateString('pt-BR')}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'sec:temp_perms',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const perms = await TemporaryPermissionService.listActivePermissions(guildId);

      if (perms.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.primary('SEM CONCESSÕES ATIVAS', 'Nenhuma permissão temporária concedida no momento.')]
        });
      }

      const embed = EmbedPresets.primary(
        'PERMISSÕES TEMPORÁRIAS ATIVAS',
        'Relação de permissões vigentes com prazo determinado:'
      );

      for (const p of perms) {
        embed.addFields({
          name: `⏳ <@${p.userId}> ➔ \`${p.permission}\``,
          value: `**Expiração:** ${p.expiresAt.toLocaleString('pt-BR')}\n**Concedido por:** <@${p.grantedById}> | **Motivo:** ${p.reason}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'sec:incidents',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const incidents = await prisma.securityIncident.findMany({
        where: { guildId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (incidents.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.success('SEM INCIDENTES', 'Nenhum incidente de segurança registrado no sistema.')]
        });
      }

      const embed = EmbedPresets.attention(
        'HISTÓRICO DE INCIDENTES DE SEGURANÇA',
        'Registro de eventos anômalos e violações de salvaguarda:'
      );

      for (const inc of incidents) {
        embed.addFields({
          name: `🚨 [${inc.protocol}] [${inc.severity}] ${inc.type}`,
          value: `**Status:** \`${inc.status}\` | **Ator:** <@${inc.actorId}>\n${inc.description}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'sec:backup',
    async execute(interaction: ButtonInteraction) {
      return interaction.reply({
        content: 'Utilize o comando `/backup` para gerenciar as cópias de segurança do banco de dados.',
        ephemeral: true
      });
    }
  }
];

export default securityButtons;
