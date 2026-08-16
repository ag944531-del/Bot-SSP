import {
  ChatInputCommandInteraction,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { AcademyService } from '../../services/AcademyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const cursoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('curso')
    .setDescription('Gerencia os cursos de formação, turmas e notas da Academia.')
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cadastra um novo curso na grade da Academia.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('nome').setDescription('Nome do curso (ex: Curso de Formação de Sargentos)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('sigla').setDescription('Sigla (ex: CFS, CFC, PATRULHA)').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('carga_horaria').setDescription('Carga horária em horas (ex: 40)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('descricao').setDescription('Ementa e conteúdo programático').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('vagas').setDescription('Vagas padrão por turma (padrão: 20)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista todos os cursos e turmas com inscrições abertas.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('turma')
        .setDescription('Abre uma nova turma para um curso existente.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('curso_id').setDescription('ID do Curso').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('codigo').setDescription('Código da turma (ex: CFS-2026/1)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('data_inicio').setDescription('Data de início (AAAA-MM-DD)').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('inscrever')
        .setDescription('Matricula um policial em uma turma aberta.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('turma_id').setDescription('ID da Turma').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('aluno').setDescription('Policial a ser matriculado').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('resultado')
        .setDescription('Lança a avaliação final, nota e emissão de certificado.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('matricula_id').setDescription('ID da Matrícula do Aluno').setRequired(true)
        )
        .addBooleanOption((opt: SlashCommandBooleanOption) =>
          opt.setName('aprovado').setDescription('Aluno aprovado no curso?').setRequired(true)
        )
        .addNumberOption((opt: SlashCommandNumberOption) =>
          opt.setName('nota').setDescription('Nota final (0.0 a 10.0)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('observacoes').setDescription('Parecer do instrutor').setRequired(false)
        )
    ),
  category: 'academy',
  requiredPermissions: [Permissions.ACADEMIA_CRIAR_CURSO],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
      const name = interaction.options.getString('nome', true);
      const abbreviation = interaction.options.getString('sigla', true);
      const workloadHours = interaction.options.getInteger('carga_horaria', true);
      const description = interaction.options.getString('descricao', true);
      const vacancies = interaction.options.getInteger('vagas') || 20;

      const course = await AcademyService.createCourse({
        guildId,
        name,
        abbreviation,
        workloadHours,
        description,
        vacancies
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Curso Cadastrado na Academia',
        `O curso **${course.name}** (\`${course.abbreviation}\`) foi inserido na grade de qualificação.\n\n` +
          `• **Carga Horária:** \`${course.workloadHours} horas\`\n` +
          `• **Vagas:** \`${course.vacancies}\`\n` +
          `• **ID do Curso:** \`${course.id}\``
      );

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'listar') {
      const courses = await AcademyService.listCourses(guildId);

      if (courses.length === 0) {
        await interaction.reply({ content: 'Nenhum curso cadastrado no momento.', ephemeral: true });
        return;
      }

      let desc = '**GRADE DE QUALIFICAÇÃO E CAPACITAÇÃO:**\n\n';
      courses.forEach((c) => {
        desc += `🎓 **${c.name}** (\`${c.abbreviation}\`) — \`${c.workloadHours}h\`\n` +
          `• *${c.description}*\n` +
          `• ID: \`${c.id}\` | Turmas Abertas: \`${c.classes.length}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Grade Curricular • Escola de Formação',
        status: `${courses.length} Cursos Cadastrados`,
        color: COLORS.INFO,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'turma') {
      const courseId = interaction.options.getString('curso_id', true);
      const code = interaction.options.getString('codigo', true);
      const startStr = interaction.options.getString('data_inicio', true);

      const startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) {
        await interaction.reply({ content: 'Formato de data inválido. Use AAAA-MM-DD.', ephemeral: true });
        return;
      }

      try {
        const courseClass = await AcademyService.openClass({
          courseId,
          code,
          startDate
        });

        const embed = InstitutionalEmbedBuilder.success(
          'Turma de Formação Aberta',
          `A turma **${courseClass.code}** foi aberta com inscrições liberadas.\n\n` +
            `• **Data de Início:** <t:${Math.floor(courseClass.startDate.getTime() / 1000)}:D>\n` +
            `• **ID da Turma:** \`${courseClass.id}\``
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    } else if (subcommand === 'inscrever') {
      const classId = interaction.options.getString('turma_id', true);
      const studentUser: User = interaction.options.getUser('aluno', true);

      try {
        const enrollment = await AcademyService.enrollStudent(classId, studentUser.id);

        const embed = InstitutionalEmbedBuilder.success(
          'Matrícula Deferida',
          `O aluno <@${studentUser.id}> foi matriculado com sucesso na turma.\n\n` +
            `• **ID da Matrícula:** \`${enrollment.id}\``
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    } else if (subcommand === 'resultado') {
      const enrollmentId = interaction.options.getString('matricula_id', true);
      const passed = interaction.options.getBoolean('aprovado', true);
      const finalGrade = interaction.options.getNumber('nota', true);
      const notes = interaction.options.getString('observacoes') || undefined;

      try {
        const result = await AcademyService.evaluateStudent({
          enrollmentId,
          passed,
          finalGrade,
          notes,
          evaluatorId: interaction.user.id
        });

        const embed = InstitutionalEmbedBuilder.create({
          title: 'Homologação de Resultado de Formação',
          protocol: result.certificate ? result.certificate.code : undefined,
          status: passed ? 'Aprovado com Certificação' : 'Reprovado',
          responsible: `<@${interaction.user.id}>`,
          color: passed ? COLORS.SUCCESS : COLORS.DANGER,
          description:
            `Resultado da avaliação pedagógica registrado nos anais da Academia.\n\n` +
            `• **Nota Final:** \`${finalGrade.toFixed(1)}\`\n` +
            `• **Situação Acadêmica:** \`${passed ? 'APROVADO' : 'REPROVADO'}\`\n` +
            (result.certificate ? `• **Código do Certificado:** \`${result.certificate.code}\`\n` : '') +
            (notes ? `• **Parecer do Instrutor:** *${notes}*\n` : '') +
            `\n*O certificado e a qualificação foram adicionados automaticamente à ficha funcional do policial.*`
        });

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }
  }
};

export default cursoCommand;
