import { prisma } from '../database/prisma.js';
import { AuditLogService } from './AuditLogService.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';

export class DutyService {
  /**
   * Inicia uma sessão de ponto para o policial
   */
  public static async startDuty(guildId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: { rank: true, unit: true }
    });

    if (!profile) {
      throw new Error('Você precisa estar cadastrado no sistema para entrar em serviço.');
    }

    if (profile.status !== 'ATIVO') {
      throw new Error(`Seu cadastro não está ativo (Situação atual: ${profile.status}).`);
    }

    // Verificar se já possui ponto ativo
    const activeSession = await prisma.dutySession.findFirst({
      where: { profileId: profile.id, isActive: true }
    });

    if (activeSession) {
      throw new Error('Você já possui uma sessão de serviço ativa.');
    }

    const session = await prisma.dutySession.create({
      data: {
        profileId: profile.id,
        guildId,
        startTime: new Date(),
        isActive: true
      }
    });

    await AuditLogService.logAction({
      guildId,
      executorId: userId,
      action: 'PONTO_ENTRADA',
      details: `Entrada em serviço: ${profile.operationalName} (${profile.rank?.name || 'Policial'})`
    });

    return { session, profile };
  }

  /**
   * Finaliza a sessão de ponto ativa e contabiliza as horas
   */
  public static async stopDuty(guildId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });

    if (!profile) {
      throw new Error('Policial não localizado.');
    }

    const activeSession = await prisma.dutySession.findFirst({
      where: { profileId: profile.id, isActive: true },
      orderBy: { startTime: 'desc' }
    });

    if (!activeSession) {
      throw new Error('Você não possui nenhuma sessão de serviço em andamento.');
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - activeSession.startTime.getTime();
    const durationMin = Math.max(1, Math.floor(durationMs / (1000 * 60)));

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.dutySession.update({
        where: { id: activeSession.id },
        data: {
          isActive: false,
          endTime,
          durationMin
        }
      });

      const updatedProfile = await tx.policeProfile.update({
        where: { id: profile.id },
        data: {
          totalDutyMinutes: { increment: durationMin }
        }
      });

      return { updatedSession, updatedProfile };
    });

    await AuditLogService.logAction({
      guildId,
      executorId: userId,
      action: 'PONTO_SAIDA',
      details: `Saída de serviço: ${profile.operationalName}. Duração: ${durationMin} minutos.`
    });

    const hours = Math.floor(durationMin / 60);
    const minutes = durationMin % 60;
    const durationFormatted = `${hours}h ${minutes.toString().padStart(2, '0')}m`;

    return {
      session: result.updatedSession,
      durationMin,
      durationFormatted,
      totalMinutes: result.updatedProfile.totalDutyMinutes
    };
  }

  /**
   * Obtém a sessão ativa de um policial
   */
  public static async getActiveSession(guildId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });

    if (!profile) return null;

    return prisma.dutySession.findFirst({
      where: { profileId: profile.id, isActive: true }
    });
  }
}
