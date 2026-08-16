import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { DutyService } from '../../services/DutyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const tabletCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('tablet')
    .setDescription('Abre o Terminal Tático / Tablet Policial com acesso centralizado a todos os sistemas.'),
  category: 'operational',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const profile = await PoliceProfileService.getProfile(interaction.guildId, interaction.user.id);
    const activeDuty = await DutyService.getActiveSession(interaction.guildId, interaction.user.id);

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Terminal Tático Operacional • Tablet Policial',
      status: activeDuty ? 'Sessão Ativa' : 'Standby',
      color: COLORS.PRIMARY,
      description:
        `Bem-vindo ao Terminal Tático de Campo da Segurança Pública.\n\n` +
        `• **Operador:** ${profile ? profile.name : interaction.user.username} (\`${profile?.operationalName || 'Não Cadastrado'}\`)\n` +
        `• **Patente:** \`${profile?.rank ? profile.rank.name : 'N/A'}\` | **Unidade:** \`${profile?.unit ? profile.unit.name : 'Geral'}\`\n` +
        `• **Status de Serviço:** ${activeDuty ? '🟢 `EM PATRULHAMENTO / SERVIÇO`' : '⚪ `FORA DE SERVIÇO`'}\n\n` +
        `Selecione uma das opções táticas abaixo:`
    });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`tablet_nav:perfil:${interaction.user.id}`)
        .setLabel('Meu Perfil')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('👤'),
      new ButtonBuilder()
        .setCustomId('tablet_nav:ponto')
        .setLabel('Controle de Ponto')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏱️'),
      new ButtonBuilder()
        .setCustomId('tablet_nav:copom')
        .setLabel('Rede COPOM')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📻'),
      new ButtonBuilder()
        .setCustomId('tablet_nav:viaturas')
        .setLabel('Viaturas')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🚓')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('tablet_action:prisao')
        .setLabel('Auto de Prisão')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('tablet_action:multa')
        .setLabel('Notificação / Multa')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📑'),
      new ButtonBuilder()
        .setCustomId('tablet_action:apreensao')
        .setLabel('Apreensão')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📦'),
      new ButtonBuilder()
        .setCustomId('tablet_action:ocorrencia')
        .setLabel('Ocorrência')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📄')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  }
};

export default tabletCommand;
