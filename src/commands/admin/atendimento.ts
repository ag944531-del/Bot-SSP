import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextChannel
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';
import { Permissions } from '../../permissions/permissions.js';

export const atendimentoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('atendimento')
    .setDescription('Envia o painel institucional persistente da Central de Atendimento / Tickets.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'admin',
  requiredPermissions: [Permissions.ADMIN_CONFIGURAR],
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = InstitutionalEmbedBuilder.create({
      title: 'Central de Atendimento Institucional • Requerimentos & Protocolos',
      status: 'Canal Oficial de Atendimento',
      color: COLORS.PRIMARY,
      description:
        `Bem-vindo ao Portal de Atendimento Oficial da Segurança Pública.\n\n` +
        `Este canal é destinado ao registro formal de requerimentos administrativos, denúncias, solicitações ao RH, processos da Corregedoria e inscrições na Escola de Formação.\n\n` +
        `**SELECIONE O SETOR DESEJADO NO MENU ABAIXO:**\n` +
        `• 📋 **Recursos Humanos:** Promoções, lotações, dúvidas funcionais;\n` +
        `• ⚖️ **Corregedoria Geral:** Denúncias disciplinares, IPMs e esclarecimentos;\n` +
        `• 🎓 **Escola de Formação:** Cursos, inscrições e certificados;\n` +
        `• 📑 **Requerimento Geral:** Solicitações formais ao Comando;\n` +
        `• 🚨 **Denúncia / Ocorrência:** Relato de fatos delituosos;\n` +
        `• ⚙️ **Suporte Técnico:** Questões de sistema ou acesso.\n\n` +
        `*Após a seleção, um canal privado de protocolo será aberto exclusivamente para o seu atendimento.*`
    });

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Selecione a categoria de atendimento oficial...')
        .addOptions(
          { label: 'Recursos Humanos (RH)', value: 'Recursos Humanos', emoji: '📋', description: 'Requerimentos, certidões e questões de carreira' },
          { label: 'Corregedoria Geral', value: 'Corregedoria', emoji: '⚖️', description: 'Denúncias disciplinares e processos éticos' },
          { label: 'Escola de Formação', value: 'Escola de Formação', emoji: '🎓', description: 'Inscrições em cursos e qualificações' },
          { label: 'Requerimento Administrativo', value: 'Requerimento', emoji: '📑', description: 'Solicitações ao Comando e pedidos oficiais' },
          { label: 'Denúncia / Notícia-Crime', value: 'Denúncia', emoji: '🚨', description: 'Comunicação de ilícitos e infrações' },
          { label: 'Suporte Operacional', value: 'Suporte', emoji: '⚙️', description: 'Apoio técnico e dúvidas de sistema' }
        )
    );

    await interaction.reply({
      content: '✅ **Painel da Central de Atendimento enviado com sucesso.**',
      ephemeral: true
    });

    if (interaction.channel && 'send' in interaction.channel) {
      await (interaction.channel as TextChannel).send({
        embeds: [embed],
        components: [select]
      });
    }
  }
};

export default atendimentoCommand;
