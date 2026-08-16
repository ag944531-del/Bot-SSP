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
import { COLORS } from '../../config/constants.js';

export const afastarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('afastar')
    .setDescription('Altera a situação funcional do policial para afastamento, licença, férias ou suspensão.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser afastado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('situacao')
        .setDescription('Nova situação funcional')
        .setRequired(true)
        .addChoices(
          { name: 'Afastado', value: PoliceStatus.AFASTADO },
          { name: 'Licença Médica / Especial', value: PoliceStatus.LICENCIADO },
          { name: 'Férias Regulamentares', value: PoliceStatus.FERIAS },
          { name: 'Suspenso Disciplinarmente', value: PoliceStatus.SUSPENSO }
        )
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Motivo do afastamento').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_AFASTAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.member) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const newStatus = interaction.options.getString('situacao', true) as PoliceStatus;
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
      newStatus,
      reason
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Afastamento Funcional Registrado',
      status: newStatus,
      protocol: result.protocol,
      color: COLORS.WARNING,
      responsible: authorMember,
      description:
        `A situação do policial <@${targetUser.id}> foi atualizada no sistema.\n\n` +
        `• **Situação Anterior:** \`${result.previousStatus}\`\n` +
        `• **Nova Situação:** \`${result.newStatus}\`\n` +
        `• **Justificativa:** ${reason}`
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default afastarCommand;
