import { Events, Interaction, GuildMember } from 'discord.js';
import { EventListener } from '../../@types/index.js';
import { commands } from '../../handlers/commandHandler.js';
import { buttons, selects, modals, findHandler } from '../../handlers/interactionHandler.js';
import { PermissionService } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { ProtocolGenerator } from '../../utils/protocolGenerator.js';
import { AuditLogService } from '../../services/AuditLogService.js';
import { logger } from '../../utils/logger.js';

export const interactionCreateEvent: EventListener = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    try {
      // 1. SLASH COMMANDS
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Comando /${interaction.commandName} não encontrado no registro.`);
          return;
        }

        // Validação de permissões internas
        if (command.requiredPermissions && command.requiredPermissions.length > 0 && interaction.inGuild() && interaction.member) {
          const member = interaction.member as GuildMember;
          for (const perm of command.requiredPermissions) {
            const hasPerm = await PermissionService.hasPermission(member, perm);
            if (!hasPerm) {
              const embed = InstitutionalEmbedBuilder.unauthorized(perm);
              await interaction.reply({ embeds: [embed], ephemeral: true });
              return;
            }
          }
        }

        await command.execute(interaction);
        return;
      }

      // 2. AUTOCOMPLETE
      if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (command && typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        }
        return;
      }

      // 3. BOTÕES
      if (interaction.isButton()) {
        const handler = findHandler(buttons, interaction.customId);
        if (!handler) {
          logger.debug(`Botão sem handler registrado: ${interaction.customId}`);
          return;
        }

        if (handler.requiredPermissions && handler.requiredPermissions.length > 0 && interaction.inGuild() && interaction.member) {
          const member = interaction.member as GuildMember;
          for (const perm of handler.requiredPermissions) {
            const hasPerm = await PermissionService.hasPermission(member, perm);
            if (!hasPerm) {
              const embed = InstitutionalEmbedBuilder.unauthorized(perm);
              await interaction.reply({ embeds: [embed], ephemeral: true });
              return;
            }
          }
        }

        await handler.execute(interaction);
        return;
      }

      // 4. SELECT MENUS
      if (interaction.isAnySelectMenu()) {
        const handler = findHandler(selects, interaction.customId);
        if (!handler) {
          logger.debug(`Select menu sem handler: ${interaction.customId}`);
          return;
        }

        if (handler.requiredPermissions && handler.requiredPermissions.length > 0 && interaction.inGuild() && interaction.member) {
          const member = interaction.member as GuildMember;
          for (const perm of handler.requiredPermissions) {
            const hasPerm = await PermissionService.hasPermission(member, perm);
            if (!hasPerm) {
              const embed = InstitutionalEmbedBuilder.unauthorized(perm);
              await interaction.reply({ embeds: [embed], ephemeral: true });
              return;
            }
          }
        }

        await handler.execute(interaction);
        return;
      }

      // 5. MODAIS
      if (interaction.isModalSubmit()) {
        const handler = findHandler(modals, interaction.customId);
        if (!handler) {
          logger.debug(`Modal sem handler: ${interaction.customId}`);
          return;
        }

        if (handler.requiredPermissions && handler.requiredPermissions.length > 0 && interaction.inGuild() && interaction.member) {
          const member = interaction.member as GuildMember;
          for (const perm of handler.requiredPermissions) {
            const hasPerm = await PermissionService.hasPermission(member, perm);
            if (!hasPerm) {
              const embed = InstitutionalEmbedBuilder.unauthorized(perm);
              await interaction.reply({ embeds: [embed], ephemeral: true });
              return;
            }
          }
        }

        await handler.execute(interaction);
        return;
      }
    } catch (error: any) {
      const errorCode = ProtocolGenerator.generateErrorCode();
      logger.error(`[${errorCode}] Erro ao processar interação:`, error);

      const guildId = interaction.guildId || undefined;
      await AuditLogService.logSystemError(
        errorCode,
        'interactionCreate',
        error?.message || 'Erro desconhecido',
        error?.stack,
        guildId
      );

      const errorEmbed = InstitutionalEmbedBuilder.systemError(errorCode);

      if (interaction.isRepliable()) {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => null);
        }
      }
    }
  }
};

export default interactionCreateEvent;
