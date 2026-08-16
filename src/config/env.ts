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
    TOKEN,
    DISCORD_CLIENT_ID,
    CLIENT_ID,
    DISCORD_GUILD_ID,
    GUILD_ID,
    DATABASE_URL,
    NODE_ENV = 'development',
    LOG_LEVEL = 'info',
    INSTITUTION_NAME = 'SECRETARIA DE SEGURANÇA PÚBLICA',
    STATE_NAME = 'ESTADO DE SÃO PAULO'
  } = process.env;

  const resolvedToken = DISCORD_TOKEN || TOKEN || '';
  const resolvedClientId = DISCORD_CLIENT_ID || CLIENT_ID || '';
  const resolvedGuildId = DISCORD_GUILD_ID || GUILD_ID || undefined;

  if (!resolvedToken) {
    console.warn('⚠️ AVISO: DISCORD_TOKEN não foi configurado no ambiente.');
  }

  if (!resolvedClientId) {
    console.warn('⚠️ AVISO: CLIENT_ID não foi configurado no ambiente.');
  }

  return {
    DISCORD_TOKEN: resolvedToken,
    DISCORD_CLIENT_ID: resolvedClientId,
    DISCORD_GUILD_ID: resolvedGuildId,
    DATABASE_URL: DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/botssp?schema=public',
    NODE_ENV: NODE_ENV as 'development' | 'production' | 'test',
    LOG_LEVEL,
    INSTITUTION_NAME,
    STATE_NAME
  };
}

export const ENV = validateEnv();
