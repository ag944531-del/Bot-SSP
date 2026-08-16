import { Client, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class CommunicationService {
  /**
   * Publica uma nota oficial da Comunicação Social no canal dedicado
   */
  public static async publishNote(data: {
    guildId: string;
    type: string;
    title: string;
    content: string;
    authorId: string;
    imageUrl?: string;
    client: Client;
  }) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: data.guildId }
    });

    const channelId = settings?.communicationChannelId;
    if (!channelId) {
      throw new Error('Canal de Comunicação Social não está configurado. Configure com `/configurar`.');
    }

    const channel = data.client.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel || !channel.isTextBased()) {
      throw new Error('Canal de Comunicação Social inacessível ou inválido.');
    }

    let color: number = COLORS.PRIMARY;
    if (data.type === 'Nota de Pesar') color = COLORS.DARK;
    else if (data.type === 'Recrutamento') color = COLORS.SUCCESS;
    else if (data.type === 'Nota de Esclarecimento') color = COLORS.WARNING;

    const embed = InstitutionalEmbedBuilder.create({
      title: `${data.type.toUpperCase()} • ${data.title}`,
      status: 'Assessoria de Comunicação Social',
      responsible: `<@${data.authorId}>`,
      color,
      description:
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${data.content}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `*Divulgação autorizada pela Chefia de Comunicação Social e Relações Públicas.*`
    });

    if (data.imageUrl) {
      embed.setImage(data.imageUrl);
    }

    const message = await channel.send({ embeds: [embed] });
    return message;
  }
}
