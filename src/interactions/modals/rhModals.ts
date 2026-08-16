import { GuildMember, ModalSubmitInteraction } from 'discord.js';
import { ModalInteractionHandler } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { RHService } from '../../services/RHService.js';
import { RankService } from '../../services/RankService.js';
import { UnitService } from '../../services/UnitService.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const rhModalCadastrar: ModalInteractionHandler = {
  customId: 'rh_modal_cadastrar',
  requiredPermissions: [Permissions.RH_CADASTRAR],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const userId = interaction.fields.getTextInputValue('user_id').trim();
    const name = interaction.fields.getTextInputValue('full_name').trim();
    const operationalName = interaction.fields.getTextInputValue('op_name').trim();
    const badgeNumber = interaction.fields.getTextInputValue('badge_number').trim();
    const passportId = interaction.fields.getTextInputValue('passport_id')?.trim() || undefined;

    const profile = await PoliceProfileService.createOrUpdateProfile({
      guildId: interaction.guildId,
      userId,
      name,
      operationalName,
      badgeNumber,
      passportId
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Cadastro Realizado pelo Painel',
      `O policial <@${userId}> foi cadastrado no sistema.\n\n` +
        `• **Nome:** ${profile.name} (\`${profile.operationalName}\`)\n` +
        `• **Matrícula:** \`${profile.badgeNumber}\``
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const rhModalPromover: ModalInteractionHandler = {
  customId: 'rh_modal_promover',
  requiredPermissions: [Permissions.RH_PROMOVER],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const userId = interaction.fields.getTextInputValue('user_id').trim();
    const rankQuery = interaction.fields.getTextInputValue('new_rank').trim();
    const reason = interaction.fields.getTextInputValue('reason').trim();
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, userId);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({ content: `⛔ ${hierarchyCheck.reason}`, ephemeral: true });
      return;
    }

    const rank = await RankService.findRank(interaction.guild.id, rankQuery);
    if (!rank) {
      await interaction.reply({ content: `Patente \`${rankQuery}\` não foi localizada.`, ephemeral: true });
      return;
    }

    const result = await RHService.promotePolice({
      guild: interaction.guild,
      authorMember,
      targetUserId: userId,
      newRankId: rank.id,
      reason
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Promoção Concedida',
      `O policial <@${userId}> foi promovido com êxito.\n\n` +
        `• **Patente Anterior:** \`${result.previousRank}\`\n` +
        `• **Nova Patente:** \`${result.newRank}\`\n` +
        `• **Motivo:** ${reason}`,
      result.protocol
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const rhModalTransferir: ModalInteractionHandler = {
  customId: 'rh_modal_transferir',
  requiredPermissions: [Permissions.RH_TRANSFERIR],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const userId = interaction.fields.getTextInputValue('user_id').trim();
    const unitQuery = interaction.fields.getTextInputValue('new_unit').trim();
    const reason = interaction.fields.getTextInputValue('reason').trim();
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, userId);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({ content: `⛔ ${hierarchyCheck.reason}`, ephemeral: true });
      return;
    }

    const unit = await UnitService.findUnit(interaction.guild.id, unitQuery);
    if (!unit) {
      await interaction.reply({ content: `Unidade \`${unitQuery}\` não foi localizada.`, ephemeral: true });
      return;
    }

    const result = await RHService.transferPolice({
      guild: interaction.guild,
      authorMember,
      targetUserId: userId,
      newUnitId: unit.id,
      reason
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Transferência Efetivada',
      `O policial <@${userId}> foi transferido para **${result.newUnit}**.\n\n` +
        `• **Lotação Anterior:** \`${result.previousUnit}\`\n` +
        `• **Nova Lotação:** \`${result.newUnit}\`\n` +
        `• **Motivo:** ${reason}`,
      result.protocol
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const handlers = [rhModalCadastrar, rhModalPromover, rhModalTransferir];
export default handlers;
