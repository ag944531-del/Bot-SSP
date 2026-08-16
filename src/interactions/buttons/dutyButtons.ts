import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { DutyService } from '../../services/DutyService.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const dutyStartButton: ButtonInteractionHandler = {
  customId: 'duty_start',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    try {
      const { session, profile } = await DutyService.startDuty(interaction.guildId, interaction.user.id);

      const embed = InstitutionalEmbedBuilder.success(
        'Entrada em Serviço Registrada',
        `O policial **${profile.name}** (\`${profile.operationalName}\`) iniciou a sua escala de serviço.\n\n` +
          `• **Horário:** <t:${Math.floor(session.startTime.getTime() / 1000)}:T>\n` +
          `• **Patente:** \`${profile.rank ? profile.rank.name : 'N/A'}\`\n` +
          `• **Unidade:** \`${profile.unit ? profile.unit.name : 'Geral'}\``
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const dutyStopButton: ButtonInteractionHandler = {
  customId: 'duty_stop',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    try {
      const result = await DutyService.stopDuty(interaction.guildId, interaction.user.id);

      const embed = InstitutionalEmbedBuilder.success(
        'Saída de Serviço Registrada',
        `A jornada de serviço foi encerrada com êxito.\n\n` +
          `• **Duração Desta Sessão:** \`${result.durationFormatted}\`\n` +
          `• **Tempo Total Acumulado:** \`${(result.totalMinutes / 60).toFixed(1)} horas\``
      );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const dutyStatusButton: ButtonInteractionHandler = {
  customId: 'duty_status',
  async execute(interaction: ButtonInteraction) {
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

    await interaction.update({
      embeds: [embed],
      components: [row]
    });
  }
};

export const handlers = [dutyStartButton, dutyStopButton, dutyStatusButton];
export default handlers;
