import { Guild, GuildMember } from 'discord.js';
import { PoliceStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { AuditLogService } from './AuditLogService.js';
import { FiveMIntegrationService } from './FiveMIntegrationService.js';
import { logger } from '../utils/logger.js';

export interface PromotionOptions {
  guild: Guild;
  authorMember: GuildMember;
  targetUserId: string;
  newRankId: string;
  reason: string;
}

export interface DemotionOptions {
  guild: Guild;
  authorMember: GuildMember;
  targetUserId: string;
  newRankId: string;
  reason: string;
}

export interface TransferOptions {
  guild: Guild;
  authorMember: GuildMember;
  targetUserId: string;
  newUnitId: string;
  reason: string;
}

export interface AbsenceOptions {
  guildId: string;
  authorId: string;
  targetUserId: string;
  newStatus: PoliceStatus;
  reason: string;
}

export interface DismissalOptions {
  guild: Guild;
  authorMember: GuildMember;
  targetUserId: string;
  reason: string;
}

export class RHService {
  /**
   * Promove um policial, ajustando cargos no Discord, FiveM e gravando histórico funcional
   */
  public static async promotePolice(options: PromotionOptions) {
    const { guild, authorMember, targetUserId, newRankId, reason } = options;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: targetUserId } },
      include: { rank: true }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado na base funcional.');
    }

    const newRank = await prisma.rank.findUnique({ where: { id: newRankId } });
    if (!newRank) {
      throw new Error('Patente de destino não encontrada.');
    }

    const previousRankName = profile.rank ? profile.rank.name : 'Não Atribuída';
    const protocol = await ProtocolGenerator.generate('PRM', guild.id);

    // 1. Atualizar cargos no Discord com segurança
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      if (profile.rank?.discordRoleId) {
        await targetMember.roles.remove(profile.rank.discordRoleId).catch((e) => {
          logger.warn(`Falha ao remover cargo de patente anterior: ${e.message}`);
        });
      }
      if (newRank.discordRoleId) {
        await targetMember.roles.add(newRank.discordRoleId).catch((e) => {
          logger.warn(`Falha ao adicionar novo cargo de patente: ${e.message}`);
        });
      }
    }

    // 2. Sincronizar com FiveM se houver vínculo
    const fivemLink = await prisma.fivemLink.findUnique({
      where: { guildId_discordId: { guildId: guild.id, discordId: targetUserId } }
    });

    let fivemResult = null;
    if (fivemLink) {
      fivemResult = await FiveMIntegrationService.syncRankChange({
        guildId: guild.id,
        passport: fivemLink.passport,
        discordId: targetUserId,
        oldRankId: profile.rankId || undefined,
        newRankId: newRank.id,
        executorId: authorMember.id,
        actionType: 'PROMOTE'
      });
    }

    // 3. Transação no Banco de Dados
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedProfile = await tx.policeProfile.update({
        where: { id: profile.id },
        data: {
          rankId: newRank.id,
          lastPromotionDate: new Date()
        }
      });

      const history = await tx.promotionHistory.create({
        data: {
          profileId: profile.id,
          previousRank: previousRankName,
          newRank: newRank.name,
          reason,
          authorId: authorMember.id,
          protocol
        }
      });

      return { updatedProfile, history };
    });

    // 4. Auditoria
    await AuditLogService.logAction({
      guildId: guild.id,
      executorId: authorMember.id,
      targetId: targetUserId,
      action: 'RH_PROMOVER',
      protocol,
      details: `Promoção: ${previousRankName} ➔ ${newRank.name}. FiveM: ${fivemResult?.status || 'Sem Vínculo'}. Motivo: ${reason}`,
      client: guild.client
    });

    return { protocol, previousRank: previousRankName, newRank: newRank.name, fivemResult };
  }

  /**
   * Rebaixa um policial, ajustando cargos no Discord, FiveM e gravando histórico
   */
  public static async demotePolice(options: DemotionOptions) {
    const { guild, authorMember, targetUserId, newRankId, reason } = options;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: targetUserId } },
      include: { rank: true }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado na base funcional.');
    }

    const newRank = await prisma.rank.findUnique({ where: { id: newRankId } });
    if (!newRank) {
      throw new Error('Patente de destino não encontrada.');
    }

    const previousRankName = profile.rank ? profile.rank.name : 'Não Atribuída';
    const protocol = await ProtocolGenerator.generate('REB', guild.id);

    // Ajustar cargos no Discord
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      if (profile.rank?.discordRoleId) {
        await targetMember.roles.remove(profile.rank.discordRoleId).catch(() => null);
      }
      if (newRank.discordRoleId) {
        await targetMember.roles.add(newRank.discordRoleId).catch(() => null);
      }
    }

    // Sincronizar FiveM
    const fivemLink = await prisma.fivemLink.findUnique({
      where: { guildId_discordId: { guildId: guild.id, discordId: targetUserId } }
    });

    let fivemResult = null;
    if (fivemLink) {
      fivemResult = await FiveMIntegrationService.syncRankChange({
        guildId: guild.id,
        passport: fivemLink.passport,
        discordId: targetUserId,
        oldRankId: profile.rankId || undefined,
        newRankId: newRank.id,
        executorId: authorMember.id,
        actionType: 'DEMOTE'
      });
    }

    // Transação no Banco
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.policeProfile.update({
        where: { id: profile.id },
        data: { rankId: newRank.id }
      });

      await tx.demotionHistory.create({
        data: {
          profileId: profile.id,
          previousRank: previousRankName,
          newRank: newRank.name,
          reason,
          authorId: authorMember.id,
          protocol
        }
      });
    });

    await AuditLogService.logAction({
      guildId: guild.id,
      executorId: authorMember.id,
      targetId: targetUserId,
      action: 'RH_REBAIXAR',
      protocol,
      details: `Rebaixamento: ${previousRankName} ➔ ${newRank.name}. FiveM: ${fivemResult?.status || 'Sem Vínculo'}. Motivo: ${reason}`,
      client: guild.client
    });

    return { protocol, previousRank: previousRankName, newRank: newRank.name, fivemResult };
  }

  /**
   * Transfere um policial para outra unidade
   */
  public static async transferPolice(options: TransferOptions) {
    const { guild, authorMember, targetUserId, newUnitId, reason } = options;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: targetUserId } },
      include: { unit: true }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado na base funcional.');
    }

    const newUnit = await prisma.unit.findUnique({ where: { id: newUnitId } });
    if (!newUnit) {
      throw new Error('Unidade de destino não encontrada.');
    }

    const previousUnitName = profile.unit ? profile.unit.name : 'Geral';
    const protocol = await ProtocolGenerator.generate('TRF', guild.id);

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      if (profile.unit?.discordRoleId) {
        await targetMember.roles.remove(profile.unit.discordRoleId).catch(() => null);
      }
      if (newUnit.discordRoleId) {
        await targetMember.roles.add(newUnit.discordRoleId).catch(() => null);
      }
    }

    // Sincronizar FiveM
    const fivemLink = await prisma.fivemLink.findUnique({
      where: { guildId_discordId: { guildId: guild.id, discordId: targetUserId } }
    });

    let fivemResult = null;
    if (fivemLink) {
      fivemResult = await FiveMIntegrationService.syncTransfer({
        guildId: guild.id,
        passport: fivemLink.passport,
        discordId: targetUserId,
        oldUnitId: profile.unitId || undefined,
        newUnitId: newUnit.id,
        executorId: authorMember.id
      });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.policeProfile.update({
        where: { id: profile.id },
        data: { unitId: newUnit.id }
      });

      await tx.transferHistory.create({
        data: {
          profileId: profile.id,
          previousUnit: previousUnitName,
          newUnit: newUnit.name,
          reason,
          authorId: authorMember.id,
          protocol
        }
      });
    });

    await AuditLogService.logAction({
      guildId: guild.id,
      executorId: authorMember.id,
      targetId: targetUserId,
      action: 'RH_TRANSFERIR',
      protocol,
      details: `Transferência: ${previousUnitName} ➔ ${newUnit.name}. FiveM: ${fivemResult?.status || 'Sem Vínculo'}. Motivo: ${reason}`,
      client: guild.client
    });

    return { protocol, previousUnit: previousUnitName, newUnit: newUnit.name, fivemResult };
  }

  /**
   * Altera status funcional do policial (Afastado, Licenciado, Suspenso, Férias, Ativo)
   */
  public static async updateStatus(options: AbsenceOptions) {
    const { guildId, authorId, targetUserId, newStatus, reason } = options;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId: targetUserId } }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado na base funcional.');
    }

    const protocol = await ProtocolGenerator.generate('SIT', guildId);

    await prisma.policeProfile.update({
      where: { id: profile.id },
      data: { status: newStatus }
    });

    await AuditLogService.logAction({
      guildId,
      executorId: authorId,
      targetId: targetUserId,
      action: 'RH_STATUS',
      protocol,
      details: `Status alterado de ${profile.status} para ${newStatus}. Motivo: ${reason}`
    });

    return { protocol, previousStatus: profile.status, newStatus };
  }

  /**
   * Exoneração sincronizada de policial: remove cargos no Discord, grupos no FiveM,
   * encerra pontos e viaturas ativas, altera status para EXONERADO e preserva todo o histórico.
   */
  public static async dismissPolice(options: DismissalOptions) {
    const { guild, authorMember, targetUserId, reason } = options;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId: targetUserId } },
      include: { rank: true, unit: true }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado na base funcional.');
    }

    if (profile.status === PoliceStatus.EXONERADO) {
      throw new Error('Este policial já se encontra exonerado.');
    }

    const protocol = await ProtocolGenerator.generate('EXO', guild.id);

    // 1. Remover cargos policiais no Discord
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      const rolesToRemove: string[] = [];
      if (profile.rank?.discordRoleId) rolesToRemove.push(profile.rank.discordRoleId);
      if (profile.unit?.discordRoleId) rolesToRemove.push(profile.unit.discordRoleId);

      if (rolesToRemove.length > 0) {
        await targetMember.roles.remove(rolesToRemove).catch((e) => {
          logger.warn(`Falha ao remover cargos na exoneração: ${e.message}`);
        });
      }
    }

    // 2. Sincronizar exoneração no FiveM
    const fivemLink = await prisma.fivemLink.findUnique({
      where: { guildId_discordId: { guildId: guild.id, discordId: targetUserId } }
    });

    let fivemResult = null;
    if (fivemLink) {
      fivemResult = await FiveMIntegrationService.syncDismissal({
        guildId: guild.id,
        passport: fivemLink.passport,
        discordId: targetUserId,
        currentRankId: profile.rankId || undefined,
        currentUnitId: profile.unitId || undefined,
        executorId: authorMember.id
      });
    }

    // 3. Transação no Banco: encerra pontos ativos e grava histórico de exoneração
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.dutySession.updateMany({
        where: { profileId: profile.id, isActive: true },
        data: { isActive: false, endTime: new Date() }
      });

      await tx.policeProfile.update({
        where: { id: profile.id },
        data: {
          status: PoliceStatus.EXONERADO,
          rankId: null,
          unitId: null
        }
      });

      await tx.dismissalHistory.create({
        data: {
          profileId: profile.id,
          reason,
          authorId: authorMember.id,
          protocol
        }
      });
    });

    // 4. Log de Auditoria
    await AuditLogService.logAction({
      guildId: guild.id,
      executorId: authorMember.id,
      targetId: targetUserId,
      action: 'RH_EXONERAR',
      protocol,
      details: `Exoneração de ${profile.operationalName} (Matrícula: ${profile.badgeNumber}). FiveM: ${fivemResult?.status || 'Sem Vínculo'}. Motivo: ${reason}`,
      client: guild.client
    });

    return { protocol, badgeNumber: profile.badgeNumber, operationalName: profile.operationalName, fivemResult };
  }

  /**
   * Consulta o histórico funcional consolidado
   */
  public static async getFullHistory(guildId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } },
      include: {
        rank: true,
        unit: true,
        fivemLink: true,
        promotions: { orderBy: { createdAt: 'desc' } },
        demotions: { orderBy: { createdAt: 'desc' } },
        transfers: { orderBy: { createdAt: 'desc' } },
        dismissals: { orderBy: { createdAt: 'desc' } },
        absences: { orderBy: { createdAt: 'desc' } }
      }
    });

    return profile;
  }
}
