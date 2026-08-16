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

export const apreensaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('apreensao')
    .setDescription('Registra um auto de apreensão de armas, drogas, valores, veículos ou materiais ilícitos.'),
  category: 'operational',
  requiredPermissions: [Permissions.OPERACIONAL_APREENSAO],
  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('operational_modal_apreensao')
      .setTitle('Auto de Apreensão de Materiais');

    const inputLocation = new TextInputBuilder()
      .setCustomId('location')
      .setLabel('Local da Apreensão')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Favela da Barragem / Zona Sul')
      .setRequired(true);

    const inputCategory = new TextInputBuilder()
      .setCustomId('category')
      .setLabel('Categoria Principal (Armas/Drogas/Valores/Outros)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Armas de Fogo e Drogas')
      .setRequired(true);

    const inputItems = new TextInputBuilder()
      .setCustomId('items_list')
      .setLabel('Descrição dos Itens e Quantidades')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('2x Fuzil AK-47\n500x Munição 7.62\n5kg Cocaína\nR$ 12.000 em espécie\n1x Veículo Honda Civic')
      .setRequired(true);

    const inputNotes = new TextInputBuilder()
      .setCustomId('notes')
      .setLabel('Procedimento / Destinação do Material')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Encaminhado ao Instituto de Criminalística / Depósito Judicial...')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputLocation),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputCategory),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputItems),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputNotes)
    );

    await interaction.showModal(modal);
  }
};

export default apreensaoCommand;
