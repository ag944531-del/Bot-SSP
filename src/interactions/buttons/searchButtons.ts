import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { TimelineService } from '../../services/TimelineService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const searchButtons: ButtonInteractionHandler[] = [
  {
    customId: 'search:timeline',
    async execute(interaction: ButtonInteraction) {
      const parts = interaction.customId.split(':');
      const targetUserId = parts[2];
      const guildId = interaction.guildId;

      if (!targetUserId || !guildId) return;

      await interaction.deferReply({ ephemeral: true });

      const timeline = await TimelineService.getTimeline(guildId, targetUserId);

      if (timeline.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('SEM HISTÓRICO', 'Nenhum registro histórico localizado para este policial.')]
        });
      }

      const embed = EmbedPresets.primary(
        'LINHA DO TEMPO FUNCIONAL (HISTÓRICO INTEGRADO)',
        `Eventos e evolução de carreira do policial <@${targetUserId}>:`
      );

      const formattedList = timeline
        .slice(0, 10)
        .map((t) => `• **${t.date.toLocaleDateString('pt-BR')}** — **${t.title}**\n  ${t.description}${t.protocol ? ` (\`${t.protocol}\`)` : ''}`)
        .join('\n\n');

      embed.setDescription(formattedList);
      embed.setFooter({ text: 'Histórico Integrado de Recursos Humanos & Corregedoria' });
      embed.setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
  {
    customId: 'search:view',
    async execute(interaction: ButtonInteraction) {
      return interaction.reply({
        content: 'Detalhes completos do registro consultados via banco institucional.',
        ephemeral: true
      });
    }
  }
];

export default searchButtons;
