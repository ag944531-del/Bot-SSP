import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { SuggestionService } from '../../services/SuggestionService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const sugestaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('sugestao')
    .setDescription('Envia uma sugestão ou proposta de melhoria para votação da corporação/comunidade.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('conteudo').setDescription('Texto detalhado da sugestão ou proposta').setRequired(true)
    ),
  category: 'public',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const content = interaction.options.getString('conteudo', true);

    try {
      const suggestion = await SuggestionService.submitSuggestion(
        interaction.guildId,
        interaction.user,
        content,
        interaction.client
      );

      const successEmbed = InstitutionalEmbedBuilder.success(
        'Sugestão Enviada para Votação',
        `Sua proposta foi registrada sob o protocolo **${suggestion.protocol}** e encaminhada ao canal de sugestões para deliberação da comunidade.`,
        suggestion.protocol
      );

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export default sugestaoCommand;
