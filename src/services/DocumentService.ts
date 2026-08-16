import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { SignatureService } from './SignatureService.js';
import { AuditService } from './AuditService.js';
import { TimelineService } from './TimelineService.js';
import { DocumentType } from '@prisma/client';

export interface GenerateDocumentInput {
  guildId: string;
  type: DocumentType;
  title: string;
  authorId: string;
  authorName: string;
  authorRank?: string;
  targetUserId?: string;
  referenceProtocol?: string;
  customContent?: string;
  signImmediately?: boolean;
}

export class DocumentService {
  /**
   * Gera um documento oficial estruturado no sistema
   */
  public static async generateDocument(input: GenerateDocumentInput) {
    const protocol = await ProtocolService.generate('DOC', input.guildId);

    const settings = await prisma.guildSettings.findUnique({
      where: { guildId: input.guildId }
    });

    const institutionName = settings?.institutionName || 'Segurança Pública';
    let content = input.customContent || '';

    // Gerar conteúdo automático conforme o tipo do documento se não fornecido
    if (!content) {
      content = await this.buildDefaultContent(input, institutionName);
    }

    const doc = await prisma.document.create({
      data: {
        guildId: input.guildId,
        protocol,
        title: input.title,
        type: input.type,
        content,
        authorId: input.authorId,
        authorName: input.authorName,
        authorRank: input.authorRank,
        institutionName,
        logoUrl: settings?.institutionLogoUrl
      }
    });

    let signature = null;
    if (input.signImmediately !== false) {
      signature = await SignatureService.signDocument({
        documentId: doc.id,
        signerId: input.authorId,
        signerName: input.authorName,
        signerRank: input.authorRank,
        guildId: input.guildId
      });
    }

    await AuditService.log({
      guildId: input.guildId,
      executorId: input.authorId,
      executorName: input.authorName,
      executorRole: input.authorRank,
      action: 'EMITIR_DOCUMENTO',
      module: 'DOCUMENTOS',
      entityType: 'Document',
      entityId: doc.id,
      protocol,
      reason: `Emissão de ${input.type}: ${input.title}`
    });

    return {
      document: doc,
      signature
    };
  }

  /**
   * Constrói o texto institucional padronizado para cada tipo de documento
   */
  private static async buildDefaultContent(input: GenerateDocumentInput, institution: string): Promise<string> {
    const now = new Date().toLocaleDateString('pt-BR');

    if (input.type === 'FICHA_FUNCIONAL' && input.targetUserId) {
      const profile = await prisma.policeProfile.findUnique({
        where: { guildId_userId: { guildId: input.guildId, userId: input.targetUserId } },
        include: { rank: true, unit: true, medals: { include: { medal: true } }, certificates: true }
      });

      if (!profile) return `Ficha não encontrada para o policial.`;

      return `=====================================================
${institution.toUpperCase()}
FICHA FUNCIONAL INDIVIDUAL
=====================================================

1. IDENTIFICAÇÃO DO POLICIAL
Nome Completo: ${profile.name}
Nome de Guerra: ${profile.operationalName}
Matrícula: ${profile.badgeNumber}
Passaporte / ID: ${profile.passportId || 'N/A'}
Situação Atual: ${profile.status}

2. DADOS HIERÁRQUICOS E LOTAÇÃO
Patente / Graduação: ${profile.rank?.name || 'Não atribuída'} (${profile.rank?.abbreviation || 'N/A'})
Nível Hierárquico: ${profile.rank?.level || 0}
Unidade Operacional: ${profile.unit?.name || 'Geral'} (${profile.unit?.abbreviation || 'N/A'})
Data de Admissão: ${profile.hireDate.toLocaleDateString('pt-BR')}

3. ESTATÍSTICAS ACUMULADAS
Horas de Serviço: ${Math.floor(profile.totalDutyMinutes / 60)}h ${profile.totalDutyMinutes % 60}min
Patrulhas Realizadas: ${profile.totalPatrols}
Prisões Efetuadas: ${profile.totalArrests}
Ocorrências Registradas: ${profile.totalOccurrences}
Apreensões Realizadas: ${profile.totalOperations}

4. CONDECORAÇÕES E CURSOS
Medalhas: ${profile.medals.map((m) => m.medal.name).join(', ') || 'Nenhuma'}
Cursos Concluídos: ${profile.certificates.map((c) => c.courseName).join(', ') || 'Nenhum'}

Documento gerado em: ${now}`;
    }

    if (input.type === 'HISTORICO_POLICIAL' && input.targetUserId) {
      const timeline = await TimelineService.getTimeline(input.guildId, input.targetUserId);
      const lines = timeline.map((t) => `• [${t.date.toLocaleDateString('pt-BR')}] ${t.title} - ${t.description}`).join('\n');

      return `=====================================================
${institution.toUpperCase()}
HISTÓRICO POLICIAL E EVOLUÇÃO FUNCIONAL
=====================================================

${lines || 'Nenhum registro histórico localizado.'}

Documento gerado em: ${now}`;
    }

    return `=====================================================
${institution.toUpperCase()}
${input.title.toUpperCase()}
=====================================================

O presente documento formaliza os atos administrativos e operacionais registrados sob a autoridade de ${input.authorName} (${input.authorRank || 'Oficial Responsável'}).

Emitido em: ${now}`;
  }

  /**
   * Busca documento pelo protocolo
   */
  public static async getByProtocol(protocol: string, guildId: string) {
    return await prisma.document.findFirst({
      where: { protocol, guildId },
      include: { signatures: true }
    });
  }
}
