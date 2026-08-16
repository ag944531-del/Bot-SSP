import { prisma } from '../database/prisma.js';

export interface CreateGoalInput {
  guildId: string;
  title: string;
  category: string;
  targetValue: number;
  unit: string;
  period: string;
  startDate: Date;
  endDate: Date;
}

export class GoalService {
  /**
   * Cria uma meta institucional
   */
  public static async createGoal(input: CreateGoalInput) {
    return await prisma.systemGoal.create({
      data: {
        guildId: input.guildId,
        title: input.title,
        category: input.category,
        targetValue: input.targetValue,
        unit: input.unit,
        period: input.period,
        startDate: input.startDate,
        endDate: input.endDate,
        currentValue: 0,
        isActive: true
      }
    });
  }

  /**
   * Atualiza o progresso de uma meta
   */
  public static async incrementGoalProgress(guildId: string, category: string, value: number) {
    const activeGoals = await prisma.systemGoal.findMany({
      where: { guildId, category, isActive: true }
    });

    for (const goal of activeGoals) {
      await prisma.systemGoal.update({
        where: { id: goal.id },
        data: {
          currentValue: goal.currentValue + value
        }
      });
    }
  }

  /**
   * Lista as metas vigentes
   */
  public static async listGoals(guildId: string) {
    return await prisma.systemGoal.findMany({
      where: { guildId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
