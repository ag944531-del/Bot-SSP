import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { RHService } from '../../services/RHService.js';
import { RankService } from '../../services/RankService.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const promoverCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('promover')
    .setDescription('Promove um policial para uma patente superior.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser promovido').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('nova_patente').setDescription('Nome ou ID da nova patente').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Motivo/fundamentação da promoção').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_PROMOVER],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const newRankQuery = interaction.options.getString('nova_patente', true);
    const reason = interaction.options.getString('motivo', true);
    const authorMember = interaction.member as GuildMember;

    // 1. Checagem de Hierarquia
    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, targetUser.id);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({
        content: `⛔ **Ação Negada:** ${hierarchyCheck.reason}`,
        ephemeral: true
      });
      return;
    }

    const rank = await RankService.findRank(interaction.guild.id, newRankQuery);
    if (!rank) {
      await interaction.reply({
        content: `Patente correspondente a \`${newRankQuery}\` não foi localizada. Consulte com \`/patente listar\`.`,
        ephemeral: true
      });
      return;
    }

    const result = await RHService.promotePolice({
      guild: interaction.guild,
      authorMember,
      targetUserId: targetUser.id,
      newRankId: rank.id,
      reason
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Promoção Funcional Concedida',
      `O policial <@${targetUser.id}> foi promovido com êxito na carreira policial.\n\n` +
        `• **Patente Anterior:** \`${result.previousRank}\`\n` +
        `• **Nova Patente:** \`${result.newRank}\`\n` +
        `• **Motivo Registrado:** ${reason}`,
      result.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export default promoverCommand;
