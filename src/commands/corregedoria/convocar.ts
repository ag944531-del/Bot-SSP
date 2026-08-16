import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { CorregedoriaService } from '../../services/CorregedoriaService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const convocarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('convocar')
    .setDescription('Emite um mandado formal de convocação para audiência, oitiva ou reunião na Corregedoria.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser convocado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Motivo da convocação / procedimento relacionado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('data_hora').setDescription('Data e Horário (ex: 2026-08-22 14:00)').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('local').setDescription('Canal de voz / Sala de audiência').setRequired(true)
    ),
  category: 'corregedoria',
  requiredPermissions: [Permissions.CORREGEDORIA_CONVOCAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const reason = interaction.options.getString('motivo', true);
    const dateTimeStr = interaction.options.getString('data_hora', true);
    const location = interaction.options.getString('local', true);

    const scheduledFor = new Date(dateTimeStr);
    if (isNaN(scheduledFor.getTime())) {
      await interaction.reply({
        content: 'Formato de data/hora inválido. Utilize o formato `AAAA-MM-DD HH:MM` (ex: `2026-08-22 14:00`).',
        ephemeral: true
      });
      return;
    }

    const summons = await CorregedoriaService.createSummons({
      guildId: interaction.guildId,
      summonedId: targetUser.id,
      authorId: interaction.user.id,
      reason,
      scheduledFor,
      location
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Mandado Oficial de Convocação Correcional',
      protocol: summons.protocol,
      status: 'Aguardando Ciência',
      responsible: `<@${interaction.user.id}>`,
      color: COLORS.DANGER,
      description:
        `Por determinação da autoridade correcional competente, fica o policial abaixo formalmente convocado:\n\n` +
        `• **Policial Notificado:** <@${targetUser.id}>\n` +
        `• **Autoridade Convocante:** <@${interaction.user.id}>\n` +
        `• **Finalidade:** \`${reason}\`\n` +
        `• **Data e Horário:** <t:${Math.floor(scheduledFor.getTime() / 1000)}:F> (<t:${Math.floor(
          scheduledFor.getTime() / 1000
        )}:R>)\n` +
        `• **Local / Sala:** \`${location}\`\n\n` +
        `*O não comparecimento sem justa causa configurará infração disciplinar por desobediência funcional.*`
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`summons_confirm:${summons.id}`)
        .setLabel('Confirmar Presença / Ciência')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`summons_justify_prompt:${summons.id}`)
        .setLabel('Justificar Ausência')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('📝')
    );

    await interaction.reply({
      content: `<@${targetUser.id}> • Você recebeu uma intimação oficial da Corregedoria Geral.`,
      embeds: [embed],
      components: [row]
    });
  }
};

export default convocarCommand;
