import { ServerResponse } from 'http';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../../database/prisma.js';
import { BackupService } from '../../services/BackupService.js';
import { BlacklistService } from '../../services/BlacklistService.js';

export class SecurityController {
  public static async getSecurityOverview(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const [auditLogs, blacklist, backups, incidents] = await Promise.all([
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 25
        }),
        prisma.blacklistRecord.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }),
        BackupService.getBackupHistory(undefined, 5),
        prisma.securityIncident.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          auditLogs,
          blacklist,
          backups,
          incidents
        })
      );
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }

  public static async triggerBackup(req: AuthenticatedRequest, res: ServerResponse) {
    try {
      const result = await BackupService.createBackup({
        backupType: 'MANUAL',
        executorId: req.user?.id || 'WEB_DASHBOARD'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, backup: result }));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
}
