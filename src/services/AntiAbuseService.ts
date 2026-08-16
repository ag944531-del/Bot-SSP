import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

interface ActionRecord {
  timestamp: number;
  action: string;
}

class AntiAbuseManager {
  private userActionHistory = new Map<string, ActionRecord[]>();

  /**
   * Monitora e valida se a ação do usuário ultrapassa o limiar de segurança antiabuso
   */
  public async trackAndValidate(params: {
    guildId: string;
    userId: string;
    action: string;
    threshold?: number;
    windowSeconds?: number;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const key = `${params.guildId}:${params.userId}`;
    const now = Date.now();
    const threshold = params.threshold || 5;
    const windowMs = (params.windowSeconds || 60) * 1000;

    let history = this.userActionHistory.get(key) || [];
    // Filtrar apenas ações dentro da janela de tempo
    history = history.filter((h) => now - h.timestamp < windowMs);

    history.push({ timestamp: now, action: params.action });
    this.userActionHistory.set(key, history);

    if (history.length > threshold) {
      // Registrar incidente de segurança
      const protocol = await ProtocolService.generate('INC', params.guildId);

      await prisma.securityIncident.create({
        data: {
          guildId: params.guildId,
          protocol,
          type: 'ACAO_EM_MASSA',
          severity: IncidentSeverity.ALTA,
          actorId: params.userId,
          description: `Disparo repetitivo de ${history.length} ações em menos de ${params.windowSeconds || 60}s. Ação recente: ${params.action}`,
          status: IncidentStatus.ABERTO
        }
      });

      logger.warn(`🚨 [ANTIABUSO] Limiar ultrapassado por <@${params.userId}> na guild ${params.guildId} [${protocol}]`);

      return {
        allowed: false,
        reason: `Mecanismo de Proteção Antiabuso: Você realizou muitas alterações em um curto intervalo de tempo. Ação bloqueada temporariamente para salvaguarda institucional.`
      };
    }

    return { allowed: true };
  }
}

export const AntiAbuseService = new AntiAbuseManager();
