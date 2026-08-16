import { Guild, GuildSettings } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class GuildConfigService {
  /**
   * Obtém ou inicializa a configuração de um servidor
   */
  public static async getOrCreateSettings(guildId: string, guildName: string): Promise<GuildSettings> {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: { name: guildName },
      create: { id: guildId, name: guildName }
    });

    let settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });

    if (!settings) {
      settings = await prisma.guildSettings.create({
        data: { guildId }
      });
    }

    return settings;
  }

  /**
   * Atualiza configurações de cargos ou canais do servidor
   */
  public static async updateSettings(
    guildId: string,
    data: Partial<Omit<GuildSettings, 'id' | 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<GuildSettings> {
    return prisma.guildSettings.upsert({
      where: { guildId },
      update: data,
      create: {
        guildId,
        ...data
      }
    });
  }
}
