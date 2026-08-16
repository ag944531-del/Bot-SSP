import { Client, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { EmbedPresets } from '../utils/embedBuilder.js';
import { logger } from '../utils/logger.js';

export interface AuditLogInput {
  guildId: string;
  executorId: string;
  executorName?: string;
  executorRole?: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  protocol?: string;
  channelId?: string;
  interactionType?: string;
  details?: Record<string, any> | string;
  targetId?: string;
  client?: Client;
}

export class AuditService {
  /**
   * Registra uma ação administrativa de forma imutável e estruturada
   */
  public static async log(input: AuditLogInput) {
    try {
      const protocol = input.protocol || (await ProtocolService.generate('AUD', input.guildId));

      const detailsString =
        typeof input.details === 'object' ? JSON.stringify(input.details) : input.details;

      const record = await prisma.auditLog.create({
        data: {
          guildId: input.guildId,
          executorId: input.executorId,
          executorName: input.executorName,
          executorRole: input.executorRole,
          action: input.action,
          module: input.module || 'SISTEMA',
          entityType: input.entityType,
          entityId: input.entityId,
          previousValue: input.previousValue,
          newValue: input.newValue,
          reason: input.reason,
          protocol,
          channelId: input.channelId,
          interactionType: input.interactionType || 'SLASH_COMMAND',
          details: detailsString,
          targetId: input.targetId
        }
      });

      // Tentar enviar para o canal de auditoria se disponível
      if (input.client) {
        this.dispatchAuditEmbed(input.client, record).catch((err) => {
          logger.warn(`Falha ao despachar embed de auditoria para guild ${input.guildId}:`, err);
        });
      }

      logger.info(`[AUDITORIA] [${protocol}] ${input.action} por ${input.executorName || input.executorId} (${input.module})`);
      return record;
    } catch (error) {
      logger.error('Erro ao registrar log de auditoria:', error);
      throw error;
    }
  }

  /**
   * Despacha o embed institucional para o canal configurado de auditoria/logs
   */
  private static async dispatchAuditEmbed(client: Client, log: any) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: log.guildId }
    });

    const targetChannelId = settings?.auditChannelId || settings?.logsChannelId;
    if (!targetChannelId) return;

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased()) {
        const embed = EmbedPresets.primary(
          'AUDITORIA ADMINISTRATIVA',
          `Ação institucional registrada com rastreabilidade completa.\n**Protocolo:** \`${log.protocol}\``
        );

        embed.addFields(
          { name: 'Executor', value: `<@${log.executorId}> (${log.executorName || 'N/A'})`, inline: true },
          { name: 'Módulo', value: log.module || 'Geral', inline: true },
          { name: 'Ação', value: log.action, inline: true }
        );

        if (log.targetId) {
          embed.addFields({ name: 'Entidade / Alvo', value: `<@${log.targetId}> (${log.entityId || log.targetId})`, inline: true });
        }

        if (log.previousValue || log.newValue) {
          embed.addFields(
            { name: 'Anterior', value: `\`\`\`${log.previousValue || 'N/A'}\`\`\``, inline: true },
            { name: 'Novo', value: `\`\`\`${log.newValue || 'N/A'}\`\`\``, inline: true }
          );
        }

        if (log.reason) {
          embed.addFields({ name: 'Motivo', value: log.reason, inline: false });
        }

        embed.setFooter({ text: `Protocolo: ${log.protocol} • Registro Imutável` });
        embed.setTimestamp(log.createdAt);

        await (channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (err) {
      logger.debug('Não foi possível despachar embed de auditoria:', err);
    }
  }

  /**
   * Consulta logs de auditoria com filtros avançados e paginação
   */
  public static async queryLogs(params: {
    guildId: string;
    executorId?: string;
    targetId?: string;
    module?: string;
    action?: string;
    protocol?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = { guildId: params.guildId };
    if (params.executorId) where.executorId = params.executorId;
    if (params.targetId) where.targetId = params.targetId;
    if (params.module) where.module = params.module;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.protocol) where.protocol = { contains: params.protocol, mode: 'insensitive' };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      })
    ]);

    return {
      total,
      page,
      totalPages: Math.ceil(total / pageSize) || 1,
      logs
    };
  }
}
