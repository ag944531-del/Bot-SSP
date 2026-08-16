import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { AuditService } from './AuditService.js';
import { ShiftStatus } from '@prisma/client';

export interface CreateShiftInput {
  guildId: string;
  unitName: string;
  supervisorId: string;
  date: Date;
  shiftName: string;
  startTime: string;
  endTime: string;
  notes?: string;
  memberUserIds: string[];
}

export class ShiftService {
  /**
   * Obtém as estatísticas consolidadas do efetivo geral
   */
  public static async getEfetivoGeral(guildId: string) {
    const [total, ativos, afastados, ferias, suspensos, exonerados, emServico] = await Promise.all([
      prisma.policeProfile.count({ where: { guildId, deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'ATIVO', deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'AFASTADO', deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'FERIAS', deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'SUSPENSO', deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'EXONERADO' } }),
      prisma.dutySession.count({ where: { guildId, isActive: true } })
    ]);

    return {
      total,
      ativos,
      emServico,
      afastados,
      ferias,
      suspensos,
      exonerados
    };
  }

  /**
   * Cria uma nova escala de serviço
   */
  public static async createShift(input: CreateShiftInput) {
    const protocol = await ProtocolService.generate('ESC', input.guildId);

    // Buscar dados dos policiais adicionados
    const profiles = await prisma.policeProfile.findMany({
      where: {
        guildId: input.guildId,
        userId: { in: input.memberUserIds }
      },
      include: { rank: true }
    });

    const shift = await prisma.shift.create({
      data: {
        guildId: input.guildId,
        protocol,
        unitName: input.unitName,
        supervisorId: input.supervisorId,
        date: input.date,
        shiftName: input.shiftName,
        startTime: input.startTime,
        endTime: input.endTime,
        notes: input.notes,
        members: {
          create: profiles.map((p) => ({
            userId: p.userId,
            userName: `${p.rank?.abbreviation || ''} ${p.operationalName}`,
            rankName: p.rank?.name,
            status: ShiftStatus.PROGRAMADO
          }))
        }
      },
      include: { members: true }
    });

    await AuditService.log({
      guildId: input.guildId,
      executorId: input.supervisorId,
      action: 'CRIAR_ESCALA_SERVICO',
      module: 'OPERACIONAL',
      entityType: 'Shift',
      entityId: shift.id,
      protocol,
      reason: `Escala para ${input.unitName} em ${input.date.toLocaleDateString('pt-BR')} (${input.shiftName})`
    });

    return shift;
  }

  /**
   * Atualiza o status de presença de um membro na escala
   */
  public static async updateMemberStatus(params: {
    shiftId: string;
    userId: string;
    status: ShiftStatus;
    justification?: string;
  }) {
    const member = await prisma.shiftMember.findUnique({
      where: { shiftId_userId: { shiftId: params.shiftId, userId: params.userId } }
    });

    if (!member) {
      throw new Error('Policial não escalado nesta sessão.');
    }

    const updated = await prisma.shiftMember.update({
      where: { id: member.id },
      data: {
        status: params.status,
        justification: params.justification,
        confirmedAt: params.status === ShiftStatus.PRESENTE || params.status === ShiftStatus.CONFIRMADO ? new Date() : undefined
      }
    });

    return updated;
  }

  /**
   * Busca escalas do dia ou futuras
   */
  public static async listShifts(guildId: string, limit: number = 10) {
    return await prisma.shift.findMany({
      where: { guildId },
      include: { members: true },
      orderBy: { date: 'desc' },
      take: limit
    });
  }

  /**
   * Busca escala pelo protocolo ou ID
   */
  public static async getShift(idOrProtocol: string, guildId: string) {
    return await prisma.shift.findFirst({
      where: {
        guildId,
        OR: [{ id: idOrProtocol }, { protocol: idOrProtocol }]
      },
      include: { members: true }
    });
  }
}
