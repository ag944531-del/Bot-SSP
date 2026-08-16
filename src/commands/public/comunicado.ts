import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { CommunicationService } from '../../services/CommunicationService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const comunicadoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('comunicado')
    .setDescription('Publica uma nota oficial da Assessoria de Comunicação Social.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('tipo')
        .setDescription('Tipo de publicação')
        .setRequired(true)
        .addChoices(
          { name: 'Comunicado Oficial', value: 'Comunicado Oficial' },
          { name: 'Nota de Esclarecimento', value: 'Nota de Esclarecimento' },
          { name: 'Edital de Recrutamento', value: 'Recrutamento' },
          { name: 'Nota de Pesar / Luto', value: 'Nota de Pesar' },
          { name: 'Aviso Institucional', value: 'Aviso Institucional' }
        )
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('titulo').setDescription('Título da publicação').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('conteudo').setDescription('Texto completo da nota oficial').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('imagem_url').setDescription('URL da imagem ou banner institucional (opcional)').setRequired(false)
    ),
  category: 'public',
  requiredPermissions: [Permissions.COMUNICACAO_SOCIAL],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;

    const type = interaction.options.getString('tipo', true);
    const title = interaction.options.getString('titulo', true);
    const content = interaction.options.getString('conteudo', true);
    const imageUrl = interaction.options.getString('imagem_url') || undefined;

    try {
      await CommunicationService.publishNote({
        guildId: interaction.guildId,
        type,
        title,
        content,
        authorId: interaction.user.id,
        imageUrl,
        client: interaction.client
      });

      const successEmbed = InstitutionalEmbedBuilder.success(
        'Nota Oficial Publicada',
        `A publicação **${title}** foi transmitida com sucesso ao canal oficial de Comunicação Social.`
      );

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export default comunicadoCommand;
