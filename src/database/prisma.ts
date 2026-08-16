import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

export const prisma =
  global.prismaInstance ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('📦 Banco de Dados PostgreSQL conectado com sucesso via Prisma ORM.');
    return true;
  } catch (error) {
    logger.error('❌ Falha ao conectar ao Banco de Dados PostgreSQL:', error);
    return false;
  }
}
