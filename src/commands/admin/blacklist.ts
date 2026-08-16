import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { BlacklistService } from '../../services/BlacklistService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { BlacklistStatus } from '@prisma/client';
import { Permissions } from '../../permissions/permissions.js';

export const blacklistCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Gerencia a lista de bloqueio institucional (impedimentos administrativos e disciplinares).')
    .addSubcommand((sub) =>
      sub
        .setName('adicionar')
        .setDescription('Inclui um usuário na lista restritiva da instituição.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial').setDescription('Usuário / Policial a ser bloqueado').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt
            .setName('status')
            .setDescription('Situação restritiva')
            .setRequired(true)
            .addChoices(
              { name: 'Bloqueado Administrativamente', value: 'BLOQUEADO' },
              { name: 'Suspenso Disciplinarmente', value: 'SUSPENSO' },
              { name: 'Exonerado da Instituição', value: 'EXONERADO' },
              { name: 'Impedido Funcionalmente', value: 'IMPEDIDO' },
              { name: 'Sob Investigação Restritiva', value: 'INVESTIGADO' }
            )
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Motivo ou processo legal que fundamenta o bloqueio').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remover')
        .setDescription('Remove ou reabilita um usuário da lista de bloqueio.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial').setDescription('Usuário / Policial a ser reabilitado').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Motivo da reabilitação / liberação').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('consultar')
        .setDescription('Verifica a situação de um usuário específico na blacklist.')
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial').setDescription('Usuário a ser verificado').setRequired(true)
        )
    ),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_BLACKLIST, Permissions.ADMIN_MASTER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'adicionar') {
      const targetUser = interaction.options.getUser('policial', true);
      const status = interaction.options.getString('status', true) as BlacklistStatus;
      const reason = interaction.options.getString('motivo', true);

      await BlacklistService.addToBlacklist({
        guildId,
        userId: targetUser.id,
        userName: targetUser.username,
        status,
        reason,
        addedById: interaction.user.id
      });

      const embed = EmbedPresets.denied(
        'USUÁRIO INSERIDO NA LISTA DE BLOQUEIO',
        `O usuário <@${targetUser.id}> foi marcado sob a situação restritiva **${status}**.\nTodas as funcionalidades operacionais e administrativas foram bloqueadas preventivamente.`
      );

      embed.addFields(
        { name: 'Policial', value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
        { name: 'Situação', value: `\`${status}\``, inline: true },
        { name: 'Autoridade Responsável', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Fundamentação', value: reason, inline: false }
      );

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remover') {
      const targetUser = interaction.options.getUser('policial', true);
      const reason = interaction.options.getString('motivo', true);

      try {
        await BlacklistService.removeFromBlacklist({
          guildId,
          userId: targetUser.id,
          removedById: interaction.user.id,
          reason
        });

        const embed = EmbedPresets.success(
          'USUÁRIO REABILITADO / DESBLOQUEADO',
          `O usuário <@${targetUser.id}> foi removido da lista de restrições funcionais com sucesso.`
        );

        embed.addFields(
          { name: 'Policial', value: `<@${targetUser.id}>`, inline: true },
          { name: 'Autoridade', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Motivo da Liberação', value: reason, inline: false }
        );

        return interaction.reply({ embeds: [embed] });
      } catch (error: any) {
        return interaction.reply({
          embeds: [EmbedPresets.attention('NÃO ENCONTRADO', error.message || 'Falha ao reabilitar usuário.')],
          ephemeral: true
        });
      }
    }

    if (sub === 'consultar') {
      const targetUser = interaction.options.getUser('policial', true);
      const check = await BlacklistService.isBlacklisted(guildId, targetUser.id);

      if (check.blocked) {
        const embed = EmbedPresets.denied(
          'USUÁRIO CONSTA NA BLACKLIST INSTITUCIONAL',
          `O usuário <@${targetUser.id}> está **IMPEDIDO** de realizar operações na corporação.`
        );
        embed.addFields(
          { name: 'Status', value: `\`${check.status}\``, inline: true },
          { name: 'Motivo Registrado', value: check.reason || 'Restrição administrativa', inline: false }
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } else {
        const embed = EmbedPresets.success(
          'USUÁRIO REGULAR / SEM RESTRIÇÕES',
          `O usuário <@${targetUser.id}> encontra-se em situação regular e não possui restrições ativas na blacklist.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};

export default blacklistCommand;
