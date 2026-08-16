import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { SignatureService } from '../../services/SignatureService.js';
import { EmbedPresets } from '../../utils/embedBuilder.js';

export const validarCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('validar')
    .setDescription('Valida publicamente a autenticidade de uma assinatura ou documento institucional.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt
        .setName('codigo')
        .setDescription('Código de assinatura digital (ex: SIG-2026-000245)')
        .setRequired(true)
    ),
  category: 'public',
  async execute(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('codigo', true).trim();

    await interaction.deferReply({ ephemeral: true });

    const verification = await SignatureService.verifySignature(code);

    if (!verification.valid || !verification.signature) {
      const embed = EmbedPresets.denied(
        'ASSINATURA DIGITAL INVÁLIDA OU INEXISTENTE',
        `O identificador **\`${code}\`** não foi localizado nos registros oficiais da instituição.\nEste documento pode ser forjado ou o código foi digitado incorretamente.`
      );
      return interaction.editReply({ embeds: [embed] });
    }

    const { signature, document } = verification;

    const embed = EmbedPresets.success(
      'DOCUMENTO AUTÊNTICO & ASSINATURA VÁLIDA',
      `O documento associado ao identificador **\`${code}\`** possui fé pública institucional e registro íntegro.`
    );

    embed.addFields(
      { name: 'Documento', value: `\`${document.protocol}\` - ${document.title}`, inline: false },
      { name: 'Tipo de Documento', value: document.type, inline: true },
      { name: 'Signatário Oficial', value: `<@${signature.signerId}> (${signature.signerName})`, inline: true },
      { name: 'Cargo / Função', value: signature.signerRole || 'Autoridade Responsável', inline: true },
      { name: 'Data da Assinatura', value: verification.signedAtFormatted || 'N/A', inline: true },
      { name: 'Hash Criptográfico (SHA-256)', value: `\`${signature.signatureHash.substring(0, 32)}...\``, inline: false }
    );

    embed.setFooter({ text: 'Validador Oficial de Integridade & Autenticidade • SSP' });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

export default validarCommand;
