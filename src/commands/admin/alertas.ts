import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { AlertService } from '../../services/AlertService.js';
import { DeadlineService } from '../../services/DeadlineService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { AlertCategory } from '@prisma/client';
import { Permissions } from '../../permissions/permissions.js';

export const alertasCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('alertas')
    .setDescription('Central de Alertas Operacionais, Prazos Processuais e Notificações.')
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista os alertas ativos e prazos processuais críticos.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Emite um novo alerta institucional.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('categoria')
            .setDescription('Categoria do alerta')
            .setRequired(true)
            .addChoices(
              { name: 'Administrativo', value: 'ADMINISTRATIVO' },
              { name: 'Operacional', value: 'OPERACIONAL' },
              { name: 'Corregedoria', value: 'CORREGEDORIA' },
              { name: 'Academia', value: 'ACADEMIA' },
              { name: 'Sistema', value: 'SISTEMA' }
            )
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('titulo').setDescription('Título do alerta').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('mensagem').setDescription('Mensagem detalhada').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('responsavel').setDescription('Policial encarregado pela resolução').setRequired(false)
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_ALERTAS, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'listar') {
      await interaction.deferReply({ ephemeral: true });

      const [alerts, deadlines] = await Promise.all([
        AlertService.listAlerts(guildId),
        DeadlineService.getCriticalDeadlines(guildId)
      ]);

      const embed = EmbedPresets.attention(
        'CENTRAL DE ALERTAS & PRAZOS PROCESSUAIS',
        'Monitoramento contínuo de notificações urgentes e prazos em andamento.'
      );

      if (deadlines.length > 0) {
        const deadText = deadlines
          .map(
            (d) =>
              `• **[${d.protocol}] ${d.title}** (${d.entityType})\n  Status: \`${d.status}\` | Restam: **${d.daysRemaining} dias** | Encarregado: <@${d.responsibleId}>`
          )
          .join('\n');
        embed.addFields({ name: '⚖️ PRAZOS PROCESSUAIS EM ATENÇÃO/URGENTES', value: deadText });
      }

      if (alerts.length > 0) {
        const alertText = alerts
          .slice(0, 5)
          .map(
            (a) =>
              `• **[${a.protocol}] [${a.category}] ${a.title}**\n  Status: \`${a.status}\` | <t:${Math.floor(a.createdAt.getTime() / 1000)}:R>`
          )
          .join('\n');
        embed.addFields({ name: '🔔 ALERTAS RECENTES DO SISTEMA', value: alertText });
      } else if (deadlines.length === 0) {
        embed.setDescription('Nenhum alerta ativo ou prazo crítico no momento. Operação em normalidade.');
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'criar') {
      const category = interaction.options.getString('categoria', true) as AlertCategory;
      const title = interaction.options.getString('titulo', true);
      const message = interaction.options.getString('mensagem', true);
      const targetUser = interaction.options.getUser('responsavel');

      const alert = await AlertService.createAlert({
        guildId,
        category,
        title,
        message,
        assignedToId: targetUser?.id,
        client: interaction.client
      });

      const embed = EmbedPresets.success(
        'ALERTA REGISTRADO COM SUCESSO',
        `Alerta emitido sob protocolo \`${alert.protocol}\` para a categoria **${alert.category}**.`
      );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

export default alertasCommand;
