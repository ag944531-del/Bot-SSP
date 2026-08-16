import { prisma } from '../database/prisma.js';
import { FiveMIntegrationService } from './FiveMIntegrationService.js';
import { SyncStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface DivergenceItem {
  discordId: string;
  passport: number;
  officerName: string;
  botRank: string;
  botUnit?: string;
  isOnline: boolean;
  syncStatus: SyncStatus;
  issue: string;
}

export class SyncService {
  /**
   * Executa a rotina de reconciliação entre Bot Institucional e Cidade FiveM
   */
  public static async reconcileGuild(guildId: string): Promise<{
    totalChecked: number;
    syncedCount: number;
    divergentCount: number;
    divergences: DivergenceItem[];
  }> {
    const links = await prisma.fivemLink.findMany({
      where: { guildId },
      include: {
        policeProfile: {
          include: { rank: true, unit: true }
        }
      }
    });

    const divergences: DivergenceItem[] = [];
    let syncedCount = 0;

    for (const link of links) {
      const passport = link.passport;
      const profile = link.policeProfile;

      if (!profile) {
        divergences.push({
          discordId: link.discordId,
          passport,
          officerName: 'Vínculo Sem Ficha Policial',
          botRank: 'N/A',
          isOnline: false,
          syncStatus: SyncStatus.ERROR,
          issue: 'Vínculo existe mas a ficha de policial não foi encontrada.'
        });
        continue;
      }

      try {
        const char = await FiveMIntegrationService.getCharacter(passport);

        if (!char) {
          divergences.push({
            discordId: link.discordId,
            passport,
            officerName: profile.operationalName,
            botRank: profile.rank?.name || 'N/A',
            botUnit: profile.unit?.name,
            isOnline: false,
            syncStatus: SyncStatus.DIVERGENT,
            issue: 'Passaporte não existe no banco da cidade FiveM.'
          });

          await prisma.fivemLink.update({
            where: { id: link.id },
            data: { syncStatus: SyncStatus.DIVERGENT, lastSyncAt: new Date() }
          });
          continue;
        }

        // Se o policial está regular
        syncedCount++;
        await prisma.fivemLink.update({
          where: { id: link.id },
          data: { syncStatus: SyncStatus.SYNCED, lastSyncAt: new Date() }
        });
      } catch (err: any) {
        divergences.push({
          discordId: link.discordId,
          passport,
          officerName: profile.operationalName,
          botRank: profile.rank?.name || 'N/A',
          isOnline: false,
          syncStatus: SyncStatus.ERROR,
          issue: `Falha ao consultar FiveM: ${err.message}`
        });
      }
    }

    logger.info(`🔄 [SYNC-RECONCILIATION] Varredura concluída: ${syncedCount} sincronizados, ${divergences.length} divergências.`);

    return {
      totalChecked: links.length,
      syncedCount,
      divergentCount: divergences.length,
      divergences
    };
  }
}
