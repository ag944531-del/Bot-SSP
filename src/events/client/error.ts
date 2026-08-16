import { Events } from 'discord.js';
import { EventListener } from '../../@types/index.js';
import { logger } from '../../utils/logger.js';

export const errorEvent: EventListener = {
  name: Events.Error,
  async execute(error: Error) {
    logger.error('⚠️ Erro detectado no Discord Client:', error);
  }
};

export default errorEvent;
