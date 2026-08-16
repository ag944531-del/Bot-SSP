import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { CopomStatus } from '@prisma/client';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { CopomService } from '../../services/CopomService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const copomOpenModalVtrButton: ButtonInteractionHandler = {
  customId: 'copom_open_modal_vtr',
  requiredPermissions: [Permissions.COPOM_CRIAR_VIATURA],
  async execute(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('copom_modal_create_vtr')
      .setTitle('Despacho de Nova Viatura • COPOM');

    const inputPrefix = new TextInputBuilder()
      .setCustomId('prefix')
      .setLabel('Prefixo da Viatura (ex: CG-01, RO-102)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: CG-01')
      .setRequired(true);

    const inputModel = new TextInputBuilder()
      .setCustomId('vehicle_model')
      .setLabel('Modelo do Veículo')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Trailblazer 4x4')
      .setRequired(false);

    const inputArea = new TextInputBuilder()
      .setCustomId('area')
      .setLabel('Área / Setor de Patrulhamento')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Setor Sul / Bairro Jardins')
      .setRequired(false);

    const inputNotes = new TextInputBuilder()
      .setCustomId('notes')
      .setLabel('Observações Táticas / Frequência do Rádio')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Canal Rádio: COPOM 1 | Frequência 102.5...')
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputPrefix),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputModel),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputArea),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputNotes)
    );

    await interaction.showModal(modal);
  }
};

export const copomRefreshButton: ButtonInteractionHandler = {
  customId: 'copom_refresh',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const { embed } = await CopomService.buildCopomEmbed(interaction.guildId);

    await interaction.update({
      embeds: [embed]
    });
  }
};

export const handlers = [copomOpenModalVtrButton, copomRefreshButton];
export default handlers;
