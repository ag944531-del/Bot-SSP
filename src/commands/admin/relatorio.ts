import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { ReportService } from '../../services/ReportService.js';
import { Permissions } from '../../permissions/permissions.js';

export const relatorioCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('relatorio')
    .setDescription('Gera relatórios executivos e estatísticos consolidados de produtividade e criminalidade.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('periodo')
        .setDescription('Período de consolidação dos dados')
        .setRequired(true)
        .addChoices(
          { name: 'Hoje (Diário)', value: 'hoje' },
          { name: 'Últimos 7 dias (Semanal)', value: 'semana' },
          { name: 'Últimos 30 dias (Mensal)', value: 'mes' },
          { name: 'Histórico Total (Geral)', value: 'total' }
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_AUDITORIA],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const period = interaction.options.getString('periodo', true) as 'hoje' | 'semana' | 'mes' | 'total';

    const embed = await ReportService.generateReport(interaction.guildId, period);

    await interaction.reply({ embeds: [embed] });
  }
};

export default relatorioCommand;
