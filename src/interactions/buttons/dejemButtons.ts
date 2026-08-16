import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { DejemService } from '../../services/DejemService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const dejemJoinButton: ButtonInteractionHandler = {
  customId: 'dejem_join',
  async execute(interaction: ButtonInteraction) {
    const dejemId = interaction.customId.split(':')[1];
    if (!dejemId) return;

    try {
      await DejemService.joinDejem(dejemId, interaction.user.id);
      const updatedEmbed = await DejemService.buildDejemEmbed(dejemId);

      await interaction.reply({
        content: '✅ **Inscrição na escala DEJEM realizada com sucesso!**',
        ephemeral: true
      });

      if (interaction.message) {
        await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => null);
      }
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const dejemLeaveButton: ButtonInteractionHandler = {
  customId: 'dejem_leave',
  async execute(interaction: ButtonInteraction) {
    const dejemId = interaction.customId.split(':')[1];
    if (!dejemId) return;

    try {
      await DejemService.leaveDejem(dejemId, interaction.user.id);
      const updatedEmbed = await DejemService.buildDejemEmbed(dejemId);

      await interaction.reply({
        content: '⚠️ **Sua inscrição na escala DEJEM foi cancelada.**',
        ephemeral: true
      });

      if (interaction.message) {
        await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => null);
      }
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const dejemRefreshButton: ButtonInteractionHandler = {
  customId: 'dejem_refresh',
  async execute(interaction: ButtonInteraction) {
    const dejemId = interaction.customId.split(':')[1];
    if (!dejemId) return;

    try {
      const updatedEmbed = await DejemService.buildDejemEmbed(dejemId);
      await interaction.update({ embeds: [updatedEmbed] });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [dejemJoinButton, dejemLeaveButton, dejemRefreshButton];
export default handlers;
