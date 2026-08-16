import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  User
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { MedalService } from '../../services/MedalService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const medalhaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('medalha')
    .setDescription('Gerencia e outorga medalhas, condecorações e honrarias policiais.')
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cadastra uma nova honraria no quadro de condecorações.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('nome').setDescription('Nome da medalha (ex: Cruz de Honra, Mérito Policial)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('categoria').setDescription('Categoria (Bravura, Mérito, Tempo de Serviço, Honra)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('descricao').setDescription('Significado e critérios de outorga').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('imagem_url').setDescription('URL da imagem/insígnia da medalha').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('conceder')
        .setDescription('Outorga uma condecoração a um policial com registro na ficha funcional.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('medalha_id').setDescription('ID da Medalha').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial').setDescription('Policial agraciado').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('motivo').setDescription('Fundamentação e ato de bravura ou mérito').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista todas as honrarias cadastradas na corporação.')
    ),
  category: 'rh',
  requiredPermissions: [Permissions.RH_PROMOVER],
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
      const name = interaction.options.getString('nome', true);
      const category = interaction.options.getString('categoria', true);
      const description = interaction.options.getString('descricao', true);
      const imageUrl = interaction.options.getString('imagem_url') || undefined;

      const medal = await MedalService.createMedal({
        guildId,
        name,
        category,
        description,
        imageUrl
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Condecoração Instituída',
        `A medalha **${medal.name}** (\`${medal.category}\`) foi criada no quadro de honrarias.\n\n` +
          `• **Descrição:** *${medal.description}*\n` +
          `• **ID da Medalha:** \`${medal.id}\``
      );

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === 'conceder') {
      const medalId = interaction.options.getString('medalha_id', true);
      const targetUser: User = interaction.options.getUser('policial', true);
      const reason = interaction.options.getString('motivo', true);

      try {
        await MedalService.grantMedal({
          guildId,
          medalId,
          targetUserId: targetUser.id,
          authorId: interaction.user.id,
          reason
        });

        const embed = InstitutionalEmbedBuilder.create({
          title: 'Outorga de Condecoração Policial',
          status: 'Honraria Concedida',
          responsible: `<@${interaction.user.id}>`,
          color: COLORS.WARNING,
          description:
            `Por ato solene de reconhecimento, foi outorgada honraria ao policial:\n\n` +
            `• **Agraciado:** <@${targetUser.id}>\n` +
            `• **Autoridade Concedente:** <@${interaction.user.id}>\n` +
            `• **Fundamentação:** *${reason}*\n\n` +
            `*A condecoração passa a constar oficialmente nos assentamentos funcionais do policial.*`
        });

        await interaction.reply({ embeds: [embed] });
      } catch (err: any) {
        await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    } else if (subcommand === 'listar') {
      const medals = await MedalService.listMedals(guildId);

      if (medals.length === 0) {
        await interaction.reply({ content: 'Nenhuma medalha cadastrada no momento.', ephemeral: true });
        return;
      }

      let desc = '**QUADRO DE CONDECORAÇÕES E HONRARIAS:**\n\n';
      medals.forEach((m: any) => {
        desc += `🎖️ **${m.name}** (${m.category})\n` +
          `• *${m.description}*\n` +
          `• ID: \`${m.id}\` | Policiais Agraciados: \`${m._count?.holders ?? 0}\`\n\n`;
      });

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Galeria de Honrarias e Medalhas',
        status: `${medals.length} Condecorações`,
        color: COLORS.WARNING,
        description: desc
      });

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default medalhaCommand;
