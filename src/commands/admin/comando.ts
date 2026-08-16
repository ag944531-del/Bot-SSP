import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { ExecutiveDashboardService } from '../../services/ExecutiveDashboardService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const comandoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('comando')
    .setDescription('Exibe o painel executivo de comando geral com métricas integradas em tempo real.'),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_COMANDO_GERAL, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: 'Este comando só pode ser executado em um servidor.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const m = await ExecutiveDashboardService.getMetrics(guildId);

    const embed = EmbedPresets.primary(
      'PAINEL EXECUTIVO — COMANDO GERAL',
      'Visão estratégica e consolidação operacional da instituição em tempo real.'
    );

    embed.addFields(
      {
        name: '👥 EFETIVO POLICIAL',
        value: `• **Total Cadastrados:** ${m.efetivo.total}\n• **Ativos:** ${m.efetivo.ativos}\n• **Em Serviço (Ponto):** ${m.efetivo.emServico}\n• **Afastados/Licenças:** ${m.efetivo.afastados}`,
        inline: true
      },
      {
        name: '🚔 OPERAÇÃO & COPOM',
        value: `• **Viaturas Ativas:** ${m.operacao.viaturasAtivas}\n• **Patrulhas em Andamento:** ${m.operacao.patrulhasEmAndamento}\n• **Ocorrências (Hoje):** ${m.operacao.ocorrenciasHoje}`,
        inline: true
      },
      {
        name: '⚖️ CORREGEDORIA GERAL',
        value: `• **IPMs em Andamento:** ${m.corregedoria.ipmsAtivos}\n• **PDOs em Andamento:** ${m.corregedoria.pdosAtivos}\n• **Convocações Pendentes:** ${m.corregedoria.convocacoesPendentes}`,
        inline: true
      },
      {
        name: '🎓 ACADEMIA & FORMAÇÃO',
        value: `• **Cursos Ativos:** ${m.formacao.cursosAtivos}\n• **Alunos Matriculados:** ${m.formacao.alunosMatriculados}`,
        inline: true
      },
      {
        name: '📋 ADMINISTRATIVO & RH',
        value: `• **Solicitações Pendentes:** ${m.administrativo.solicitacoesPendentes}\n• **Promoções p/ Aprovar:** ${m.administrativo.promocoesPendentes}\n• **Ausências Pendentes:** ${m.administrativo.ausenciasPendentes}`,
        inline: true
      }
    );

    embed.setFooter({ text: 'Comando Geral • Governança & Decisão Estratégica' });
    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('tablet:rh').setLabel('RH & Efetivo').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tablet:copom').setLabel('COPOM & VTRs').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tablet:corregedoria').setLabel('Corregedoria').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tablet:academia').setLabel('Academia').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('comando:alertas').setLabel('Alertas').setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};

export default comandoCommand;
