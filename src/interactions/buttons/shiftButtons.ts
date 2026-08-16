import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { ShiftService } from '../../services/ShiftService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { ShiftStatus } from '@prisma/client';

export const shiftButtons: ButtonInteractionHandler[] = [
  {
    customId: 'shift:confirm',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const shiftId = parts[2];

      if (!shiftId) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        await ShiftService.updateMemberStatus({
          shiftId,
          userId: interaction.user.id,
          status: ShiftStatus.CONFIRMADO
        });

        const embed = EmbedPresets.success(
          'PRESENÇA CONFIRMADA',
          'Sua confirmação de presença na escala de serviço foi registrada com sucesso.'
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('ERRO AO CONFIRMAR', error.message || 'Falha ao confirmar presença.')]
        });
      }
    }
  },
  {
    customId: 'shift:justify',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const shiftId = parts[2];

      if (!shiftId) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        await ShiftService.updateMemberStatus({
          shiftId,
          userId: interaction.user.id,
          status: ShiftStatus.JUSTIFICADO,
          justification: 'Ausência informada pelo policial via painel interativo.'
        });

        const embed = EmbedPresets.attention(
          'AUSÊNCIA JUSTIFICADA',
          'Sua ausência na escala foi registrada sob justificativa. Comunique seu comandante de equipe.'
        );

        return interaction.editReply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('ERRO AO JUSTIFICAR', error.message || 'Falha ao justificar ausência.')]
        });
      }
    }
  }
];

export default shiftButtons;
