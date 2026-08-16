import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const corregedoriaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('corregedoria')
    .setDescription('Abre o painel central da Corregedoria Geral da corporação.'),
  category: 'corregedoria',
  requiredPermissions: [Permissions.CORREGEDORIA_CRIAR_IPM],
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Corregedoria Geral • Órgão de Correição & Ética',
      status: 'Acesso Reservado',
      color: COLORS.DANGER,
      description:
        `Painel de controle correcional, investigações preliminares, inquéritos e disciplina militar.\n\n` +
        `**COMPETÊNCIAS CORRECIONAIS:**\n` +
        `• ⚖️ **IPM:** Inquéritos Policiais Militares e apuração de crimes funcionais;\n` +
        `• 📑 **PDO:** Procedimentos Disciplinares Ordinários e infrações éticas;\n` +
        `• 📢 **Convocações:** Mandados de intimação para oitivas e defesas;\n` +
        `• 🚫 **Sanções:** Aplicação de advertências, suspensões e decisões disciplinares.\n\n` +
        `Utilize os atalhos abaixo ou os comandos específicos (\`/ipm\`, \`/pdo\`, \`/convocar\`, \`/sancao\`).`
    });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('corregedoria_open_denuncia')
        .setLabel('Nova Notícia / Denúncia')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🚨'),
      new ButtonBuilder()
        .setCustomId('corregedoria_open_ipm')
        .setLabel('Instaurar IPM')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚖️'),
      new ButtonBuilder()
        .setCustomId('corregedoria_open_pdo')
        .setLabel('Instaurar PDO')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📑')
    );

    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('corregedoria_open_convocar')
        .setLabel('Emitir Convocação')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📢'),
      new ButtonBuilder()
        .setCustomId('corregedoria_open_sancao')
        .setLabel('Aplicar Sanção')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚫'),
      new ButtonBuilder()
        .setCustomId('corregedoria_refresh')
        .setLabel('Atualizar')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2]
    });
  }
};

export default corregedoriaCommand;
