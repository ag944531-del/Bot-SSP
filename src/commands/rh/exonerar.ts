import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { PermissionService, Permissions } from '../../permissions/permissions.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const exonerarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('exonerar')
    .setDescription('Exonera um policial do serviço ativo da corporação com remoção de cargos e desativação.')
    .addUserOption((opt: SlashCommandUserOption) =>
      opt.setName('policial').setDescription('Policial a ser exonerado').setRequired(true)
    )
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('motivo').setDescription('Fundamentação legal/disciplinar da exoneração').setRequired(true)
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_EXONERAR],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) return;

    const targetUser: User = interaction.options.getUser('policial', true);
    const reason = interaction.options.getString('motivo', true);
    const authorMember = interaction.member as GuildMember;

    const hierarchyCheck = await PermissionService.canActOnTarget(interaction.guild.id, authorMember, targetUser.id);
    if (!hierarchyCheck.allowed) {
      await interaction.reply({
        content: `⛔ **Ação Negada:** ${hierarchyCheck.reason}`,
        ephemeral: true
      });
      return;
    }

    const confirmEmbed = InstitutionalEmbedBuilder.create({
      title: 'Confirmação de Exoneração Funcional',
      status: 'Ação Crítica',
      color: COLORS.DANGER,
      responsible: authorMember,
      description:
        `⚠️ **ATENÇÃO: PROCEDIMENTO GRAVE E IRREVERSÍVEL VIA COMANDO DIRETO**\n\n` +
        `Você está prestes a exonerar o policial <@${targetUser.id}>.\n\n` +
        `**CONSEQUÊNCIAS AUTOMÁTICAS:**\n` +
        `• Remoção imediata de todos os cargos policiais vinculados no Discord;\n` +
        `• Encerramento de ponto e serviço de patrulhamento ativos;\n` +
        `• Alteração da situação funcional para \`EXONERADO\`;\n` +
        `• Preservação de todo o histórico para fins de auditoria e Corregedoria.\n\n` +
        `**MOTIVO APRESENTADO:**\n*${reason}*\n\n` +
        `Para confirmar a exoneração, clique no botão abaixo.`
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_dismissal:${targetUser.id}:${encodeURIComponent(reason)}`)
        .setLabel('Confirmar Exoneração')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️'),
      new ButtonBuilder()
        .setCustomId('cancel_action')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true
    });
  }
};

export default exonerarCommand;
