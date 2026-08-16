import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SanctionType, PoliceStatus, Prisma } from '@prisma/client';
import { SlashCommand } from '../../@types/index.js';
import { prisma } from '../../database/prisma.js';
import { ProtocolGenerator } from '../../utils/protocolGenerator.js';
import { AuditLogService } from '../../services/AuditLogService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const sancaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('sancao')
    .setDescription('Aplica formalmente uma sanção ou penalidade disciplinar no prontuário do policial.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser penalizado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('tipo')
        .setDescription('Tipo de sanção disciplinar')
        .setRequired(true)
        .addChoices(
          { name: 'Advertência Funcional', value: SanctionType.ADVERTENCIA },
          { name: 'Suspensão Disciplinar', value: SanctionType.SUSPENSAO },
          { name: 'Rebaixamento de Patente', value: SanctionType.REBAIXAMENTO },
          { name: 'Exoneração a Bem da Disciplina', value: SanctionType.EXONERACAO }
        )
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Fundamentação legal da penalidade').setRequired(true)
    )
    .addIntegerOption((opt: SlashCommandIntegerOption) =>
      opt.setName('dias_suspensao').setDescription('Quantidade de dias (quando aplicável)').setRequired(false)
    ),
  category: 'corregedoria',
  requiredPermissions: [Permissions.CORREGEDORIA_APLICAR_SANCAO],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const sanctionType = interaction.options.getString('tipo', true) as SanctionType;
    const reason = interaction.options.getString('motivo', true);
    const days = interaction.options.getInteger('dias_suspensao') || undefined;

    const profile = await prisma.policeProfile.findUnique({
      where: { guildId_userId: { guildId: interaction.guildId, userId: targetUser.id } }
    });

    if (!profile) {
      await interaction.reply({ content: 'Policial não cadastrado no sistema.', ephemeral: true });
      return;
    }

    const protocol = await ProtocolGenerator.generate('SNC', interaction.guildId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.sanction.create({
        data: {
          guildId: interaction.guildId!,
          profileId: profile.id,
          type: sanctionType,
          reason,
          daysSuspended: days,
          authorId: interaction.user.id,
          protocol
        }
      });

      if (sanctionType === SanctionType.SUSPENSAO) {
        await tx.policeProfile.update({
          where: { id: profile.id },
          data: { status: PoliceStatus.SUSPENSO }
        });
      }
    });

    await AuditLogService.logAction({
      guildId: interaction.guildId,
      executorId: interaction.user.id,
      targetId: targetUser.id,
      action: 'CORREGEDORIA_SANCAO',
      protocol,
      details: `Sanção aplicada: ${sanctionType}. Motivo: ${reason}`
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Aplicação de Sanção Disciplinar Homologada',
      protocol,
      status: 'Penalidade Registrada',
      responsible: `<@${interaction.user.id}>`,
      color: COLORS.DANGER,
      description:
        `Registrada penalidade disciplinar no assentamento funcional do policial.\n\n` +
        `• **Policial Sancionado:** <@${targetUser.id}> (\`${profile.operationalName}\`)\n` +
        `• **Medida Aplicada:** \`${sanctionType}\`\n` +
        (days ? `• **Prazo de Suspensão:** \`${days} dias\`\n` : '') +
        `• **Fundamentação:** ${reason}\n\n` +
        `*A penalidade passa a constar oficialmente no Prontuário Funcional e histórico da Corregedoria.*`
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default sancaoCommand;
