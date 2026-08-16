import { prisma } from '../database/prisma.js';
import { IFiveMAdapter, FivemSyncResult, FivemServerStatus, CharacterInfo } from '../integrations/fivem/types.js';
import { MockFiveMAdapter } from '../integrations/fivem/adapters/mockAdapter.js';
import { VRPAdapter } from '../integrations/fivem/adapters/vrpAdapter.js';
import { CreativeAdapter } from '../integrations/fivem/adapters/creativeAdapter.js';
import { QBCoreAdapter, ESXAdapter, CustomFiveMAdapter } from '../integrations/fivem/adapters/customAdapter.js';
import { ProtocolService } from './ProtocolService.js';
import { logger } from '../utils/logger.js';

class FiveMIntegrationManager {
  private adapter: IFiveMAdapter;
  private circuitOpen: boolean = false;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;
  private readonly FAILURE_THRESHOLD = 3;
  private readonly CIRCUIT_COOLDOWN_MS = 60000;

  constructor() {
    const framework = (process.env.FIVEM_FRAMEWORK || 'mock').toLowerCase();
    this.adapter = this.createAdapter(framework);
  }

  public setAdapter(framework: string) {
    this.adapter = this.createAdapter(framework);
    logger.info(`🔄 [FIVEM] Adapter alterado para: ${this.adapter.name}`);
  }

  public getAdapter(): IFiveMAdapter {
    return this.adapter;
  }

  private createAdapter(framework: string): IFiveMAdapter {
    switch (framework) {
      case 'vrp':
        return new VRPAdapter();
      case 'creative':
        return new CreativeAdapter();
      case 'qbcore':
        return new QBCoreAdapter();
      case 'esx':
        return new ESXAdapter();
      case 'custom':
        return new CustomFiveMAdapter();
      case 'mock':
      default:
        return new MockFiveMAdapter();
    }
  }

  private checkCircuit(): boolean {
    if (!this.circuitOpen) return true;

    if (Date.now() - this.lastFailureTime > this.CIRCUIT_COOLDOWN_MS) {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
      logger.info('🟢 [FIVEM-CIRCUIT] Circuit Breaker rearmado. Tentando reconexão.');
      return true;
    }

    return false;
  }

  private recordFailure() {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
      this.circuitOpen = true;
      logger.warn('🚨 [FIVEM-CIRCUIT] Limiar de falhas atingido. Circuit Breaker ABERTO temporariamente.');
    }
  }

  private recordSuccess() {
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
  }

  public async getStatus(): Promise<FivemServerStatus> {
    return await this.adapter.getStatus();
  }

  public async getCharacter(passport: number): Promise<CharacterInfo | null> {
    return await this.adapter.getCharacter(passport);
  }

  public async syncHire(params: {
    guildId: string;
    passport: number;
    discordId: string;
    rankId?: string;
    unitId?: string;
    executorId: string;
  }): Promise<FivemSyncResult> {
    const protocol = await ProtocolService.generate('FIV', params.guildId);

    if (!this.checkCircuit()) {
      return this.handleCircuitBroken(params.guildId, 'ADD_POLICE', params.passport, protocol, params.executorId);
    }

    const rankMapping = params.rankId
      ? await prisma.fivemRankMapping.findUnique({
          where: { botRankId: params.rankId }
        })
      : null;

    const unitMapping = params.unitId
      ? await prisma.fivemUnitMapping.findUnique({
          where: { botUnitId: params.unitId }
        })
      : null;

    const rankGroup = rankMapping?.fivemGroup;
    const unitGroup = unitMapping?.fivemGroup;

    try {
      const result = await this.adapter.addPoliceRole(params.passport, rankGroup, unitGroup);

      if (result.success) this.recordSuccess();
      else this.recordFailure();

      await this.logOperation({
        guildId: params.guildId,
        protocol,
        action: 'ADD_POLICE',
        executorId: params.executorId,
        discordId: params.discordId,
        passport: params.passport,
        endpoint: '/police/register',
        status: result.status,
        response: JSON.stringify(result)
      });

      return result;
    } catch (err: any) {
      this.recordFailure();
      return this.handleError(params.guildId, 'ADD_POLICE', params.passport, protocol, params.executorId, err);
    }
  }

  public async syncRankChange(params: {
    guildId: string;
    passport: number;
    discordId: string;
    oldRankId?: string;
    newRankId: string;
    executorId: string;
    actionType: 'PROMOTE' | 'DEMOTE';
  }): Promise<FivemSyncResult> {
    const protocol = await ProtocolService.generate('FIV', params.guildId);

    if (!this.checkCircuit()) {
      return this.handleCircuitBroken(params.guildId, params.actionType, params.passport, protocol, params.executorId);
    }

    const [oldMapping, newMapping] = await Promise.all([
      params.oldRankId
        ? prisma.fivemRankMapping.findUnique({
            where: { botRankId: params.oldRankId }
          })
        : null,
      prisma.fivemRankMapping.findUnique({
        where: { botRankId: params.newRankId }
      })
    ]);

    const oldRankGroup = oldMapping?.fivemGroup;
    const newRankGroup = newMapping?.fivemGroup || 'Policia';

    try {
      const result = await this.adapter.setPoliceRank(params.passport, oldRankGroup, newRankGroup);

      if (result.success) this.recordSuccess();
      else this.recordFailure();

      await this.logOperation({
        guildId: params.guildId,
        protocol,
        action: `${params.actionType}_POLICE`,
        executorId: params.executorId,
        discordId: params.discordId,
        passport: params.passport,
        endpoint: '/police/setrank',
        status: result.status,
        response: JSON.stringify(result)
      });

      return result;
    } catch (err: any) {
      this.recordFailure();
      return this.handleError(params.guildId, `${params.actionType}_POLICE`, params.passport, protocol, params.executorId, err);
    }
  }

  public async syncTransfer(params: {
    guildId: string;
    passport: number;
    discordId: string;
    oldUnitId?: string;
    newUnitId: string;
    executorId: string;
  }): Promise<FivemSyncResult> {
    const protocol = await ProtocolService.generate('FIV', params.guildId);

    if (!this.checkCircuit()) {
      return this.handleCircuitBroken(params.guildId, 'TRANSFER_POLICE', params.passport, protocol, params.executorId);
    }

    const [oldMapping, newMapping] = await Promise.all([
      params.oldUnitId
        ? prisma.fivemUnitMapping.findUnique({
            where: { botUnitId: params.oldUnitId }
          })
        : null,
      prisma.fivemUnitMapping.findUnique({
        where: { botUnitId: params.newUnitId }
      })
    ]);

    try {
      const result = await this.adapter.setPoliceUnit(params.passport, oldMapping?.fivemGroup, newMapping?.fivemGroup);

      if (result.success) this.recordSuccess();
      else this.recordFailure();

      await this.logOperation({
        guildId: params.guildId,
        protocol,
        action: 'TRANSFER_POLICE',
        executorId: params.executorId,
        discordId: params.discordId,
        passport: params.passport,
        endpoint: '/police/transfer',
        status: result.status,
        response: JSON.stringify(result)
      });

      return result;
    } catch (err: any) {
      this.recordFailure();
      return this.handleError(params.guildId, 'TRANSFER_POLICE', params.passport, protocol, params.executorId, err);
    }
  }

  public async syncDismissal(params: {
    guildId: string;
    passport: number;
    discordId: string;
    currentRankId?: string;
    currentUnitId?: string;
    executorId: string;
  }): Promise<FivemSyncResult> {
    const protocol = await ProtocolService.generate('FIV', params.guildId);

    if (!this.checkCircuit()) {
      return this.handleCircuitBroken(params.guildId, 'DISMISS_POLICE', params.passport, protocol, params.executorId);
    }

    const [rankMapping, unitMapping] = await Promise.all([
      params.currentRankId
        ? prisma.fivemRankMapping.findUnique({
            where: { botRankId: params.currentRankId }
          })
        : null,
      params.currentUnitId
        ? prisma.fivemUnitMapping.findUnique({
            where: { botUnitId: params.currentUnitId }
          })
        : null
    ]);

    try {
      const result = await this.adapter.dismissPolice(params.passport, rankMapping?.fivemGroup, unitMapping?.fivemGroup);

      if (result.success) this.recordSuccess();
      else this.recordFailure();

      await this.logOperation({
        guildId: params.guildId,
        protocol,
        action: 'DISMISS_POLICE',
        executorId: params.executorId,
        discordId: params.discordId,
        passport: params.passport,
        endpoint: '/police/dismiss',
        status: result.status,
        response: JSON.stringify(result)
      });

      return result;
    } catch (err: any) {
      this.recordFailure();
      return this.handleError(params.guildId, 'DISMISS_POLICE', params.passport, protocol, params.executorId, err);
    }
  }

  private async handleCircuitBroken(
    guildId: string,
    action: string,
    passport: number,
    protocol: string,
    executorId: string
  ): Promise<FivemSyncResult> {
    await this.logOperation({
      guildId,
      protocol,
      action,
      executorId,
      passport,
      endpoint: '/bridge',
      status: 'CIRCUIT_BROKEN',
      error: 'Circuit Breaker ABERTO: Servidor FiveM inacessivel.'
    });

    return {
      success: false,
      action,
      passport,
      status: 'PENDING_SYNC',
      error: 'Servidor FiveM temporariamente inacessivel. Operacao marcada para sincronizacao futura.'
    };
  }

  private async handleError(
    guildId: string,
    action: string,
    passport: number,
    protocol: string,
    executorId: string,
    err: any
  ): Promise<FivemSyncResult> {
    await this.logOperation({
      guildId,
      protocol,
      action,
      executorId,
      passport,
      endpoint: '/bridge',
      status: 'FAILED',
      error: err.message
    });

    return {
      success: false,
      action,
      passport,
      status: 'PENDING_SYNC',
      error: `Falha na integracao FiveM: ${err.message}`
    };
  }

  private async logOperation(data: {
    guildId: string;
    protocol: string;
    action: string;
    executorId: string;
    discordId?: string;
    passport?: number;
    endpoint: string;
    status: string;
    response?: string;
    error?: string;
  }) {
    try {
      await prisma.fivemIntegrationLog.create({ data });
    } catch (e) {
      logger.error('Erro ao gravar log de integracao FiveM:', e);
    }
  }
}

export const FiveMIntegrationService = new FiveMIntegrationManager();
