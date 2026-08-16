import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { prisma } from '../database/prisma.js';
import { AuditService } from './AuditService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.join(__dirname, '../../backups');

export class BackupService {
  /**
   * Garante a existência do diretório de backups
   */
  private static ensureBackupDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }

  /**
   * Executa um backup estruturado e higienizado dos dados institucionais
   */
  public static async createBackup(params: {
    guildId?: string;
    executorId?: string;
    backupType?: 'MANUAL' | 'AUTOMATICO_DIARIO' | 'AUTOMATICO_SEMANAL';
  }) {
    this.ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${params.guildId || 'global'}_${timestamp}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    try {
      // Coletar dados higienizados das entidades (sem credenciais / tokens)
      const [
        guilds,
        ranks,
        units,
        profiles,
        vehicles,
        occurrences,
        arrests,
        fines,
        cases,
        courses,
        documents,
        shifts,
        approvalRequests
      ] = await Promise.all([
        prisma.guild.findMany({
          select: { id: true, name: true, createdAt: true }
        }),
        prisma.rank.findMany(),
        prisma.unit.findMany(),
        prisma.policeProfile.findMany({
          select: {
            id: true,
            guildId: true,
            userId: true,
            name: true,
            operationalName: true,
            badgeNumber: true,
            status: true,
            rankId: true,
            unitId: true,
            hireDate: true
          }
        }),
        prisma.vehicle.findMany(),
        prisma.occurrence.findMany(),
        prisma.arrest.findMany(),
        prisma.fine.findMany(),
        prisma.corregedoriaCase.findMany(),
        prisma.course.findMany(),
        prisma.document.findMany(),
        prisma.shift.findMany({ include: { members: true } }),
        prisma.approvalRequest.findMany()
      ]);

      const backupPayload = {
        metadata: {
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          backupType: params.backupType || 'MANUAL',
          scope: params.guildId || 'GLOBAL'
        },
        data: {
          guilds,
          ranks,
          units,
          profiles,
          vehicles,
          occurrences,
          arrests,
          fines,
          cases,
          courses,
          documents,
          shifts,
          approvalRequests
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      fs.writeFileSync(filePath, jsonString, 'utf-8');

      const fileStats = fs.statSync(filePath);
      const hashIntegrity = crypto.createHash('sha256').update(jsonString).digest('hex');

      const log = await prisma.backupLog.create({
        data: {
          guildId: params.guildId,
          fileName,
          fileSizeBytes: fileStats.size,
          status: 'SUCESSO',
          backupType: params.backupType || 'MANUAL',
          hashIntegrity,
          details: `Backup concluído com ${profiles.length} policiais e ${occurrences.length} ocorrências.`
        }
      });

      if (params.executorId && params.guildId) {
        await AuditService.log({
          guildId: params.guildId,
          executorId: params.executorId,
          action: 'BACKUP_EXECUTADO',
          module: 'SEGURANCA',
          reason: `Geração de backup ${params.backupType || 'MANUAL'} (${(fileStats.size / 1024).toFixed(1)} KB)`
        });
      }

      logger.info(`💾 Backup gerado com sucesso: ${fileName} [${fileStats.size} bytes]`);
      return { log, fileName, sizeBytes: fileStats.size, hashIntegrity };
    } catch (error: any) {
      logger.error('💥 Erro ao gerar backup do banco de dados:', error);

      await prisma.backupLog.create({
        data: {
          guildId: params.guildId,
          fileName,
          fileSizeBytes: 0,
          status: 'FALHA',
          backupType: params.backupType || 'MANUAL',
          details: error.message || 'Erro durante a extração de dados.'
        }
      });

      throw new Error(`Falha ao gerar backup: ${error.message}`);
    }
  }

  /**
   * Obtém o status do último backup realizado
   */
  public static async getLastBackup(guildId?: string) {
    return await prisma.backupLog.findFirst({
      where: guildId ? { guildId } : {},
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Lista o histórico de backups
   */
  public static async getBackupHistory(guildId?: string, limit: number = 10) {
    return await prisma.backupLog.findMany({
      where: guildId ? { guildId } : {},
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Testa a integridade dos arquivos de backup existentes
   */
  public static async testIntegrity(logId: string) {
    const log = await prisma.backupLog.findUnique({ where: { id: logId } });
    if (!log) throw new Error('Registro de backup não localizado.');

    const filePath = path.join(BACKUPS_DIR, log.fileName);
    if (!fs.existsSync(filePath)) {
      return { valid: false, message: 'Arquivo físico de backup não encontrado no armazenamento do servidor.' };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');

    if (log.hashIntegrity && log.hashIntegrity !== calculatedHash) {
      return { valid: false, message: 'Inconsistência de integridade: O hash SHA-256 do arquivo difere do registrado.' };
    }

    try {
      JSON.parse(content);
      return { valid: true, message: 'Integridade validada com sucesso. Estrutura JSON e hash íntegros.' };
    } catch {
      return { valid: false, message: 'Arquivo corrompido: JSON inválido.' };
    }
  }

  /**
   * Aplica a política de retenção excluindo backups anteriores a X dias
   */
  public static async cleanOldBackups(retentionDays: number = 30) {
    this.ensureBackupDir();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldLogs = await prisma.backupLog.findMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    let removedCount = 0;
    for (const l of oldLogs) {
      const filePath = path.join(BACKUPS_DIR, l.fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          removedCount++;
        } catch (err) {
          logger.warn(`Falha ao remover arquivo de backup antigo ${l.fileName}:`, err);
        }
      }
    }

    await prisma.backupLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    logger.info(`🧹 Limpeza de retenção concluída: ${removedCount} arquivo(s) antigos removidos.`);
    return { removedCount };
  }
}
