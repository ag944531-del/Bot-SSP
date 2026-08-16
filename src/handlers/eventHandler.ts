import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { EventListener } from '../@types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadEvents(client: Client, eventsDir: string = path.join(__dirname, '../events')) {
  if (!fs.existsSync(eventsDir)) {
    logger.warn(`Diretório de eventos não encontrado: ${eventsDir}`);
    return;
  }

  let eventCount = 0;

  const readFolder = async (dir: string) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        await readFolder(fullPath);
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        try {
          const moduleUrl = pathToFileURL(fullPath).href;
          const imported = await import(moduleUrl);
          const event: EventListener = imported.default || imported.event;

          if (event && event.name && typeof event.execute === 'function') {
            if (event.once) {
              client.once(event.name, (...args) => event.execute(...args, client));
            } else {
              client.on(event.name, (...args) => event.execute(...args, client));
            }
            eventCount++;
          }
        } catch (err) {
          logger.error(`Erro ao carregar evento ${fullPath}:`, err);
        }
      }
    }
  };

  await readFolder(eventsDir);
  logger.info(`📡 Total de ${eventCount} ouvinte(s) de evento registrado(s).`);
}
