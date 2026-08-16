import { AbsenceRecord, AbsenceStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { AuditLogService } from './AuditLogService.js';

export class AbsenceService {
  /**
   * Registra uma solicitação formal de ausência/licença
   */
  public static async requestAbsence(data: {
    guildId: string;
    userId: string;
    reason: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    proofUrl?: string;
  }): Promise<AbsenceRecord> {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: data.guildId, userId: data.userId } }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado no sistema.');
    }

    const protocol = await ProtocolGenerator.generate('AUS', data.guildId);

    const absence = await prisma.absenceRecord.create({
      data: {
        profileId: profile.id,
        reason: data.reason,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
        proofUrl: data.proofUrl,
        status: AbsenceStatus.PENDENTE,
        protocol
      }
    });

    await AuditLogService.logAction({
      guildId: data.guildId,
      executorId: data.userId,
      action: 'AUSENCIA_SOLICITADA',
      protocol,
      details: `Solicitação de ausência: ${data.reason} (${data.startDate.toLocaleDateString()} a ${data.endDate.toLocaleDateString()})`
    });

    return absence;
  }

  /**
   * Aprova ou rejeita a ausência
   */
  public static async reviewAbsence(absenceId: string, reviewerId: string, status: AbsenceStatus) {
    const absence = await prisma.absenceRecord.findUnique({
      where: { id: absenceId },
      include: { profile: true }
    });

    if (!absence) throw new Error('Registro de ausência não localizado.');

    const updated = await prisma.absenceRecord.update({
      where: { id: absenceId },
      data: {
        status,
        approvedBy: reviewerId
      }
    });

    // Se aprovada, atualizar status funcional do perfil para AFASTADO
    if (status === AbsenceStatus.APROVADA) {
      await prisma.policeProfile.update({
        where: { id: absence.profileId },
        data: { status: 'AFASTADO' }
      });
    }

    await AuditLogService.logAction({
      guildId: absence.profile.guildId,
      executorId: reviewerId,
      targetId: absence.profile.userId,
      action: `AUSENCIA_${status}`,
      protocol: absence.protocol,
      details: `Parecer de ausência emitido: ${status}`
    });

    return updated;
  }
}
