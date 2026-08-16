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

export const ocorrenciaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ocorrencia')
    .setDescription('Lavra um Boletim de Ocorrência Policial (BOP).'),
  category: 'operational',
  requiredPermissions: [Permissions.OPERACIONAL_OCORRENCIA],
  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('operational_modal_ocorrencia')
      .setTitle('Boletim de Ocorrência Policial');

    const inputType = new TextInputBuilder()
      .setCustomId('type')
      .setLabel('Natureza da Ocorrência (Tipo)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Roubo a Estabelecimento Comercial / Disparo de Arma')
      .setRequired(true);

    const inputLocation = new TextInputBuilder()
      .setCustomId('location')
      .setLabel('Local do Fato')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Av. Paulista, 1000 - Bela Vista')
      .setRequired(true);

    const inputInvolved = new TextInputBuilder()
      .setCustomId('involved')
      .setLabel('Envolvidos / Vítimas / Testemunhas')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Vítima: Maria / Suspeito: Não identificado')
      .setRequired(true);

    const inputGuarnicao = new TextInputBuilder()
      .setCustomId('officers')
      .setLabel('Policiais e Viaturas Envolvidas')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('VTR CG-01 | Sgt Gomes, Cb Ramos')
      .setRequired(true);

    const inputNarrative = new TextInputBuilder()
      .setCustomId('narrative')
      .setLabel('Dinâmica dos Fatos e Desfecho')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Descreva o atendimento, circunstâncias apuradas e o desfecho final da ocorrência...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputType),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputLocation),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputInvolved),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputGuarnicao),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputNarrative)
    );

    await interaction.showModal(modal);
  }
};

export default ocorrenciaCommand;
