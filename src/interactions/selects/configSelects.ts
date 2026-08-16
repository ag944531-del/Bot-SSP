import { RoleSelectMenuInteraction, ChannelSelectMenuInteraction } from 'discord.js';
import { SelectMenuInteractionHandler } from '../../@types/index.js';
import { GuildConfigService } from '../../services/GuildConfigService.js';
import { AuditLogService } from '../../services/AuditLogService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const configSetRoleSelect: SelectMenuInteractionHandler = {
  customId: 'config_set_role',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction) {
    if (!interaction.isRoleSelectMenu()) return;
    const roleMenu = interaction as RoleSelectMenuInteraction;
    const fieldName = roleMenu.customId.split(':')[1];
    const selectedRoleId = roleMenu.values[0];
    const guildId = roleMenu.guildId;

    if (!guildId || !fieldName) return;

    await GuildConfigService.updateSettings(guildId, {
      [fieldName]: selectedRoleId
    });

    await AuditLogService.logAction({
      guildId,
      executorId: roleMenu.user.id,
      action: 'CONFIGURAR_CARGO',
      details: `Campo ${fieldName} atualizado para cargo <@&${selectedRoleId}>`,
      client: roleMenu.client
    });

    const successEmbed = InstitutionalEmbedBuilder.success(
      'Parâmetro Atualizado',
      `O cargo <@&${selectedRoleId}> foi vinculado com sucesso à função **${fieldName}**.`
    );

    await roleMenu.reply({ embeds: [successEmbed], ephemeral: true });
  }
};

export const configSetChannelSelect: SelectMenuInteractionHandler = {
  customId: 'config_set_channel',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction) {
    if (!interaction.isChannelSelectMenu()) return;
    const channelMenu = interaction as ChannelSelectMenuInteraction;
    const fieldName = channelMenu.customId.split(':')[1];
    const selectedChannelId = channelMenu.values[0];
    const guildId = channelMenu.guildId;

    if (!guildId || !fieldName) return;

    await GuildConfigService.updateSettings(guildId, {
      [fieldName]: selectedChannelId
    });

    await AuditLogService.logAction({
      guildId,
      executorId: channelMenu.user.id,
      action: 'CONFIGURAR_CANAL',
      details: `Campo ${fieldName} atualizado para canal <#${selectedChannelId}>`,
      client: channelMenu.client
    });

    const successEmbed = InstitutionalEmbedBuilder.success(
      'Parâmetro Atualizado',
      `O canal <#${selectedChannelId}> foi configurado com sucesso para a finalidade **${fieldName}**.`
    );

    await channelMenu.reply({ embeds: [successEmbed], ephemeral: true });
  }
};

export const handlers = [configSetRoleSelect, configSetChannelSelect];
export default handlers;
