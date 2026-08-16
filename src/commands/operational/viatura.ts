import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { VehicleStatus } from '@prisma/client';
import { SlashCommand } from '../../@types/index.js';
import { VehicleService } from '../../services/VehicleService.js';
import { UnitService } from '../../services/UnitService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const viaturaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('viatura')
    .setDescription('Gerencia a frota de viaturas e veículos da corporação.')
    .addSubcommand((sub) =>
      sub
        .setName('cadastrar')
        .setDescription('Cadastra um novo veículo na frota oficial.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('modelo').setDescription('Modelo da viatura (ex: Trailblazer, Hilux)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('prefixo').setDescription('Prefixo da VTR (ex: CG-01, RO-102)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('placa').setDescription('Placa do veículo (ex: SSP-2026)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('unidade').setDescription('Sigla da unidade vinculada (opcional)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista todas as viaturas registradas e sua situação operacional.')
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Atualiza a situação operacional de uma viatura.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('prefixo').setDescription('Prefixo da viatura').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('situacao')
            .setDescription('Nova situação da viatura')
            .setRequired(true)
            .addChoices(
              { name: 'Disponível', value: VehicleStatus.DISPONIVEL },
              { name: 'Em Patrulhamento', value: VehicleStatus.EM_PATRULHAMENTO },
              { name: 'Em Manutenção', value: VehicleStatus.MANUTENCAO },
              { name: 'Apreendida', value: VehicleStatus.APREENDIDA },
              { name: 'Indisponível', value: VehicleStatus.INDISPONIVEL }
            )
        )
    ),
  category: 'copom',
  requiredPermissions: [Permissions.COPOM_GERENCIAR_VIATURA],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'cadastrar') {
      const model = interaction.options.getString('modelo', true);
      const prefix = interaction.options.getString('prefixo', true);
      const plate = interaction.options.getString('placa', true);
      const unitQuery = interaction.options.getString('unidade') || undefined;

      let unitId: string | undefined;
      if (unitQuery) {
        const unit = await UnitService.findUnit(guildId, unitQuery);
        if (unit) unitId = unit.id;
      }

      try {
        const vehicle = await VehicleService.createVehicle({
          guildId,
          model,
          prefix,
          plate,
          unitId
        });

        const embed = InstitutionalEmbedBuilder.success(
          'Viatura Cadastrada',
          `A viatura **${vehicle.model}** (\`VTR ${vehicle.prefix}\`) foi integrada à frota com sucesso.\n\n` +
            `• **Placa:** \`${vehicle.plate}\`\n` +
            `• **Situação Inicial:** \`${vehicle.status}\``
        );

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        if (err.code === 'P2002') {
          await interaction.reply({
            content: `Já existe uma viatura cadastrada com o prefixo \`${prefix.toUpperCase()}\`.`,
            ephemeral: true
          });
          return;
        }
        throw err;
      }
    } else if (subcommand === 'listar') {
      const vehicles = await VehicleService.listVehicles(guildId);

      if (vehicles.length === 0) {
        await interaction.reply({
          content: 'Nenhuma viatura cadastrada na frota. Cadastre com `/viatura cadastrar`.',
          ephemeral: true
        });
        return;
      }

      let desc = '**QUADRO GERAL DA FROTA OPERACIONAL:**\n\n';
      vehicles.forEach((v) => {
        desc += `🚓 **VTR ${v.prefix}** — *${v.model}* (\`${v.plate}\`)\n` +
          `• **Unidade:** \`${(v as any).unit?.abbreviation || 'Geral'}\` | **Situação:** \`${v.status}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Controle de Frota de Viaturas',
        status: `${vehicles.length} Veículos Cadastrados`,
        color: COLORS.PRIMARY,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'status') {
      const prefix = interaction.options.getString('prefixo', true);
      const status = interaction.options.getString('situacao', true) as VehicleStatus;

      const vehicle = await VehicleService.findVehicle(guildId, prefix);
      if (!vehicle) {
        await interaction.reply({
          content: `Viatura de prefixo \`${prefix.toUpperCase()}\` não foi localizada na frota.`,
          ephemeral: true
        });
        return;
      }

      const updated = await VehicleService.updateVehicleStatus(guildId, prefix, status);

      const embed = InstitutionalEmbedBuilder.success(
        'Situação da Viatura Atualizada',
        `A viatura **VTR ${updated.prefix}** teve sua situação alterada para \`${updated.status}\`.`
      );

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default viaturaCommand;
