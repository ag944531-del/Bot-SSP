import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Guild,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
  User
} from 'discord.js';
import { TicketStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export class TicketService {
  /**
   * Abre um novo ticket de atendimento com canal dedicado e protocolo oficial
   */
  public static async createTicket(guild: Guild, user: User, category: string) {
    // 1. Verificar se o usuário já possui ticket aberto na mesma categoria
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        guildId: guild.id,
        authorId: user.id,
        category,
        status: { in: [TicketStatus.ABERTO, TicketStatus.EM_ATENDIMENTO] }
      }
    });

    if (existingTicket) {
      const existingChannel = guild.channels.cache.get(existingTicket.channelId);
      if (existingChannel) {
        throw new Error(`Você já possui um protocolo ativo nesta categoria em <#${existingTicket.channelId}>.`);
      }
    }

    const protocol = await ProtocolGenerator.generate('TK', guild.id);
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });

    // Permissões do canal do ticket
    const permissionOverwrites: any[] = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ];

    // Adicionar cargo administrativo se configurado
    if (settings?.adminRoleId) {
      permissionOverwrites.push({
        id: settings.adminRoleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      });
    }

    const channelName = `tk-${category.toLowerCase().replace(/[^a-z0-9]/g, '')}-${user.username.slice(0, 10)}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: settings?.ticketsCategoryId || undefined,
      permissionOverwrites,
      topic: `Atendimento Oficial • Protocolo: ${protocol} • Solicitante: ${user.tag} (ID: ${user.id})`
    });

    const ticket = await prisma.ticket.create({
      data: {
        guildId: guild.id,
        protocol,
        channelId: channel.id,
        authorId: user.id,
        category,
        status: TicketStatus.ABERTO
      }
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: `Central de Atendimento • ${category.toUpperCase()}`,
      protocol,
      status: 'Aguardando Atendente',
      responsible: 'Setor Responsável',
      color: COLORS.INFO,
      description:
        `Olá <@${user.id}>, seu requerimento foi recebido com sucesso.\n\n` +
        `**INSTRUÇÕES OPERACIONAIS:**\n` +
        `• Descreva detalhadamente a sua solicitação, denúncia ou requerimento;\n` +
        `• Anexe imagens, documentos ou provas quando pertinente;\n` +
        `• Um oficial responsável assumirá este protocolo em breve.\n\n` +
        `*Todas as mensagens e anexos enviados aqui serão consolidados no transcript oficial de auditoria.*`
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_claim:${ticket.id}`)
        .setLabel('Assumir Protocolo')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🙋‍♂️'),
      new ButtonBuilder()
        .setCustomId(`ticket_close_prompt:${ticket.id}`)
        .setLabel('Encerrar Atendimento')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await channel.send({
      content: `<@${user.id}> • Notificação institucional gerada.`,
      embeds: [embed],
      components: [row]
    });

    return { ticket, channel };
  }

  /**
   * Assume o atendimento do ticket
   */
  public static async claimTicket(ticketId: string, officerMember: GuildMember) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket não localizado.');

    if (ticket.claimedById) {
      throw new Error(`Este atendimento já foi assumido por <@${ticket.claimedById}>.`);
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        claimedById: officerMember.id,
        status: TicketStatus.EM_ATENDIMENTO
      }
    });

    return updated;
  }

  /**
   * Encerra o ticket, gera transcript HTML completo, envia ao canal de logs e exclui o canal do Discord
   */
  public static async closeTicket(ticketId: string, closedBy: GuildMember, reason: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket não encontrado.');

    const guild = closedBy.guild;
    const channel = guild.channels.cache.get(ticket.channelId) as TextChannel | undefined;

    let transcriptHtml = '';
    let messageCount = 0;

    if (channel && channel.isTextBased()) {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sortedMessages = Array.from(messages.values()).reverse();
      messageCount = sortedMessages.length;

      // Construir Transcript em HTML Institucional
      transcriptHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Transcript Oficial • ${ticket.protocol}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #E2E8F0; margin: 0; padding: 20px; }
    .header { background-color: #1E293B; border-left: 5px solid #0284C7; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 10px 0; color: #38BDF8; font-size: 22px; text-transform: uppercase; }
    .header p { margin: 4px 0; font-size: 14px; color: #94A3B8; }
    .badge { background-color: #0369A1; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    .messages-container { display: flex; flex-direction: column; gap: 12px; }
    .msg { background-color: #1E293B; border-radius: 6px; padding: 12px; border: 1px solid #334155; }
    .msg-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .author { font-weight: bold; color: #38BDF8; }
    .timestamp { font-size: 12px; color: #64748B; }
    .content { line-height: 1.5; font-size: 14px; white-space: pre-wrap; }
    .attachments { margin-top: 8px; }
    .attachments a { color: #38BDF8; text-decoration: underline; font-size: 13px; }
    .footer { margin-top: 30px; text-align: center; color: #64748B; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Secretaria de Segurança Pública • Relatório de Atendimento</h1>
    <p><strong>PROTOCOLO OFICIAL:</strong> <span class="badge">${ticket.protocol}</span></p>
    <p><strong>CATEGORIA:</strong> ${ticket.category} | <strong>SOLICITANTE ID:</strong> ${ticket.authorId}</p>
    <p><strong>ENCERRADO POR:</strong> ${closedBy.displayName} | <strong>MOTIVO:</strong> ${reason}</p>
    <p><strong>DATA DE ENCERRAMENTO:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  </div>
  <div class="messages-container">
`;

      for (const m of sortedMessages) {
        const timeStr = m.createdAt.toLocaleString('pt-BR');
        let attachmentsStr = '';
        if (m.attachments.size > 0) {
          attachmentsStr = '<div class="attachments">';
          m.attachments.forEach((att) => {
            attachmentsStr += `<div>📎 <a href="${att.url}" target="_blank">${att.name}</a></div>`;
          });
          attachmentsStr += '</div>';
        }

        const safeContent = m.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        transcriptHtml += `
    <div class="msg">
      <div class="msg-header">
        <span class="author">${m.author.tag}</span>
        <span class="timestamp">${timeStr}</span>
      </div>
      <div class="content">${safeContent}</div>
      ${attachmentsStr}
    </div>`;
      }

      transcriptHtml += `
  </div>
  <div class="footer">
    Documento emitido automaticamente pelo Sistema Central de Segurança Pública • Protocolo ${ticket.protocol}
  </div>
</body>
</html>`;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.FECHADO,
        closedById: closedBy.id,
        closeReason: reason,
        closedAt: new Date()
      }
    });

    // Enviar notificação com anexo de transcript no canal de logs
    const settings = await prisma.guildSettings.findUnique({ where: { guildId: guild.id } });
    if (settings?.logsChannelId && transcriptHtml.length > 0) {
      const logsChannel = guild.channels.cache.get(settings.logsChannelId) as TextChannel | undefined;
      if (logsChannel?.isTextBased()) {
        const fileBuffer = Buffer.from(transcriptHtml, 'utf-8');
        const attachment = new AttachmentBuilder(fileBuffer, { name: `transcript-${ticket.protocol}.html` });

        const logEmbed = InstitutionalEmbedBuilder.create({
          title: `Atendimento Encerrado • ${ticket.category}`,
          protocol: ticket.protocol,
          status: 'Concluído e Arquivado',
          responsible: closedBy,
          color: COLORS.NEUTRAL,
          description:
            `**SOLICITANTE:** <@${ticket.authorId}>\n` +
            `**ATENDENTE RESPONSÁVEL:** ${ticket.claimedById ? `<@${ticket.claimedById}>` : '`Não assumido`'}\n` +
            `**MOTIVO DO ENCERRAMENTO:** ${reason}\n` +
            `**TOTAL DE MENSAGENS:** \`${messageCount}\`\n\n` +
            `📄 *O arquivo HTML do transcript foi anexado a este registro para fins de auditoria.*`
        });

        await logsChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => null);
      }
    }

    // Deletar o canal do ticket com timeout suave
    if (channel) {
      setTimeout(async () => {
        await channel.delete().catch(() => null);
      }, 5000);
    }

    return updated;
  }
}
