import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const painelRhCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('rh')
    .setDescription('Abre o painel central de gestão de Recursos Humanos (RH).'),
  category: 'rh',
  requiredPermissions: [Permissions.RH_CADASTRAR],
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Diretoria de Recursos Humanos (RH)',
      status: 'Central de Gestão',
      color: COLORS.PRIMARY,
      description:
        `Central de controle de efetivo, promoções, transferências e assentamentos funcionais.\n\n` +
        `**OPERAÇÕES FUNCIONAIS DISPONÍVEIS:**\n` +
        `• **Cadastrar:** Admissão e geração de matrícula funcional;\n` +
        `• **Promover:** Evolução de patente e nível hierárquico;\n` +
        `• **Transferir:** Movimentação entre batalhões e unidades;\n` +
        `• **Afastar / Reintegrar:** Gestão de férias, licenças e serviço ativo;\n` +
        `• **Exonerar:** Desativação e encerramento funcional com segurança.\n\n` +
        `Utilize os botões abaixo ou os comandos dedicados (\`/promover\`, \`/transferir\`, \`/exonerar\`, etc.).`
    });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('rh_open_modal:cadastrar')
        .setLabel('Novo Cadastro')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📋'),
      new ButtonBuilder()
        .setCustomId('rh_open_modal:promover')
        .setLabel('Promover')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⭐'),
      new ButtonBuilder()
        .setCustomId('rh_open_modal:transferir')
        .setLabel('Transferir')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🏢')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('rh_open_modal:afastar')
        .setLabel('Afastar / Licença')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏱️'),
      new ButtonBuilder()
        .setCustomId('rh_open_modal:reintegrar')
        .setLabel('Reintegrar')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('rh_open_modal:exonerar')
        .setLabel('Exonerar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚫')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  }
};

export default painelRhCommand;
