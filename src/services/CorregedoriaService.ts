import { CaseStatus, SanctionType } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { AuditLogService } from './AuditLogService.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class CorregedoriaService {
  /**
   * Instaura um novo Inquérito Policial Militar (IPM) ou Procedimento Disciplinar Ordinário (PDO)
   */
  public static async createCase(data: {
    guildId: string;
    type: 'IPM' | 'PDO';
    investigatedId: string;
    accuserId?: string;
    officerInChargeId: string;
    reporterId?: string;
    factNarrative: string;
    evidence?: string;
    witnesses?: string;
    deadlineDays?: number;
  }) {
    const protocol = await ProtocolGenerator.generate(data.type, data.guildId);

    const deadline = data.deadlineDays
      ? new Date(Date.now() + data.deadlineDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias padrão

    const newCase = await prisma.corregedoriaCase.create({
      data: {
        guildId: data.guildId,
        protocol,
        type: data.type,
        investigatedId: data.investigatedId,
        accuserId: data.accuserId,
        officerInChargeId: data.officerInChargeId,
        reporterId: data.reporterId,
        factNarrative: data.factNarrative,
        evidence: data.evidence,
        witnesses: data.witnesses,
        deadline,
        status: CaseStatus.INSTAURADO
      }
    });

    await AuditLogService.logAction({
      guildId: data.guildId,
      executorId: data.officerInChargeId,
      targetId: data.investigatedId,
      action: `CORREGEDORIA_${data.type}_INSTAURADO`,
      protocol,
      details: `Instauração de ${data.type} contra <@${data.investigatedId}>. Fato: ${data.factNarrative}`
    });

    return newCase;
  }

  /**
   * Atualiza a fase processual de um IPM ou PDO
   */
  public static async updateCaseStatus(caseIdOrProtocol: string, newStatus: CaseStatus, authorId: string) {
    const corregedoriaCase = await prisma.corregedoriaCase.findFirst({
      where: {
        OR: [{ id: caseIdOrProtocol }, { protocol: caseIdOrProtocol }]
      }
    });

    if (!corregedoriaCase) throw new Error('Procedimento correcional não localizado.');

    const updated = await prisma.corregedoriaCase.update({
      where: { id: corregedoriaCase.id },
      data: { status: newStatus }
    });

    await AuditLogService.logAction({
      guildId: corregedoriaCase.guildId,
      executorId: authorId,
      targetId: corregedoriaCase.investigatedId,
      action: `CORREGEDORIA_FASE_ATUALIZADA`,
      protocol: corregedoriaCase.protocol,
      details: `Status alterado para ${newStatus}`
    });

    return updated;
  }

  /**
   * Julga e encerra o procedimento com sentença disciplinar
   */
  public static async judgeCase(data: {
    caseIdOrProtocol: string;
    judgeId: string;
    sanction: SanctionType;
    notes: string;
    daysSuspended?: number;
  }) {
    const corregedoriaCase = await prisma.corregedoriaCase.findFirst({
      where: {
        OR: [{ id: data.caseIdOrProtocol }, { protocol: data.caseIdOrProtocol }]
      }
    });

    if (!corregedoriaCase) throw new Error('Procedimento correcional não localizado.');

    const protocolSanction = await ProtocolGenerator.generate('SNC', corregedoriaCase.guildId);

    const result = await prisma.$transaction(async (tx) => {
      const updatedCase = await tx.corregedoriaCase.update({
        where: { id: corregedoriaCase.id },
        data: {
          status: CaseStatus.CONCLUIDO,
          resultSanction: data.sanction,
          resultNotes: data.notes
        }
      });

      const profile = await tx.policeProfile.findUnique({
        where: {
          guildId_userId: {
            guildId: corregedoriaCase.guildId,
            userId: corregedoriaCase.investigatedId
          }
        }
      });

      if (profile && data.sanction !== SanctionType.ABSOLVICAO) {
        await tx.sanction.create({
          data: {
            guildId: corregedoriaCase.guildId,
            caseId: corregedoriaCase.id,
            profileId: profile.id,
            type: data.sanction,
            reason: data.notes,
            daysSuspended: data.daysSuspended,
            authorId: data.judgeId,
            protocol: protocolSanction
          }
        });

        // Se for suspensão, alterar status para SUSPENSO
        if (data.sanction === SanctionType.SUSPENSAO) {
          await tx.policeProfile.update({
            where: { id: profile.id },
            data: { status: 'SUSPENSO' }
          });
        }
      }

      return { updatedCase, protocolSanction };
    });

    await AuditLogService.logAction({
      guildId: corregedoriaCase.guildId,
      executorId: data.judgeId,
      targetId: corregedoriaCase.investigatedId,
      action: `CORREGEDORIA_JULGAMENTO`,
      protocol: corregedoriaCase.protocol,
      details: `Julgamento: ${data.sanction}. Parecer: ${data.notes}`
    });

    return result;
  }

  /**
   * Emite uma convocação oficial para oitiva ou audiência disciplinar
   */
  public static async createSummons(data: {
    guildId: string;
    caseId?: string;
    summonedId: string;
    authorId: string;
    reason: string;
    scheduledFor: Date;
    location: string;
  }) {
    const protocol = await ProtocolGenerator.generate('CNV', data.guildId);

    return prisma.summons.create({
      data: {
        guildId: data.guildId,
        caseId: data.caseId,
        summonedId: data.summonedId,
        authorId: data.authorId,
        reason: data.reason,
        scheduledFor: data.scheduledFor,
        location: data.location,
        protocol
      }
    });
  }

  /**
   * Registra a confirmação de presença ou justificativa de ausência na convocação
   */
  public static async respondSummons(summonsId: string, userId: string, confirmed: boolean, justification?: string) {
    const summons = await prisma.summons.findUnique({ where: { id: summonsId } });
    if (!summons) throw new Error('Convocação não localizada.');

    if (summons.summonedId !== userId) {
      throw new Error('Apenas o policial formalmente convocado pode responder a esta notificação.');
    }

    return prisma.summons.update({
      where: { id: summonsId },
      data: {
        confirmed,
        justification
      }
    });
  }

  /**
   * Consulta um processo pelo número de protocolo
   */
  public static async findCase(guildId: string, protocol: string) {
    return prisma.corregedoriaCase.findFirst({
      where: { guildId, protocol: { equals: protocol, mode: 'insensitive' } },
      include: {
        sanctions: true,
        summons: true
      }
    });
  }
}
