import { Rank } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class RankService {
  /**
   * Cria uma nova patente/graduação com nível hierárquico
   */
  public static async createRank(data: {
    guildId: string;
    name: string;
    abbreviation?: string;
    level: number;
    discordRoleId?: string;
    sector?: string;
  }): Promise<Rank> {
    return prisma.rank.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        abbreviation: data.abbreviation,
        level: data.level,
        discordRoleId: data.discordRoleId,
        sector: data.sector
      }
    });
  }

  /**
   * Lista todas as patentes do servidor ordenadas por autoridade decrescente
   */
  public static async listRanks(guildId: string): Promise<Rank[]> {
    return prisma.rank.findMany({
      where: { guildId },
      orderBy: { level: 'desc' },
      include: {
        _count: { select: { profiles: true } }
      }
    });
  }

  /**
   * Busca uma patente por ID ou Nome
   */
  public static async findRank(guildId: string, query: string): Promise<Rank | null> {
    return prisma.rank.findFirst({
      where: {
        guildId,
        OR: [
          { id: query },
          { name: { equals: query, mode: 'insensitive' } },
          { abbreviation: { equals: query, mode: 'insensitive' } }
        ]
      }
    });
  }

  /**
   * Deleta uma patente
   */
  public static async deleteRank(guildId: string, rankId: string): Promise<boolean> {
    const rank = await prisma.rank.findFirst({
      where: { guildId, id: rankId }
    });

    if (!rank) return false;

    await prisma.rank.delete({ where: { id: rankId } });
    return true;
  }
}
