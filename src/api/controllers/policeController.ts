import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';
import { TimelineService } from '../../services/TimelineService.js';

export class PoliceController {
  public static async listProfiles(req: AuthenticatedRequest, res: ServerResponse, urlParams: URLSearchParams) {
    try {
      const search = urlParams.get('q') || '';
      const unit = urlParams.get('unit') || undefined;
      const status = urlParams.get('status') || undefined;
      const page = parseInt(urlParams.get('page') || '1', 10);
      const pageSize = parseInt(urlParams.get('pageSize') || '15', 10);

      const where: any = { deletedAt: null };
      if (unit) where.unit = { abbreviation: unit };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { operationalName: { contains: search, mode: 'insensitive' } },
          { badgeNumber: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [total, profiles] = await Promise.all([
        prisma.policeProfile.count({ where }),
        prisma.policeProfile.findMany({
          where,
          include: { rank: true, unit: true },
          orderBy: { rank: { level: 'desc' } },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      const formatted = profiles.map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        operationalName: p.operationalName,
        badgeNumber: p.badgeNumber,
        rank: p.rank?.name || 'N/A',
        rankAbbr: p.rank?.abbreviation || '',
        rankLevel: p.rank?.level || 0,
        unit: p.unit?.name || 'Geral',
        unitAbbr: p.unit?.abbreviation || '',
        status: p.status,
        dutyHours: (p.totalDutyMinutes / 60).toFixed(1),
        totalPatrols: p.totalPatrols,
        totalArrests: p.totalArrests,
        totalOccurrences: p.totalOccurrences,
        hireDate: p.hireDate.toLocaleDateString('pt-BR')
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, total, page, totalPages: Math.ceil(total / pageSize) || 1, profiles: formatted }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  public static async getTimeline(req: AuthenticatedRequest, res: ServerResponse, urlParams: URLSearchParams) {
    try {
      const userId = urlParams.get('userId');
      const firstGuild = await prisma.guild.findFirst();
      const guildId = req.user?.guildId || firstGuild?.id;

      if (!userId || !guildId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'userId obrigatório.' }));
      }

      const timeline = await TimelineService.getTimeline(guildId, userId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, userId, timeline }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
