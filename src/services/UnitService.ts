import { Unit } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class UnitService {
  /**
   * Cria uma nova unidade / batalhão / divisão
   */
  public static async createUnit(data: {
    guildId: string;
    name: string;
    abbreviation: string;
    discordRoleId?: string;
  }): Promise<Unit> {
    return prisma.unit.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        abbreviation: data.abbreviation.toUpperCase(),
        discordRoleId: data.discordRoleId
      }
    });
  }

  /**
   * Lista todas as unidades do servidor
   */
  public static async listUnits(guildId: string): Promise<Unit[]> {
    return prisma.unit.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { profiles: true, vehicles: true } }
      }
    });
  }

  /**
   * Busca unidade por ID ou Sigla
   */
  public static async findUnit(guildId: string, query: string): Promise<Unit | null> {
    return prisma.unit.findFirst({
      where: {
        guildId,
        OR: [
          { id: query },
          { abbreviation: { equals: query, mode: 'insensitive' } },
          { name: { equals: query, mode: 'insensitive' } }
        ]
      }
    });
  }

  /**
   * Deleta uma unidade
   */
  public static async deleteUnit(guildId: string, unitId: string): Promise<boolean> {
    const unit = await prisma.unit.findFirst({
      where: { guildId, id: unitId }
    });

    if (!unit) return false;

    await prisma.unit.delete({ where: { id: unitId } });
    return true;
  }
}
