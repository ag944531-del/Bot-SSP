import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { RHService } from '../../services/RHService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const historicoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('historico')
    .setDescription('Consulta o histórico funcional completo e movimentações de carreira de um policial.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser consultado').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_VER_HISTORICO],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const profile = await RHService.getFullHistory(interaction.guildId, targetUser.id);

    if (!profile) {
      await interaction.reply({
        content: `Não foi encontrado nenhum registro funcional para <@${targetUser.id}>.`,
        ephemeral: true
      });
      return;
    }

    let report = `**ASSENTAMENTO FUNCIONAL — HISTÓRICO INTEGRAL**\n\n`;
    report += `• **Policial:** ${profile.name} (\`${profile.operationalName}\`)\n`;
    report += `• **Matrícula:** \`${profile.badgeNumber}\`\n`;
    report += `• **Situação Atual:** \`${profile.status}\`\n`;
    report += `• **Patente:** \`${profile.rank ? profile.rank.name : 'N/A'}\` | **Unidade:** \`${profile.unit ? profile.unit.name : 'N/A'}\`\n\n`;

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `**REGISTRO DE PROMOÇÕES (${profile.promotions.length}):**\n`;
    if (profile.promotions.length === 0) {
      report += `*Nenhuma promoção registrada.*\n`;
    } else {
      profile.promotions.slice(0, 5).forEach((p) => {
        report += `• \`${p.protocol}\` • **${p.previousRank}** ➔ **${p.newRank}** (<t:${Math.floor(p.createdAt.getTime() / 1000)}:d>)\n  *Motivo:* ${p.reason}\n`;
      });
    }

    report += `\n**REGISTRO DE TRANSFERÊNCIAS (${profile.transfers.length}):**\n`;
    if (profile.transfers.length === 0) {
      report += `*Nenhuma transferência registrada.*\n`;
    } else {
      profile.transfers.slice(0, 5).forEach((t) => {
        report += `• \`${t.protocol}\` • **${t.previousUnit}** ➔ **${t.newUnit}** (<t:${Math.floor(t.createdAt.getTime() / 1000)}:d>)\n  *Motivo:* ${t.reason}\n`;
      });
    }

    report += `\n**REGISTRO DE REBAIXAMENTOS (${profile.demotions.length}):**\n`;
    if (profile.demotions.length === 0) {
      report += `*Nenhum rebaixamento registrado.*\n`;
    } else {
      profile.demotions.slice(0, 5).forEach((d) => {
        report += `• \`${d.protocol}\` • **${d.previousRank}** ➔ **${d.newRank}** (<t:${Math.floor(d.createdAt.getTime() / 1000)}:d>)\n  *Motivo:* ${d.reason}\n`;
      });
    }

    if (profile.dismissals.length > 0) {
      report += `\n**REGISTRO DE EXONERAÇÃO:**\n`;
      profile.dismissals.forEach((exo) => {
        report += `⚠️ \`${exo.protocol}\` • **Exonerado em:** <t:${Math.floor(exo.createdAt.getTime() / 1000)}:f>\n  *Fundamentação:* ${exo.reason}\n`;
      });
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: `Prontuário Funcional • ${profile.operationalName}`,
      status: profile.status,
      protocol: `MAT: ${profile.badgeNumber}`,
      color: COLORS.PRIMARY,
      description: report
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default historicoCommand;
