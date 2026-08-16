import { Medal, PoliceMedal } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { AuditLogService } from './AuditLogService.js';

export class MedalService {
  /**
   * Cadastra uma nova medalha ou honraria institucional
   */
  public static async createMedal(data: {
    guildId: string;
    name: string;
    description: string;
    category: string;
    imageUrl?: string;
  }): Promise<Medal> {
    return prisma.medal.create({
      data: {
        guildId: data.guildId,
        name: data.name,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl
      }
    });
  }

  /**
   * Concede uma condecoração a um policial com registro na ficha funcional
   */
  public static async grantMedal(data: {
    guildId: string;
    medalId: string;
    targetUserId: string;
    authorId: string;
    reason: string;
  }): Promise<PoliceMedal> {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: data.guildId, userId: data.targetUserId } }
    });

    if (!profile) throw new Error('Policial não cadastrado no sistema.');

    const medal = await prisma.medal.findUnique({ where: { id: data.medalId } });
    if (!medal) throw new Error('Medalha não localizada.');

    const granted = await prisma.policeMedal.create({
      data: {
        medalId: medal.id,
        profileId: profile.id,
        grantedBy: data.authorId,
        reason: data.reason
      }
    });

    await AuditLogService.logAction({
      guildId: data.guildId,
      executorId: data.authorId,
      targetId: data.targetUserId,
      action: 'MEDALHA_OUTORGADA',
      details: `Concessão da medalha ${medal.name}. Motivo: ${data.reason}`
    });

    return granted;
  }

  /**
   * Lista todas as medalhas cadastradas
   */
  public static async listMedals(guildId: string) {
    return prisma.medal.findMany({
      where: { guildId },
      include: {
        _count: { select: { holders: true } }
      },
      orderBy: { name: 'asc' }
    });
  }
}
