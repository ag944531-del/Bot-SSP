import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { ButtonInteractionHandler } from '../../@types/index.js';
import { PoliceProfileService } from '../../services/PoliceProfileService.js';
import { DutyService } from '../../services/DutyService.js';
import { CopomService } from '../../services/CopomService.js';
import { VehicleService } from '../../services/VehicleService.js';
import { AlertService } from '../../services/AlertService.js';
import { DeadlineService } from '../../services/DeadlineService.js';
import { InstitutionalEmbedBuilder, EmbedPresets } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const tabletNavButton: ButtonInteractionHandler = {
  customId: 'tablet_nav',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const parts = interaction.customId.split(':');
    const targetAction = parts[1];

    if (targetAction === 'perfil') {
      const targetUserId = parts[2] || interaction.user.id;
      const profile = await PoliceProfileService.getProfile(interaction.guildId, targetUserId);

      if (!profile) {
        await interaction.reply({
          content: 'Seu cadastro funcional ainda não foi realizado pelo setor de RH.',
          ephemeral: true
        });
        return;
      }

      const dutyHours = (profile.totalDutyMinutes / 60).toFixed(1);

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Ficha Funcional • Tablet Tático',
        status: profile.status,
        protocol: `MATRÍCULA: ${profile.badgeNumber}`,
        color: COLORS.PRIMARY,
        description:
          `• **Policial:** ${profile.name} (\`${profile.operationalName}\`)\n` +
          `• **Patente:** \`${profile.rank ? profile.rank.name : 'N/A'}\`\n` +
          `• **Unidade:** \`${profile.unit ? profile.unit.name : 'Geral'}\`\n` +
          `• **Horas em Serviço:** \`${dutyHours}h\` | **Patrulhas:** \`${profile.totalPatrols}\`\n` +
          `• **Prisões Efetuadas:** \`${profile.totalArrests}\` | **Multas:** \`${profile.totalFines}\`\n` +
          `• **Ocorrências Atendidas:** \`${profile.totalOccurrences}\``
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (targetAction === 'ponto') {
      const activeSession = await DutyService.getActiveSession(interaction.guildId, interaction.user.id);
      const profile = await PoliceProfileService.getProfile(interaction.guildId, interaction.user.id);

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Status de Serviço • Ponto Eletrônico',
        status: activeSession ? 'Em Serviço' : 'Fora de Serviço',
        color: activeSession ? COLORS.SUCCESS : COLORS.NEUTRAL,
        description:
          `• **Operador:** ${profile?.name || interaction.user.username}\n` +
          `• **Situação:** ${activeSession ? '🟢 **EM SERVIÇO ATIVO**' : '⚪ **FORA DE SERVIÇO**'}\n` +
          (activeSession
            ? `• **Entrada:** <t:${Math.floor(activeSession.startTime.getTime() / 1000)}:T>`
            : 'Utilize o comando `/ponto` para registrar entrada ou saída.')
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (targetAction === 'copom') {
      const { embed } = await CopomService.buildCopomEmbed(interaction.guildId);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (targetAction === 'viaturas') {
      const vehicles = await VehicleService.listVehicles(interaction.guildId);

      let desc = '**FROTA DISPONÍVEL:**\n\n';
      if (vehicles.length === 0) {
        desc += '*Nenhuma viatura registrada no sistema.*';
      } else {
        vehicles.forEach((v) => {
          desc += `🚓 **VTR ${v.prefix}** (${v.model}) — \`${v.status}\` [Placa: \`${v.plate}\`]\n`;
        });
      }

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Quadro da Frota • Tablet Tático',
        status: `${vehicles.length} Veículos`,
        color: COLORS.PRIMARY,
        description: desc
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  }
};

export const tabletDirectSectionButton: ButtonInteractionHandler = {
  customId: 'tablet:',
  async execute(interaction: ButtonInteraction) {
    if (!interaction.guildId) return;

    const parts = interaction.customId.split(':');
    const section = parts[1];

    if (section === 'copom') {
      const { embed } = await CopomService.buildCopomEmbed(interaction.guildId);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (section === 'rh') {
      return interaction.reply({
        embeds: [
          EmbedPresets.primary(
            'GESTÃO DE RECURSOS HUMANOS',
            'Utilize os comandos `/painelrh`, `/cadastrar`, `/promover`, `/transferir` ou `/escala` para gerenciar o efetivo.'
          )
        ],
        ephemeral: true
      });
    }

    if (section === 'corregedoria') {
      return interaction.reply({
        embeds: [
          EmbedPresets.primary(
            'CORREGEDORIA GERAL',
            'Utilize os comandos `/corregedoria`, `/ipm`, `/pdo`, `/convocar` ou `/sancao` para conduzir investigações e processos disciplinares.'
          )
        ],
        ephemeral: true
      });
    }

    if (section === 'academia') {
      return interaction.reply({
        embeds: [
          EmbedPresets.primary(
            'ACADEMIA & ESCOLA DE FORMAÇÃO',
            'Utilize os comandos `/academia`, `/curso`, `/instrutor` ou `/certificado` para administrar turmas e capacitações.'
          )
        ],
        ephemeral: true
      });
    }
  }
};

export const comandoAlertsButton: ButtonInteractionHandler = {
  customId: 'comando:alertas',
  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    await interaction.deferReply({ ephemeral: true });

    const [alerts, deadlines] = await Promise.all([
      AlertService.listAlerts(guildId),
      DeadlineService.getCriticalDeadlines(guildId)
    ]);

    const embed = EmbedPresets.attention(
      'ALERTAS E PRAZOS DO COMANDO GERAL',
      `Alertas Ativos: ${alerts.length} | Prazos Críticos: ${deadlines.length}`
    );

    if (deadlines.length > 0) {
      embed.addFields({
        name: 'Prazos Processuais em Atenção',
        value: deadlines.map((d) => `• [${d.protocol}] ${d.title} (Restam ${d.daysRemaining} dias)`).join('\n')
      });
    }

    return interaction.editReply({ embeds: [embed] });
  }
};

export const tabletActionButton: ButtonInteractionHandler = {
  customId: 'tablet_action',
  async execute(interaction: ButtonInteraction) {
    const actionType = interaction.customId.split(':')[1];

    if (actionType === 'prisao') {
      const modal = new ModalBuilder()
        .setCustomId('operational_modal_prisao')
        .setTitle('Auto de Prisão em Flagrante');

      const inputSuspect = new TextInputBuilder()
        .setCustomId('suspect_name')
        .setLabel('Nome do Acusado')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputArticles = new TextInputBuilder()
        .setCustomId('articles')
        .setLabel('Artigos Penais / Tipificação')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputPenalty = new TextInputBuilder()
        .setCustomId('penalty_months')
        .setLabel('Pena (Meses)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNarrative = new TextInputBuilder()
        .setCustomId('narrative')
        .setLabel('Local e Dinâmica dos Fatos')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputSuspect),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputArticles),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputPenalty),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputNarrative)
      );

      await interaction.showModal(modal);
      return;
    }

    if (actionType === 'multa') {
      const modal = new ModalBuilder()
        .setCustomId('operational_modal_multa')
        .setTitle('Auto de Infração e Notificação');

      const inputCitizen = new TextInputBuilder()
        .setCustomId('citizen_name')
        .setLabel('Nome do Cidadão Autuado')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputInfraction = new TextInputBuilder()
        .setCustomId('infraction')
        .setLabel('Infração / Conduta')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputAmount = new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Valor (R$)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputDetails = new TextInputBuilder()
        .setCustomId('details')
        .setLabel('Artigo e Detalhes')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputCitizen),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputInfraction),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputAmount),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputDetails)
      );

      await interaction.showModal(modal);
      return;
    }

    if (actionType === 'apreensao') {
      const modal = new ModalBuilder()
        .setCustomId('operational_modal_apreensao')
        .setTitle('Auto de Apreensão de Materiais');

      const inputLocation = new TextInputBuilder()
        .setCustomId('location')
        .setLabel('Local da Apreensão')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputCategory = new TextInputBuilder()
        .setCustomId('category')
        .setLabel('Categoria Principal')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputItems = new TextInputBuilder()
        .setCustomId('items_list')
        .setLabel('Itens e Quantidades')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputLocation),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputCategory),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputItems)
      );

      await interaction.showModal(modal);
      return;
    }

    if (actionType === 'ocorrencia') {
      const modal = new ModalBuilder()
        .setCustomId('operational_modal_ocorrencia')
        .setTitle('Boletim de Ocorrência Policial');

      const inputType = new TextInputBuilder()
        .setCustomId('type')
        .setLabel('Natureza da Ocorrência')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputLocation = new TextInputBuilder()
        .setCustomId('location')
        .setLabel('Local do Fato')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputInvolved = new TextInputBuilder()
        .setCustomId('involved')
        .setLabel('Envolvidos / Vítimas')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputOfficers = new TextInputBuilder()
        .setCustomId('officers')
        .setLabel('Policiais e Viaturas')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const inputNarrative = new TextInputBuilder()
        .setCustomId('narrative')
        .setLabel('Histórico e Desfecho')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputType),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputLocation),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputInvolved),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputOfficers),
        new ActionRowBuilder<TextInputBuilder>().addComponents(inputNarrative)
      );

      await interaction.showModal(modal);
      return;
    }
  }
};

export const handlers = [tabletNavButton, tabletDirectSectionButton, comandoAlertsButton, tabletActionButton];
export default handlers;
