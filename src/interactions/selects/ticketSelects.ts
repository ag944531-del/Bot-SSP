import { StringSelectMenuInteraction } from 'discord.js';
import { SelectMenuInteractionHandler } from '../../@types/index.js';
import { TicketService } from '../../services/TicketService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const ticketCategorySelect: SelectMenuInteractionHandler = {
  customId: 'ticket_category_select',
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    const select = interaction as StringSelectMenuInteraction;
    if (!select.guild) return;

    const category = select.values[0];

    try {
      const { ticket, channel } = await TicketService.createTicket(select.guild, select.user, category);

      const successEmbed = InstitutionalEmbedBuilder.success(
        'Protocolo de Atendimento Gerado',
        `Seu canal de atendimento foi criado com sucesso em <#${channel.id}>.\n\n` +
          `• **Categoria:** \`${ticket.category}\`\n` +
          `• **Protocolo:** \`${ticket.protocol}\``,
        ticket.protocol
      );

      await select.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err: any) {
      await select.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [ticketCategorySelect];
export default handlers;
