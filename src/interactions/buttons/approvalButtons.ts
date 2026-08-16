import { ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { ApprovalService } from '../../services/ApprovalService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { PermissionService } from '../../permissions/permissions.js';

export const approvalButtons: ButtonInteractionHandler[] = [
  {
    customId: 'approval:approve',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const requestId = parts[2];

      if (!requestId) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        const result = await ApprovalService.processAction({
          requestId,
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          actionType: 'APROVAR',
          client: interaction.client
        });

        const embed = EmbedPresets.success(
          'ETAPA DE WORKFLOW HOMOLOGADA',
          `${result.message}\n**Protocolo:** \`${result.request.protocol}\`\n**Status Atual:** \`${result.request.status}\``
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('AÇÃO NÃO PROCESSADA', error.message || 'Falha ao homologar a etapa.')]
        });
      }
    }
  },
  {
    customId: 'approval:reject',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const requestId = parts[2];

      if (!requestId) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        const result = await ApprovalService.processAction({
          requestId,
          actorId: interaction.user.id,
          actorName: interaction.user.username,
          actionType: 'REJEITAR',
          client: interaction.client
        });

        const embed = EmbedPresets.denied(
          'SOLICITAÇÃO REJEITADA',
          `${result.message}\n**Protocolo:** \`${result.request.protocol}\``
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('AÇÃO NÃO PROCESSADA', error.message || 'Falha ao rejeitar solicitação.')]
        });
      }
    }
  },
  {
    customId: 'approval:history',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const requestId = parts[2];

      if (!requestId || !interaction.guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const request = await ApprovalService.getRequest(requestId, interaction.guildId);

      if (!request) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('NÃO LOCALIZADO', 'Solicitação de workflow não encontrada.')]
        });
      }

      const embed = EmbedPresets.primary(
        `HISTÓRICO DO WORKFLOW [${request.protocol}]`,
        `**Tipo:** ${request.actionType}\n**Status:** \`${request.status}\`\n**Etapa:** ${request.currentStepOrder} de ${request.totalSteps}`
      );

      embed.addFields(
        { name: 'Solicitante', value: `<@${request.requesterId}>`, inline: true },
        { name: 'Alvo', value: `<@${request.targetId}>`, inline: true },
        { name: 'Motivo', value: request.reason, inline: false }
      );

      if (request.actions.length > 0) {
        const acts = request.actions
          .map(
            (a) =>
              `• **Etapa ${a.stepOrder} [${a.actionType}]** por <@${a.actorId}> em ${a.createdAt.toLocaleDateString('pt-BR')}${a.comment ? `\n  *Obs: ${a.comment}*` : ''}`
          )
          .join('\n');
        embed.addFields({ name: 'Ações Registradas', value: acts });
      } else {
        embed.addFields({ name: 'Ações Registradas', value: 'Nenhuma ação registrada até o momento.' });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
];

export default approvalButtons;
