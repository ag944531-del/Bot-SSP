import { prisma } from '../database/prisma.js';

export interface DashboardMetrics {
  efetivo: {
    total: number;
    ativos: number;
    emServico: number;
    afastados: number;
  };
  operacao: {
    viaturasAtivas: number;
    patrulhasEmAndamento: number;
    ocorrenciasHoje: number;
  };
  corregedoria: {
    ipmsAtivos: number;
    pdosAtivos: number;
    convocacoesPendentes: number;
  };
  formacao: {
    cursosAtivos: number;
    alunosMatriculados: number;
  };
  administrativo: {
    solicitacoesPendentes: number;
    promocoesPendentes: number;
    ausenciasPendentes: number;
  };
}

export class ExecutiveDashboardService {
  /**
   * Consolida todos os indicadores executivos da corporação em tempo real
   */
  public static async getMetrics(guildId: string): Promise<DashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalEfetivo,
      ativosEfetivo,
      afastadosEfetivo,
      emServico,
      viaturasAtivas,
      patrulhasEmAndamento,
      ocorrenciasHoje,
      ipmsAtivos,
      pdosAtivos,
      convocacoesPendentes,
      cursosAtivos,
      alunosMatriculados,
      solicitacoesPendentes,
      promocoesPendentes,
      ausenciasPendentes
    ] = await Promise.all([
      prisma.policeProfile.count({ where: { guildId, deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'ATIVO', deletedAt: null } }),
      prisma.policeProfile.count({ where: { guildId, status: 'AFASTADO', deletedAt: null } }),
      prisma.dutySession.count({ where: { guildId, isActive: true } }),
      prisma.vehicle.count({ where: { guildId, status: 'EM_PATRULHAMENTO', deletedAt: null } }),
      prisma.patrol.count({ where: { guildId, isActive: true } }),
      prisma.occurrence.count({ where: { guildId, createdAt: { gte: today }, deletedAt: null } }),
      prisma.corregedoriaCase.count({ where: { guildId, type: 'IPM', status: { notIn: ['CONCLUIDO', 'ARQUIVADO'] } } }),
      prisma.corregedoriaCase.count({ where: { guildId, type: 'PDO', status: { notIn: ['CONCLUIDO', 'ARQUIVADO'] } } }),
      prisma.summons.count({ where: { guildId, confirmed: null } }),
      prisma.course.count({ where: { guildId, isActive: true, deletedAt: null } }),
      prisma.studentEnrollment.count({ where: { class: { course: { guildId } } } }),
      prisma.approvalRequest.count({ where: { guildId, status: { in: ['PENDENTE', 'EM_ANALISE'] } } }),
      prisma.approvalRequest.count({ where: { guildId, actionType: 'PROMOTION', status: { in: ['PENDENTE', 'EM_ANALISE'] } } }),
      prisma.absenceRecord.count({ where: { profile: { guildId }, status: 'PENDENTE' } })
    ]);

    return {
      efetivo: {
        total: totalEfetivo,
        ativos: ativosEfetivo,
        emServico,
        afastados: afastadosEfetivo
      },
      operacao: {
        viaturasAtivas,
        patrulhasEmAndamento,
        ocorrenciasHoje
      },
      corregedoria: {
        ipmsAtivos,
        pdosAtivos,
        convocacoesPendentes
      },
      formacao: {
        cursosAtivos,
        alunosMatriculados
      },
      administrativo: {
        solicitacoesPendentes,
        promocoesPendentes,
        ausenciasPendentes
      }
    };
  }
}
