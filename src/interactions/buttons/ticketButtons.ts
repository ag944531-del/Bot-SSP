import {
  ActionRowBuilder,
  ButtonInteraction,
  GuildMember,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { TicketService } from '../../services/TicketService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const ticketClaimButton: ButtonInteractionHandler = {
  customId: 'ticket_claim',
  async execute(interaction: ButtonInteraction) {
    const ticketId = interaction.customId.split(':')[1];
    if (!ticketId || !interaction.member) return;

    try {
      const updated = await TicketService.claimTicket(ticketId, interaction.member as GuildMember);

      const embed = InstitutionalEmbedBuilder.success(
        'Atendimento Assumido',
        `O oficial <@${interaction.user.id}> assumiu a condução deste protocolo.\n\n` +
          `• **Protocolo:** \`${updated.protocol}\``
      );

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const ticketClosePromptButton: ButtonInteractionHandler = {
  customId: 'ticket_close_prompt',
  async execute(interaction: ButtonInteraction) {
    const ticketId = interaction.customId.split(':')[1];

    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_close:${ticketId}`)
      .setTitle('Encerramento de Atendimento');

    const inputReason = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Motivo / Conclusão do Atendimento')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Ex: Requerimento deferido e encaminhado ao RH / Dúvida sanada...')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(inputReason));

    await interaction.showModal(modal);
  }
};

export const handlers = [ticketClaimButton, ticketClosePromptButton];
export default handlers;
