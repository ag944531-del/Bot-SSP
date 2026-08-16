import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { ShiftService } from '../../services/ShiftService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const escalaCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('escala')
    .setDescription('Gerenciamento e consulta das Escalas de Serviço da corporação.')
    .addSubcommand((sub) =>
      sub
        .setName('criar')
        .setDescription('Cria uma nova escala de serviço institucional.')
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('unidade').setDescription('Nome ou sigla da Unidade (ex: ROTA, BAEP, 1º BPM)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('turno').setDescription('Nome do turno (ex: Manhã, Tarde, Noite, 12x36)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('inicio').setDescription('Horário de início (ex: 07:00)').setRequired(true)
        )
        .addStringOption((opt: SlashCommandStringOption) =>
          opt.setName('fim').setDescription('Horário de término (ex: 19:00)').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial1').setDescription('Policial escalado 1').setRequired(true)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial2').setDescription('Policial escalado 2').setRequired(false)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial3').setDescription('Policial escalado 3').setRequired(false)
        )
        .addUserOption((opt: SlashCommandUserOption) =>
          opt.setName('policial4').setDescription('Policial escalado 4').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('listar').setDescription('Lista as escalas de serviço agendadas.')
    )
    .addSubcommand((sub) =>
      sub.setName('efetivo').setDescription('Exibe o quadro consolidado do efetivo geral por situação funcional.')
    ),
  category: 'admin',
  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: 'Servidor inválido.', ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'efetivo') {
      const e = await ShiftService.getEfetivoGeral(guildId);
      const embed = EmbedPresets.primary(
        'QUADRO GERAL DO EFETIVO DA CORPORAÇÃO',
        'Controle numérico da força policial ativa e licenciada.'
      );

      embed.addFields(
        { name: 'Total Cadastrados', value: `\`${e.total}\``, inline: true },
        { name: 'Ativos', value: `\`${e.ativos}\``, inline: true },
        { name: 'Em Serviço (Ponto Aberto)', value: `\`${e.emServico}\``, inline: true },
        { name: 'Afastados / Licença', value: `\`${e.afastados}\``, inline: true },
        { name: 'Férias', value: `\`${e.ferias}\``, inline: true },
        { name: 'Suspensos Disciplinarmente', value: `\`${e.suspensos}\``, inline: true },
        { name: 'Exonerados', value: `\`${e.exonerados}\``, inline: true }
      );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'criar') {
      const unitName = interaction.options.getString('unidade', true);
      const shiftName = interaction.options.getString('turno', true);
      const startTime = interaction.options.getString('inicio', true);
      const endTime = interaction.options.getString('fim', true);

      const memberIds: string[] = [];
      for (let i = 1; i <= 4; i++) {
        const u = interaction.options.getUser(`policial${i}`);
        if (u && !memberIds.includes(u.id)) memberIds.push(u.id);
      }

      const shift = await ShiftService.createShift({
        guildId,
        unitName,
        supervisorId: interaction.user.id,
        date: new Date(),
        shiftName,
        startTime,
        endTime,
        memberUserIds: memberIds
      });

      const embed = EmbedPresets.success(
        'ESCALA DE SERVIÇO REGISTRADA',
        `A escala institucional foi gerada com sucesso sob o protocolo \`${shift.protocol}\`.`
      );

      embed.addFields(
        { name: 'Unidade', value: shift.unitName, inline: true },
        { name: 'Turno', value: `${shift.shiftName} (${shift.startTime} às ${shift.endTime})`, inline: true },
        { name: 'Supervisor', value: `<@${shift.supervisorId}>`, inline: true },
        {
          name: 'Policiais Escalados',
          value: shift.members.map((m) => `• <@${m.userId}> (${m.userName}) - \`${m.status}\``).join('\n') || 'Nenhum'
        }
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`shift:confirm:${shift.id}`).setLabel('Confirmar Presença').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`shift:justify:${shift.id}`).setLabel('Justificar Ausência').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (sub === 'listar') {
      const shifts = await ShiftService.listShifts(guildId, 5);

      if (shifts.length === 0) {
        return interaction.reply({
          embeds: [EmbedPresets.attention('NENHUMA ESCALA', 'Não há escalas de serviço ativas cadastradas.')],
          ephemeral: true
        });
      }

      const embed = EmbedPresets.primary(
        'ESCALAS DE SERVIÇO RECENTES',
        'Listagem das escalas de serviço operacionais programadas.'
      );

      for (const s of shifts) {
        const dateStr = s.date.toLocaleDateString('pt-BR');
        const membersList = s.members.map((m) => `<@${m.userId}> (\`${m.status}\`)`).join(', ') || 'Nenhum';
        embed.addFields({
          name: `[${s.protocol}] ${s.unitName} - ${s.shiftName} (${dateStr})`,
          value: `**Horário:** ${s.startTime} às ${s.endTime}\n**Policiais:** ${membersList}`
        });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

export default escalaCommand;
