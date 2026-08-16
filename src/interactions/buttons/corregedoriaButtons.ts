import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { CorregedoriaService } from '../../services/CorregedoriaService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const summonsConfirmButton: ButtonInteractionHandler = {
  customId: 'summons_confirm',
  async execute(interaction: ButtonInteraction) {
    const summonsId = interaction.customId.split(':')[1];
    if (!summonsId) return;

    try {
      await CorregedoriaService.respondSummons(summonsId, interaction.user.id, true);

      const embed = InstitutionalEmbedBuilder.success(
        'Ciência e Presença Confirmadas',
        `Sua confirmação de presença na audiência correcional foi devidamente protocolada e transmitida ao relator.`
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const summonsJustifyPromptButton: ButtonInteractionHandler = {
  customId: 'summons_justify_prompt',
  async execute(interaction: ButtonInteraction) {
    const summonsId = interaction.customId.split(':')[1];
    if (!summonsId) return;

    const modal = new ModalBuilder()
      .setCustomId(`summons_modal_justify:${summonsId}`)
      .setTitle('Justificativa de Ausência');

    const inputJustification = new TextInputBuilder()
      .setCustomId('justification')
      .setLabel('Motivo da Impossibilidade de Comparecimento')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: Escala de serviço inadiável em outra comarca / Atestado médico...')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(inputJustification));

    await interaction.showModal(modal);
  }
};

export const corregedoriaNavButton: ButtonInteractionHandler = {
  customId: 'corregedoria_open',
  requiredPermissions: [Permissions.CORREGEDORIA_CRIAR_IPM],
  async execute(interaction: ButtonInteraction) {
    const action = interaction.customId.split('_')[2];

    if (action === 'denuncia') {
      const modal = new ModalBuilder()
        .setCustomId('corregedoria_modal_denuncia')
        .setTitle('Registro de Notícia / Denúncia');

      const inputAccused = new TextInputBuilder()
        .setCustomId('accused_id')
        .setLabel('Discord ID do Policial Denunciado')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputFact = new TextInputBuilder()
        .setCustomId('fact')
        .setLabel('Relato Detalhado dos Fatos e Conduta')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const inputEvidence = new TextInputBuilder()
        .setCustomId('evidence')
        .setLabel('Provas, Testemunhas e Links')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputAccused),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputFact),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputEvidence)
      );

      await interaction.showModal(modal);
      return;
    }

    await interaction.reply({
      content: `Para esta operação, utilize o comando correspondente: \`/ipm\`, \`/pdo\`, \`/convocar\` ou \`/sancao\`.`,
      ephemeral: true
    });
  }
};

export const corregedoriaRefreshButton: ButtonInteractionHandler = {
  customId: 'corregedoria_refresh',
  requiredPermissions: [Permissions.CORREGEDORIA_CRIAR_IPM],
  async execute(interaction: ButtonInteraction) {
    await interaction.reply({
      content: '🔄 **Painel da Corregedoria Geral atualizado.**',
      ephemeral: true
    });
  }
};

export const handlers = [
  summonsConfirmButton,
  summonsJustifyPromptButton,
  corregedoriaNavButton,
  corregedoriaRefreshButton
];

export default handlers;
