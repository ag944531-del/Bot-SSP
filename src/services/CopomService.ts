import { CopomStatus, Patrol } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { VehicleService } from './VehicleService.js';
import { InstitutionalEmbedBuilder } from '../utils/embedBuilder.js';
import { COLORS } from '../config/constants.js';

export class CopomService {
  /**
   * Cria uma nova guarnição/viatura na Rede COPOM
   */
  public static async createPatrol(data: {
    guildId: string;
    prefix: string;
    vehicleModel?: string;
    commanderId: string;
    driverId?: string;
    area?: string;
    notes?: string;
  }): Promise<Patrol> {
    const activePatrol = await prisma.patrol.findFirst({
      where: {
        guildId: data.guildId,
        prefix: data.prefix.toUpperCase(),
        isActive: true
      }
    });

    if (activePatrol) {
      throw new Error(`A viatura de prefixo \`${data.prefix.toUpperCase()}\` já se encontra em serviço na Rede COPOM.`);
    }

    const commanderProfile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: data.guildId, userId: data.commanderId } }
    });

    return prisma.$transaction(async (tx) => {
      const patrol = await tx.patrol.create({
        data: {
          guildId: data.guildId,
          prefix: data.prefix.toUpperCase(),
          vehicleModel: data.vehicleModel,
          commanderId: data.commanderId,
          driverId: data.driverId,
          area: data.area,
          notes: data.notes,
          copomStatus: CopomStatus.PATRULHAMENTO,
          isActive: true
        }
      });

      if (commanderProfile) {
        await tx.patrolMember.create({
          data: {
            patrolId: patrol.id,
            profileId: commanderProfile.id
          }
        });
      }

      await tx.vehicle.updateMany({
        where: { guildId: data.guildId, prefix: data.prefix.toUpperCase() },
        data: { status: 'EM_PATRULHAMENTO' }
      });

      return patrol;
    });
  }

  /**
   * Adiciona um policial à guarnição da viatura
   */
  public static async joinPatrol(guildId: string, patrolId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });

    if (!profile) {
      throw new Error('Policial não cadastrado no sistema.');
    }

    const patrol = await prisma.patrol.findUnique({
      where: { id: patrolId },
      include: { members: true }
    });

    if (!patrol || !patrol.isActive) {
      throw new Error('Guarnição não está mais ativa.');
    }

    const alreadyMember = patrol.members.some((m) => m.profileId === profile.id && !m.leftAt);
    if (alreadyMember) {
      throw new Error('Você já faz parte desta guarnição.');
    }

    return prisma.patrolMember.create({
      data: {
        patrolId,
        profileId: profile.id
      }
    });
  }

  /**
   * Remove um policial da guarnição
   */
  public static async leavePatrol(guildId: string, patrolId: string, userId: string) {
    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId, userId } }
    });

    if (!profile) return;

    const activeMember = await prisma.patrolMember.findFirst({
      where: {
        patrolId,
        profileId: profile.id,
        leftAt: null
      }
    });

    if (activeMember) {
      await prisma.patrolMember.update({
        where: { id: activeMember.id },
        data: { leftAt: new Date() }
      });
    }
  }

  /**
   * Altera o status operacional da viatura no COPOM
   */
  public static async updateStatus(patrolId: string, newStatus: CopomStatus) {
    return prisma.patrol.update({
      where: { id: patrolId },
      data: { copomStatus: newStatus }
    });
  }

  /**
   * Encerra a viatura / patrulha e libera o veículo
   */
  public static async endPatrol(patrolId: string) {
    const patrol = await prisma.patrol.findUnique({
      where: { id: patrolId },
      include: { members: { include: { profile: true } } }
    });

    if (!patrol) return;

    const endTime = new Date();
    const durationMin = Math.max(1, Math.floor((endTime.getTime() - patrol.startTime.getTime()) / (1000 * 60)));

    await prisma.$transaction(async (tx) => {
      await tx.patrol.update({
        where: { id: patrolId },
        data: {
          isActive: false,
          endTime,
          durationMin,
          copomStatus: CopomStatus.INDISPONIVEL
        }
      });

      await tx.patrolMember.updateMany({
        where: { patrolId, leftAt: null },
        data: { leftAt: endTime }
      });

      // Incrementar patrulhas nos perfis
      for (const m of patrol.members) {
        await tx.policeProfile.update({
          where: { id: m.profileId },
          data: { totalPatrols: { increment: 1 } }
        });
      }

      await tx.vehicle.updateMany({
        where: { guildId: patrol.guildId, prefix: patrol.prefix },
        data: { status: 'DISPONIVEL' }
      });
    });

    return { patrol, durationMin };
  }

  /**
   * Gera o Embed institucional com o quadro ao vivo da Rede COPOM
   */
  public static async buildCopomEmbed(guildId: string) {
    const activePatrols = await prisma.patrol.findMany({
      where: { guildId, isActive: true },
      include: {
        members: {
          where: { leftAt: null },
          include: { profile: { include: { rank: true } } }
        }
      },
      orderBy: { prefix: 'asc' }
    });

    let desc = `**CENTRAL DE DESPACHO E MONITORAMENTO TÁTICO — REDE COPOM**\n\n`;

    if (activePatrols.length === 0) {
      desc += `*Nenhuma viatura em serviço operacional no momento.*\n` +
        `Para despachar uma nova viatura, clique em **Criar VTR** abaixo.`;
    } else {
      activePatrols.forEach((p) => {
        let statusBadge = `\`🟢 DISPONÍVEL\``;
        if (p.copomStatus === CopomStatus.PATRULHAMENTO) statusBadge = `\`🚓 EM PATRULHAMENTO\``;
        else if (p.copomStatus === CopomStatus.DESLOCAMENTO) statusBadge = `\`🔄 EM DESLOCAMENTO\``;
        else if (p.copomStatus === CopomStatus.EM_OCORRENCIA) statusBadge = `\`🚨 EM OCORRÊNCIA\``;
        else if (p.copomStatus === CopomStatus.ACOMPANHAMENTO) statusBadge = `\`🏎️ ACOMPANHAMENTO\``;
        else if (p.copomStatus === CopomStatus.CODIGO_VERMELHO) statusBadge = `\`🔴 CÓDIGO VERMELHO\``;
        else if (p.copomStatus === CopomStatus.RETORNO_A_BASE) statusBadge = `\`🏠 RETORNO À BASE\``;

        const membersList = p.members.map((m) => `${m.profile.rank?.abbreviation || ''} ${m.profile.operationalName}`).join(', ');

        desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `**VTR ${p.prefix}** (${p.vehicleModel || 'Viatura Tática'})\n` +
          `• **Status:** ${statusBadge}\n` +
          `• **Comandante:** <@${p.commanderId}>\n` +
          `• **Guarnição (${p.members.length}):** ${membersList || 'Solo'}\n` +
          (p.area ? `• **Área / Setor:** \`${p.area}\`\n` : '') +
          `• **ID da VTR:** \`${p.id}\`\n`;
      });
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Rede Central de Despacho • COPOM',
      status: `${activePatrols.length} VTRs em Serviço`,
      color: COLORS.PRIMARY,
      description: desc
    });

    return { embed, activePatrols };
  }
}
