import { prisma } from '../database/prisma.js';
import { BlacklistStatus } from '@prisma/client';
import { AuditService } from './AuditService.js';

export class BlacklistService {
  /**
   * Adiciona um usuário à lista de bloqueio institucional
   */
  public static async addToBlacklist(params: {
    guildId: string;
    userId: string;
    userName?: string;
    status: BlacklistStatus;
    reason: string;
    addedById: string;
    expiresAt?: Date;
  }) {
    const existing = await prisma.blacklistRecord.findUnique({
      where: { guildId_userId: { guildId: params.guildId, userId: params.userId } }
    });

    let record;
    if (existing) {
      record = await prisma.blacklistRecord.update({
        where: { id: existing.id },
        data: {
          status: params.status,
          reason: params.reason,
          addedById: params.addedById,
          expiresAt: params.expiresAt,
          isActive: true,
          removedById: null,
          removedReason: null
        }
      });
    } else {
      record = await prisma.blacklistRecord.create({
        data: {
          guildId: params.guildId,
          userId: params.userId,
          userName: params.userName,
          status: params.status,
          reason: params.reason,
          addedById: params.addedById,
          expiresAt: params.expiresAt,
          isActive: true
        }
      });
    }

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.addedById,
      targetId: params.userId,
      action: 'BLACKLIST_ADICIONAR',
      module: 'SEGURANCA',
      reason: `Inclusão na lista de bloqueio (${params.status}): ${params.reason}`
    });

    return record;
  }

  /**
   * Remove ou reabilita um usuário da lista de bloqueio
   */
  public static async removeFromBlacklist(params: {
    guildId: string;
    userId: string;
    removedById: string;
    reason: string;
  }) {
    const record = await prisma.blacklistRecord.findUnique({
      where: { guildId_userId: { guildId: params.guildId, userId: params.userId } }
    });

    if (!record || !record.isActive) {
      throw new Error('Usuário não consta como ativo na lista de bloqueio institucional.');
    }

    const updated = await prisma.blacklistRecord.update({
      where: { id: record.id },
      data: {
        isActive: false,
        removedById: params.removedById,
        removedReason: params.reason
      }
    });

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.removedById,
      targetId: params.userId,
      action: 'BLACKLIST_REMOVER',
      module: 'SEGURANCA',
      reason: `Reabilitação/Remoção da lista de bloqueio: ${params.reason}`
    });

    return updated;
  }

  /**
   * Verifica se o usuário está impedido na blacklist ativa
   */
  public static async isBlacklisted(guildId: string, userId: string): Promise<{ blocked: boolean; reason?: string; status?: BlacklistStatus }> {
    const record = await prisma.blacklistRecord.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });

    if (!record || !record.isActive) {
      return { blocked: false };
    }

    // Verificar se expirou
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      await prisma.blacklistRecord.update({
        where: { id: record.id },
        data: { isActive: false, removedReason: 'Expiração automática do prazo de bloqueio.' }
      });
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: record.reason,
      status: record.status
    };
  }

  /**
   * Lista todos os registros de bloqueio
   */
  public static async listBlacklist(guildId: string, activeOnly: boolean = true) {
    return await prisma.blacklistRecord.findMany({
      where: {
        guildId,
        ...(activeOnly ? { isActive: true } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
