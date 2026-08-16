import { Client, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { EmbedPresets } from '../utils/embedBuilder.js';
import { AlertCategory, AlertStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface CreateAlertInput {
  guildId: string;
  category: AlertCategory;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  assignedToId?: string;
  client?: Client;
}

export class AlertService {
  /**
   * Dispara um alerta automático no sistema
   */
  public static async createAlert(input: CreateAlertInput) {
    const protocol = await ProtocolService.generate('ALR', input.guildId);

    const alert = await prisma.systemAlert.create({
      data: {
        guildId: input.guildId,
        protocol,
        category: input.category,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        assignedToId: input.assignedToId,
        status: AlertStatus.NOVO
      }
    });

    if (input.client) {
      this.dispatchAlertEmbed(input.client, alert).catch((err) => {
        logger.warn(`Falha ao despachar alerta para o canal da guild ${input.guildId}:`, err);
      });
    }

    return alert;
  }

  /**
   * Envia o alerta para o canal configurado de alertas da Guild
   */
  private static async dispatchAlertEmbed(client: Client, alert: any) {
    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: alert.guildId }
    });

    const targetChannelId = settings?.alertsChannelId || settings?.logsChannelId;
    if (!targetChannelId) return;

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (channel && channel.isTextBased()) {
        const embed = EmbedPresets.attention(
          `ALERTA DO SISTEMA [${alert.category}]`,
          `**Protocolo:** \`${alert.protocol}\`\n**Título:** ${alert.title}\n\n${alert.message}`
        );

        if (alert.assignedToId) {
          embed.addFields({ name: 'Responsável Designado', value: `<@${alert.assignedToId}>`, inline: true });
        }

        embed.setFooter({ text: `Central de Alertas • Status: ${alert.status}` });
        embed.setTimestamp(alert.createdAt);

        await (channel as TextChannel).send({ embeds: [embed] });
      }
    } catch (err) {
      logger.debug('Não foi possível despachar embed de alerta:', err);
    }
  }

  /**
   * Lista alertas ativos com filtros
   */
  public static async listAlerts(guildId: string, status?: AlertStatus) {
    const where: any = { guildId };
    if (status) where.status = status;

    return await prisma.systemAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  /**
   * Atualiza status de um alerta (Visualizar, Resolver, Ignorar)
   */
  public static async updateAlertStatus(params: {
    alertId: string;
    status: AlertStatus;
    resolvedById: string;
  }) {
    return await prisma.systemAlert.update({
      where: { id: params.alertId },
      data: {
        status: params.status,
        resolvedById: params.resolvedById,
        resolvedAt: params.status === AlertStatus.RESOLVIDO ? new Date() : undefined
      }
    });
  }
}
