import dotenv from 'dotenv';
dotenv.config();

export interface EnvConfig {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_GUILD_ID?: string;
  DATABASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: string;
  INSTITUTION_NAME: string;
  STATE_NAME: string;
}

export function validateEnv(): EnvConfig {
  const {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID,
    DATABASE_URL,
    NODE_ENV = 'development',
    LOG_LEVEL = 'info',
    INSTITUTION_NAME = 'SECRETARIA DE SEGURANÇA PÚBLICA',
    STATE_NAME = 'ESTADO DE SÃO PAULO'
  } = process.env;

  if (!DISCORD_TOKEN) {
    console.warn('⚠️ AVISO: DISCORD_TOKEN não foi configurado no arquivo .env');
  }

  if (!DISCORD_CLIENT_ID) {
    console.warn('⚠️ AVISO: DISCORD_CLIENT_ID não foi configurado no arquivo .env');
  }

  return {
    DISCORD_TOKEN: DISCORD_TOKEN || '',
    DISCORD_CLIENT_ID: DISCORD_CLIENT_ID || '',
    DISCORD_GUILD_ID: DISCORD_GUILD_ID || undefined,
    DATABASE_URL: DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/botssp?schema=public',
    NODE_ENV: NODE_ENV as 'development' | 'production' | 'test',
    LOG_LEVEL,
    INSTITUTION_NAME,
    STATE_NAME
  };
}

export const ENV = validateEnv();
