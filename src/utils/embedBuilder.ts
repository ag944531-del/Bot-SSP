import { EmbedBuilder, GuildMember, User } from 'discord.js';
import { COLORS, ICONS } from '../config/constants.js';
import { ENV } from '../config/env.js';

export interface StandardEmbedOptions {
  title: string;
  description?: string;
  protocol?: string;
  responsible?: User | GuildMember | string;
  status?: string;
  color?: number;
  timestamp?: Date | boolean;
}

export class InstitutionalEmbedBuilder {
  /**
   * Constrói a base institucional para qualquer embed do sistema
   */
  public static create(options: StandardEmbedOptions): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(options.color ?? COLORS.PRIMARY)
      .setAuthor({
        name: `${ENV.STATE_NAME} • ${ENV.INSTITUTION_NAME}`,
        iconURL: undefined
      })
      .setTitle(`🏛️ ${options.title.toUpperCase()}`);

    let desc = '';

    if (options.status) {
      desc += `**STATUS DO PROCEDIMENTO:** \` ${options.status.toUpperCase()} \`\n`;
    }

    if (options.protocol) {
      desc += `**NÚMERO DE PROTOCOLO:** \` ${options.protocol} \`\n`;
    }

    if (options.responsible) {
      let respName = '';
      if (typeof options.responsible === 'string') {
        respName = options.responsible;
      } else if (options.responsible instanceof GuildMember) {
        respName = options.responsible.displayName;
      } else if (options.responsible instanceof User) {
        respName = options.responsible.username;
      } else {
        respName = String(options.responsible);
      }
      desc += `**RESPONSÁVEL OPERACIONAL:** ${respName}\n`;
    }

    if (options.status || options.protocol || options.responsible) {
      desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    if (options.description) {
      desc += options.description;
    }

    if (desc.trim().length > 0) {
      embed.setDescription(desc);
    }

    if (options.timestamp !== false) {
      embed.setTimestamp(options.timestamp instanceof Date ? options.timestamp : new Date());
    }

    embed.setFooter({
      text: `SSP • Sistema de Gestão e Segurança Pública • Autenticidade Registrada`
    });

    return embed;
  }

  /**
   * Embed de Ação Não Autorizada / Falha de Permissão
   */
  public static unauthorized(permissionName: string, reason?: string): EmbedBuilder {
    return this.create({
      title: 'Ação Não Autorizada',
      color: COLORS.DANGER,
      description:
        `Você não possui credenciamento para executar esta operação institucional.\n\n` +
        `**PERMISSÃO REQUERIDA:** \`${permissionName}\`\n` +
        (reason ? `**MOTIVO:** ${reason}\n\n` : '\n') +
        `*Caso acredite que isto seja uma inconsistência, contate a Corregedoria ou o Comando Geral.*`
    });
  }

  /**
   * Embed de Erro Interno do Sistema
   */
  public static systemError(errorCode: string, friendlyMessage?: string): EmbedBuilder {
    return this.create({
      title: 'Inconsistência no Sistema',
      protocol: errorCode,
      color: COLORS.DANGER,
      description:
        `${friendlyMessage || 'Ocorreu um erro interno durante o processamento da sua solicitação.'}\n\n` +
        `O incidente foi devidamente registrado nos logs de auditoria do sistema sob o código acima.\n` +
        `Por favor, informe este protocolo à Administração Técnica.`
    });
  }

  /**
   * Embed de Sucesso em Ação
   */
  public static success(title: string, description: string, protocol?: string): EmbedBuilder {
    return this.create({
      title,
      protocol,
      color: COLORS.SUCCESS,
      description
    });
  }
}

export class EmbedPresets {
  public static primary(title: string, description?: string): EmbedBuilder {
    return InstitutionalEmbedBuilder.create({ title, description, color: COLORS.PRIMARY });
  }

  public static success(title: string, description?: string): EmbedBuilder {
    return InstitutionalEmbedBuilder.create({ title, description, color: COLORS.SUCCESS });
  }

  public static attention(title: string, description?: string): EmbedBuilder {
    return InstitutionalEmbedBuilder.create({ title, description, color: COLORS.WARNING });
  }

  public static denied(title: string, description?: string): EmbedBuilder {
    return InstitutionalEmbedBuilder.create({ title, description, color: COLORS.DANGER });
  }
}
