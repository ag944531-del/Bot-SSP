import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { EmergencyModeService } from '../../services/EmergencyModeService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const emergenciaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('emergencia')
    .setDescription('Protocolo de Emergência Institucional (bloqueio de alterações e salvaguarda do sistema).')
    .addSubcommand((sub) =>
      sub
        .setName('ativar')
        .setDescription('Ativa o modo de emergência bloqueando operações de RH e Corregedoria.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Justificativa para ativação do protocolo de emergência').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('desativar')
        .setDescription('Desativa o modo de emergência e restabelece as operações normais.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Justificativa para o encerramento do protocolo').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Consulta o status atual do modo de emergência.')
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_EMERGENCIA, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const em = await EmergencyModeService.isEmergencyActive(guildId);
      const embed = em.active
        ? EmbedPresets.denied('PROTOCOLO DE EMERGÊNCIA ATIVO', `O modo de emergência está ativado.\n**Motivo:** ${em.reason}`)
        : EmbedPresets.success('OPERAÇÃO NORMAL', 'O sistema está operando sob regime normal de funcionamento.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const reason = interaction.options.getString('motivo', true);

    if (sub === 'ativar') {
      await EmergencyModeService.setEmergencyMode({
        guildId,
        enabled: true,
        reason,
        activatedById: interaction.user.id
      });

      const embed = EmbedPresets.denied(
        'PROTOCOLO DE EMERGÊNCIA ATIVADO',
        `A autoridade <@${interaction.user.id}> ativou o protocolo de emergência institucional.\n\n` +
        `• **Efeito:** Alterações funcionais de RH e processos da Corregedoria foram temporariamente congelados.\n` +
        `• **Justificativa:** ${reason}`
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'desativar') {
      await EmergencyModeService.setEmergencyMode({
        guildId,
        enabled: false,
        reason,
        activatedById: interaction.user.id
      });

      const embed = EmbedPresets.success(
        'PROTOCOLO DE EMERGÊNCIA DESATIVADO',
        `O regime normal de operações institucionais foi restabelecido por <@${interaction.user.id}>.\n**Justificativa:** ${reason}`
      );

      return interaction.reply({ embeds: [embed] });
    }
  }
};

export default emergenciaCommand;
