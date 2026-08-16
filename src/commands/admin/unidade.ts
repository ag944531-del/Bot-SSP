import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
  SlashCommandRoleOption,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { UnitService } from '../../services/UnitService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const unidadeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('unidade')
    .setDescription('Gerencia as unidades, batalhões e departamentos policiais.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cadastra uma nova unidade policial/batalhão.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('nome').setDescription('Nome da unidade (ex: 1º Batalhão de Choque)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('sigla').setDescription('Sigla da unidade (ex: ROTA, BAEP)').setRequired(true)
        )
        .addRoleOption((opt: SlashCommandRoleOption) =>
          opt.setName('cargo').setDescription('Cargo correspondente no Discord').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista todas as unidades cadastradas e seus efetivos.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('deletar')
        .setDescription('Remove uma unidade do sistema.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('unidade_id').setDescription('Sigla ou ID da unidade a ser removida').setRequired(true)
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
      const abbreviation = interaction.options.getString('sigla', true);
      const role = interaction.options.getRole('cargo') as Role | null;

      try {
        const unit = await UnitService.createUnit({
          guildId,
          name,
          abbreviation,
          discordRoleId: role?.id
        });

        const embed = InstitutionalEmbedBuilder.success(
          'Unidade Cadastrada',
          `A unidade **${unit.name}** (\`${unit.abbreviation}\`) foi registrada com sucesso.\n\n` +
            `• **Cargo Vinculado:** ${unit.discordRoleId ? `<@&${unit.discordRoleId}>` : '`Nenhum`'}`
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code === 'P2002') {
          await interaction.reply({
            content: `Já existe uma unidade cadastrada com a sigla \`${abbreviation.toUpperCase()}\`.`,
            ephemeral: true
          });
          return;
        }
        throw err;
      }
    } else if (subcommand === 'listar') {
      const units = await UnitService.listUnits(guildId);

      if (units.length === 0) {
        await interaction.reply({
          content: 'Nenhuma unidade foi cadastrada ainda neste servidor. Utilize `/unidade criar`.',
          ephemeral: true
        });
        return;
      }

      let desc = '**QUADRO DE UNIDADES E BATALHÕES:**\n\n';
      units.forEach((u) => {
        desc += `🏢 **${u.name}** (\`${u.abbreviation}\`)\n` +
          `• Cargo: ${u.discordRoleId ? `<@&${u.discordRoleId}>` : '`Nenhum`'} | ID: \`${u.id}\`\n` +
          `• Policiais Lotados: \`${(u as any)._count?.profiles ?? 0}\` | Viaturas: \`${(u as any)._count?.vehicles ?? 0}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Unidades e Departamentos Oficiais',
        status: 'Estrutura Organizacional',
        color: COLORS.PRIMARY,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'deletar') {
      const query = interaction.options.getString('unidade_id', true);
      const unit = await UnitService.findUnit(guildId, query);

      if (!unit) {
        await interaction.reply({
          content: `Unidade correspondente a \`${query}\` não foi localizada.`,
          ephemeral: true
        });
        return;
      }

      await UnitService.deleteUnit(guildId, unit.id);

      const embed = InstitutionalEmbedBuilder.success(
        'Unidade Removida',
        `A unidade **${unit.name}** (\`${unit.abbreviation}\`) foi removida do sistema.`
      );

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default unidadeCommand;
