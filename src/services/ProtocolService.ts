import { prisma } from '../database/prisma.js';

export type ProtocolPrefix =
  | 'PR'   // Prisão
  | 'MT'   // Multa
  | 'AP'   // Apreensão
  | 'OC'   // Ocorrência
  | 'OP'   // Operação
  | 'IPM'  // Inquérito Policial Militar
  | 'PDO'  // Processo Disciplinar Ordinário
  | 'TK'   // Ticket
  | 'DOC'  // Documento Institucional
  | 'AUD'  // Auditoria
  | 'APR'  // Solicitação de Aprovação (Workflow)
  | 'SIG'  // Assinatura Digital
  | 'ESC'  // Escala de Serviço
  | 'ALR'  // Alerta do Sistema
  | 'DL'   // Prazo Processual (Deadline)
  | 'EV'   // Evidência / Prova
  | 'SUG'  // Sugestão
  | 'CERT' // Certificado
  | 'ERR'; // Erro do Sistema

export class ProtocolService {
  /**
   * Gera um protocolo institucional único e atômico no formato PREFIX-ANO-NUMERO
   * Exemplo: PR-2026-000142, APR-2026-000081, DOC-2026-000245
   */
  public static async generate(prefix: ProtocolPrefix | string, guildId?: string): Promise<string> {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${year}-${randomSuffix}`;
  }

  /**
   * Gera código de assinatura institucional no formato SIG-ANO-NUMERO
   */
  public static generateSignatureCode(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `SIG-${year}-${randomSuffix}`;
  }

  /**
   * Gera código de rastreamento de erro: ERR-YYYYMMDD-HEX
   */
  public static generateErrorCode(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ERR-${dateStr}-${rand}`;
  }
}
