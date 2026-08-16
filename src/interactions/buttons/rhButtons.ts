import {
  ActionRowBuilder,
  ButtonInteraction,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { RHService } from '../../services/RHService.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const confirmDismissalButton: ButtonInteractionHandler = {
  customId: 'confirm_dismissal',
  requiredPermissions: [Permissions.RH_EXONERAR],
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const parts = interaction.customId.split(':');
    const targetUserId = parts[1];
    const reason = parts[2] ? decodeURIComponent(parts[2]) : 'Decisão Administrativa';
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, targetUserId);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({
        content: `⛔ **Ação Negada:** ${hierarchyCheck.reason}`,
        ephemeral: true
      });
      return;
    }

    const result = await RHService.dismissPolice({
      guild: interaction.guild,
      authorMember,
      targetUserId,
      reason
    });

    const successEmbed = InstitutionalEmbedBuilder.create({
      title: 'Exoneração Funcional Efetivada',
      status: 'Exonerado',
      protocol: result.protocol,
      color: COLORS.DANGER,
      responsible: authorMember,
      description:
        `O policial <@${targetUserId}> foi exonerado com sucesso da corporação.\n\n` +
        `• **Nome:** \`${result.operationalName}\`\n` +
        `• **Matrícula:** \`${result.badgeNumber}\`\n` +
        `• **Fundamentação:** ${reason}\n\n` +
        `*Os cargos foram removidos e o ponto/patrulhamento encerrado no sistema.*`
    });

    await interaction.update({
      embeds: [successEmbed],
      components: []
    });
  }
};

export const cancelActionButton: ButtonInteractionHandler = {
  customId: 'cancel_action',
  async execute(interaction: ButtonInteraction) {
    await interaction.update({
      content: '❌ **Operação cancelada pelo operador.**',
      embeds: [],
      components: []
    });
  }
};

export const rhOpenModalButton: ButtonInteractionHandler = {
  customId: 'rh_open_modal',
  requiredPermissions: [Permissions.RH_CADASTRAR],
  async execute(interaction: ButtonInteraction) {
    const modalType = interaction.customId.split(':')[1];

    if (modalType === 'cadastrar') {
      const modal = new ModalBuilder()
        .setCustomId('rh_modal_cadastrar')
        .setTitle('Cadastro Funcional de Policial');

      const inputUserId = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('Discord ID do Policial')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 284729102938475829')
        .setRequired(true);

      const inputName = new TextInputBuilder()
        .setCustomId('full_name')
        .setLabel('Nome Completo')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Obscuro Gomes da Silva')
        .setRequired(true);

      const inputOpName = new TextInputBuilder()
        .setCustomId('op_name')
        .setLabel('Nome Operacional / De Guerra')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: Gomes')
        .setRequired(true);

      const inputBadge = new TextInputBuilder()
        .setCustomId('badge_number')
        .setLabel('Matrícula Funcional')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 00135')
        .setRequired(true);

      const inputPassport = new TextInputBuilder()
        .setCustomId('passport_id')
        .setLabel('Passaporte / ID (Opcional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1245')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputUserId),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputName),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputOpName),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputBadge),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputPassport)
      );

      await interaction.showModal(modal);
      return;
    }

    if (modalType === 'promover') {
      const modal = new ModalBuilder()
        .setCustomId('rh_modal_promover')
        .setTitle('Promoção Funcional');

      const inputUserId = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('Discord ID do Policial')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputRank = new TextInputBuilder()
        .setCustomId('new_rank')
        .setLabel('Nova Patente (Nome ou Sigla)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputReason = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Motivo / Justificativa')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputUserId),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputRank),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputReason)
      );

      await interaction.showModal(modal);
      return;
    }

    if (modalType === 'transferir') {
      const modal = new ModalBuilder()
        .setCustomId('rh_modal_transferir')
        .setTitle('Transferência de Unidade');

      const inputUserId = new TextInputBuilder()
        .setCustomId('user_id')
        .setLabel('Discord ID do Policial')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputUnit = new TextInputBuilder()
        .setCustomId('new_unit')
        .setLabel('Nova Unidade (Sigla)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputReason = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Motivo da Transferência')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputUserId),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputUnit),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputReason)
      );

      await interaction.showModal(modal);
      return;
    }

    await interaction.reply({
      content: `Para esta operação, utilize os comandos diretos: \`/afastar\`, \`/reintegrar\` ou \`/exonerar\`.`,
      ephemeral: true
    });
  }
};

export const handlers = [confirmDismissalButton, cancelActionButton, rhOpenModalButton];
export default handlers;
