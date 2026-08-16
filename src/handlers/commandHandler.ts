import { Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { SlashCommand } from '../@types/index.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Collection<string, SlashCommand>();

export async function loadCommands(commandsDir: string = path.join(__dirname, '../commands')): Promise<Collection<string, SlashCommand>> {
  commands.clear();

  if (!fs.existsSync(commandsDir)) {
    logger.warn(`Diretório de comandos não encontrado: ${commandsDir}`);
    return commands;
  }

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
          const command: SlashCommand = imported.default || imported.command;

          if (command && command.data && typeof command.execute === 'function') {
            commands.set(command.data.name, command);
            logger.debug(`Comando carregado: /${command.data.name}`);
          }
        } catch (err) {
          logger.error(`Erro ao carregar comando ${fullPath}:`, err);
        }
      }
    }
  };

  await readFolder(commandsDir);
  logger.info(`⚡ Total de ${commands.size} slash command(s) carregado(s) com sucesso.`);
  return commands;
}
