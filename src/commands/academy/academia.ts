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

export const academiaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('academia')
    .setDescription('Abre o painel central da Escola de Formação e Aperfeiçoamento de Praças e Oficiais.'),
  category: 'academy',
  requiredPermissions: [Permissions.ACADEMIA_CRIAR_CURSO],
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Escola de Formação • Academia de Polícia',
      status: 'Centro de Instrução e Doutrina',
      color: COLORS.INFO,
      description:
        `Centro de Aperfeiçoamento, Formação e Treinamento Tático de Praças e Oficiais.\n\n` +
        `**PROGRAMAS E CURSOS DE FORMAÇÃO:**\n` +
        `• 🎓 **Cursos de Formação:** CFS, CFC, Curso de Patrulhamento Tático;\n` +
        `• 🎯 **Especializações:** Ações Táticas Especiais, Abordagem Policial, Tiro Defensivo;\n` +
        `• 📜 **Certificação:** Emissão com código oficial de autenticidade;\n` +
        `• 📊 **Quadro de Instrutores:** Acompanhamento de desempenho e taxa de aprovação.\n\n` +
        `Utilize os atalhos abaixo ou os comandos (\`/curso\`, \`/certificado\`, \`/instrutor\`).`
    });

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('academy_open_create_course')
        .setLabel('Cadastrar Novo Curso')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎓'),
      new ButtonBuilder()
        .setCustomId('academy_open_list_courses')
        .setLabel('Cursos Disponíveis')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋'),
      new ButtonBuilder()
        .setCustomId('academy_open_my_instructor_stats')
        .setLabel('Meu Perfil de Instrutor')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⭐')
    );

    await interaction.reply({
      embeds: [embed],
      components: [row1]
    });
  }
};

export default academiaCommand;
