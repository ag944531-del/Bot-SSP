import { prisma } from '../database/prisma.js';
import { AuditService } from './AuditService.js';

export type ExportCategory = 'EFETIVO' | 'PONTO' | 'OCORRENCIAS' | 'CURSOS' | 'AUDITORIA';

export class ExportService {
  /**
   * Exporta dados estruturados em formato CSV padronizado
   */
  public static async exportToCsv(params: {
    guildId: string;
    category: ExportCategory;
    authorId: string;
  }): Promise<{ filename: string; content: string }> {
    const now = new Date().toISOString().slice(0, 10);
    let csvHeader = '';
    let csvRows: string[] = [];
    let filename = '';

    if (params.category === 'EFETIVO') {
      filename = `efetivo_${params.guildId}_${now}.csv`;
      csvHeader = 'Matricula;NomeCompleto;NomeGuerra;Patente;Nivel;Unidade;Status;HorasServico;DataAdmissao';

      const profiles = await prisma.policeProfile.findMany({
        where: { guildId: params.guildId, deletedAt: null },
        include: { rank: true, unit: true },
        orderBy: { rank: { level: 'desc' } }
      });

      csvRows = profiles.map((p) => {
        const hours = (p.totalDutyMinutes / 60).toFixed(1);
        return `"${p.badgeNumber}";"${p.name}";"${p.operationalName}";"${p.rank?.name || ''}";${p.rank?.level || 0};"${p.unit?.abbreviation || ''}";"${p.status}";${hours};"${p.hireDate.toISOString().slice(0, 10)}"`;
      });
    } else if (params.category === 'OCORRENCIAS') {
      filename = `ocorrencias_${params.guildId}_${now}.csv`;
      csvHeader = 'Protocolo;Tipo;Local;Resultado;AutorID;Data';

      const occurrences = await prisma.occurrence.findMany({
        where: { guildId: params.guildId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 500
      });

      csvRows = occurrences.map((o) => {
        return `"${o.protocol}";"${o.type}";"${o.location}";"${o.result}";"${o.authorId}";"${o.createdAt.toISOString()}"`;
      });
    } else if (params.category === 'AUDITORIA') {
      filename = `auditoria_${params.guildId}_${now}.csv`;
      csvHeader = 'Protocolo;Data;ExecutorID;ExecutorNome;Modulo;Acao;Entidade;Anterior;Novo;Motivo';

      const logs = await prisma.auditLog.findMany({
        where: { guildId: params.guildId },
        orderBy: { createdAt: 'desc' },
        take: 1000
      });

      csvRows = logs.map((l) => {
        return `"${l.protocol || ''}";"${l.createdAt.toISOString()}";"${l.executorId}";"${l.executorName || ''}";"${l.module || ''}";"${l.action}";"${l.entityType || ''}";"${l.previousValue || ''}";"${l.newValue || ''}";"${l.reason || ''}"`;
      });
    } else if (params.category === 'PONTO') {
      filename = `folha_ponto_${params.guildId}_${now}.csv`;
      csvHeader = 'PolicialMatricula;PolicialNome;Inicio;Fim;DuracaoMinutos;Status';

      const sessions = await prisma.dutySession.findMany({
        where: { guildId: params.guildId },
        include: { profile: true },
        orderBy: { startTime: 'desc' },
        take: 500
      });

      csvRows = sessions.map((s) => {
        return `"${s.profile.badgeNumber}";"${s.profile.operationalName}";"${s.startTime.toISOString()}";"${s.endTime?.toISOString() || 'Em aberto'}";${s.durationMin || 0};"${s.isActive ? 'ABERTO' : 'CONCLUIDO'}"`;
      });
    } else if (params.category === 'CURSOS') {
      filename = `cursos_academia_${params.guildId}_${now}.csv`;
      csvHeader = 'Curso;Sigla;CargaHoraria;Turma;AlunoID;Aprovado;NotaFinal';

      const enrollments = await prisma.studentEnrollment.findMany({
        where: { class: { course: { guildId: params.guildId } } },
        include: { class: { include: { course: true } } },
        take: 500
      });

      csvRows = enrollments.map((e) => {
        return `"${e.class.course.name}";"${e.class.course.abbreviation}";${e.class.course.workloadHours};"${e.class.code}";"${e.studentId}";"${e.passed === null ? 'EM_ANDAMENTO' : e.passed ? 'APROVADO' : 'REPROVADO'}";${e.finalGrade || 'N/A'}`;
      });
    }

    const content = [csvHeader, ...csvRows].join('\n');

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.authorId,
      action: 'EXPORTAR_RELATORIO_CSV',
      module: 'RELATORIOS',
      reason: `Exportação de dados da categoria ${params.category}`
    });

    return { filename, content };
  }
}
