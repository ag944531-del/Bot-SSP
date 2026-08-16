import { Client, TextChannel } from 'discord.js';
import { Bulletin } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export class BulletinService {
  /**
   * Publica um novo Boletim Geral (BG) ou Boletim Interno (BI) com numeração sequencial anual
   */
  public static async publishBulletin(data: {
    guildId: string;
    title: string;
    content: string;
    authorId: string;
    isInternal?: boolean;
    client?: Client;
  }): Promise<Bulletin> {
    const year = new Date().getFullYear();
    const countThisYear = await prisma.bulletin.count({
      where: {
        guildId: data.guildId,
        isInternal: data.isInternal || false,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`)
        }
      }
    });

    const prefix = data.isInternal ? 'BI' : 'BG';
    const numberStr = `${prefix} Nº ${(countThisYear + 1).toString().padStart(3, '0')}/${year}`;

    const bulletin = await prisma.bulletin.create({
      data: {
        guildId: data.guildId,
        number: numberStr,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        isInternal: data.isInternal || false
      }
    });

    // Publicar no canal correspondente
    if (data.client) {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: data.guildId }
      });

      const channelId = data.isInternal ? settings?.internalBulletinChannelId : settings?.bulletinChannelId;

      if (channelId) {
        const channel = data.client.channels.cache.get(channelId) as TextChannel | undefined;
        if (channel?.isTextBased()) {
          const embed = InstitutionalEmbedBuilder.create({
            title: `${data.isInternal ? 'Boletim Interno Reservado' : 'Boletim Geral'} • ${numberStr}`,
            status: 'Publicação Oficial',
            responsible: `<@${data.authorId}>`,
            color: data.isInternal ? COLORS.DANGER : COLORS.PRIMARY,
            description:
              `**ASSUNTO:** \`${data.title.toUpperCase()}\`\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `${data.content}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `*Determina-se o devido cumprimento e registro em assentamentos funcionais.*`
          });

          await channel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }

    return bulletin;
  }

  /**
   * Lista os últimos boletins publicados
   */
  public static async listBulletins(guildId: string, isInternal: boolean = false) {
    return prisma.bulletin.findMany({
      where: { guildId, isInternal },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }
}
