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

export const ipmCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ipm')
    .setDescription('Gerencia Inquéritos Policiais Militares (IPM).')
    .addSubcommand((sub) =>
      sub
        .setName('instaurar')
        .setDescription('Instaura uma nova portaria de Inquérito Policial Militar.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('investigado').setDescription('Policial sob investigação').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('fato').setDescription('Fato narrado e conduta apurada').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('denunciante').setDescription('Denunciante / Vítima (opcional)').setRequired(false)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('prazo_dias').setDescription('Prazo para conclusão (dias - padrão: 30)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('consultar')
        .setDescription('Consulta os autos e andamento de um IPM pelo protocolo.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('protocolo').setDescription('Número do protocolo (ex: IPM-2026-000001)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('andamento')
        .setDescription('Atualiza a fase processual do IPM.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('protocolo').setDescription('Protocolo do IPM').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('fase')
            .setDescription('Nova fase processual')
            .setRequired(true)
            .addChoices(
              { name: 'Em Investigação', value: CaseStatus.EM_INVESTIGACAO },
              { name: 'Aguardando Defesa Prévia', value: CaseStatus.AGUARDANDO_DEFESA },
              { name: 'Em Análise da Corregedoria', value: CaseStatus.EM_ANALISE },
              { name: 'Arquivado', value: CaseStatus.ARQUIVADO }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('julgar')
        .setDescription('Emite o julgamento final e encerra o IPM.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('protocolo').setDescription('Protocolo do IPM').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('resultado')
            .setDescription('Decisão final / Sanção disciplinar')
            .setRequired(true)
            .addChoices(
              { name: 'Absolvição / Arquivamento', value: SanctionType.ABSOLVICAO },
              { name: 'Advertência Funcional', value: SanctionType.ADVERTENCIA },
              { name: 'Suspensão de Atividades', value: SanctionType.SUSPENSAO },
              { name: 'Rebaixamento de Patente', value: SanctionType.REBAIXAMENTO },
              { name: 'Exoneração a Bem da Disciplina', value: SanctionType.EXONERACAO },
              { name: 'Encaminhamento à Justiça Comum/Militar', value: SanctionType.ENCAMINHAMENTO }
            )
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('parecer').setDescription('Fundamentação jurídica e parecer final').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('dias_suspensao').setDescription('Dias de suspensão (quando aplicável)').setRequired(false)
        )
    ),
  category: 'corregedoria',
  requiredPermissions: [Permissions.CORREGEDORIA_CRIAR_IPM],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'instaurar') {
      const targetUser: User = interaction.options.getUser('investigado', true);
      const factNarrative = interaction.options.getString('fato', true);
      const accuser: User | null = interaction.options.getUser('denunciante');
      const deadlineDays = interaction.options.getInteger('prazo_dias') || 30;

      const newCase = await CorregedoriaService.createCase({
        guildId,
        type: 'IPM',
        investigatedId: targetUser.id,
        accuserId: accuser?.id,
        officerInChargeId: interaction.user.id,
        factNarrative,
        deadlineDays
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Portaria de Instauração • Inquérito Policial Militar (IPM)',
        protocol: newCase.protocol,
        status: 'Instaurado',
        responsible: `<@${interaction.user.id}>`,
        color: COLORS.DANGER,
        description:
          `Instaurado procedimento apuratório formal nos termos do Regulamento Disciplinar.\n\n` +
          `• **Investigado:** <@${targetUser.id}>\n` +
          (accuser ? `• **Denunciante:** <@${accuser.id}>\n` : '') +
          `• **Encarregado do IPM:** <@${interaction.user.id}>\n` +
          `• **Prazo Limite:** <t:${Math.floor((newCase.deadline?.getTime() || 0) / 1000)}:D>\n\n` +
          `**SÍNTESE DOS FATOS APURADOS:**\n${factNarrative}`
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'consultar') {
      const protocol = interaction.options.getString('protocolo', true);
      const ipm = await CorregedoriaService.findCase(guildId, protocol);

      if (!ipm) {
        await interaction.reply({ content: `Processo \`${protocol}\` não localizado.`, ephemeral: true });
        return;
      }

      const embed = InstitutionalEmbedBuilder.create({
        title: `Autos Processuais • ${ipm.protocol}`,
        protocol: ipm.protocol,
        status: ipm.status,
        color: COLORS.PRIMARY,
        description:
          `• **Tipo de Procedimento:** \`${ipm.type}\`\n` +
          `• **Investigado:** <@${ipm.investigatedId}>\n` +
          `• **Encarregado:** <@${ipm.officerInChargeId}>\n` +
          `• **Fase Processual:** \`${ipm.status}\`\n` +
          `• **Data de Instauração:** <t:${Math.floor(ipm.createdAt.getTime() / 1000)}:D>\n` +
          (ipm.resultSanction ? `• **Resultado / Decisão:** \`${ipm.resultSanction}\`\n• **Parecer:** *${ipm.resultNotes}*\n` : '') +
          `\n**HISTÓRICO DO FATO:**\n${ipm.factNarrative}`
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'andamento') {
      const protocol = interaction.options.getString('protocolo', true);
      const fase = interaction.options.getString('fase', true) as CaseStatus;

      try {
        const updated = await CorregedoriaService.updateCaseStatus(protocol, fase, interaction.user.id);
        const embed = InstitutionalEmbedBuilder.success(
          'Fase Processual Atualizada',
          `Os autos do **${updated.protocol}** avançaram para a fase: \`${updated.status}\`.`
        );
        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    } else if (subcommand === 'julgar') {
      const protocol = interaction.options.getString('protocolo', true);
      const sanction = interaction.options.getString('resultado', true) as SanctionType;
      const notes = interaction.options.getString('parecer', true);
      const days = interaction.options.getInteger('dias_suspensao') || undefined;

      try {
        const result = await CorregedoriaService.judgeCase({
          caseIdOrProtocol: protocol,
          judgeId: interaction.user.id,
          sanction,
          notes,
          daysSuspended: days
        });

        const embed = InstitutionalEmbedBuilder.create({
          title: 'Decisão e Sentença Correcional Proferida',
          protocol: result.updatedCase.protocol,
          status: 'Processo Concluído',
          responsible: `<@${interaction.user.id}>`,
          color: sanction === SanctionType.ABSOLVICAO ? COLORS.SUCCESS : COLORS.DANGER,
          description:
            `Julgamento conclusivo proferido pela Corregedoria Geral da Polícia.\n\n` +
            `• **Investigado:** <@${result.updatedCase.investigatedId}>\n` +
            `• **Decisão Aplicada:** \`${sanction}\`\n` +
            (days ? `• **Dias de Suspensão:** \`${days} dias\`\n` : '') +
            `\n**PARECER E FUNDAMENTAÇÃO:**\n${notes}`
        });

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }
  }
};

export default ipmCommand;
