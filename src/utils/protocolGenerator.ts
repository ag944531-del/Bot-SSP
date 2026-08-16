import { prisma } from '../database/prisma.js';

export class ProtocolGenerator {
  /**
   * Gera um protocolo padronizado no formato: PREFIX-ANO-NUMERO (ex: PR-2026-000001)
   */
  public static async generate(prefix: string, guildId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${year}-${randomSuffix}`;
  }

  /**
   * Gera um código de rastreamento de erro: ERR-YYYYMMDD-HEX
   */
  public static generateErrorCode(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ERR-${dateStr}-${rand}`;
  }
}
