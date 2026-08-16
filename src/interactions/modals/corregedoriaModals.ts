import { ModalSubmitInteraction } from 'discord.js';
import { ModalInteractionHandler } from '../../@types/index.js';
import { CorregedoriaService } from '../../services/CorregedoriaService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const corregedoriaModalDenuncia: ModalInteractionHandler = {
  customId: 'corregedoria_modal_denuncia',
  async execute(interaction: ModalSubmitInteraction) {
    if (!interaction.guildId) return;

    const accusedId = interaction.fields.getTextInputValue('accused_id').trim();
    const fact = interaction.fields.getTextInputValue('fact').trim();
    const evidence = interaction.fields.getTextInputValue('evidence')?.trim() || undefined;

    const newCase = await CorregedoriaService.createCase({
      guildId: interaction.guildId,
      type: 'PDO',
      investigatedId: accusedId,
      accuserId: interaction.user.id,
      officerInChargeId: interaction.user.id,
      factNarrative: fact,
      evidence
    });

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Notícia de Denúncia Correcional Protocolada',
      protocol: newCase.protocol,
      status: 'Aguardando Despacho',
      responsible: `<@${interaction.user.id}>`,
      color: COLORS.WARNING,
      description:
        `Sua denúncia disciplinar foi recebida pela Corregedoria Geral e tombada sob procedimento preliminar.\n\n` +
        `• **Investigado Noticiado:** <@${accusedId}>\n` +
        `• **Protocolo Oficial:** \`${newCase.protocol}\`\n\n` +
        `*O sigilo e a estrita apuração correcional são garantidos pela legislação vigente.*`
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const summonsModalJustify: ModalInteractionHandler = {
  customId: 'summons_modal_justify',
  async execute(interaction: ModalSubmitInteraction) {
    const summonsId = interaction.customId.split(':')[1];
    const justification = interaction.fields.getTextInputValue('justification').trim();

    if (!summonsId) return;

    try {
      await CorregedoriaService.respondSummons(summonsId, interaction.user.id, false, justification);

      const embed = InstitutionalEmbedBuilder.create({
        title: 'Justificativa de Ausência Enviada',
        status: 'Aguardando Análise do Relator',
        responsible: `<@${interaction.user.id}>`,
        color: COLORS.WARNING,
        description:
          `Sua justificativa de impossibilidade de comparecimento foi protocolada e enviada à autoridade convocante.\n\n` +
          `**FUNDAMENTAÇÃO APRESENTADA:**\n*${justification}*`
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err: any) {
      await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
    }
  }
};

export const handlers = [corregedoriaModalDenuncia, summonsModalJustify];
export default handlers;
