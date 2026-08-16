import { ActivityType, Client, Events } from 'discord.js';
import { EventListener } from '../../@types/index.js';
import { logger } from '../../utils/logger.js';
import { ENV } from '../../config/env.js';

export const readyEvent: EventListener = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    if (!client.user) return;

    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`👮 SISTEMA CENTRAL DE SEGURANÇA PÚBLICA INICIADO`);
    logger.info(`🤖 Autenticado como: ${client.user.tag} (ID: ${client.user.id})`);
    logger.info(`🌐 Servidores conectados: ${client.guilds.cache.size}`);
    logger.info(`🏛️ Órgão: ${ENV.INSTITUTION_NAME} - ${ENV.STATE_NAME}`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    client.user.setPresence({
      activities: [
        {
          name: 'Segurança Pública • /tablet',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });
  }
};

export default readyEvent;
