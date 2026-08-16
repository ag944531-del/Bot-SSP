import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  ButtonInteractionHandler,
  SelectMenuInteractionHandler,
  ModalInteractionHandler,
  BaseInteractionHandler
} from '../@types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const buttons = new Collection<string | RegExp, ButtonInteractionHandler>();
export const selects = new Collection<string | RegExp, SelectMenuInteractionHandler>();
export const modals = new Collection<string | RegExp, ModalInteractionHandler>();

async function loadInteractiveComponents<T extends BaseInteractionHandler>(
  dir: string,
  collection: Collection<string | RegExp, T>
) {
  collection.clear();
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      await loadInteractiveComponents(fullPath, collection);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
      try {
        const moduleUrl = pathToFileURL(fullPath).href;
        const imported = await import(moduleUrl);
        const handlers: T | T[] = imported.default || imported.handlers || imported.handler;

        if (Array.isArray(handlers)) {
          for (const h of handlers) {
            if (h && h.customId) {
              collection.set(h.customId, h);
            }
          }
        } else if (handlers && handlers.customId) {
          collection.set(handlers.customId, handlers);
        }
      } catch (err) {
        logger.error(`Erro ao carregar componente de interação ${fullPath}:`, err);
      }
    }
  }
}

export async function loadInteractions(baseDir: string = path.join(__dirname, '../interactions')) {
  await Promise.all([
    loadInteractiveComponents(path.join(baseDir, 'buttons'), buttons),
    loadInteractiveComponents(path.join(baseDir, 'selects'), selects),
    loadInteractiveComponents(path.join(baseDir, 'modals'), modals)
  ]);

  logger.info(
    `🔘 Componentes Interativos carregados: ${buttons.size} botões, ${selects.size} selects, ${modals.size} modais.`
  );
}

export function findHandler<T extends BaseInteractionHandler>(
  collection: Collection<string | RegExp, T>,
  customId: string
): T | undefined {
  // 1. Match exato
  if (collection.has(customId)) {
    return collection.get(customId);
  }

  // 2. Match por RegExp ou prefixo
  for (const [key, handler] of collection.entries()) {
    if (key instanceof RegExp && key.test(customId)) {
      return handler;
    }
    if (typeof key === 'string' && key.includes(':') && customId.startsWith(key.split(':')[0] + ':')) {
      return handler;
    }
  }

  return undefined;
}
