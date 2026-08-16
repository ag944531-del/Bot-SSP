import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { prisma } from '../../database/prisma.js';

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Exibe a latência operacional e integridade dos sistemas da Segurança Pública.'),
  category: 'public',
  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    // Testar tempo de resposta do banco de dados
    const dbStart = Date.now();
    let dbStatus = 'Operacional';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'Indisponível';
    }
    const dbLatency = Date.now() - dbStart;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Diagnóstico Operacional do Sistema',
      status: 'Operante',
      color: COLORS.INFO,
      description:
        `Status de conectividade e desempenho da infraestrutura central:\n\n` +
        `**📡 GATEWAY DISCORD:** \` ${wsPing}ms \`\n` +
        `**⚡ LATÊNCIA DE RESPOSTA:** \` ${latency}ms \`\n` +
        `**📦 BANCO DE DADOS (POSTGRES):** \` ${dbLatency}ms (${dbStatus}) \`\n` +
        `**⏱️ TEMPO DE ATIVIDADE:** \` ${uptimeStr} \`\n` +
        `**💾 CONSUMO DE MEMÓRIA:** \` ${memoryUsage} MB \``
    });

    await interaction.editReply({ embeds: [embed] });
  }
};

export default pingCommand;
