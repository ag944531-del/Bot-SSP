import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { Permissions } from '../../permissions/permissions.js';

export const multaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('multa')
    .setDescription('Emite um auto de infração ou notificação de multa a um cidadão.'),
  category: 'operational',
  requiredPermissions: [Permissions.OPERACIONAL_MULTA],
  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('operational_modal_multa')
      .setTitle('Auto de Infração e Notificação');

    const inputCitizen = new TextInputBuilder()
      .setCustomId('citizen_name')
      .setLabel('Nome do Cidadão Autuado')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Carlos Eduardo')
      .setRequired(true);

    const inputDoc = new TextInputBuilder()
      .setCustomId('document_id')
      .setLabel('Documento / Passaporte / ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1048')
      .setRequired(false);

    const inputInfraction = new TextInputBuilder()
      .setCustomId('infraction')
      .setLabel('Infração / Conduta')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Excesso de velocidade / Direção perigosa')
      .setRequired(true);

    const inputAmount = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel('Valor da Autuação (R$)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5000')
      .setRequired(true);

    const inputDetails = new TextInputBuilder()
      .setCustomId('details')
      .setLabel('Artigo, Placa do Veículo e Observações')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Artigo: CTB 218 | Placa: ABC-1234 | Observações adicionais...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputCitizen),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputDoc),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputInfraction),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputAmount),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputDetails)
    );

    await interaction.showModal(modal);
  }
};

export default multaCommand;
