import { prisma } from '../database/prisma.js';
import { AuditService } from './AuditService.js';

export class TemporaryPermissionService {
  /**
   * Concede uma permissão temporária a um membro com data/hora de expiração
   */
  public static async grantTemporaryPermission(params: {
    guildId: string;
    userId: string;
    permission: string;
    grantedById: string;
    reason: string;
    expiresAt: Date;
  }) {
    const record = await prisma.temporaryPermission.create({
      data: {
        guildId: params.guildId,
        userId: params.userId,
        permission: params.permission,
        grantedById: params.grantedById,
        reason: params.reason,
        expiresAt: params.expiresAt,
        isActive: true
      }
    });

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.grantedById,
      targetId: params.userId,
      action: 'PERMISSAO_TEMPORARIA_CONCEDIDA',
      module: 'SEGURANCA',
      reason: `Permissão ${params.permission} concedida até ${params.expiresAt.toLocaleString('pt-BR')}. Motivo: ${params.reason}`
    });

    return record;
  }

  /**
   * Cadastra uma substituição administrativa de função
   */
  public static async createSubstitution(params: {
    guildId: string;
    titularId: string;
    substituteId: string;
    roleName: string;
    permissions: string[];
    grantedById: string;
    reason: string;
    expiresAt: Date;
  }) {
    const permissionsString = params.permissions.join(',');

    const record = await prisma.temporarySubstitution.create({
      data: {
        guildId: params.guildId,
        titularId: params.titularId,
        substituteId: params.substituteId,
        roleName: params.roleName,
        permissions: permissionsString,
        grantedById: params.grantedById,
        reason: params.reason,
        expiresAt: params.expiresAt,
        isActive: true
      }
    });

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.grantedById,
      targetId: params.substituteId,
      action: 'SUBSTITUICAO_FUNCAO_DESIGNADA',
      module: 'SEGURANCA',
      reason: `Substituição de ${params.roleName} (Titular: <@${params.titularId}>) até ${params.expiresAt.toLocaleString('pt-BR')}`
    });

    return record;
  }

  /**
   * Verifica se o usuário possui permissão temporária válida ou decorrente de substituição
   */
  public static async hasActiveTemporaryPermission(guildId: string, userId: string, permission: string): Promise<boolean> {
    const now = new Date();

    // 1. Checar permissões temporárias diretas
    const direct = await prisma.temporaryPermission.findFirst({
      where: {
        guildId,
        userId,
        permission,
        isActive: true,
        expiresAt: { gt: now }
      }
    });

    if (direct) return true;

    // 2. Checar permissões por substituição de função
    const substitutions = await prisma.temporarySubstitution.findMany({
      where: {
        guildId,
        substituteId: userId,
        isActive: true,
        expiresAt: { gt: now }
      }
    });

    for (const sub of substitutions) {
      const perms = sub.permissions.split(',').map((p) => p.trim());
      if (perms.includes(permission) || perms.includes('ADMIN.MASTER')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Lista permissões temporárias ativas
   */
  public static async listActivePermissions(guildId: string) {
    const now = new Date();
    return await prisma.temporaryPermission.findMany({
      where: {
        guildId,
        isActive: true,
        expiresAt: { gt: now }
      },
      orderBy: { expiresAt: 'asc' }
    });
  }

  /**
   * Lista substituições ativas
   */
  public static async listActiveSubstitutions(guildId: string) {
    const now = new Date();
    return await prisma.temporarySubstitution.findMany({
      where: {
        guildId,
        isActive: true,
        expiresAt: { gt: now }
      },
      orderBy: { expiresAt: 'asc' }
    });
  }
}
