import {
  ActionRowBuilder,
  ButtonInteraction,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { GuildConfigService } from '../../services/GuildConfigService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const configRolesMenuButton: ButtonInteractionHandler = {
  customId: 'config_roles_menu',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ButtonInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Parametrização de Cargos Setoriais',
      status: 'Configuração',
      color: COLORS.PRIMARY,
      description:
        `Selecione o cargo que deseja vincular a cada setor institucional.\n` +
        `Membros com estes cargos terão acesso automático aos respectivos painéis e comandos operacionais.`
    });

    const selectAdmin = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_set_role:adminRoleId')
        .setPlaceholder('Definir Cargo de Administração Central')
        .setMaxValues(1)
    );

    const selectRh = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_set_role:rhRoleId')
        .setPlaceholder('Definir Cargo de Recursos Humanos (RH)')
        .setMaxValues(1)
    );

    const selectCorregedoria = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_set_role:corregedoriaRoleId')
        .setPlaceholder('Definir Cargo da Corregedoria Geral')
        .setMaxValues(1)
    );

    const selectCopom = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_set_role:copomRoleId')
        .setPlaceholder('Definir Cargo do COPOM / Despacho')
        .setMaxValues(1)
    );

    const selectAcademy = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('config_set_role:academyRoleId')
        .setPlaceholder('Definir Cargo da Escola de Formação')
        .setMaxValues(1)
    );

    await interaction.reply({
      embeds: [embed],
      components: [selectAdmin, selectRh, selectCorregedoria, selectCopom, selectAcademy],
      ephemeral: true
    });
  }
};

export const configChannelsMenuButton: ButtonInteractionHandler = {
  customId: 'config_channels_menu',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ButtonInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Parametrização de Canais Oficiais',
      status: 'Configuração',
      color: COLORS.PRIMARY,
      description:
        `Selecione os canais de texto correspondentes para publicação automática dos registros, relatórios e auditorias.`
    });

    const selectLogs = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('config_set_channel:logsChannelId')
        .setPlaceholder('Canal de Auditoria e Logs')
        .setChannelTypes(ChannelType.GuildText)
        .setMaxValues(1)
    );

    const selectBulletins = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('config_set_channel:bulletinChannelId')
        .setPlaceholder('Canal de Boletins Gerais (BG)')
        .setChannelTypes(ChannelType.GuildText)
        .setMaxValues(1)
    );

    const selectArrests = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('config_set_channel:arrestsChannelId')
        .setPlaceholder('Canal de Registro de Prisões')
        .setChannelTypes(ChannelType.GuildText)
        .setMaxValues(1)
    );

    const selectOccurrences = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('config_set_channel:occurrencesChannelId')
        .setPlaceholder('Canal de Registro de Ocorrências')
        .setChannelTypes(ChannelType.GuildText)
        .setMaxValues(1)
    );

    const selectSuggestions = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('config_set_channel:suggestionsChannelId')
        .setPlaceholder('Canal de Sugestões')
        .setChannelTypes(ChannelType.GuildText)
        .setMaxValues(1)
    );

    await interaction.reply({
      embeds: [embed],
      components: [selectLogs, selectBulletins, selectArrests, selectOccurrences, selectSuggestions],
      ephemeral: true
    });
  }
};

export const configRefreshButton: ButtonInteractionHandler = {
  customId: 'config_refresh',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const settings = await GuildConfigService.getOrCreateSettings(interaction.guildId, interaction.guild.name);

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Configurações Institucionais do Sistema',
      status: 'Painel Administrativo',
      color: COLORS.PRIMARY,
      description:
        `Painel atualizado em tempo real.\n\n` +
        `**CARGOS SETORIAIS DEFINIDOS:**\n` +
        `• **Administração Central:** ${settings.adminRoleId ? `<@&${settings.adminRoleId}>` : '`Não Definido`'}\n` +
        `• **Recursos Humanos (RH):** ${settings.rhRoleId ? `<@&${settings.rhRoleId}>` : '`Não Definido`'}\n` +
        `• **Corregedoria Geral:** ${settings.corregedoriaRoleId ? `<@&${settings.corregedoriaRoleId}>` : '`Não Definido`'}\n` +
        `• **Central COPOM:** ${settings.copomRoleId ? `<@&${settings.copomRoleId}>` : '`Não Definido`'}\n` +
        `• **Escola de Formação:** ${settings.academyRoleId ? `<@&${settings.academyRoleId}>` : '`Não Definido`'}\n\n` +
        `**CANAIS DE AUDITORIA E REGISTROS:**\n` +
        `• **Canal de Logs:** ${settings.logsChannelId ? `<#${settings.logsChannelId}>` : '`Não Definido`'}\n` +
        `• **Boletins Oficiais:** ${settings.bulletinChannelId ? `<#${settings.bulletinChannelId}>` : '`Não Definido`'}\n` +
        `• **Registro de Prisões:** ${settings.arrestsChannelId ? `<#${settings.arrestsChannelId}>` : '`Não Definido`'}\n` +
        `• **Registro de Ocorrências:** ${settings.occurrencesChannelId ? `<#${settings.occurrencesChannelId}>` : '`Não Definido`'}\n` +
        `• **Canal de Sugestões:** ${settings.suggestionsChannelId ? `<#${settings.suggestionsChannelId}>` : '`Não Definido`'}`
    });

    await interaction.update({ embeds: [embed] });
  }
};

export const handlers = [configRolesMenuButton, configChannelsMenuButton, configRefreshButton];
export default handlers;
