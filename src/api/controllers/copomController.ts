import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';

export class CopomController {
  public static async getFleetAndOccurrences(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const [vehicles, activePatrols, occurrences, arrests] = await Promise.all([
        prisma.vehicle.findMany({
          where: { deletedAt: null },
          include: { unit: true },
          orderBy: { prefix: 'asc' }
        }),
        prisma.patrol.findMany({
          where: { isActive: true },
          include: { members: { include: { profile: true } } }
        }),
        prisma.occurrence.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        prisma.arrest.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          vehicles,
          activePatrols,
          occurrences,
          arrests
        })
      );
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
