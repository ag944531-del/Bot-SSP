import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { BlacklistService } from '../../services/BlacklistService.js';
import { TemporaryPermissionService } from '../../services/TemporaryPermissionService.js';
import { EmergencyModeService } from '../../services/EmergencyModeService.js';
import { prisma } from '../../database/prisma.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const segurancaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('seguranca')
    .setDescription('Painel de Gestão e Central de Segurança Institucional do Sistema.'),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_SEGURANCA, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const [
      blacklisted,
      tempPerms,
      emergency,
      maintenance,
      recentIncidents
    ] = await Promise.all([
      BlacklistService.listBlacklist(guildId, true),
      TemporaryPermissionService.listActivePermissions(guildId),
      EmergencyModeService.isEmergencyActive(guildId),
      EmergencyModeService.isMaintenanceActive(guildId),
      prisma.securityIncident.findMany({
        where: { guildId, status: 'ABERTO' },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    const embed = EmbedPresets.primary(
      'CENTRAL DE SEGURANÇA & CONTINUIDADE INSTITUCIONAL',
      'Monitoramento de salvaguardas, integridade de acessos e protocolos de defesa.'
    );

    embed.addFields(
      {
        name: '🛡️ MODOS OPERACIONAIS',
        value: `• **Modo Emergência:** ${emergency.active ? '🔴 **ATIVADO**' : '🟢 **NORMAL**'}\n• **Modo Manutenção:** ${maintenance.active ? '🟡 **ATIVADO**' : '🟢 **NORMAL**'}`,
        inline: true
      },
      {
        name: '🚫 LISTA DE BLOQUEIO (BLACKLIST)',
        value: `• **Usuários Impedidos:** ${blacklisted.length}\n• **Status:** ${blacklisted.length > 0 ? 'Políticas restritivas ativas' : 'Nenhum impedimento'}`,
        inline: true
      },
      {
        name: '⏳ PERMISSÕES TEMPORÁRIAS',
        value: `• **Concessões Ativas:** ${tempPerms.length}\n• **Expiração:** Controle automatizado`,
        inline: true
      }
    );

    if (recentIncidents.length > 0) {
      const incText = recentIncidents
        .map((i: any) => `• **[${i.protocol}] [${i.severity}] ${i.type}**\n  ${i.description} (<t:${Math.floor(i.createdAt.getTime() / 1000)}:R>)`)
        .join('\n');
      embed.addFields({ name: '🚨 INCIDENTES DE SEGURANÇA RECENTES', value: incText });
    }

    embed.setFooter({ text: 'Sistema de Proteção e Salvaguarda • SSP' });
    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('sec:blacklist').setLabel('Ver Blacklist').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('sec:temp_perms').setLabel('Permissões Temp.').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('sec:incidents').setLabel('Incidentes').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('sec:backup').setLabel('Central Backup').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};

export default segurancaCommand;
