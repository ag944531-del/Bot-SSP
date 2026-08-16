import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandIntegerOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { RankService } from '../../services/RankService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const patenteCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('patente')
    .setDescription('Gerencia a estrutura hierárquica de patentes e graduações.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cadastra uma nova patente na hierarquia da corporação.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('nome').setDescription('Nome da patente (ex: Soldado, Coronel)').setRequired(true)
        )
        .addIntegerOption((opt: SlashCommandIntegerOption) =>
          opt
            .setName('nivel')
            .setDescription('Nível hierárquico (1 a 100 - quanto maior, maior a autoridade)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addRoleOption((opt: SlashCommandRoleOption) =>
          opt.setName('cargo').setDescription('Cargo correspondente no Discord').setRequired(false)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('abreviacao').setDescription('Sigla/Abreviação (ex: Sd, Cel)').setRequired(false)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('setor').setDescription('Setor (ex: Comando Geral, Oficiais, Praças)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista o quadro hierárquico completo ordenado por antiguidade/nível.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('deletar')
        .setDescription('Remove uma patente existente da hierarquia.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('patente_id').setDescription('ID ou Nome exato da patente a ser removida').setRequired(true)
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
      const name = interaction.options.getString('nome', true);
      const level = interaction.options.getInteger('nivel', true);
      const role = interaction.options.getRole('cargo') as Role | null;
      const abbreviation = interaction.options.getString('abreviacao') || undefined;
      const sector = interaction.options.getString('setor') || undefined;

      try {
        const rank = await RankService.createRank({
          guildId,
          name,
          level,
          discordRoleId: role?.id,
          abbreviation,
          sector
        });

        const embed = InstitutionalEmbedBuilder.success(
          'Patente Registrada',
          `A patente **${rank.name}** (Nível \`${rank.level}\`) foi inserida com sucesso no quadro institucional.\n\n` +
            `• **Sigla:** \`${rank.abbreviation || 'N/A'}\`\n` +
            `• **Cargo Vinculado:** ${rank.discordRoleId ? `<@&${rank.discordRoleId}>` : '`Nenhum`'}\n` +
            `• **Setor:** \`${rank.sector || 'Geral'}\``
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code === 'P2002') {
          await interaction.reply({
            content: `Já existe uma patente cadastrada com o nível hierárquico \`${level}\`. Escolha outro nível.`,
            ephemeral: true
          });
          return;
        }
        throw err;
      }
    } else if (subcommand === 'listar') {
      const ranks = await RankService.listRanks(guildId);

      if (ranks.length === 0) {
        await interaction.reply({
          content: 'Nenhuma patente foi cadastrada ainda neste servidor. Utilize `/patente criar`.',
          ephemeral: true
        });
        return;
      }

      let desc = '**ESCALA HIERÁRQUICA INSTITUCIONAL (ORDEM DE PRECEDÊNCIA):**\n\n';
      ranks.forEach((r) => {
        desc += `\`[NV ${r.level.toString().padStart(2, '0')}]\` **${r.name}** (${r.abbreviation || 'S/S'}) — ${
          r.discordRoleId ? `<@&${r.discordRoleId}>` : '`Sem cargo`'
        }\n• ID: \`${r.id}\` | Efetivo Ativo: \`${(r as any)._count?.profiles ?? 0}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Quadro Geral de Patentes e Graduações',
        status: 'Hierarquia Oficial',
        color: COLORS.PRIMARY,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'deletar') {
      const query = interaction.options.getString('patente_id', true);
      const rank = await RankService.findRank(guildId, query);

      if (!rank) {
        await interaction.reply({
          content: `Patente correspondente a \`${query}\` não foi localizada.`,
          ephemeral: true
        });
        return;
      }

      await RankService.deleteRank(guildId, rank.id);

      const embed = InstitutionalEmbedBuilder.success(
        'Patente Removida',
        `A patente **${rank.name}** (Nível \`${rank.level}\`) foi excluída com sucesso.`
      );

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default patenteCommand;
