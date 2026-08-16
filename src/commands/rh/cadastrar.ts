import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { RankService } from '../../services/RankService.js';
import { UnitService } from '../../services/UnitService.js';
import { AuditLogService } from '../../services/AuditLogService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const cadastrarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('cadastrar')
    .setDescription('Cadastra um novo policial no sistema funcional de Segurança Pública.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Usuário do Discord a ser cadastrado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('nome').setDescription('Nome completo do policial').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('nome_operacional').setDescription('Nome de guerra / operacional').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('matricula').setDescription('Matrícula funcional única (ex: 00135)').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('patente').setDescription('Nome ou sigla da patente inicial').setRequired(false)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('unidade').setDescription('Sigla da unidade de lotação').setRequired(false)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('passaporte').setDescription('Passaporte / ID do jogador (opcional)').setRequired(false)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_CADASTRAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId || !interaction.guild) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const name = interaction.options.getString('nome', true);
    const operationalName = interaction.options.getString('nome_operacional', true);
    const badgeNumber = interaction.options.getString('matricula', true);
    const passportId = interaction.options.getString('passaporte') || undefined;
    const rankQuery = interaction.options.getString('patente') || undefined;
    const unitQuery = interaction.options.getString('unidade') || undefined;

    let rankId: string | undefined;
    let unitId: string | undefined;

    if (rankQuery) {
      const rank = await RankService.findRank(interaction.guildId, rankQuery);
      if (rank) rankId = rank.id;
    }

    if (unitQuery) {
      const unit = await UnitService.findUnit(interaction.guildId, unitQuery);
      if (unit) unitId = unit.id;
    }

    try {
      const profile = await PoliceProfileService.createOrUpdateProfile({
        guildId: interaction.guildId,
        userId: targetUser.id,
        name,
        operationalName,
        badgeNumber,
        passportId,
        rankId,
        unitId
      });

      // Atribuir cargos no Discord se configurados
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (targetMember) {
        if (rankId) {
          const rank = await RankService.findRank(interaction.guildId, rankId);
          if (rank?.discordRoleId) await targetMember.roles.add(rank.discordRoleId).catch(() => null);
        }
        if (unitId) {
          const unit = await UnitService.findUnit(interaction.guildId, unitId);
          if (unit?.discordRoleId) await targetMember.roles.add(unit.discordRoleId).catch(() => null);
        }
      }

      await AuditLogService.logAction({
        guildId: interaction.guildId,
        executorId: interaction.user.id,
        targetId: targetUser.id,
        action: 'RH_CADASTRAR',
        details: `Cadastro funcional criado: ${name} (${operationalName}) - Matrícula: ${badgeNumber}`,
        client: interaction.client
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Policial Cadastrado',
        `O assentamento funcional de <@${targetUser.id}> foi gerado com êxito na base de dados.\n\n` +
          `• **Nome Completo:** ${profile.name}\n` +
          `• **Nome Operacional:** \`${profile.operationalName}\`\n` +
          `• **Matrícula Funcional:** \`${profile.badgeNumber}\`\n` +
          (profile.passportId ? `• **Passaporte / ID:** \`${profile.passportId}\`\n` : '') +
          `• **Situação:** \`${profile.status}\``
      );

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      if (err.code === 'P2002') {
        await interaction.reply({
          content: `Já existe um policial cadastrado com a matrícula \`${badgeNumber}\` ou este usuário já possui cadastro.`,
          ephemeral: true
        });
        return;
      }
      throw err;
    }
  }
};

export default cadastrarCommand;
