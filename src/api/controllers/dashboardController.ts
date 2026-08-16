import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { ExecutiveDashboardService } from '../../services/ExecutiveDashboardService.js';
import { ShiftService } from '../../services/ShiftService.js';
import { AlertService } from '../../services/AlertService.js';
import { DeadlineService } from '../../services/DeadlineService.js';
import { prisma } from '../../database/prisma.js';

export class DashboardController {
  public static async getMetrics(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      // Buscar primeira Guild ativa caso não especificada
      const firstGuild = await prisma.guild.findFirst();
      const guildId = req.user?.guildId || firstGuild?.id || 'GLOBAL';

      const [metrics, efetivo, alerts, deadlines] = await Promise.all([
        guildId !== 'GLOBAL' ? ExecutiveDashboardService.getMetrics(guildId) : null,
        guildId !== 'GLOBAL' ? ShiftService.getEfetivoGeral(guildId) : null,
        guildId !== 'GLOBAL' ? AlertService.listAlerts(guildId) : [],
        guildId !== 'GLOBAL' ? DeadlineService.getCriticalDeadlines(guildId) : []
      ]);

      const responsePayload = {
        success: true,
        guildId,
        metrics: metrics || {
          efetivo: { total: 0, ativos: 0, emServico: 0, afastados: 0 },
          operacao: { viaturasAtivas: 0, patrulhasEmAndamento: 0, ocorrenciasHoje: 0 },
          corregedoria: { ipmsAtivos: 0, pdosAtivos: 0, convocacoesPendentes: 0 },
          formacao: { cursosAtivos: 0, alunosMatriculados: 0 },
          administrativo: { solicitacoesPendentes: 0, promocoesPendentes: 0, ausenciasPendentes: 0 }
        },
        efetivoDetail: efetivo,
        alerts: alerts.slice(0, 5),
        deadlines: deadlines.slice(0, 5)
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responsePayload));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
