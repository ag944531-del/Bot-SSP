import crypto from 'crypto';
import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { AuditService } from './AuditService.js';

export interface SignDocumentInput {
  documentId: string;
  signerId: string;
  signerName: string;
  signerRank?: string;
  signerRole?: string;
  guildId: string;
}

export class SignatureService {
  /**
   * Assina digitalmente um documento institucional gerando um identificador SIG- e hash de autenticidade
   */
  public static async signDocument(input: SignDocumentInput) {
    const document = await prisma.document.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new Error('Documento institucional não encontrado para assinatura.');
    }

    const identifier = ProtocolService.generateSignatureCode();
    const payloadToHash = `${document.protocol}|${document.content}|${input.signerId}|${Date.now()}`;
    const signatureHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    const signature = await prisma.documentSignature.create({
      data: {
        documentId: document.id,
        identifier,
        signerId: input.signerId,
        signerName: input.signerName,
        signerRank: input.signerRank,
        signerRole: input.signerRole || 'Autoridade Responsável',
        signatureHash
      }
    });

    await AuditService.log({
      guildId: input.guildId,
      executorId: input.signerId,
      executorName: input.signerName,
      executorRole: input.signerRank,
      action: 'ASSINAR_DOCUMENTO',
      module: 'DOCUMENTOS',
      entityType: 'Document',
      entityId: document.id,
      protocol: identifier,
      reason: `Assinatura digital do documento ${document.protocol}`
    });

    return signature;
  }

  /**
   * Valida a autenticidade de uma assinatura pelo identificador SIG-XXXX
   */
  public static async verifySignature(identifier: string) {
    const signature = await prisma.documentSignature.findUnique({
      where: { identifier },
      include: {
        document: {
          include: { guild: true }
        }
      }
    });

    if (!signature) {
      return {
        valid: false,
        message: 'Código de assinatura não encontrado nos registros oficiais do sistema.'
      };
    }

    return {
      valid: true,
      signature,
      document: signature.document,
      signedAtFormatted: signature.signedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      message: 'Documento e Assinatura Digital autênticos e válidos.'
    };
  }
}
