import { PoliceProfile, PoliceStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class PoliceProfileService {
  /**
   * Busca ou retorna o perfil do policial no servidor
   */
  public static async getProfile(guildId: string, userId: string) {
    return prisma.policeProfile.findUnique({
      where: {
        guildId_userId: { guildId, userId }
      },
      include: {
        rank: true,
        unit: true,
        medals: { include: { medal: true } },
        certificates: true,
        promotions: { orderBy: { createdAt: 'desc' }, take: 5 },
        demotions: { orderBy: { createdAt: 'desc' }, take: 5 },
        transfers: { orderBy: { createdAt: 'desc' }, take: 5 },
        dismissals: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });
  }

  /**
   * Cria ou atualiza um perfil funcional inicial
   */
  public static async createOrUpdateProfile(data: {
    guildId: string;
    userId: string;
    name: string;
    operationalName: string;
    badgeNumber: string;
    passportId?: string;
    rankId?: string;
    unitId?: string;
    status?: PoliceStatus;
  }): Promise<PoliceProfile> {
    return prisma.policeProfile.upsert({
      where: {
        guildId_userId: { guildId: data.guildId, userId: data.userId }
      },
      update: {
        name: data.name,
        operationalName: data.operationalName,
        badgeNumber: data.badgeNumber,
        passportId: data.passportId,
        rankId: data.rankId,
        unitId: data.unitId,
        status: data.status
      },
      create: {
        guildId: data.guildId,
        userId: data.userId,
        name: data.name,
        operationalName: data.operationalName,
        badgeNumber: data.badgeNumber,
        passportId: data.passportId,
        rankId: data.rankId,
        unitId: data.unitId,
        status: data.status || PoliceStatus.ATIVO
      }
    });
  }
}
