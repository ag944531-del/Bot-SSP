import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { DutyService } from '../../services/DutyService.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const pontoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ponto')
    .setDescription('Painel de controle de ponto e serviço operacional.'),
  category: 'operational',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const profile = await PoliceProfileService.getProfile(interaction.guildId, interaction.user.id);
    const activeSession = await DutyService.getActiveSession(interaction.guildId, interaction.user.id);

    const totalHours = profile ? (profile.totalDutyMinutes / 60).toFixed(1) : '0.0';

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Controle de Ponto e Escala de Serviço',
      status: activeSession ? 'Em Serviço' : 'Fora de Serviço',
      color: activeSession ? COLORS.SUCCESS : COLORS.NEUTRAL,
      description:
        `Painel de registro de presença e horas em serviço ativo da corporação.\n\n` +
        `• **Policial:** ${profile ? profile.name : interaction.user.username} (\`${profile?.operationalName || 'Não Cadastrado'}\`)\n` +
        `• **Status Atual:** ${activeSession ? '🟢 **EM SERVIÇO ATIVO**' : '⚪ **FORA DE SERVIÇO**'}\n` +
        (activeSession
          ? `• **Entrada:** <t:${Math.floor(activeSession.startTime.getTime() / 1000)}:T> (<t:${Math.floor(
              activeSession.startTime.getTime() / 1000
            )}:R>)\n`
          : '') +
        `• **Total de Horas Acumuladas:** \`${totalHours} horas\`\n\n` +
        `Utilize os botões abaixo para iniciar ou encerrar sua jornada de serviço.`
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('duty_start')
        .setLabel('Entrar em Serviço')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🟢')
        .setDisabled(!!activeSession),
      new ButtonBuilder()
        .setCustomId('duty_stop')
        .setLabel('Sair de Serviço')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔴')
        .setDisabled(!activeSession),
      new ButtonBuilder()
        .setCustomId('duty_status')
        .setLabel('Atualizar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};

export default pontoCommand;
