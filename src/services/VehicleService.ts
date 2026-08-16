import { Vehicle, VehicleStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';

export class VehicleService {
  /**
   * Cadastra uma nova viatura na frota
   */
  public static async createVehicle(data: {
    guildId: string;
    model: string;
    prefix: string;
    plate: string;
    unitId?: string;
    notes?: string;
  }): Promise<Vehicle> {
    return prisma.vehicle.create({
      data: {
        guildId: data.guildId,
        model: data.model,
        prefix: data.prefix.toUpperCase(),
        plate: data.plate.toUpperCase(),
        unitId: data.unitId,
        notes: data.notes
      }
    });
  }

  /**
   * Lista as viaturas do servidor
   */
  public static async listVehicles(guildId: string): Promise<Vehicle[]> {
    return prisma.vehicle.findMany({
      where: { guildId },
      include: { unit: true },
      orderBy: { prefix: 'asc' }
    });
  }

  /**
   * Atualiza a situação de uma viatura
   */
  public static async updateVehicleStatus(guildId: string, prefix: string, status: VehicleStatus): Promise<Vehicle> {
    return prisma.vehicle.update({
      where: { guildId_prefix: { guildId, prefix: prefix.toUpperCase() } },
      data: { status }
    });
  }

  /**
   * Busca viatura por prefixo
   */
  public static async findVehicle(guildId: string, prefix: string): Promise<Vehicle | null> {
    return prisma.vehicle.findUnique({
      where: { guildId_prefix: { guildId, prefix: prefix.toUpperCase() } },
      include: { unit: true }
    });
  }
}
