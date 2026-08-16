import { prisma } from '../database/prisma.js';
import { AuditService } from './AuditService.js';

export class EmergencyModeService {
  /**
   * Ativa ou desativa o Modo de Emergência (bloqueia alterações críticas e congela cargos)
   */
  public static async setEmergencyMode(params: {
    guildId: string;
    enabled: boolean;
    reason?: string;
    activatedById: string;
  }) {
    const updated = await prisma.guildSettings.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        emergencyMode: params.enabled,
        emergencyReason: params.reason,
        emergencyActivatedBy: params.activatedById
      },
      update: {
        emergencyMode: params.enabled,
        emergencyReason: params.reason,
        emergencyActivatedBy: params.activatedById
      }
    });

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.activatedById,
      action: params.enabled ? 'EMERGENCIA_ATIVADA' : 'EMERGENCIA_DESATIVADA',
      module: 'SEGURANCA',
      reason: params.reason || (params.enabled ? 'Ativação do protocolo de emergência' : 'Retorno à normalidade operacional')
    });

    return updated;
  }

  /**
   * Ativa ou desativa o Modo de Manutenção
   */
  public static async setMaintenanceMode(params: {
    guildId: string;
    enabled: boolean;
    reason?: string;
    activatedById: string;
  }) {
    const updated = await prisma.guildSettings.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        maintenanceMode: params.enabled,
        maintenanceReason: params.reason
      },
      update: {
        maintenanceMode: params.enabled,
        maintenanceReason: params.reason
      }
    });

    await AuditService.log({
      guildId: params.guildId,
      executorId: params.activatedById,
      action: params.enabled ? 'MANUTENCAO_ATIVADA' : 'MANUTENCAO_DESATIVADA',
      module: 'SISTEMA',
      reason: params.reason || (params.enabled ? 'Ativação de manutenção programada' : 'Fim do período de manutenção')
    });

    return updated;
  }

  /**
   * Verifica se a Guild está em modo de emergência
   */
  public static async isEmergencyActive(guildId: string): Promise<{ active: boolean; reason?: string }> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });

    if (settings && settings.emergencyMode) {
      return { active: true, reason: settings.emergencyReason || 'Protocolo de Emergência Institucional Ativo.' };
    }

    return { active: false };
  }

  /**
   * Verifica se a Guild está em modo de manutenção
   */
  public static async isMaintenanceActive(guildId: string): Promise<{ active: boolean; reason?: string }> {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId }
    });

    if (settings && settings.maintenanceMode) {
      return { active: true, reason: settings.maintenanceReason || 'O sistema encontra-se em manutenção programada.' };
    }

    return { active: false };
  }
}
