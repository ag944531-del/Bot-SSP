import { prisma } from '../database/prisma.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class ReportService {
  /**
   * Compila dados estatísticos e analíticos consolidados por período
   */
  public static async generateReport(guildId: string, period: 'hoje' | 'semana' | 'mes' | 'total') {
    let dateFilter: Date | undefined;
    const now = new Date();

    if (period === 'hoje') {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'semana') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'mes') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const whereDate = dateFilter ? { gte: dateFilter } : undefined;

    const [
      totalOfficers,
      activeOfficers,
      dutySessions,
      patrolsCount,
      arrestsCount,
      finesCount,
      seizuresCount,
      occurrencesCount,
      operationsCount,
      casesCount,
      topOfficers
    ] = await Promise.all([
      prisma.policeProfile.count({ where: { guildId } }),
      prisma.policeProfile.count({ where: { guildId, status: 'ATIVO' } }),
      prisma.dutySession.findMany({
        where: {
          guildId,
          ...(whereDate ? { startTime: whereDate } : {})
        }
      }),
      prisma.patrol.count({
        where: {
          guildId,
          ...(whereDate ? { startTime: whereDate } : {})
        }
      }),
      prisma.arrest.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.fine.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.seizure.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.occurrence.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.policeOperation.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.corregedoriaCase.count({
        where: {
          guildId,
          ...(whereDate ? { createdAt: whereDate } : {})
        }
      }),
      prisma.policeProfile.findMany({
        where: { guildId, status: 'ATIVO' },
        orderBy: { totalDutyMinutes: 'desc' },
        take: 5,
        include: { rank: true }
      })
    ]);

    const totalMinutesPeriod = dutySessions.reduce((acc: number, s: any) => acc + (s.durationMin || 0), 0);
    const totalHoursPeriod = (totalMinutesPeriod / 60).toFixed(1);

    let periodLabel = 'GERAL (HISTÓRICO COMPLETO)';
    if (period === 'hoje') periodLabel = 'DIÁRIO (HOJE)';
    else if (period === 'semana') periodLabel = 'SEMANAL (ÚLTIMOS 7 DIAS)';
    else if (period === 'mes') periodLabel = 'MENSAL (ÚLTIMOS 30 DIAS)';

    let topList = '';
    topOfficers.forEach((o: any, i: number) => {
      const h = (o.totalDutyMinutes / 60).toFixed(1);
      topList += `\`${i + 1}º\` **${o.rank?.abbreviation || ''} ${o.operationalName}** — \`${h}h em serviço\`\n`;
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: `Relatório Executivo e Estatístico • ${periodLabel}`,
      status: 'Relatório Oficial Consolidado',
      color: COLORS.PRIMARY,
      description:
        `**RESUMO DO EFETIVO E OPERAÇÕES:**\n\n` +
        `👥 **Efetivo Total:** \`${totalOfficers}\` policiais (Ativos: \`${activeOfficers}\`)\n` +
        `⏱️ **Horas Trabalhadas no Período:** \`${totalHoursPeriod} horas\`\n` +
        `🚓 **Patrulhamentos / Viaturas Despachadas:** \`${patrolsCount}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**INDICADORES CRIMINAIS E PRODUTIVIDADE:**\n` +
        `🔒 **Prisões Efetuadas:** \`${arrestsCount}\`\n` +
        `📑 **Autuações / Multas Aplicadas:** \`${finesCount}\`\n` +
        `📦 **Autos de Apreensão de Ilícitos:** \`${seizuresCount}\`\n` +
        `📄 **Boletins de Ocorrência Registrados:** \`${occurrencesCount}\`\n` +
        `🎯 **Operações Táticas Especiais:** \`${operationsCount}\`\n` +
        `⚖️ **Processos Correcionais Instaurados:** \`${casesCount}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**POLICIAIS DE MAIOR DESTAQUE OPERACIONAL:**\n` +
        (topList || '*Nenhum dado acumulado até o momento.*')
    });

    return embed;
  }
}
