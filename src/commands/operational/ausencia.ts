import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { AbsenceService } from '../../services/AbsenceService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const ausenciaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ausencia')
    .setDescription('Requer formalmente dispensa, licença ou afastamento temporário do serviço.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Motivo do afastamento / requerimento').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('data_inicio').setDescription('Data de início (AAAA-MM-DD, ex: 2026-08-20)').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('data_termino').setDescription('Data de término (AAAA-MM-DD, ex: 2026-08-25)').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('observacoes').setDescription('Observações ou link de comprovante médico/documental').setRequired(false)
    ),
  category: 'operational',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const reason = interaction.options.getString('motivo', true);
    const startStr = interaction.options.getString('data_inicio', true);
    const endStr = interaction.options.getString('data_termino', true);
    const notes = interaction.options.getString('observacoes') || undefined;

    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      await interaction.reply({
        content: 'Formato de data inválido. Utilize o formato `AAAA-MM-DD` (ex: `2026-08-20`).',
        ephemeral: true
      });
      return;
    }

    try {
      const absence = await AbsenceService.requestAbsence({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        reason,
        startDate,
        endDate,
        notes
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Requerimento de Ausência Registrado',
        protocol: absence.protocol,
        status: 'Pendente de Homologação',
        responsible: `<@${interaction.user.id}>`,
        color: COLORS.WARNING,
        description:
          `Seu pedido formal de ausência foi recebido e encaminhado para deliberação da chefia/RH.\n\n` +
          `• **Motivo:** ${reason}\n` +
          `• **Período:** <t:${Math.floor(startDate.getTime() / 1000)}:d> até <t:${Math.floor(
            endDate.getTime() / 1000
          )}:d>\n` +
          (notes ? `• **Observações:** *${notes}*\n` : '') +
          `\n*Você será notificado assim que o requerimento for analisado.*`
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export default ausenciaCommand;
