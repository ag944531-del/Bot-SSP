import { Client } from 'discord.js';
import { prisma } from '../database/prisma.js';

export interface SystemHealthStatus {
  discord: 'ONLINE' | 'OFFLINE' | 'INSTAVEL';
  database: 'ONLINE' | 'OFFLINE';
  latencyMs: number;
  dbLatencyMs: number;
  uptimeFormatted: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  memoryUsageMb: number;
}

export class HealthService {
  /**
   * Executa diagnósticos de integridade do sistema e latência
   */
  public static async getSystemStatus(client: Client): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    let dbStatus: 'ONLINE' | 'OFFLINE' = 'ONLINE';
    let dbLatency = 0;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - startTime;
    } catch {
      dbStatus = 'OFFLINE';
      dbLatency = -1;
    }

    const discordLatency = Math.round(client.ws.ping);
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / (3600 * 24));
    const hours = Math.floor((uptimeSec % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);

    const mem = process.memoryUsage();
    const memoryMb = Math.round(mem.rss / (1024 * 1024));

    return {
      discord: client.ws.ping >= 0 ? 'ONLINE' : 'INSTAVEL',
      database: dbStatus,
      latencyMs: discordLatency,
      dbLatencyMs: dbLatency,
      uptimeFormatted: `${days}d ${hours}h ${minutes}m`,
      uptimeSeconds: uptimeSec,
      version: 'v1.4.2',
      environment: process.env.NODE_ENV === 'production' ? 'Produção' : 'Desenvolvimento',
      memoryUsageMb: memoryMb
    };
  }
}
