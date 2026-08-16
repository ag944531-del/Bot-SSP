import { ModalSubmitInteraction } from 'discord.js';
import { ModalInteractionHandler } from '../../@types/index.js';
import { AcademyService } from '../../services/AcademyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const academyModalCreateCourse: ModalInteractionHandler = {
  customId: 'academy_modal_create_course',
  requiredPermissions: [Permissions.ACADEMIA_CRIAR_CURSO],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const name = interaction.fields.getTextInputValue('name').trim();
    const abbreviation = interaction.fields.getTextInputValue('sigla').trim();
    const workloadHours = parseInt(interaction.fields.getTextInputValue('workload').trim(), 10) || 20;
    const description = interaction.fields.getTextInputValue('description').trim();

    try {
      const course = await AcademyService.createCourse({
        guildId: interaction.guildId,
        name,
        abbreviation,
        workloadHours,
        description
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Curso Cadastrado na Academia',
        `O curso **${course.name}** (\`${course.abbreviation}\`) foi criado com sucesso.\n\n` +
          `• **Carga Horária:** \`${course.workloadHours} horas\`\n` +
          `• **ID do Curso:** \`${course.id}\``
      );

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [academyModalCreateCourse];
export default handlers;
