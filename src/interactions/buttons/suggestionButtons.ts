import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { SuggestionService } from '../../services/SuggestionService.js';

export const suggestionVoteUpButton: ButtonInteractionHandler = {
  customId: 'suggestion_vote_up',
  async execute(interaction: ButtonInteraction) {
    const suggestionId = interaction.customId.split(':')[1];
    if (!suggestionId) return;

    try {
      await SuggestionService.vote(suggestionId, interaction.user.id, true, interaction.client);
      await interaction.reply({ content: '✅ **Seu voto FAVORÁVEL foi computado com sucesso.**', ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `⚠️ ${err.message}`, ephemeral: true });
    }
  }
};

export const suggestionVoteDownButton: ButtonInteractionHandler = {
  customId: 'suggestion_vote_down',
  async execute(interaction: ButtonInteraction) {
    const suggestionId = interaction.customId.split(':')[1];
    if (!suggestionId) return;

    try {
      await SuggestionService.vote(suggestionId, interaction.user.id, false, interaction.client);
      await interaction.reply({ content: '❌ **Seu voto CONTRÁRIO foi computado com sucesso.**', ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `⚠️ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [suggestionVoteUpButton, suggestionVoteDownButton];
export default handlers;
