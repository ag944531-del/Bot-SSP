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
import { UnitService } from '../../services/UnitService.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const transferirCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfere a lotação de um policial para outra unidade/batalhão.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser transferido').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('nova_unidade').setDescription('Sigla ou Nome da nova unidade de lotação').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Motivo/necessidade de serviço para a transferência').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_TRANSFERIR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const newUnitQuery = interaction.options.getString('nova_unidade', true);
    const reason = interaction.options.getString('motivo', true);
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, targetUser.id);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({
        content: `⛔ **Ação Negada:** ${hierarchyCheck.reason}`,
        ephemeral: true
      });
      return;
    }

    const unit = await UnitService.findUnit(interaction.guild.id, newUnitQuery);
    if (!unit) {
      await interaction.reply({
        content: `Unidade correspondente a \`${newUnitQuery}\` não foi localizada. Consulte com \`/unidade listar\`.`,
        ephemeral: true
      });
      return;
    }

    const result = await RHService.transferPolice({
      guild: interaction.guild,
      authorMember,
      targetUserId: targetUser.id,
      newUnitId: unit.id,
      reason
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Transferência de Lotação Efetivada',
      `O policial <@${targetUser.id}> foi transferido com sucesso.\n\n` +
        `• **Lotação Anterior:** \`${result.previousUnit}\`\n` +
        `• **Nova Lotação:** \`${result.newUnit}\`\n` +
        `• **Fundamentação:** ${reason}`,
      result.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export default transferirCommand;
