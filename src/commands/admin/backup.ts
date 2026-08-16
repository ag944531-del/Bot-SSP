import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { BackupService } from '../../services/BackupService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const backupCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Painel de Gestão e Central de Backups do Banco de Dados.'),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_BACKUP, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const lastBackup = await BackupService.getLastBackup(guildId);

    const embed = EmbedPresets.primary(
      'CENTRAL DE BACKUPS DO SISTEMA',
      'Rotinas automatizadas de preservação e integridade dos dados institucionais.'
    );

    if (lastBackup) {
      const sizeKb = (lastBackup.fileSizeBytes / 1024).toFixed(1);
      const dateStr = lastBackup.createdAt.toLocaleString('pt-BR');

      embed.addFields(
        { name: 'Último Backup', value: `\`${lastBackup.fileName}\``, inline: true },
        { name: 'Status', value: `\`${lastBackup.status}\``, inline: true },
        { name: 'Tamanho', value: `${sizeKb} KB`, inline: true },
        { name: 'Data da Execução', value: dateStr, inline: true },
        { name: 'Tipo', value: lastBackup.backupType, inline: true },
        { name: 'Integridade (SHA-256)', value: `\`${lastBackup.hashIntegrity ? lastBackup.hashIntegrity.substring(0, 16) + '...' : 'Registrado'}\``, inline: true }
      );
    } else {
      embed.setDescription('Nenhum backup foi realizado para este servidor até o momento.\nClique no botão abaixo para gerar uma cópia instantânea.');
    }

    embed.setFooter({ text: 'Segurança & Continuidade de Negócio • SSP' });
    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('backup:now')
        .setLabel('Fazer Backup Agora')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('backup:history')
        .setLabel('Consultar Histórico')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(lastBackup ? `backup:integrity:${lastBackup.id}` : 'backup:integrity:none')
        .setLabel('Testar Integridade')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!lastBackup),
      new ButtonBuilder()
        .setCustomId('backup:retention')
        .setLabel('Configurar Retenção')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};

export default backupCommand;
