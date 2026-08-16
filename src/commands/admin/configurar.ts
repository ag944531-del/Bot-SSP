import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { GuildConfigService } from '../../services/GuildConfigService.js';
import { Permissions } from '../../permissions/permissions.js';

export const configurarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Painel de gestão e parametrização institucional do servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({
        content: 'Este comando só pode ser utilizado no âmbito de um servidor.',
        ephemeral: true
      });
      return;
    }

    const settings = await GuildConfigService.getOrCreateSettings(interaction.guildId, interaction.guild.name);

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Configurações Institucionais do Sistema',
      status: 'Painel Administrativo',
      color: COLORS.PRIMARY,
      description:
        `Bem-vindo à Central de Parametrização Institucional da Segurança Pública.\n\n` +
        `Selecione uma das opções abaixo para definir os cargos setoriais de autoridade e os canais oficiais de publicação.\n\n` +
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

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('config_roles_menu')
        .setLabel('Configurar Cargos')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🛡️'),
      new ButtonBuilder()
        .setCustomId('config_channels_menu')
        .setLabel('Configurar Canais')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📻'),
      new ButtonBuilder()
        .setCustomId('config_refresh')
        .setLabel('Atualizar Painel')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1],
      ephemeral: true
    });
  }
};

export default configurarCommand;
