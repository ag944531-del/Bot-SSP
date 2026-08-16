import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { BulletinService } from '../../services/BulletinService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const boletimCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('boletim')
    .setDescription('Gerencia e publica Boletins Gerais (BG) e Boletins Internos (BI).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('publicar')
        .setDescription('Publica uma nova edição oficial de Boletim Geral ou Interno.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('titulo').setDescription('Assunto ou Título principal do boletim').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('conteudo').setDescription('Texto completo e determinações do boletim').setRequired(true)
        )
        .addBooleanOption((opt: SlashCommandBooleanOption) =>
          opt.setName('interno').setDescription('Marque como verdadeiro para Boletim Interno Reservado (BI)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('listar')
        .setDescription('Lista as edições recentes de boletins oficiais.')
        .addBooleanOption((opt: SlashCommandBooleanOption) =>
          opt.setName('interno').setDescription('Listar Boletins Internos').setRequired(false)
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.BOLETIM_PUBLICAR_BG],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'publicar') {
      const title = interaction.options.getString('titulo', true);
      const content = interaction.options.getString('conteudo', true);
      const isInternal = interaction.options.getBoolean('interno') || false;

      const bulletin = await BulletinService.publishBulletin({
        guildId,
        title,
        content,
        authorId: interaction.user.id,
        isInternal,
        client: interaction.client
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Boletim Publicado',
        `A publicação oficial **${bulletin.number}** foi editada e transmitida ao canal oficial de boletins.\n\n` +
          `• **Assunto:** \`${bulletin.title}\`\n` +
          `• **Tipo:** \`${isInternal ? 'Boletim Interno (BI)' : 'Boletim Geral (BG)'}\``
      );

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'listar') {
      const isInternal = interaction.options.getBoolean('interno') || false;
      const bulletins = await BulletinService.listBulletins(guildId, isInternal);

      if (bulletins.length === 0) {
        await interaction.reply({
          content: `Nenhum ${isInternal ? 'Boletim Interno' : 'Boletim Geral'} localizado nos arquivos.`,
          ephemeral: true
        });
        return;
      }

      let desc = `**PUBLICAÇÕES RECENTES (${isInternal ? 'BOLETINS INTERNOS' : 'BOLETINS GERAIS'}):**\n\n`;
      bulletins.forEach((b) => {
        desc += `📄 **${b.number}** — \`${b.title}\` (<t:${Math.floor(b.createdAt.getTime() / 1000)}:d>)\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: isInternal ? 'Arquivo de Boletins Internos (BI)' : 'Arquivo de Boletins Gerais (BG)',
        status: 'Registros Oficiais',
        color: isInternal ? COLORS.DANGER : COLORS.PRIMARY,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default boletimCommand;
