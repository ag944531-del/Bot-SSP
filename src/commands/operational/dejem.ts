import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  TextChannel
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { DejemService } from '../../services/DejemService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';

export const dejemCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('dejem')
    .setDescription('Gerencia e abre inscrições para a Diária Especial de Jornada Extraordinária (DEJEM).')
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cria uma nova escala de serviço extraordinário DEJEM.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('unidade').setDescription('Unidade / Batalhão solicitante (ex: Choque, ROTA)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('data').setDescription('Data da escala no formato AAAA-MM-DD (ex: 2026-08-20)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('inicio').setDescription('Horário de início (ex: 08:00)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('termino').setDescription('Horário de término (ex: 16:00)').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('vagas').setDescription('Quantidade de vagas disponíveis').setRequired(true).setMinValue(1)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('requisitos').setDescription('Requisitos específicos (opcional)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista as escalas de DEJEM ativas e com inscrições abertas.')
    ),
  category: 'operational',
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
      const unitName = interaction.options.getString('unidade', true);
      const dateStr = interaction.options.getString('data', true);
      const startTime = interaction.options.getString('inicio', true);
      const endTime = interaction.options.getString('termino', true);
      const vacancies = interaction.options.getInteger('vagas', true);
      const requirements = interaction.options.getString('requisitos') || undefined;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        await interaction.reply({
          content: 'Formato de data inválido. Utilize o formato `AAAA-MM-DD` (ex: `2026-08-20`).',
          ephemeral: true
        });
        return;
      }

      const dejem = await DejemService.createDejem({
        guildId,
        date,
        startTime,
        endTime,
        vacancies,
        unitName,
        requirements,
        creatorId: interaction.user.id
      });

      const embed = await DejemService.buildDejemEmbed(dejem.id);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`dejem_join:${dejem.id}`)
          .setLabel('Candidatar-se (Inscrever)')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✋'),
        new ButtonBuilder()
          .setCustomId(`dejem_leave:${dejem.id}`)
          .setLabel('Cancelar Inscrição')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌'),
        new ButtonBuilder()
          .setCustomId(`dejem_refresh:${dejem.id}`)
          .setLabel('Atualizar Quadro')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );

      await interaction.reply({
        content: '✅ **Escala de DEJEM publicada com sucesso.**',
        ephemeral: true
      });

      if (interaction.channel && 'send' in interaction.channel) {
        await (interaction.channel as TextChannel).send({
          embeds: [embed],
          components: [row]
        });
      }
    } else if (subcommand === 'listar') {
      const activeDejems = await DejemService.listActiveDejem(guildId);

      if (activeDejems.length === 0) {
        await interaction.reply({ content: 'Nenhuma escala DEJEM aberta no momento.', ephemeral: true });
        return;
      }

      let desc = '**ESCALAS DEJEM COM INSCRIÇÕES ABERTAS:**\n\n';
      activeDejems.forEach((d) => {
        const vagasRestantes = d.vacancies - d.members.length;
        desc += `📌 **${d.unitName}** — <t:${Math.floor(d.date.getTime() / 1000)}:d> (${d.startTime} às ${d.endTime})\n` +
          `• Vagas: \`${vagasRestantes}/${d.vacancies}\` | ID: \`${d.id}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Escalas de Jornada Extraordinária (DEJEM)',
        status: `${activeDejems.length} Escalas Abertas`,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default dejemCommand;
