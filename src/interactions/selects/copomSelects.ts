import { StringSelectMenuInteraction } from 'discord.js';
import { CopomStatus } from '@prisma/client';
import { SelectMenuInteractionHandler } from '../../@types/index.js';
import { CopomService } from '../../services/CopomService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const copomStatusSelect: SelectMenuInteractionHandler = {
  customId: 'copom_status_select',
  requiredPermissions: [Permissions.COPOM_STATUS_VIATURA],
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    const select = interaction as StringSelectMenuInteraction;
    const patrolId = select.customId.split(':')[1];
    const newStatus = select.values[0] as CopomStatus;

    if (!patrolId || !newStatus) return;

    await CopomService.updateStatus(patrolId, newStatus);

    const successEmbed = InstitutionalEmbedBuilder.success(
      'Status Atualizado',
      `O status operacional da guarnição foi atualizado para \`${newStatus}\`.`
    );

    await select.reply({ embeds: [successEmbed], ephemeral: true });
  }
};

export const handlers = [copomStatusSelect];
export default handlers;
