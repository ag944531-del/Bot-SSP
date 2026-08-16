import { GuildMember, ModalSubmitInteraction } from 'discord.js';
import { ModalInteractionHandler } from '../../@types/index.js';
import { TicketService } from '../../services/TicketService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const ticketModalClose: ModalInteractionHandler = {
  customId: 'ticket_modal_close',
  async execute(interaction: ModalSubmitInteraction) {
    const ticketId = interaction.customId.split(':')[1];
    const reason = interaction.fields.getTextInputValue('reason').trim();

    if (!ticketId || !interaction.member) return;

    await interaction.reply({
      content: '🔒 **Encerrando atendimento, consolidando transcript e arquivando canal...**',
      ephemeral: true
    });

    try {
      await TicketService.closeTicket(ticketId, interaction.member as GuildMember, reason);
    } catch (err: any) {
      await interaction.followUp({ content: `❌ Falha ao encerrar ticket: ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [ticketModalClose];
export default handlers;
