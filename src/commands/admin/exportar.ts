import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  AttachmentBuilder
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { ExportService, ExportCategory } from '../../services/ExportService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const exportarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('exportar')
    .setDescription('Exporta relatórios oficiais e dados institucionais em formato CSV/Planilha.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('categoria')
        .setDescription('Categoria dos dados a exportar')
        .setRequired(true)
        .addChoices(
          { name: 'Quadro Geral do Efetivo', value: 'EFETIVO' },
          { name: 'Folha de Ponto & Presença', value: 'PONTO' },
          { name: 'Ocorrências Registradas', value: 'OCORRENCIAS' },
          { name: 'Cursos da Academia', value: 'CURSOS' },
          { name: 'Logs de Auditoria Administrativa', value: 'AUDITORIA' }
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_EXPORTAR, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const category = interaction.options.getString('categoria', true) as ExportCategory;

    await interaction.deferReply({ ephemeral: true });

    const result = await ExportService.exportToCsv({
      guildId,
      category,
      authorId: interaction.user.id
    });

    const buffer = Buffer.from(result.content, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, { name: result.filename });

    const embed = EmbedPresets.success(
      'EXPORTAÇÃO GERADA COM SUCESSO',
      `O arquivo estruturado com os dados de **${category}** foi gerado e registrado na auditoria institucional.`
    );

    embed.addFields(
      { name: 'Arquivo', value: `\`${result.filename}\``, inline: true },
      { name: 'Solicitante', value: `<@${interaction.user.id}>`, inline: true }
    );

    embed.setFooter({ text: 'Segurança da Informação • Arquivo Restrito' });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  }
};

export default exportarCommand;
