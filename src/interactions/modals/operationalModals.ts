import { ModalSubmitInteraction } from 'discord.js';
import { ModalInteractionHandler } from '../../@types/index.js';
import { OperationalService } from '../../services/OperationalService.js';
import { CopomService } from '../../services/CopomService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { Permissions } from '../../permissions/permissions.js';

export const modalPrisao: ModalInteractionHandler = {
  customId: 'operational_modal_prisao',
  requiredPermissions: [Permissions.OPERACIONAL_PRISAO],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const suspectName = interaction.fields.getTextInputValue('suspect_name').trim();
    const passportId = interaction.fields.getTextInputValue('passport_id')?.trim() || undefined;
    const articles = interaction.fields.getTextInputValue('articles').trim();
    const penaltyMonths = parseInt(interaction.fields.getTextInputValue('penalty_months').trim(), 10) || 0;
    const narrative = interaction.fields.getTextInputValue('narrative').trim();

    const arrest = await OperationalService.registerArrest({
      guildId: interaction.guildId,
      suspectName,
      passportId,
      articles,
      penaltyMonths,
      officerId: interaction.user.id,
      location: 'Registrado em Campo',
      narrative,
      client: interaction.client
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Auto de Prisão Homologado',
      `O registro de prisão do indiciado **${suspectName}** foi lavrado com sucesso na base de dados.\n\n` +
        `• **Tipificação Penal:** \`${articles}\`\n` +
        `• **Pena Estabelecida:** \`${penaltyMonths} meses / serviços\`\n` +
        `• **Policial Condutor:** <@${interaction.user.id}>`,
      arrest.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export const modalMulta: ModalInteractionHandler = {
  customId: 'operational_modal_multa',
  requiredPermissions: [Permissions.OPERACIONAL_MULTA],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const citizenName = interaction.fields.getTextInputValue('citizen_name').trim();
    const documentId = interaction.fields.getTextInputValue('document_id')?.trim() || undefined;
    const infraction = interaction.fields.getTextInputValue('infraction').trim();
    const amount = parseFloat(interaction.fields.getTextInputValue('amount').replace(',', '.').trim()) || 0;
    const details = interaction.fields.getTextInputValue('details').trim();

    const fine = await OperationalService.registerFine({
      guildId: interaction.guildId,
      citizenName,
      documentId,
      infraction,
      article: 'CTB / CP',
      amount,
      officerId: interaction.user.id,
      notes: details
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Auto de Infração Emitido',
      `A notificação de autuação contra **${citizenName}** foi registrada.\n\n` +
        `• **Infração:** \`${infraction}\`\n` +
        `• **Valor da Multa:** \`R$ ${amount.toLocaleString('pt-BR')}\`\n` +
        `• **Agente Fiscalizador:** <@${interaction.user.id}>`,
      fine.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export const modalApreensao: ModalInteractionHandler = {
  customId: 'operational_modal_apreensao',
  requiredPermissions: [Permissions.OPERACIONAL_APREENSAO],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const location = interaction.fields.getTextInputValue('location').trim();
    const category = interaction.fields.getTextInputValue('category').trim();
    const itemsList = interaction.fields.getTextInputValue('items_list').trim();
    const notes = interaction.fields.getTextInputValue('notes')?.trim() || undefined;

    const items = itemsList.split('\n').filter((l) => l.trim().length > 0).map((line) => ({
      category,
      name: line.trim(),
      quantity: 1
    }));

    const seizure = await OperationalService.registerSeizure({
      guildId: interaction.guildId,
      officerId: interaction.user.id,
      location,
      notes,
      items
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Auto de Apreensão Registrado',
      `Materiais e bens ilícitos apreendidos foram registrados e tombados sob custódia.\n\n` +
        `• **Local do Fato:** \`${location}\`\n` +
        `• **Volume de Itens:** \`${items.length} registro(s)\`\n` +
        `• **Responsável pelo Recolhimento:** <@${interaction.user.id}>`,
      seizure.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export const modalOcorrencia: ModalInteractionHandler = {
  customId: 'operational_modal_ocorrencia',
  requiredPermissions: [Permissions.OPERACIONAL_OCORRENCIA],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const type = interaction.fields.getTextInputValue('type').trim();
    const location = interaction.fields.getTextInputValue('location').trim();
    const involved = interaction.fields.getTextInputValue('involved').trim();
    const officers = interaction.fields.getTextInputValue('officers').trim();
    const narrative = interaction.fields.getTextInputValue('narrative').trim();

    const occurrence = await OperationalService.registerOccurrence({
      guildId: interaction.guildId,
      type,
      location,
      involved,
      officers,
      narrative,
      result: 'Atendimento Concluído em Campo',
      authorId: interaction.user.id,
      client: interaction.client
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Boletim de Ocorrência Registrado',
      `O Boletim de Ocorrência Policial foi gerado com sucesso.\n\n` +
        `• **Natureza:** \`${type}\`\n` +
        `• **Localidade:** \`${location}\`\n` +
        `• **Encarregado:** <@${interaction.user.id}>`,
      occurrence.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export const modalOperacao: ModalInteractionHandler = {
  customId: 'operational_modal_operacao',
  requiredPermissions: [Permissions.OPERACIONAL_OPERACAO],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const name = interaction.fields.getTextInputValue('name').trim();
    const unitName = interaction.fields.getTextInputValue('unit_name').trim();
    const objective = interaction.fields.getTextInputValue('objective').trim();
    const results = interaction.fields.getTextInputValue('results').trim();
    const officersVehicles = interaction.fields.getTextInputValue('officers_vehicles').trim();

    const op = await OperationalService.registerOperation({
      guildId: interaction.guildId,
      name,
      commanderId: interaction.user.id,
      unitName,
      officers: officersVehicles,
      vehicles: officersVehicles,
      planning: objective,
      objective,
      result: results
    });

    const embed = InstitutionalEmbedBuilder.success(
      'Relatório de Operação Policial Arquivado',
      `A Operação Tática **${name}** teve seu relatório oficial registrado.\n\n` +
        `• **Unidade Responsável:** \`${unitName}\`\n` +
        `• **Comandante da Operação:** <@${interaction.user.id}>\n` +
        `• **Desfecho:** ${results}`,
      op.protocol
    );

    await interaction.reply({ embeds: [embed] });
  }
};

export const modalCopomCreateVtr: ModalInteractionHandler = {
  customId: 'copom_modal_create_vtr',
  requiredPermissions: [Permissions.COPOM_CRIAR_VIATURA],
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const prefix = interaction.fields.getTextInputValue('prefix').trim();
    const vehicleModel = interaction.fields.getTextInputValue('vehicle_model')?.trim() || undefined;
    const area = interaction.fields.getTextInputValue('area')?.trim() || undefined;
    const notes = interaction.fields.getTextInputValue('notes')?.trim() || undefined;

    try {
      const patrol = await CopomService.createPatrol({
        guildId: interaction.guildId,
        prefix,
        vehicleModel,
        commanderId: interaction.user.id,
        area,
        notes
      });

      const embed = InstitutionalEmbedBuilder.success(
        'Viatura Despachada na Rede COPOM',
        `A viatura **VTR ${patrol.prefix}** entrou em patrulhamento ativo na rede.\n\n` +
          `• **Comandante:** <@${interaction.user.id}>\n` +
          `• **Modelo:** \`${vehicleModel || 'Viatura Tática'}\`\n` +
          `• **Setor:** \`${area || 'Área Livre'}\``
      );

      await interaction.reply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [
  modalPrisao,
  modalMulta,
  modalApreensao,
  modalOcorrencia,
  modalOperacao,
  modalCopomCreateVtr
];

export default handlers;
