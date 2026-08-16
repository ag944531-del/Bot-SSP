import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandIntegerOption,
  SlashCommandUserOption,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { FiveMIntegrationService } from '../../services/FiveMIntegrationService.js';
import { SyncService } from '../../services/SyncService.js';
import { prisma } from '../../database/prisma.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const fivemCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('fivem')
    .setDescription('Painel de Gestão e Integração com a Cidade FiveM.')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Consulta a disponibilidade do servidor FiveM, framework e latência.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('verificar')
        .setDescription('Consulta os dados do personagem no FiveM e seu vínculo institucional.')
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('passaporte').setDescription('Passaporte / ID do jogador no FiveM').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('vincular')
        .setDescription('Vincula manualmente uma conta do Discord a um passaporte da cidade.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('membro').setDescription('Usuário do Discord').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('passaporte').setDescription('Passaporte no FiveM').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('desvincular')
        .setDescription('Remove o vínculo entre o Discord e o passaporte.')
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt.setName('passaporte').setDescription('Passaporte no FiveM').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('sincronizar').setDescription('Executa uma varredura de reconciliação entre Discord e FiveM.')
    )
    .addSubcommand((sub) =>
      sub.setName('divergencias').setDescription('Exibe a lista de divergências de patentes/unidades detectadas.')
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_MASTER, Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // 1. /fivem status
    if (sub === 'status') {
      await interaction.deferReply({ ephemeral: true });
      const status = await FiveMIntegrationService.getStatus();

      const embed = status.online
        ? EmbedPresets.success(
            'INTEGRAÇÃO FIVEM • ONLINE',
            `A ponte de comunicação com o servidor FiveM está funcionando com alta estabilidade.`
          )
        : EmbedPresets.denied(
            'INTEGRAÇÃO FIVEM • INDISPONÍVEL',
            `Não foi possível obter resposta do resource \`security_bridge\` no servidor FiveM.`
          );

      embed.addFields(
        { name: 'Status do Servidor', value: status.online ? '🟢 `ONLINE`' : '🔴 `OFFLINE`', inline: true },
        { name: 'Framework', value: `\`${status.framework}\``, inline: true },
        { name: 'Latência do Bridge', value: `${status.latencyMs >= 0 ? `${status.latencyMs} ms` : 'Inacessível'}`, inline: true },
        { name: 'Jogadores Conectados', value: `${status.onlinePlayers}`, inline: true },
        { name: 'Adapter Ativo', value: FiveMIntegrationService.getAdapter().name, inline: true }
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('fivem:reconcile').setLabel('Sincronizar Agora').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('fivem:divergences').setLabel('Ver Divergências').setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({ embeds: [embed], components: [row] });
    }

    // 2. /fivem verificar
    if (sub === 'verificar') {
      await interaction.deferReply({ ephemeral: true });
      const passport = interaction.options.getInteger('passaporte', true);

      const [character, link] = await Promise.all([
        FiveMIntegrationService.getCharacter(passport),
        prisma.fivemLink.findUnique({
          where: { guildId_passport: { guildId, passport } },
          include: { policeProfile: { include: { rank: true, unit: true } } }
        })
      ]);

      if (!character && !link) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('NÃO ENCONTRADO', `Nenhum personagem com passaporte \`${passport}\` foi localizado na cidade.`)]
        });
      }

      const embed = EmbedPresets.primary(
        `DADOS DO PASSAPORTE #${passport}`,
        `Informações consolidadas entre Cidade FiveM e Sistema Institucional:`
      );

      embed.addFields(
        { name: 'Nome no FiveM', value: character?.name || 'Não identificado', inline: true },
        { name: 'Status na Cidade', value: character?.isOnline ? '🟢 `ONLINE`' : '⚪ `OFFLINE`', inline: true },
        { name: 'Vínculo Discord', value: link ? `<@${link.discordId}>` : '❌ Sem Vínculo', inline: true }
      );

      if (link && link.policeProfile) {
        embed.addFields(
          { name: 'Nome de Guerra', value: link.policeProfile.operationalName, inline: true },
          { name: 'Patente Atual', value: link.policeProfile.rank?.name || 'N/A', inline: true },
          { name: 'Unidade', value: link.policeProfile.unit?.name || 'Geral', inline: true }
        );
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // 3. /fivem vincular
    if (sub === 'vincular') {
      await interaction.deferReply({ ephemeral: true });
      const targetUser = interaction.options.getUser('membro', true);
      const passport = interaction.options.getInteger('passaporte', true);

      // Checar se o personagem existe
      const character = await FiveMIntegrationService.getCharacter(passport);
      if (!character) {
        return interaction.editReply({
          embeds: [EmbedPresets.denied('CADASTRO RECUSADO', `Nenhum personagem foi encontrado na base da cidade com o passaporte \`${passport}\`.`)]
        });
      }

      // Checar duplicidades
      const existingLink = await prisma.fivemLink.findFirst({
        where: {
          guildId,
          OR: [{ discordId: targetUser.id }, { passport }]
        }
      });

      if (existingLink) {
        return interaction.editReply({
          embeds: [
            EmbedPresets.attention(
              'VÍNCULO DUPLICADO IMPEDIDO',
              existingLink.discordId === targetUser.id
                ? `O usuário <@${targetUser.id}> já está vinculado ao passaporte \`${existingLink.passport}\`.`
                : `O passaporte \`${passport}\` já se encontra vinculado a outro Discord (<@${existingLink.discordId}>).`
            )
          ]
        });
      }

      const profile = await prisma.policeProfile.findUnique({
        where: { guildId_userId: { guildId, userId: targetUser.id } }
      });

      await prisma.fivemLink.create({
        data: {
          guildId,
          discordId: targetUser.id,
          passport,
          policeProfileId: profile?.id
        }
      });

      const embed = EmbedPresets.success(
        'VÍNCULO FIVEM CRIADO COM SUCESSO',
        `A conta <@${targetUser.id}> foi vinculada com segurança ao passaporte **#${passport}** (${character.name}).`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // 4. /fivem desvincular
    if (sub === 'desvincular') {
      await interaction.deferReply({ ephemeral: true });
      const passport = interaction.options.getInteger('passaporte', true);

      const link = await prisma.fivemLink.findUnique({
        where: { guildId_passport: { guildId, passport } }
      });

      if (!link) {
        return interaction.editReply({
          embeds: [EmbedPresets.attention('NÃO LOCALIZADO', `Nenhum vínculo ativo encontrado para o passaporte \`${passport}\`.`)]
        });
      }

      await prisma.fivemLink.delete({ where: { id: link.id } });

      const embed = EmbedPresets.success(
        'VÍNCULO REMOVIDO',
        `O vínculo entre o passaporte **#${passport}** e o usuário <@${link.discordId}> foi desfeito com sucesso.`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // 5. /fivem sincronizar
    if (sub === 'sincronizar') {
      await interaction.deferReply({ ephemeral: true });
      const result = await SyncService.reconcileGuild(guildId);

      const embed = EmbedPresets.primary(
        'RECONCILIAÇÃO DISCORD ↔ FIVEM CONCLUÍDA',
        `Varredura de integridade executada em todos os membros vinculados da corporação.`
      );

      embed.addFields(
        { name: 'Total Verificados', value: `${result.totalChecked}`, inline: true },
        { name: 'Sincronizados (OK)', value: `🟢 ${result.syncedCount}`, inline: true },
        { name: 'Divergências Encontradas', value: `🟡 ${result.divergentCount}`, inline: true }
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // 6. /fivem divergencias
    if (sub === 'divergencias') {
      await interaction.deferReply({ ephemeral: true });
      const result = await SyncService.reconcileGuild(guildId);

      if (result.divergences.length === 0) {
        return interaction.editReply({
          embeds: [EmbedPresets.success('NENHUMA DIVERGÊNCIA', 'Todos os policiais encontram-se com situação 100% idêntica entre Discord e FiveM!')]
        });
      }

      const embed = EmbedPresets.attention(
        'DIVERGÊNCIAS DETECTADAS (DISCORD ↔ FIVEM)',
        'Foram encontradas inconsistências que requerem conferência ou resolução manual:'
      );

      for (const d of result.divergences.slice(0, 10)) {
        embed.addFields({
          name: `⚠️ ${d.officerName} (Passaporte: ${d.passport})`,
          value: `**Discord:** <@${d.discordId}>\n**Patente Bot:** ${d.botRank}\n**Problema:** ${d.issue}`
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }
  }
};

export default fivemCommand;
