import { ButtonInteraction } from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const profileHistoryButton: ButtonInteractionHandler = {
  customId: 'profile_history',
  async execute(interaction: ButtonInteraction) {
    const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;

    const profile = await PoliceProfileService.getProfile(guildId, targetUserId);
    if (!profile) {
      await interaction.reply({ content: 'Perfil funcional não localizado.', ephemeral: true });
      return;
    }

    let historyText = '';

    if (profile.promotions.length > 0) {
      historyText += `**PROMOÇÕES RECENTES:**\n`;
      profile.promotions.forEach((p) => {
        historyText += `• \`${p.protocol}\` • **${p.previousRank}** ➔ **${p.newRank}** (<t:${Math.floor(
          p.createdAt.getTime() / 1000
        )}:d>)\n  *Motivo:* ${p.reason}\n`;
      });
      historyText += '\n';
    }

    if (profile.transfers.length > 0) {
      historyText += `**TRANSFERÊNCIAS:**\n`;
      profile.transfers.forEach((t) => {
        historyText += `• \`${t.protocol}\` • **${t.previousUnit}** ➔ **${t.newUnit}** (<t:${Math.floor(
          t.createdAt.getTime() / 1000
        )}:d>)\n`;
      });
      historyText += '\n';
    }

    if (profile.demotions.length > 0) {
      historyText += `**REBAIXAMENTOS:**\n`;
      profile.demotions.forEach((d) => {
        historyText += `• \`${d.protocol}\` • **${d.previousRank}** ➔ **${d.newRank}** (<t:${Math.floor(
          d.createdAt.getTime() / 1000
        )}:d>)\n`;
      });
      historyText += '\n';
    }

    if (historyText.trim().length === 0) {
      historyText = 'Nenhuma movimentação de carreira registrada até o momento no assentamento funcional.';
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: `Histórico Funcional • ${profile.operationalName}`,
      protocol: `MATRÍCULA: ${profile.badgeNumber}`,
      color: COLORS.PRIMARY,
      description: historyText
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const profileCoursesButton: ButtonInteractionHandler = {
  customId: 'profile_courses',
  async execute(interaction: ButtonInteraction) {
    const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;

    const profile = await PoliceProfileService.getProfile(guildId, targetUserId);
    if (!profile) {
      await interaction.reply({ content: 'Perfil funcional não localizado.', ephemeral: true });
      return;
    }

    let text = '';
    if (profile.certificates.length > 0) {
      text = `**CERTIFICADOS E QUALIFICAÇÕES ACADÊMICAS:**\n\n`;
      profile.certificates.forEach((c) => {
        text += `🎓 **${c.courseName}**\n• Código: \`${c.code}\` • Data: <t:${Math.floor(c.issueDate.getTime() / 1000)}:d>\n\n`;
      });
    } else {
      text = 'Nenhuma qualificação ou certificado registrado na Escola de Formação até o momento.';
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: `Qualificações e Cursos • ${profile.operationalName}`,
      protocol: `MATRÍCULA: ${profile.badgeNumber}`,
      color: COLORS.INFO,
      description: text
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const profileMedalsButton: ButtonInteractionHandler = {
  customId: 'profile_medals',
  async execute(interaction: ButtonInteraction) {
    const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;

    const profile = await PoliceProfileService.getProfile(guildId, targetUserId);
    if (!profile) {
      await interaction.reply({ content: 'Perfil funcional não localizado.', ephemeral: true });
      return;
    }

    let text = '';
    if (profile.medals.length > 0) {
      text = `**CONDECORAÇÕES E HONRARIAS CONCEDIDAS:**\n\n`;
      profile.medals.forEach((m) => {
        text += `🎖️ **${m.medal.name}** (${m.medal.category})\n• *Motivo:* ${m.reason}\n• Data: <t:${Math.floor(
          m.grantedAt.getTime() / 1000
        )}:d>\n\n`;
      });
    } else {
      text = 'Nenhuma condecoração ou honraria registrada até o momento no assentamento individual.';
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: `Quadro de Medalhas • ${profile.operationalName}`,
      protocol: `MATRÍCULA: ${profile.badgeNumber}`,
      color: COLORS.WARNING,
      description: text
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const profilePunishmentsButton: ButtonInteractionHandler = {
  customId: 'profile_punishments',
  async execute(interaction: ButtonInteraction) {
    const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;

    const profile = await PoliceProfileService.getProfile(guildId, targetUserId);
    if (!profile) {
      await interaction.reply({ content: 'Perfil funcional não localizado.', ephemeral: true });
      return;
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: `Registro Disciplinar • ${profile.operationalName}`,
      protocol: `MATRÍCULA: ${profile.badgeNumber}`,
      color: COLORS.DANGER,
      description:
        `**ASSENTAMENTO DISCIPLINAR DA CORREGEDORIA:**\n\n` +
        `• Não constam sanções disciplinares graves ativas no prontuário.\n` +
        `• Prontuário sob acompanhamento da Corregedoria Geral.`
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const profileStatsButton: ButtonInteractionHandler = {
  customId: 'profile_stats',
  async execute(interaction: ButtonInteraction) {
    const targetUserId = interaction.customId.split(':')[1] || interaction.user.id;
    const guildId = interaction.guildId;
    if (!guildId) return;

    const profile = await PoliceProfileService.getProfile(guildId, targetUserId);
    if (!profile) {
      await interaction.reply({ content: 'Perfil funcional não localizado.', ephemeral: true });
      return;
    }

    const dutyHours = (profile.totalDutyMinutes / 60).toFixed(1);

    const embed = InstitutionalEmbedBuilder.create({
      title: `Estatísticas Operacionais Detalhadas • ${profile.operationalName}`,
      protocol: `MATRÍCULA: ${profile.badgeNumber}`,
      color: COLORS.PRIMARY,
      description:
        `**DESEMPENHO OPERACIONAL:**\n\n` +
        `• **Tempo Total em Serviço:** \`${dutyHours} horas\`\n` +
        `• **Patrulhas Realizadas:** \`${profile.totalPatrols}\`\n` +
        `• **Ocorrências Atendidas:** \`${profile.totalOccurrences}\`\n` +
        `• **Prisões em Flagrante/Mandado:** \`${profile.totalArrests}\`\n` +
        `• **Multas e Notificações:** \`${profile.totalFines}\`\n` +
        `• **Operações Especiais:** \`${profile.totalOperations}\`\n` +
        `• **Data de Ingresso:** <t:${Math.floor(profile.hireDate.getTime() / 1000)}:F>`
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const handlers = [
  profileHistoryButton,
  profileCoursesButton,
  profileMedalsButton,
  profilePunishmentsButton,
  profileStatsButton
];

export default handlers;
