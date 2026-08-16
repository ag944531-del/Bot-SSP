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

export const operacaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('operacao')
    .setDescription('Registra o relatório final de uma Operação Policial Tática.'),
  category: 'operational',
  requiredPermissions: [Permissions.OPERACIONAL_OPERACAO],
  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('operational_modal_operacao')
      .setTitle('Relatório de Operação Policial');

    const inputName = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Nome da Operação Tática')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Operação Muralha de Aço / Cerco Fechado')
      .setRequired(true);

    const inputUnit = new TextInputBuilder()
      .setCustomId('unit_name')
      .setLabel('Unidade / Batalhão Responsável')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1º Batalhão de Choque - ROTA')
      .setRequired(true);

    const inputObjective = new TextInputBuilder()
      .setCustomId('objective')
      .setLabel('Objetivo e Planejamento Operacional')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Combate ao crime organizado e cumprimento de mandados na região leste...')
      .setRequired(true);

    const inputResults = new TextInputBuilder()
      .setCustomId('results')
      .setLabel('Resultado / Prisões / Apreensões')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('8 prisões realizadas, 15kg de drogas apreendidas, 3 armas de fogo recuperadas...')
      .setRequired(true);

    const inputEfetivo = new TextInputBuilder()
      .setCustomId('officers_vehicles')
      .setLabel('Efetivo e Viaturas Empregadas')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('24 policiais | Viaturas: RO-01, RO-02, RO-03, Choque-10')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputName),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputUnit),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputObjective),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputResults),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputEfetivo)
    );

    await interaction.showModal(modal);
  }
};

export default operacaoCommand;
