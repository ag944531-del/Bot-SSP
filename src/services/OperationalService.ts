import { Client, TextChannel } from 'discord.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { ProtocolGenerator } from '../utils/protocolGenerator.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';
import { AuditLogService } from './AuditLogService.js';
import { logger } from '../utils/logger.js';

export class OperationalService {
  /**
   * Registra uma prisão em flagrante ou mandado
   */
  public static async registerArrest(data: {
    guildId: string;
    suspectName: string;
    passportId?: string;
    articles: string;
    penaltyMonths: number;
    fineAmount?: number;
    officerId: string;
    vehiclePrefix?: string;
    location: string;
    narrative: string;
    proofUrl?: string;
    notes?: string;
    client?: Client;
  }) {
    const protocol = await ProtocolGenerator.generate('PR', data.guildId);

    const arrest = await prisma.$transaction(async (tx) => {
      const created = await tx.arrest.create({
        data: {
          guildId: data.guildId,
          protocol,
          suspectName: data.suspectName,
          passportId: data.passportId,
          articles: data.articles,
          penaltyMonths: data.penaltyMonths,
          fineAmount: data.fineAmount ? new Prisma.Decimal(data.fineAmount) : new Prisma.Decimal(0),
          officerId: data.officerId,
          vehiclePrefix: data.vehiclePrefix,
          location: data.location,
          narrative: data.narrative,
          proofUrl: data.proofUrl,
          notes: data.notes
        }
      });

      // Incrementar contador de prisões do policial
      await tx.policeProfile.updateMany({
        where: { guildId: data.guildId, userId: data.officerId },
        data: { totalArrests: { increment: 1 } }
      });

      return created;
    });

    // Enviar notificação no canal oficial de prisões se configurado
    if (data.client) {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: data.guildId }
      });

      if (settings?.arrestsChannelId) {
        const channel = data.client.channels.cache.get(settings.arrestsChannelId) as TextChannel | undefined;
        if (channel?.isTextBased()) {
          const embed = InstitutionalEmbedBuilder.create({
            title: 'Auto de Prisão em Flagrante / Mandado',
            protocol,
            status: 'Detenção Homologada',
            responsible: `<@${data.officerId}>`,
            color: COLORS.DANGER,
            description:
              `**DADOS DO CUSTODIADO:**\n` +
              `• **Nome do Indiciado:** \`${data.suspectName}\`\n` +
              (data.passportId ? `• **Passaporte / ID:** \`${data.passportId}\`\n` : '') +
              `• **Local da Abordagem:** \`${data.location}\`\n` +
              (data.vehiclePrefix ? `• **Viatura Responsável:** \`${data.vehiclePrefix}\`\n` : '') +
              `\n**ENQUADRAMENTO PENAL:**\n` +
              `• **Artigos Infringidos:** \`${data.articles}\`\n` +
              `• **Pena Fixada:** \`${data.penaltyMonths} meses / serviços\`\n` +
              (data.fineAmount ? `• **Multa Fixada:** \`R$ ${data.fineAmount.toLocaleString('pt-BR')}\`\n` : '') +
              `\n**NARRATIVA DOS FATOS:**\n${data.narrative}\n` +
              (data.proofUrl ? `\n🔗 **Provas / Anexos:** [Visualizar Material](${data.proofUrl})` : '')
          });

          await channel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }

    return arrest;
  }

  /**
   * Registra um auto de infração / multa
   */
  public static async registerFine(data: {
    guildId: string;
    citizenName: string;
    documentId?: string;
    infraction: string;
    article: string;
    amount: number;
    officerId: string;
    vehiclePlate?: string;
    notes?: string;
  }) {
    const protocol = await ProtocolGenerator.generate('MT', data.guildId);

    const fine = await prisma.$transaction(async (tx) => {
      const created = await tx.fine.create({
        data: {
          guildId: data.guildId,
          protocol,
          citizenName: data.citizenName,
          documentId: data.documentId,
          infraction: data.infraction,
          article: data.article,
          amount: new Prisma.Decimal(data.amount),
          officerId: data.officerId,
          vehiclePlate: data.vehiclePlate,
          notes: data.notes
        }
      });

      await tx.policeProfile.updateMany({
        where: { guildId: data.guildId, userId: data.officerId },
        data: { totalFines: { increment: 1 } }
      });

      return created;
    });

    return fine;
  }

  /**
   * Registra uma apreensão de ilícitos/bens
   */
  public static async registerSeizure(data: {
    guildId: string;
    officerId: string;
    location: string;
    notes?: string;
    items: Array<{ category: string; name: string; quantity: number; details?: string }>;
  }) {
    const protocol = await ProtocolGenerator.generate('AP', data.guildId);

    return prisma.seizure.create({
      data: {
        guildId: data.guildId,
        protocol,
        officerId: data.officerId,
        location: data.location,
        notes: data.notes,
        items: {
          create: data.items.map((it) => ({
            category: it.category,
            name: it.name,
            quantity: it.quantity,
            details: it.details
          }))
        }
      },
      include: { items: true }
    });
  }

  /**
   * Registra um Boletim de Ocorrência Policial
   */
  public static async registerOccurrence(data: {
    guildId: string;
    type: string;
    location: string;
    involved: string;
    officers: string;
    vehicles?: string;
    narrative: string;
    result: string;
    proofUrl?: string;
    notes?: string;
    authorId: string;
    client?: Client;
  }) {
    const protocol = await ProtocolGenerator.generate('OC', data.guildId);

    const occurrence = await prisma.$transaction(async (tx) => {
      const created = await tx.occurrence.create({
        data: {
          guildId: data.guildId,
          protocol,
          type: data.type,
          location: data.location,
          involved: data.involved,
          officers: data.officers,
          vehicles: data.vehicles,
          narrative: data.narrative,
          result: data.result,
          proofUrl: data.proofUrl,
          notes: data.notes,
          authorId: data.authorId
        }
      });

      await tx.policeProfile.updateMany({
        where: { guildId: data.guildId, userId: data.authorId },
        data: { totalOccurrences: { increment: 1 } }
      });

      return created;
    });

    if (data.client) {
      const settings = await prisma.guildSettings.findUnique({
        where: { guildId: data.guildId }
      });

      if (settings?.occurrencesChannelId) {
        const channel = data.client.channels.cache.get(settings.occurrencesChannelId) as TextChannel | undefined;
        if (channel?.isTextBased()) {
          const embed = InstitutionalEmbedBuilder.create({
            title: `Boletim de Ocorrência Policial • ${data.type}`,
            protocol,
            status: 'Registrado',
            responsible: `<@${data.authorId}>`,
            color: COLORS.INFO,
            description:
              `**NATUREZA DA OCORRÊNCIA:** \`${data.type}\`\n` +
              `**LOCAL DOS FATOS:** \`${data.location}\`\n` +
              `**ENVOLVIDOS:** ${data.involved}\n` +
              `**EFETIVO / GUARNIÇÃO:** ${data.officers}\n` +
              (data.vehicles ? `**VIATURAS EMPREGADAS:** \`${data.vehicles}\`\n` : '') +
              `\n**HISTÓRICO / DINÂMICA DO FATO:**\n${data.narrative}\n\n` +
              `**DESFECHO / RESULTADO:**\n${data.result}` +
              (data.proofUrl ? `\n\n🔗 **Provas:** [Visualizar Registro](${data.proofUrl})` : '')
          });

          await channel.send({ embeds: [embed] }).catch(() => null);
        }
      }
    }

    return occurrence;
  }

  /**
   * Registra uma Operação Policial Tática
   */
  public static async registerOperation(data: {
    guildId: string;
    name: string;
    commanderId: string;
    unitName: string;
    officers: string;
    vehicles: string;
    planning: string;
    objective: string;
    result: string;
    arrestsCount?: number;
    seizuresInfo?: string;
    casualties?: string;
    notes?: string;
  }) {
    const protocol = await ProtocolGenerator.generate('OP', data.guildId);

    const operation = await prisma.$transaction(async (tx) => {
      const created = await tx.policeOperation.create({
        data: {
          guildId: data.guildId,
          protocol,
          name: data.name,
          commanderId: data.commanderId,
          unitName: data.unitName,
          officers: data.officers,
          vehicles: data.vehicles,
          planning: data.planning,
          objective: data.objective,
          result: data.result,
          arrestsCount: data.arrestsCount || 0,
          seizuresInfo: data.seizuresInfo,
          casualties: data.casualties,
          notes: data.notes
        }
      });

      await tx.policeProfile.updateMany({
        where: { guildId: data.guildId, userId: data.commanderId },
        data: { totalOperations: { increment: 1 } }
      });

      return created;
    });

    return operation;
  }
}
