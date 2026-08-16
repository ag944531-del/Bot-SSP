import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { SearchService } from '../../services/SearchService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const consultarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('consultar')
    .setDescription('Central de Consultas e Pesquisa Global Unificada do Sistema.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('termo')
        .setDescription('Digite o protocolo, nome, matrícula, viatura ou termo de busca')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  category: 'admin',
  async autocomplete(interaction: AutocompleteInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.respond([]);

    const focusedValue = interaction.options.getFocused();
    const suggestions = await SearchService.autocomplete(guildId, focusedValue);
    await interaction.respond(suggestions.slice(0, 25));
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: 'Este comando só pode ser utilizado em um servidor.', ephemeral: true });
    }

    const query = interaction.options.getString('termo', true);
    await interaction.deferReply({ ephemeral: true });

    const results = await SearchService.globalSearch(guildId, query, 5);

    if (results.length === 0) {
      const embed = EmbedPresets.attention(
        'NENHUM REGISTRO ENCONTRADO',
        `Não foram localizados registros correspondentes para o termo informado: **"${query}"**.\nVerifique a grafia ou o protocolo.`
      );
      return interaction.editReply({ embeds: [embed] });
    }

    const first = results[0];
    const embed = EmbedPresets.primary(
      'CENTRAL DE CONSULTAS & PESQUISA INSTITUCIONAL',
      `Resultados encontrados para a busca: **\`${query}\`**`
    );

    embed.addFields(
      { name: 'Protocolo / Categoria', value: `\`${first.protocol || first.category}\` (${first.category})`, inline: true },
      { name: 'Status / Situação', value: `\`${first.status || 'CONCLUÍDO'}\``, inline: true },
      { name: 'Data de Registro', value: first.date.toLocaleDateString('pt-BR'), inline: true },
      { name: 'Título / Descrição', value: `**${first.title}**\n${first.subtitle || ''}`, inline: false }
    );

    if (results.length > 1) {
      const others = results
        .slice(1)
        .map((r, i) => `**${i + 2}. [${r.category}]** ${r.title} • \`${r.protocol || 'ID'}\``)
        .join('\n');
      embed.addFields({ name: 'Outras Correspondências', value: others });
    }

    embed.setFooter({ text: 'Sistema Integrado de Inteligência & Governança • SSP' });
    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`search:view:${first.id}`)
        .setLabel('Ver Detalhes')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`search:timeline:${first.raw.userId || first.id}`)
        .setLabel('Histórico Funcional')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!first.raw.userId)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
  }
};

export default consultarCommand;
