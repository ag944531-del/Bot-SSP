import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';
import { DeadlineService } from '../../services/DeadlineService.js';

export class CorregedoriaController {
  public static async getCasesAndSanctions(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const firstGuild = await prisma.guild.findFirst();
      const guildId = req.user?.guildId || firstGuild?.id;

      const [cases, sanctions, summons, deadlines] = await Promise.all([
        prisma.corregedoriaCase.findMany({
          where: { deletedAt: null },
          include: { sanctions: true, summons: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        }),
        prisma.sanction.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.summons.findMany({
          orderBy: { scheduledFor: 'asc' },
          take: 10
        }),
        guildId ? DeadlineService.checkAllDeadlines(guildId) : []
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          cases,
          sanctions,
          summons,
          deadlines
        })
      );
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
