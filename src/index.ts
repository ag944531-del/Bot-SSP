import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { ENV } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, prisma } from './database/prisma.js';
import { loadEvents } from './handlers/eventHandler.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadInteractions } from './handlers/interactionHandler.js';
import { startApiServer } from './api/server.js';

// ==========================================
// TRATAMENTO GLOBAL DE EXCEÇÕES DO PROCESSO
// ==========================================
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Exceção Não Tratada (uncaughtException):', error);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('💥 Rejeição de Promise Não Tratada (unhandledRejection):', reason);
});

// ==========================================
// INICIALIZAÇÃO DO CLIENT DISCORD
// ==========================================
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.User,
    Partials.GuildMember,
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

async function bootstrap() {
  logger.info('🚀 Inicializando Plataforma de Segurança Pública (ERP Discord + Web)...');

  // 1. Conectar ao Banco de Dados PostgreSQL
  await connectDatabase();

  // 2. Iniciar Servidor da API RESTful e Dashboard Web
  startApiServer();

  // 3. Carregar Handlers do Discord
  await loadCommands();
  await loadInteractions();
  await loadEvents(client);

  // 4. Autenticação no Discord
  if (!ENV.DISCORD_TOKEN) {
    logger.warn('⚠️ DISCORD_TOKEN não configurado no .env. O Dashboard Web e API permanecerão ativos.');
    return;
  }

  try {
    await client.login(ENV.DISCORD_TOKEN);
  } catch (error) {
    logger.error('❌ Falha ao autenticar o bot no Discord:', error);
  }
}

// ==========================================
// FINALIZAÇÃO GRACIOSA (GRACEFUL SHUTDOWN)
// ==========================================
const shutdown = async () => {
  logger.warn('🛑 Sinal de encerramento recebido. Desconectando serviços com segurança...');
  try {
    await client.destroy();
    await prisma.$disconnect();
    logger.info('👋 Processos finalizados com sucesso.');
    process.exit(0);
  } catch (err) {
    logger.error('Erro durante o encerramento:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap();
