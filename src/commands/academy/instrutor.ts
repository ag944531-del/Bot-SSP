import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { AcademyService } from '../../services/AcademyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const instrutorCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('instrutor')
    .setDescription('Consulta o perfil estatístico e métricas de desempenho pedagógico de um instrutor.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('instrutor').setDescription('Instrutor a ser consultado (deixe vazio para si mesmo)').setRequired(false)
    ),
  category: 'academy',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const targetUser: User = interaction.options.getUser('instrutor') || interaction.user;
    const profile = await AcademyService.getInstructorStats(interaction.guildId, targetUser.id);

    if (!profile) {
      await interaction.reply({
        content: `O usuário <@${targetUser.id}> não possui cadastro funcional no sistema.`,
        ephemeral: true
      });
      return;
    }

    const stats = profile.instructorProfile;

    if (!stats || stats.studentsTotal === 0) {
      const emptyEmbed = InstitutionalEmbedBuilder.create({
        title: `Quadro de Instrução • ${profile.operationalName}`,
        status: 'Sem Registros Pedagógicos',
        color: COLORS.NEUTRAL,
        description:
          `O policial **${profile.name}** (\`${profile.operationalName}\`) ainda não possui turmas ou avaliações pedagógicas registradas na Escola de Formação.\n\n` +
          `*Para lançar notas de alunos avaliados, utilize \`/curso resultado\`.*`
      });

      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }

    const approvalRate =
      stats.studentsTotal > 0 ? ((stats.approvedTotal / stats.studentsTotal) * 100).toFixed(1) : '0.0';

    const embed = InstitutionalEmbedBuilder.create({
      title: `Perfil do Corpo Docente • ${profile.operationalName}`,
      status: 'Instrutor Homologado',
      protocol: `MAT: ${profile.badgeNumber}`,
      responsible: `<@${targetUser.id}>`,
      color: COLORS.INFO,
      description:
        `Estatísticas consolidadas de docência e qualificação policial ministrada:\n\n` +
        `• **Instrutor:** ${profile.name} (\`${profile.operationalName}\`)\n` +
        `• **Patente:** \`${profile.rank ? profile.rank.name : 'N/A'}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `**DESEMPENHO PEDAGÓGICO:**\n` +
        `📚 **Cursos Ministrados:** \`${stats.coursesTaught}\`\n` +
        `👥 **Total de Alunos Avaliados:** \`${stats.studentsTotal}\`\n` +
        `✅ **Alunos Aprovados:** \`${stats.approvedTotal}\`\n` +
        `❌ **Alunos Reprovados:** \`${stats.rejectedTotal}\`\n` +
        `📈 **Taxa de Aprovação:** \`${approvalRate}%\`\n` +
        `⏱️ **Carga Horária Ministrada:** \`${stats.workloadTaught} horas\``
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default instrutorCommand;
