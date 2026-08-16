import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { EmergencyModeService } from '../../services/EmergencyModeService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const manutencaoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('manutencao')
    .setDescription('Gerencia o modo de manutenção do sistema institucional.')
    .addSubcommand((sub) =>
      sub
        .setName('ativar')
        .setDescription('Ativa o modo de manutenção.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Justificativa para a manutenção').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('desativar')
        .setDescription('Desativa o modo de manutenção e restaura o acesso aos usuários comuns.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Justificativa para a conclusão da manutenção').setRequired(false)
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_MANUTENCAO, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const reason = interaction.options.getString('motivo') || undefined;

    if (sub === 'ativar') {
      await EmergencyModeService.setMaintenanceMode({
        guildId,
        enabled: true,
        reason,
        activatedById: interaction.user.id
      });

      const embed = EmbedPresets.attention(
        'SISTEMA EM MODO DE MANUTENÇÃO',
        `O modo de manutenção foi **ATIVADO** pela administração.\n` +
        `Algumas funcionalidades para membros comuns poderão ficar temporariamente indisponíveis.\n\n` +
        `**Previsão / Motivo:** ${reason || 'Ajustes técnicos e de infraestrutura'}`
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'desativar') {
      await EmergencyModeService.setMaintenanceMode({
        guildId,
        enabled: false,
        reason,
        activatedById: interaction.user.id
      });

      const embed = EmbedPresets.success(
        'MANUTENÇÃO CONCLUÍDA',
        'O modo de manutenção foi **DESATIVADO**. Todas as funcionalidades do sistema encontram-se plenamente operacionais.'
      );

      return interaction.reply({ embeds: [embed] });
    }
  }
};

export default manutencaoCommand;
