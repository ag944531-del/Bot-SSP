import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  TextChannel,
  User
} from 'discord.js';
import { Suggestion, SuggestionStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class SuggestionService {
  /**
   * Envia uma nova sugestão para o canal de votação
   */
  public static async submitSuggestion(guildId: string, author: User, content: string, client: Client) {
    const protocol = await ProtocolGenerator.generate('SUG', guildId);

    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    if (!settings?.suggestionsChannelId) {
      throw new Error('Canal de sugestões não foi configurado. Configure com `/configurar`.');
    }

    const channel = client.channels.cache.get(settings.suggestionsChannelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased()) {
      throw new Error('Canal de sugestões inválido ou inacessível.');
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        guildId,
        protocol,
        authorId: author.id,
        content,
        status: SuggestionStatus.PENDENTE,
        upvotes: 0,
        downvotes: 0
      }
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: `Sugestão Institucional • ${protocol}`,
      protocol,
      status: 'Votação Aberta',
      responsible: `<@${author.id}>`,
      color: COLORS.INFO,
      description:
        `**PROPOSTA DE MELHORIA / SUGESTÃO:**\n\n` +
        `"${content}"\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 **PLACAR DA VOTAÇÃO:**\n` +
        `👍 **A Favor:** \`0 votos\` (0%)\n` +
        `👎 **Contra:** \`0 votos\` (0%)\n\n` +
        `*Utilize os botões abaixo para manifestar seu voto.*`
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggestion_vote_up:${suggestion.id}`)
        .setLabel('A Favor (0)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('👍'),
      new ButtonBuilder()
        .setCustomId(`suggestion_vote_down:${suggestion.id}`)
        .setLabel('Contra (0)')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('👎')
    );

    const message = await channel.send({ embeds: [embed], components: [row] });

    await prisma.suggestion.update({
      where: { id: suggestion.id },
      data: { messageId: message.id }
    });

    return suggestion;
  }

  /**
   * Processa o voto de um usuário em uma sugestão
   */
  public static async vote(suggestionId: string, userId: string, isUpvote: boolean, client: Client) {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: { votes: true }
    });

    if (!suggestion || suggestion.status !== SuggestionStatus.PENDENTE) {
      throw new Error('Esta sugestão não está mais aberta para votação.');
    }

    const existingVote = suggestion.votes.find((v: any) => v.userId === userId);

    if (existingVote) {
      if (existingVote.isUpvote === isUpvote) {
        throw new Error('Você já registrou este voto nesta sugestão.');
      }

      await prisma.suggestionVote.update({
        where: { id: existingVote.id },
        data: { isUpvote }
      });
    } else {
      await prisma.suggestionVote.create({
        data: {
          suggestionId,
          userId,
          isUpvote
        }
      });
    }

    const allVotes = await prisma.suggestionVote.findMany({ where: { suggestionId } });
    const upvotes = allVotes.filter((v: any) => v.isUpvote).length;
    const downvotes = allVotes.filter((v: any) => !v.isUpvote).length;

    const updated = await prisma.suggestion.update({
      where: { id: suggestionId },
      data: { upvotes, downvotes }
    });

    // Atualizar a mensagem no Discord se messageId existir
    if (suggestion.messageId) {
      const settings = await prisma.guildSettings.findUnique({ where: { guildId: suggestion.guildId } });
      if (settings?.suggestionsChannelId) {
        const channel = client.channels.cache.get(settings.suggestionsChannelId) as TextChannel | undefined;
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(suggestion.messageId).catch(() => null);
          if (message) {
            const total = upvotes + downvotes;
            const upPct = total > 0 ? ((upvotes / total) * 100).toFixed(0) : '0';
            const downPct = total > 0 ? ((downvotes / total) * 100).toFixed(0) : '0';

            const embed = InstitutionalEmbedBuilder.create({
              title: `Sugestão Institucional • ${suggestion.protocol}`,
              protocol: suggestion.protocol,
              status: 'Votação Aberta',
              responsible: `<@${suggestion.authorId}>`,
              color: COLORS.INFO,
              description:
                `**PROPOSTA DE MELHORIA / SUGESTÃO:**\n\n` +
                `"${suggestion.content}"\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 **PLACAR DA VOTAÇÃO (${total} votos):**\n` +
                `👍 **A Favor:** \`${upvotes} votos\` (${upPct}%)\n` +
                `👎 **Contra:** \`${downvotes} votos\` (${downPct}%)\n\n` +
                `*Utilize os botões abaixo para manifestar seu voto.*`
            });

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`suggestion_vote_up:${suggestion.id}`)
                .setLabel(`A Favor (${upvotes})`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('👍'),
              new ButtonBuilder()
                .setCustomId(`suggestion_vote_down:${suggestion.id}`)
                .setLabel(`Contra (${downvotes})`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('👎')
            );

            await message.edit({ embeds: [embed], components: [row] }).catch(() => null);
          }
        }
      }
    }

    return updated;
  }
}
