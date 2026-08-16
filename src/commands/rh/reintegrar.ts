import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { PoliceStatus } from '@prisma/client';
import { SlashCommand } from '../../@types/index.js';
import { RHService } from '../../services/RHService.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const reintegrarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('reintegrar')
    .setDescription('Reintegra o policial ao serviço ativo após período de afastamento ou licença.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser reintegrado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Fundamentação do retorno às atividades').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_REINTEGRAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.member) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const reason = interaction.options.getString('motivo', true);
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guildId, authorMember, targetUser.id);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({
        content: `⛔ **Ação Negada:** ${hierarchyCheck.reason}`,
        ephemeral: true
      });
      return;
    }

    const result = await RHService.updateStatus({
      guildId: interaction.guildId,
      authorId: authorMember.id,
      targetUserId: targetUser.id,
      newStatus: PoliceStatus.ATIVO,
      reason
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Reintegração ao Serviço Ativo',
      `O policial <@${targetUser.id}> foi reintegrado ao quadro operacional ativo.\n\n` +
        `• **Situação Anterior:** \`${result.previousStatus}\`\n` +
        `• **Nova Situação:** \`ATIVO\`\n` +
        `• **Despacho:** ${reason}`,
      result.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export default reintegrarCommand;
