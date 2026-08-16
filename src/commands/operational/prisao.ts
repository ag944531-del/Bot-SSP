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

export const prisaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('prisao')
    .setDescription('Lavra um auto de prisão em flagrante ou cumprimento de mandado.'),
  category: 'operational',
  requiredPermissions: [Permissions.OPERACIONAL_PRISAO],
  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('operational_modal_prisao')
      .setTitle('Auto de Prisão em Flagrante');

    const inputSuspect = new TextInputBuilder()
      .setCustomId('suspect_name')
      .setLabel('Nome do Acusado / Indiciado')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: João da Silva')
      .setRequired(true);

    const inputPassport = new TextInputBuilder()
      .setCustomId('passport_id')
      .setLabel('Passaporte / ID do Acusado')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5042')
      .setRequired(false);

    const inputArticles = new TextInputBuilder()
      .setCustomId('articles')
      .setLabel('Artigos Penais / Tipificação')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Art. 157 (Roubo), Art. 33 (Tráfico)')
      .setRequired(true);

    const inputPenalty = new TextInputBuilder()
      .setCustomId('penalty_months')
      .setLabel('Pena Total (em Meses / Serviços)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 30')
      .setRequired(true);

    const inputNarrative = new TextInputBuilder()
      .setCustomId('narrative')
      .setLabel('Local, VTR e Dinâmica da Ocorrência')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Local: Centro | VTR: CG-01 | Descrição dos fatos, provas e apreensões efetuadas...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputSuspect),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputPassport),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputArticles),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputPenalty),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputNarrative)
    );

    await interaction.showModal(modal);
  }
};

export default prisaoCommand;
