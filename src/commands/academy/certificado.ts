import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandStringOption
} from 'discord.js';
import { SlashCommand } from '../../@types/index.js';
import { AcademyService } from '../../services/AcademyService.js';
import { InstitutionalEmbedBuilder } from '../../utils/embedBuilder.js';
import { COLORS } from '../../config/constants.js';

export const certificadoCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('certificado')
    .setDescription('Consulta e autentica a veracidade de um certificado emitido pela Escola de Formação.')
    .addStringOption((opt: SlashCommandStringOption) =>
      opt.setName('codigo').setDescription('Código de autenticidade (ex: CERT-2026-000001)').setRequired(true)
    ),
  category: 'academy',
  async execute(interaction: ChatInputCommandInteraction) {
    const code = interaction.options.getString('codigo', true);
    const cert = await AcademyService.verifyCertificate(code);

    if (!cert) {
      const errorEmbed = InstitutionalEmbedBuilder.create({
        title: 'Certificado Não Autêntico / Inválido',
        status: 'Inautêntico',
        color: COLORS.DANGER,
        description:
          `Não foi localizado nenhum registro oficial com o código de autenticidade \`${code.toUpperCase()}\`.\n\n` +
          `*Apresentar certificado falso ou adulterado constitui falta grave e crime tipificado.*`
      });

      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    const embed = InstitutionalEmbedBuilder.create({
      title: 'Autenticidade de Certificado Confirmada',
      protocol: cert.code,
      status: 'Certificado Válido e Homologado',
      responsible: `<@${cert.issuerId}>`,
      color: COLORS.SUCCESS,
      description:
        `Certificamos que o documento consultado encontra-se devidamente registrado e homologado nos arquivos oficiais da Escola de Formação.\n\n` +
        `• **Policial Titular:** ${cert.profile.name} (\`${cert.profile.operationalName}\`)\n` +
        `• **Matrícula:** \`${cert.profile.badgeNumber}\`\n` +
        `• **Curso / Habilitação:** **${cert.courseName}**\n` +
        `• **Data de Emissão:** <t:${Math.floor(cert.issueDate.getTime() / 1000)}:F>\n` +
        `• **Emissor Responsável:** <@${cert.issuerId}>`
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default certificadoCommand;
