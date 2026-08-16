import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { AcademyService } from '../../services/AcademyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const academyOpenCreateCourseButton: ButtonInteractionHandler = {
  customId: 'academy_open_create_course',
  requiredPermissions: [Permissions.ACADEMIA_CRIAR_CURSO],
  async execute(interaction: ButtonInteraction) {
    const modal = new ModalBuilder()
      .setCustomId('academy_modal_create_course')
      .setTitle('Cadastro de Curso de Formação');

    const inputName = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Nome do Curso')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: Curso de Patrulhamento Tático')
      .setRequired(true);

    const inputSigla = new TextInputBuilder()
      .setCustomId('sigla')
      .setLabel('Sigla do Curso')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: CPT')
      .setRequired(true);

    const inputWorkload = new TextInputBuilder()
      .setCustomId('workload')
      .setLabel('Carga Horária (em Horas)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 40')
      .setRequired(true);

    const inputDesc = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Ementa e Conteúdo')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Táticas de abordagem, conduta de patrulha e tiro defensivo...')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputName),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputSigla),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputWorkload),
      new ActionRowBuilder<TextInputBuilder>().addComponents(inputDesc)
    );

    await interaction.showModal(modal);
  }
};

export const academyOpenListCoursesButton: ButtonInteractionHandler = {
  customId: 'academy_open_list_courses',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const courses = await AcademyService.listCourses(interaction.guildId);

    if (courses.length === 0) {
      await interaction.reply({ content: 'Nenhum curso cadastrado no momento.', ephemeral: true });
      return;
    }

    let desc = '**CURSOS E QUALIFICAÇÕES NA ACADEMIA:**\n\n';
    courses.forEach((c) => {
      desc += `🎓 **${c.name}** (\`${c.abbreviation}\`) — \`${c.workloadHours}h\`\n` +
        `• *${c.description}*\n` +
        `• ID: \`${c.id}\` | Turmas Abertas: \`${c.classes.length}\`\n\n`;
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Quadro Geral de Cursos • Academia de Polícia',
      status: `${courses.length} Cursos Registrados`,
      color: COLORS.INFO,
      description: desc
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const academyOpenMyInstructorStatsButton: ButtonInteractionHandler = {
  customId: 'academy_open_my_instructor_stats',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const profile = await AcademyService.getInstructorStats(interaction.guildId, interaction.user.id);

    if (!profile) {
      await interaction.reply({ content: 'Cadastro funcional não localizado.', ephemeral: true });
      return;
    }

    const stats = profile.instructorProfile;

    if (!stats || stats.studentsTotal === 0) {
      await interaction.reply({
        content: 'Você ainda não possui turmas ou avaliações registradas como instrutor na Academia.',
        ephemeral: true
      });
      return;
    }

    const approvalRate =
      stats.studentsTotal > 0 ? ((stats.approvedTotal / stats.studentsTotal) * 100).toFixed(1) : '0.0';

    const embed = InstitutionalEmbedBuilder.create({
      title: `Meu Desempenho Docente • ${profile.operationalName}`,
      status: 'Instrutor Homologado',
      protocol: `MAT: ${profile.badgeNumber}`,
      color: COLORS.INFO,
      description:
        `• **Cursos Ministrados:** \`${stats.coursesTaught}\`\n` +
        `• **Alunos Avaliados:** \`${stats.studentsTotal}\`\n` +
        `• **Alunos Aprovados:** \`${stats.approvedTotal}\` (\`${approvalRate}%\`)\n` +
        `• **Alunos Reprovados:** \`${stats.rejectedTotal}\`\n` +
        `• **Horas Ministradas:** \`${stats.workloadTaught} horas\``
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const handlers = [
  academyOpenCreateCourseButton,
  academyOpenListCoursesButton,
  academyOpenMyInstructorStatsButton
];

export default handlers;
