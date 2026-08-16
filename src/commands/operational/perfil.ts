import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const perfilCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Consulta a ficha e assentamento funcional de um policial.')
    .addUserOption((option: SlashCommandUserOption) =>
      option
        .setName('policial')
        .setDescription('Policial a ser consultado (deixe vazio para consultar a si mesmo)')
        .setRequired(false)
    ),
  category: 'operational',
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'Este comando só pode ser executado em um servidor.', ephemeral: true });
      return;
    }

    const targetUser: User = interaction.options.getUser('policial') || interaction.user;
    const profile = await PoliceProfileService.getProfile(interaction.guildId, targetUser.id);

    if (!profile) {
      const emptyEmbed = InstitutionalEmbedBuilder.create({
        title: 'Ficha Funcional • Registro Não Localizado',
        status: 'Não Cadastrado',
        color: COLORS.WARNING,
        description:
          `Não foi localizado nenhum assentamento funcional ativo para o usuário <@${targetUser.id}>.\n\n` +
          `**Orientações:**\n` +
          `• Policiais devem ser integrados e registrados pelo setor de Recursos Humanos (**RH**).\n` +
          `• Caso seja um recruta recém-admitido, aguarde o cadastro oficial no sistema.`
      });

      await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
      return;
    }

    const dutyHours = Math.floor(profile.totalDutyMinutes / 60);
    const dutyMinutes = profile.totalDutyMinutes % 60;
    const dutyFormatted = `${dutyHours}h${dutyMinutes.toString().padStart(2, '0')}`;

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Ficha e Assentamento Funcional',
      status: profile.status,
      protocol: profile.badgeNumber ? `MATRÍCULA: ${profile.badgeNumber}` : undefined,
      color: profile.status === 'ATIVO' ? COLORS.PRIMARY : COLORS.WARNING,
      description:
        `**DADOS DE IDENTIFICAÇÃO:**\n` +
        `• **Nome Operacional:** \`${profile.operationalName || targetUser.username}\`\n` +
        `• **Nome Completo:** ${profile.name}\n` +
        `• **Matrícula Funcional:** \`${profile.badgeNumber}\`\n` +
        (profile.passportId ? `• **Passaporte / ID:** \`${profile.passportId}\`\n` : '') +
        `• **Patente / Graduação:** \`${profile.rank ? profile.rank.name : 'Não Atribuída'}\`\n` +
        `• **Unidade de Lotação:** \`${profile.unit ? profile.unit.name : 'Geral'}\`\n` +
        (profile.subunit ? `• **Subunidade:** \`${profile.subunit}\`\n` : '') +
        `• **Situação Funcional:** \`${profile.status}\`\n\n` +
        `**MÉTRICAS OPERACIONAIS ACUMULADAS:**\n` +
        `⏱️ **Horas em Serviço:** \`${dutyFormatted}\`\n` +
        `🚓 **Patrulhamentos:** \`${profile.totalPatrols}\`\n` +
        `📋 **Ocorrências Atendidas:** \`${profile.totalOccurrences}\`\n` +
        `🔒 **Prisões Efetuadas:** \`${profile.totalArrests}\`\n` +
        `📑 **Autuações / Multas:** \`${profile.totalFines}\`\n` +
        `🎖️ **Condecorações / Medalhas:** \`${profile.medals.length}\`\n` +
        `🎓 **Certificações / Cursos:** \`${profile.certificates.length}\``
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_history:${profile.userId}`)
        .setLabel('Histórico')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📜'),
      new ButtonBuilder()
        .setCustomId(`profile_courses:${profile.userId}`)
        .setLabel('Cursos')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎓'),
      new ButtonBuilder()
        .setCustomId(`profile_medals:${profile.userId}`)
        .setLabel('Medalhas')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🎖️'),
      new ButtonBuilder()
        .setCustomId(`profile_punishments:${profile.userId}`)
        .setLabel('Punições')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⚖️'),
      new ButtonBuilder()
        .setCustomId(`profile_stats:${profile.userId}`)
        .setLabel('Estatísticas')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};

export default perfilCommand;
