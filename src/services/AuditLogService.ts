import { Client, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { logger } from '../utils/logger.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export interface AuditLogOptions {
  guildId: string;
  executorId: string;
  targetId?: string;
  action: string;
  details?: string;
  protocol?: string;
  client?: Client;
}

export class AuditLogService {
  /**
   * Registra uma ação na base de auditoria e envia notificação no canal configurado
   */
  public static async logAction(options: AuditLogOptions): Promise<void> {
    try {
      const logRecord = await prisma.auditLog.create({
        data: {
          guildId: options.guildId,
          executorId: options.executorId,
          targetId: options.targetId,
          action: options.action,
          details: options.details,
          protocol: options.protocol
        }
      });

      if (options.client) {
        const settings = await prisma.guildSettings.findUnique({
          where: { guildId: options.guildId }
        });

        if (settings?.logsChannelId) {
          const channel = options.client.channels.cache.get(settings.logsChannelId) as TextChannel | undefined;
          if (channel && channel.isTextBased()) {
            const embed = InstitutionalEmbedBuilder.create({
              title: `Registro de Auditoria • ${options.action}`,
              protocol: options.protocol,
              responsible: `<@${options.executorId}>`,
              color: COLORS.NEUTRAL,
              description:
                `**AÇÃO EXECUTADA:** \`${options.action}\`\n` +
                (options.targetId ? `**ALVO AFETADO:** <@${options.targetId}>\n` : '') +
                (options.details ? `**DETALHES / MOTIVO:** ${options.details}\n` : '')
            });

            await channel.send({ embeds: [embed] }).catch((e) => {
              logger.warn(`Falha ao enviar log para canal ${settings.logsChannelId}: ${e.message}`);
            });
          }
        }
      }
    } catch (error) {
      logger.error('Falha ao registrar log de auditoria:', error);
    }
  }

  /**
   * Registra um erro de sistema na base para rastreabilidade
   */
  public static async logSystemError(errorCode: string, action: string, message: string, stack?: string, guildId?: string): Promise<void> {
    try {
      await prisma.systemErrorLog.create({
        data: {
          errorCode,
          action,
          message,
          stack,
          guildId
        }
      });
    } catch (err) {
      logger.error(`Falha ao salvar erro de sistema no banco (${errorCode}):`, err);
    }
  }
}
