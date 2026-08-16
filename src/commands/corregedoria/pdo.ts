import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { CaseStatus, SanctionType } from '@prisma/client';
import { SlashCommand } from '../../@types/index.js';
import { CorregedoriaService } from '../../services/CorregedoriaService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const pdoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('pdo')
    .setDescription('Gerencia Procedimentos Disciplinares Ordinários (PDO).')
    .addSubcommand((sub) =>
      sub
        .setName('instaurar')
        .setDescription('Instaura um novo Procedimento Disciplinar Ordinário.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial').setDescription('Policial processado').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('infracao').setDescription('Descrição da infração disciplinar apurada').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('prazo_dias').setDescription('Prazo para conclusão (dias - padrão: 15)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('consultar')
        .setDescription('Consulta os autos de um PDO pelo protocolo.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('protocolo').setDescription('Número do protocolo (ex: PDO-2026-000001)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('julgar')
        .setDescription('Julga e arquiva o PDO com aplicação de penalidade.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('protocolo').setDescription('Protocolo do PDO').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('resultado')
            .setDescription('Sanção disciplinar aplicada')
            .setRequired(true)
            .addChoices(
              { name: 'Absolvição', value: SanctionType.ABSOLVICAO },
              { name: 'Advertência', value: SanctionType.ADVERTENCIA },
              { name: 'Suspensão', value: SanctionType.SUSPENSAO },
              { name: 'Rebaixamento', value: SanctionType.REBAIXAMENTO }
            )
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('parecer').setDescription('Fundamentação do julgamento').setRequired(true)
        )
    ),
  category: 'corregedoria',
  requiredPermissions: [Permissions.CORREGEDORIA_CRIAR_PDO],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'instaurar') {
      const targetUser: User = interaction.options.getUser('policial', true);
      const factNarrative = interaction.options.getString('infracao', true);
      const deadlineDays = interaction.options.getInteger('prazo_dias') || 15;

      const newCase = await CorregedoriaService.createCase({
        guildId,
        type: 'PDO',
        investigatedId: targetUser.id,
        officerInChargeId: interaction.user.id,
        factNarrative,
        deadlineDays
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Portaria de Procedimento Disciplinar Ordinário (PDO)',
        protocol: newCase.protocol,
        status: 'Instaurado',
        responsible: `<@${interaction.user.id}>`,
        color: COLORS.WARNING,
        description:
          `Instaurado procedimento disciplinar para apuração de falta funcional.\n\n` +
          `• **Acusado:** <@${targetUser.id}>\n` +
          `• **Relator / Encarregado:** <@${interaction.user.id}>\n` +
          `• **Prazo de Defesa:** <t:${Math.floor((newCase.deadline?.getTime() || 0) / 1000)}:D>\n\n` +
          `**INFRAÇÃO EM APURAÇÃO:**\n${factNarrative}`
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'consultar') {
      const protocol = interaction.options.getString('protocolo', true);
      const pdo = await CorregedoriaService.findCase(guildId, protocol);

      if (!pdo) {
        await interaction.reply({ content: `Processo \`${protocol}\` não localizado.`, ephemeral: true });
        return;
      }

      const embed = InstitutionalEmbedBuilder.create({
        title: `Autos Disciplinares • ${pdo.protocol}`,
        protocol: pdo.protocol,
        status: pdo.status,
        color: COLORS.PRIMARY,
        description:
          `• **Tipo:** \`${pdo.type}\`\n` +
          `• **Policial:** <@${pdo.investigatedId}>\n` +
          `• **Fase Atual:** \`${pdo.status}\`\n` +
          (pdo.resultSanction ? `• **Resultado:** \`${pdo.resultSanction}\`\n• **Parecer:** *${pdo.resultNotes}*\n` : '') +
          `\n**FATO APURADO:**\n${pdo.factNarrative}`
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'julgar') {
      const protocol = interaction.options.getString('protocolo', true);
      const sanction = interaction.options.getString('resultado', true) as SanctionType;
      const notes = interaction.options.getString('parecer', true);

      try {
        const result = await CorregedoriaService.judgeCase({
          caseIdOrProtocol: protocol,
          judgeId: interaction.user.id,
          sanction,
          notes
        });

        const embed = InstitutionalEmbedBuilder.success(
          'PDO Julgado com Sucesso',
          `O procedimento **${result.updatedCase.protocol}** foi encerrado.\n\n` +
            `• **Policial:** <@${result.updatedCase.investigatedId}>\n` +
            `• **Decisão Aplicada:** \`${sanction}\`\n` +
            `• **Parecer:** ${notes}`
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }
  }
};

export default pdoCommand;
