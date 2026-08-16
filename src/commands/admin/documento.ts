import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { DocumentService } from '../../services/DocumentService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { DocumentType } from '@prisma/client';
import { Permissions } from '../../permissions/permissions.js';

export const documentoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('documento')
    .setDescription('Emite e formaliza documentos institucionais oficiais com assinatura digital.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('tipo')
        .setDescription('Tipo do documento a ser emitido')
        .setRequired(true)
        .addChoices(
          { name: 'Ficha Funcional Individual', value: 'FICHA_FUNCIONAL' },
          { name: 'Histórico Policial', value: 'HISTORICO_POLICIAL' },
          { name: 'Relatório Operacional Geral', value: 'RELATORIO_OPERACIONAL' },
          { name: 'Boletim Interno / Geral', value: 'BOLETIM_GERAL' }
        )
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('titulo').setDescription('Título ou assunto principal do documento').setRequired(true)
    )
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial relacionado (obrigatório para ficha e histórico)').setRequired(false)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('conteudo').setDescription('Texto customizado opcional para o corpo do documento').setRequired(false)
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_DOCUMENTOS, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const type = interaction.options.getString('tipo', true) as DocumentType;
    const title = interaction.options.getString('titulo', true);
    const targetUser = interaction.options.getUser('policial');
    const customContent = interaction.options.getString('conteudo') || undefined;

    if (['FICHA_FUNCIONAL', 'HISTORICO_POLICIAL'].includes(type) && !targetUser) {
      return interaction.reply({
        embeds: [EmbedPresets.attention('DADOS INCOMPLETOS', 'Para emitir Ficha Funcional ou Histórico, selecione o policial alvo.')],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const result = await DocumentService.generateDocument({
      guildId,
      type,
      title,
      authorId: interaction.user.id,
      authorName: interaction.user.username,
      authorRank: 'Autoridade Emissora',
      targetUserId: targetUser?.id,
      customContent,
      signImmediately: true
    });

    const embed = EmbedPresets.success(
      'DOCUMENTO INSTITUCIONAL EMITIDO',
      `Documento registrado sob o protocolo \`${result.document.protocol}\` com assinatura digital.`
    );

    embed.addFields(
      { name: 'Título', value: result.document.title, inline: true },
      { name: 'Tipo', value: result.document.type, inline: true },
      { name: 'Assinado Digitalmente por', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Código de Autenticidade', value: `\`${result.signature?.identifier || 'N/A'}\``, inline: true }
    );

    // Truncar conteúdo para o embed se for longo
    const displayContent =
      result.document.content.length > 900
        ? result.document.content.substring(0, 897) + '...'
        : result.document.content;

    embed.addFields({ name: 'Visualização do Conteúdo', value: `\`\`\`${displayContent}\`\`\`` });

    embed.setFooter({ text: `Assinatura: ${result.signature?.identifier} • Consulte com /validar` });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

export default documentoCommand;
