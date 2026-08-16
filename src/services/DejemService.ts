import { DejemSession } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class DejemService {
  /**
   * Cria uma nova escala de serviço extraordinário DEJEM
   */
  public static async createDejem(data: {
    guildId: string;
    date: Date;
    startTime: string;
    endTime: string;
    vacancies: number;
    unitName: string;
    requirements?: string;
    creatorId: string;
  }): Promise<DejemSession> {
    return prisma.dejemSession.create({
      data: {
        guildId: data.guildId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        vacancies: data.vacancies,
        unitName: data.unitName,
        requirements: data.requirements,
        creatorId: data.creatorId
      }
    });
  }

  /**
   * Inscreve um policial na escala DEJEM
   */
  public static async joinDejem(dejemId: string, userId: string) {
    const dejem = await prisma.dejemSession.findUnique({
      where: { id: dejemId },
      include: { members: true }
    });

    if (!dejem) throw new Error('Escala DEJEM não localizada.');

    if (dejem.members.length >= dejem.vacancies) {
      throw new Error('O limite de vagas desta escala DEJEM já foi atingido.');
    }

    const alreadyJoined = dejem.members.some((m) => m.userId === userId);
    if (alreadyJoined) {
      throw new Error('Você já está inscrito nesta escala DEJEM.');
    }

    return prisma.dejemMember.create({
      data: {
        dejemId,
        userId
      }
    });
  }

  /**
   * Cancela a inscrição do policial na escala DEJEM
   */
  public static async leaveDejem(dejemId: string, userId: string) {
    return prisma.dejemMember.deleteMany({
      where: {
        dejemId,
        userId
      }
    });
  }

  /**
   * Lista escalas ativas da DEJEM
   */
  public static async listActiveDejem(guildId: string) {
    return prisma.dejemSession.findMany({
      where: { guildId },
      include: { members: true },
      orderBy: { date: 'asc' }
    });
  }

  /**
   * Constrói o Embed institucional da escala DEJEM
   */
  public static async buildDejemEmbed(dejemId: string) {
    const dejem = await prisma.dejemSession.findUnique({
      where: { id: dejemId },
      include: { members: true }
    });

    if (!dejem) throw new Error('Escala DEJEM não localizada.');

    const vacanciesLeft = dejem.vacancies - dejem.members.length;
    const membersList =
      dejem.members.length > 0
        ? dejem.members.map((m, idx) => `${idx + 1}. <@${m.userId}>`).join('\n')
        : '*Nenhum policial voluntário inscrito até o momento.*';

    const embed = InstitutionalEmbedBuilder.create({
      title: `Escala DEJEM • ${dejem.unitName}`,
      status: vacanciesLeft > 0 ? `${vacanciesLeft} Vagas Disponíveis` : 'Vagas Esgotadas',
      color: vacanciesLeft > 0 ? COLORS.SUCCESS : COLORS.WARNING,
      responsible: `<@${dejem.creatorId}>`,
      description:
        `**INFORMAÇÕES DA DIÁRIA ESPECIAL (DEJEM):**\n\n` +
        `• **Data da Escala:** <t:${Math.floor(dejem.date.getTime() / 1000)}:D>\n` +
        `• **Horário Previsto:** \`${dejem.startTime}\` às \`${dejem.endTime}\`\n` +
        `• **Unidade Solicitante:** \`${dejem.unitName}\`\n` +
        `• **Vagas Totais:** \`${dejem.vacancies}\` | **Disponíveis:** \`${vacanciesLeft}\`\n` +
        (dejem.requirements ? `• **Requisitos:** *${dejem.requirements}*\n` : '') +
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**POLICIAIS INSCRITOS:**\n${membersList}\n\n` +
        `*A participação no DEJEM é voluntária e sujeita à homologação da chefia imediata.*`
    });

    return embed;
  }
}
