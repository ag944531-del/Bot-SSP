import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { SyncService } from '../../services/SyncService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const fivemButtons: ButtonInteractionHandler[] = [
  {
    customId: 'fivem:reconcile',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });
      const result = await SyncService.reconcileGuild(guildId);

      const embed = EmbedPresets.primary(
        'RECONCILIAÇÃO DISCORD ↔ FIVEM',
        `Varredura concluída:\n• **Verificados:** ${result.totalChecked}\n• **Sincronizados:** 🟢 ${result.syncedCount}\n• **Divergências:** 🟡 ${result.divergentCount}`
      );

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'fivem:divergences',
    async execute(interaction: ButtonInteraction) {
      const guildId = interaction.guildId;
      if (!guildId) return;

      await interaction.deferReply({ ephemeral: true });
      const result = await SyncService.reconcileGuild(guildId);

      if (result.divergences.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.success('TUDO SINCRONIZADO', 'Nenhuma divergência identificada entre o Discord e a cidade.')]
        });
      }

      const embed = EmbedPresets.attention(
        'DIVERGÊNCIAS REGISTRADAS',
        'Inconsistências identificadas durante a última checagem:'
      );

      for (const d of result.divergences.slice(0, 10)) {
        embed.addFields({
          name: `⚠️ Passaporte #${d.passport} (${d.officerName})`,
          value: `**Problema:** ${d.issue}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
];

export default fivemButtons;
