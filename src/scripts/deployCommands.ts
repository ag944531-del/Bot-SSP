import { REST, Routes } from 'discord.js';
import { loadCommands, commands } from '../handlers/commandHandler.js';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function deploy() {
  if (!ENV.DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN não fornecido. Não é possível registrar os comandos.');
    process.exit(1);
  }

  if (!ENV.DISCORD_CLIENT_ID) {
    logger.error('DISCORD_CLIENT_ID não fornecido. Não é possível registrar os comandos.');
    process.exit(1);
  }

  logger.info('Carregando comandos para deploy...');
  await loadCommands();

  const commandData = Array.from(commands.values()).map((cmd) => cmd.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(ENV.DISCORD_TOKEN);

  try {
    logger.info(`Iniciando registro de ${commandData.length} slash commands na API do Discord...`);

    if (ENV.DISCORD_GUILD_ID) {
      logger.info(`Registrando comandos especificamente na Guild: ${ENV.DISCORD_GUILD_ID}`);
      await rest.put(
        Routes.applicationGuildCommands(ENV.DISCORD_CLIENT_ID, ENV.DISCORD_GUILD_ID),
        { body: commandData }
      );
    } else {
      logger.info('Registrando comandos GLOBALMENTE (pode levar alguns minutos para propagação)...');
      await rest.put(
        Routes.applicationCommands(ENV.DISCORD_CLIENT_ID),
        { body: commandData }
      );
    }

    logger.info('✅ Comandos registrados com sucesso!');
  } catch (error) {
    logger.error('❌ Falha ao registrar comandos:', error);
  }
}

deploy();
