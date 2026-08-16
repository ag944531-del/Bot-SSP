import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { CopomService } from '../../services/CopomService.js';
import { Permissions } from '../../permissions/permissions.js';

export const copomCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('copom')
    .setDescription('Exibe o painel central ao vivo de viaturas e despacho da Rede COPOM.'),
  category: 'copom',
  requiredPermissions: [Permissions.COPOM_DESPACHAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const { embed } = await CopomService.buildCopomEmbed(interaction.guildId);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('copom_open_modal_vtr')
        .setLabel('Criar / Despachar VTR')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚓'),
      new ButtonBuilder()
        .setCustomId('copom_refresh')
        .setLabel('Atualizar Quadro')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};

export default copomCommand;
