import { Client, TextChannel } from 'discord.js';
import { prisma } from '../database/prisma.js';
import { ProtocolService } from './ProtocolService.js';
import { AuditService } from './AuditService.js';
import { RHService } from './RHService.js';
import { MedalService } from './MedalService.js';
import { EmbedPresets } from '../utils/embedBuilder.js';
import { logger } from '../utils/logger.js';
import { concurrencyLock } from '../utils/concurrencyLock.js';

export interface CreateApprovalRequestInput {
  guildId: string;
  actionType: 'PROMOTION' | 'DEMOTION' | 'DISMISSAL' | 'TRANSFER' | 'SANCTION' | 'MEDAL' | string;
  requesterId: string;
  targetId: string;
  reason: string;
  payload: Record<string, any>;
  client?: Client;
}

export class ApprovalService {
  /**
   * Inicializa workflows padrão se não existirem para a Guild
   */
  public static async ensureDefaultWorkflows(guildId: string) {
    const defaultFlows = [
      {
        actionType: 'PROMOTION',
        name: 'Workflow de Promoção',
        description: 'Aprovação em 2 etapas: RH e Comando Geral',
        steps: [
          { stepOrder: 1, roleName: 'Recursos Humanos', permissionRequired: 'RH.PROMOVER' },
          { stepOrder: 2, roleName: 'Comando Geral', permissionRequired: 'ADMIN.COMANDO_GERAL' }
        ]
      },
      {
        actionType: 'DISMISSAL',
        name: 'Workflow de Exoneração',
        description: 'Aprovação em 2 etapas: RH e Comando Geral',
        steps: [
          { stepOrder: 1, roleName: 'Recursos Humanos', permissionRequired: 'RH.EXONERAR' },
          { stepOrder: 2, roleName: 'Comando Geral', permissionRequired: 'ADMIN.COMANDO_GERAL' }
        ]
      },
      {
        actionType: 'SANCTION',
        name: 'Workflow de Sanção Disciplinar Grave',
        description: 'Aprovação pela Corregedoria e Homologação pelo Comando Geral',
        steps: [
          { stepOrder: 1, roleName: 'Corregedoria Geral', permissionRequired: 'CORREGEDORIA.APLICAR_SANCAO' },
          { stepOrder: 2, roleName: 'Comando Geral', permissionRequired: 'ADMIN.COMANDO_GERAL' }
        ]
      },
      {
        actionType: 'MEDAL',
        name: 'Workflow de Concessão de Medalha',
        description: 'Avaliação da Comissão de Mérito e Comando',
        steps: [
          { stepOrder: 1, roleName: 'Comando Geral', permissionRequired: 'ADMIN.COMANDO_GERAL' }
        ]
      }
    ];

    for (const flow of defaultFlows) {
      const existing = await prisma.approvalWorkflow.findUnique({
        where: { guildId_actionType: { guildId, actionType: flow.actionType } }
      });

      if (!existing) {
        await prisma.approvalWorkflow.create({
          data: {
            guildId,
            actionType: flow.actionType,
            name: flow.name,
            description: flow.description,
            steps: {
              create: flow.steps.map((s) => ({
                stepOrder: s.stepOrder,
                roleName: s.roleName,
                permissionRequired: s.permissionRequired
              }))
            }
          }
        });
      }
    }
  }

  /**
   * Cria uma nova solicitação de aprovação
   */
  public static async createRequest(input: CreateApprovalRequestInput) {
    await this.ensureDefaultWorkflows(input.guildId);

    // Conflito de interesse: o próprio solicitante não pode ser o beneficiário em ações de mérito
    if (input.requesterId === input.targetId) {
      throw new Error('Conflito de Interesse: Você não pode criar e aprovar uma solicitação em benefício próprio.');
    }

    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { guildId_actionType: { guildId: input.guildId, actionType: input.actionType } },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!workflow || workflow.steps.length === 0) {
      throw new Error(`Nenhum workflow de aprovação ativo para o tipo ${input.actionType}.`);
    }

    const protocol = await ProtocolService.generate('APR', input.guildId);

    const request = await prisma.approvalRequest.create({
      data: {
        guildId: input.guildId,
        workflowId: workflow.id,
        protocol,
        actionType: input.actionType,
        requesterId: input.requesterId,
        targetId: input.targetId,
        currentStepOrder: 1,
        totalSteps: workflow.steps.length,
        status: 'PENDENTE',
        payload: JSON.stringify(input.payload),
        reason: input.reason
      },
      include: { workflow: { include: { steps: true } } }
    });

    await AuditService.log({
      guildId: input.guildId,
      executorId: input.requesterId,
      targetId: input.targetId,
      action: `SOLICITAR_${input.actionType}`,
      module: 'WORKFLOW',
      protocol,
      reason: input.reason,
      details: input.payload,
      client: input.client
    });

    return request;
  }

  /**
   * Processa uma ação em um workflow (Aprovação, Rejeição, Correção)
   */
  public static async processAction(params: {
    requestId: string;
    actorId: string;
    actorName: string;
    actorRole?: string;
    actionType: 'APROVAR' | 'REJEITAR' | 'SOLICITAR_CORRECAO' | 'CANCELAR';
    comment?: string;
    client?: Client;
  }) {
    const lockKey = `approval:${params.requestId}`;

    return await concurrencyLock.runWithLock(lockKey, async () => {
      const request = await prisma.approvalRequest.findUnique({
        where: { id: params.requestId },
        include: {
          workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
          actions: true
        }
      });

      if (!request) {
        throw new Error('Solicitação de aprovação não encontrada.');
      }

      if (['APROVADO', 'REJEITADO', 'CANCELADO'].includes(request.status)) {
        throw new Error(`Esta solicitação já foi finalizada com status: ${request.status}.`);
      }

      // Proteção contra Conflito de Interesse
      if (params.actorId === request.targetId) {
        await AuditService.log({
          guildId: request.guildId,
          executorId: params.actorId,
          targetId: request.targetId,
          action: 'TENTATIVA_CONFLITO_INTERESSE',
          module: 'GOVERNANCA',
          reason: 'Tentativa de aprovar ou alterar a própria solicitação funcional.',
          client: params.client
        });
        throw new Error('Bloqueio Institucional: Conflito de interesse detectado. Você não pode aprovar ou julgar solicitações envolvendo você mesmo.');
      }

      // Registrar a ação do avaliador
      await prisma.approvalAction.create({
        data: {
          requestId: request.id,
          actorId: params.actorId,
          actorName: params.actorName,
          actorRole: params.actorRole,
          stepOrder: request.currentStepOrder,
          actionType: params.actionType,
          comment: params.comment
        }
      });

      if (params.actionType === 'REJEITAR') {
        const updated = await prisma.approvalRequest.update({
          where: { id: request.id },
          data: { status: 'REJEITADO' }
        });

        await AuditService.log({
          guildId: request.guildId,
          executorId: params.actorId,
          targetId: request.targetId,
          action: `REJEITAR_${request.actionType}`,
          module: 'WORKFLOW',
          protocol: request.protocol,
          reason: params.comment || 'Solicitação rejeitada pela autoridade competente.',
          client: params.client
        });

        return { request: updated, executed: false, message: 'Solicitação rejeitada com sucesso.' };
      }

      if (params.actionType === 'SOLICITAR_CORRECAO') {
        const updated = await prisma.approvalRequest.update({
          where: { id: request.id },
          data: {
            status: 'CORRECAO_SOLICITADA',
            correctionNotes: params.comment
          }
        });
        return { request: updated, executed: false, message: 'Correção solicitada ao autor.' };
      }

      if (params.actionType === 'APROVAR') {
        const nextStepOrder = request.currentStepOrder + 1;

        // Se ainda restam etapas
        if (nextStepOrder <= request.totalSteps) {
          const updated = await prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              currentStepOrder: nextStepOrder,
              status: 'EM_ANALISE'
            }
          });
          return { request: updated, executed: false, message: `Etapa ${request.currentStepOrder} aprovada. Avançado para a etapa ${nextStepOrder}.` };
        } else {
          // Todas as etapas foram aprovadas -> Execução automática
          const payload = JSON.parse(request.payload);
          await this.executeWorkflowPayload(request, payload, params.client);

          const updated = await prisma.approvalRequest.update({
            where: { id: request.id },
            data: {
              status: 'APROVADO',
              executedAt: new Date()
            }
          });

          await AuditService.log({
            guildId: request.guildId,
            executorId: params.actorId,
            targetId: request.targetId,
            action: `HOMOLOGAR_${request.actionType}`,
            module: 'WORKFLOW',
            protocol: request.protocol,
            reason: 'Todas as etapas obrigatórias foram aprovadas com êxito.',
            client: params.client
          });

          return { request: updated, executed: true, message: 'Todas as etapas foram concluídas! Operação executada automaticamente.' };
        }
      }

      throw new Error('Ação inválida.');
    });
  }

  /**
   * Executa a regra de negócio real após a homologação de todas as etapas
   */
  private static async executeWorkflowPayload(request: any, payload: any, client?: Client) {
    const { guildId, actionType, targetId } = request;

    if (!client) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const authorMember = await guild.members.fetch(request.requesterId).catch(() => null);
    if (!authorMember) return;

    if (actionType === 'PROMOTION') {
      await RHService.promotePolice({
        guild,
        authorMember,
        targetUserId: targetId,
        newRankId: payload.newRankId,
        reason: `Homologado via Workflow [${request.protocol}]: ${request.reason}`
      });
    } else if (actionType === 'DEMOTION') {
      await RHService.demotePolice({
        guild,
        authorMember,
        targetUserId: targetId,
        newRankId: payload.newRankId,
        reason: `Homologado via Workflow [${request.protocol}]: ${request.reason}`
      });
    } else if (actionType === 'DISMISSAL') {
      await RHService.dismissPolice({
        guild,
        authorMember,
        targetUserId: targetId,
        reason: `Homologado via Workflow [${request.protocol}]: ${request.reason}`
      });
    } else if (actionType === 'TRANSFER') {
      await RHService.transferPolice({
        guild,
        authorMember,
        targetUserId: targetId,
        newUnitId: payload.newUnitId,
        reason: `Homologado via Workflow [${request.protocol}]: ${request.reason}`
      });
    } else if (actionType === 'MEDAL') {
      await MedalService.grantMedal({
        guildId,
        medalId: payload.medalId,
        targetUserId: targetId,
        authorId: request.requesterId,
        reason: `Homologado via Workflow [${request.protocol}]: ${request.reason}`
      });
    }
  }

  /**
   * Busca uma solicitação pelo ID ou Protocolo
   */
  public static async getRequest(idOrProtocol: string, guildId: string) {
    return await prisma.approvalRequest.findFirst({
      where: {
        guildId,
        OR: [{ id: idOrProtocol }, { protocol: idOrProtocol }]
      },
      include: {
        workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
        actions: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  /**
   * Lista solicitações pendentes de aprovação na Guild
   */
  public static async listPending(guildId: string) {
    return await prisma.approvalRequest.findMany({
      where: {
        guildId,
        status: { in: ['PENDENTE', 'EM_ANALISE'] }
      },
      include: {
        workflow: { include: { steps: true } },
        actions: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
