import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { HealthService } from '../../services/HealthService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Exibe o diagnóstico de integridade, latência e disponibilidade dos serviços.'),
  category: 'public',
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const status = await HealthService.getSystemStatus(interaction.client);

    const embed = EmbedPresets.primary(
      'STATUS & DIAGNÓSTICO DO SISTEMA',
      'Painel de monitoramento de disponibilidade e integridade da infraestrutura.'
    );

    embed.addFields(
      {
        name: '🤖 Discord Gateway',
        value: `\`${status.discord}\` (${status.latencyMs} ms)`,
        inline: true
      },
      {
        name: '🗄️ Banco de Dados (PostgreSQL)',
        value: `\`${status.database}\` (${status.dbLatencyMs >= 0 ? `${status.dbLatencyMs} ms` : 'Indisponível'})`,
        inline: true
      },
      {
        name: '⏱️ Uptime do Sistema',
        value: `\`${status.uptimeFormatted}\``,
        inline: true
      },
      {
        name: '📦 Versão da Plataforma',
        value: `\`${status.version}\``,
        inline: true
      },
      {
        name: '🌐 Ambiente',
        value: `\`${status.environment}\``,
        inline: true
      },
      {
        name: '🧠 Uso de Memória (RSS)',
        value: `\`${status.memoryUsageMb} MB\``,
        inline: true
      }
    );

    embed.setFooter({ text: 'Monitoramento Contínuo de Disponibilidade • SSP' });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

export default statusCommand;
