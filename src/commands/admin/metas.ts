import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandNumberOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { GoalService } from '../../services/GoalService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const metasCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('metas')
    .setDescription('Gerenciamento e acompanhamento de metas institucionais corporativas.')
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista as metas institucionais vigentes e seu progresso.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Define uma nova meta institucional (ex: horas de instrução, patrulha).')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('titulo').setDescription('Título da meta (ex: 500h de Patrulhamento Comunitário)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('categoria')
            .setDescription('Categoria da meta')
            .setRequired(true)
            .addChoices(
              { name: 'Patrulhamento', value: 'PATRULHAMENTO' },
              { name: 'Instrução e Treinamento', value: 'INSTRUCAO' },
              { name: 'Presença e Escala', value: 'PRESENCA' },
              { name: 'Formação de Efetivo', value: 'FORMACAO' }
            )
        )
        .addNumberOption((opt: SlashCommandNumberOption) =>
          opt.setName('alvo').setDescription('Valor alvo numérico (ex: 500)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('unidade_medida').setDescription('Unidade de medida (ex: Horas, Alunos, Sessões)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('periodo')
            .setDescription('Período de vigência')
            .setRequired(true)
            .addChoices(
              { name: 'Mensal', value: 'MENSAL' },
              { name: 'Trimestral', value: 'TRIMESTRAL' },
              { name: 'Anual', value: 'ANUAL' }
            )
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_METAS, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'listar') {
      await interaction.deferReply({ ephemeral: true });

      const goals = await GoalService.listGoals(guildId);

      if (goals.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('NENHUMA META ATIVA', 'Não há metas institucionais ativas configuradas no momento.')]
        });
      }

      const embed = EmbedPresets.primary(
        'METAS & INDICADORES INSTITUCIONAIS',
        'Acompanhamento do progresso das metas corporativas estabelecidas.'
      );

      for (const g of goals) {
        const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
        const barFilled = Math.round(percent / 10);
        const bar = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);

        embed.addFields({
          name: `🎯 ${g.title} (${g.period})`,
          value: `**Progresso:** \`${bar}\` ${percent}%\n**Atual:** ${g.currentValue} / ${g.targetValue} ${g.unit}\n**Categoria:** \`${g.category}\``
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === 'criar') {
      const title = interaction.options.getString('titulo', true);
      const category = interaction.options.getString('categoria', true);
      const targetValue = interaction.options.getNumber('alvo', true);
      const unit = interaction.options.getString('unidade_medida', true);
      const period = interaction.options.getString('periodo', true);

      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30); // 30 dias padrão

      await GoalService.createGoal({
        guildId,
        title,
        category,
        targetValue,
        unit,
        period,
        startDate: now,
        endDate: end
      });

      const embed = EmbedPresets.success(
        'META INSTITUCIONAL CADASTRADA',
        `A meta **"${title}"** foi definida para a categoria **${category}** com objetivo de **${targetValue} ${unit}**.`
      );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

export default metasCommand;
