import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { DeadlineStatus } from '@prisma/client';

export class DeadlineService {
  /**
   * Registra ou atualiza o controle de prazo de um processo/entidade
   */
  public static async registerDeadline(params: {
    guildId: string;
    entityType: string;
    entityId: string;
    title: string;
    responsibleId: string;
    dueDate: Date;
  }) {
    const protocol = await ProtocolService.generate('DL', params.guildId);
    const now = new Date();
    const diffTime = params.dueDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: DeadlineStatus = DeadlineStatus.NORMAL;
    if (daysRemaining < 0) status = DeadlineStatus.VENCIDO;
    else if (daysRemaining <= 3) status = DeadlineStatus.URGENTE;
    else if (daysRemaining <= 7) status = DeadlineStatus.ATENCAO;

    const deadline = await prisma.deadlineRecord.create({
      data: {
        guildId: params.guildId,
        protocol,
        entityType: params.entityType,
        entityId: params.entityId,
        title: params.title,
        responsibleId: params.responsibleId,
        dueDate: params.dueDate,
        daysRemaining,
        status
      }
    });

    return deadline;
  }

  /**
   * Recalcula e lista todos os prazos ativos da Guild
   */
  public static async checkAllDeadlines(guildId: string) {
    const deadlines = await prisma.deadlineRecord.findMany({
      where: { guildId },
      orderBy: { dueDate: 'asc' }
    });

    const now = new Date();
    const updatedList = [];

    for (const d of deadlines) {
      const diffTime = d.dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: DeadlineStatus = DeadlineStatus.NORMAL;
      if (daysRemaining < 0) status = DeadlineStatus.VENCIDO;
      else if (daysRemaining <= 3) status = DeadlineStatus.URGENTE;
      else if (daysRemaining <= 7) status = DeadlineStatus.ATENCAO;

      const updated = await prisma.deadlineRecord.update({
        where: { id: d.id },
        data: { daysRemaining, status }
      });

      updatedList.push(updated);
    }

    return updatedList;
  }

  /**
   * Busca prazos críticos (Atenção, Urgente, Vencido)
   */
  public static async getCriticalDeadlines(guildId: string) {
    const list = await this.checkAllDeadlines(guildId);
    return list.filter((d) => d.status !== DeadlineStatus.NORMAL);
  }
}
