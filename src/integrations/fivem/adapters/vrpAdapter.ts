import { IFiveMAdapter, CharacterInfo, FivemSyncResult, FivemServerStatus } from '../types.js';
import { logger } from '../../../utils/logger.js';

export class VRPAdapter implements IFiveMAdapter {
  public name = 'vRP / vRPex Bridge';

  private bridgeUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(bridgeUrl?: string, apiKey?: string, timeoutMs: number = 5000) {
    this.bridgeUrl = bridgeUrl || process.env.FIVEM_BRIDGE_URL || 'http://localhost:30120/security_bridge';
    this.apiKey = apiKey || process.env.FIVEM_API_KEY || 'CHAVE_SECRETA_INSTITUCIONAL_SSP_FIVEM_2026';
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.bridgeUrl}${endpoint}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Timestamp': timestamp,
          'X-Nonce': nonce,
          ...(options.headers || {})
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.warn(`[VRP-ADAPTER] Falha na comunicacao com FiveM Bridge (${url}):`, err.message);
      throw err;
    }
  }

  public async getStatus(): Promise<FivemServerStatus> {
    try {
      const startTime = Date.now();
      const data = await this.request<{ success: boolean; onlinePlayers: number; framework: string; serverName: string }>(
        '/status'
      );
      const latency = Date.now() - startTime;

      return {
        online: true,
        framework: data.framework || 'vRP',
        onlinePlayers: data.onlinePlayers || 0,
        policeOnline: 0,
        latencyMs: latency,
        serverName: data.serverName,
        version: '1.0.0'
      };
    } catch {
      return {
        online: false,
        framework: 'vRP',
        onlinePlayers: 0,
        policeOnline: 0,
        latencyMs: -1
      };
    }
  }

  public async getCharacter(passport: number): Promise<CharacterInfo | null> {
    try {
      const data = await this.request<{ success: boolean; character: CharacterInfo }>(`/player?passport=${passport}`);
      return data.character;
    } catch {
      return null;
    }
  }

  public async addPoliceRole(passport: number, rankGroup?: string, unitGroup?: string): Promise<FivemSyncResult> {
    try {
      const data = await this.request<{ success: boolean; message: string }>('/police/register', {
        method: 'POST',
        body: JSON.stringify({ passport, rankGroup, unitGroup })
      });
      return {
        success: data.success,
        action: 'ADD_POLICE',
        passport,
        message: data.message,
        status: data.success ? 'SUCCESS' : 'FAILED'
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'ADD_POLICE',
        passport,
        error: err.message,
        status: 'PENDING_SYNC'
      };
    }
  }

  public async setPoliceRank(passport: number, oldRankGroup?: string, newRankGroup?: string): Promise<FivemSyncResult> {
    try {
      const data = await this.request<{ success: boolean; message: string }>('/police/setrank', {
        method: 'POST',
        body: JSON.stringify({ passport, oldRankGroup, newRankGroup })
      });
      return {
        success: data.success,
        action: 'SET_RANK',
        passport,
        message: data.message,
        status: data.success ? 'SUCCESS' : 'FAILED'
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'SET_RANK',
        passport,
        error: err.message,
        status: 'PENDING_SYNC'
      };
    }
  }

  public async setPoliceUnit(passport: number, oldUnitGroup?: string, newUnitGroup?: string): Promise<FivemSyncResult> {
    try {
      const data = await this.request<{ success: boolean; message: string }>('/police/transfer', {
        method: 'POST',
        body: JSON.stringify({ passport, oldUnitGroup, newUnitGroup })
      });
      return {
        success: data.success,
        action: 'SET_UNIT',
        passport,
        message: data.message,
        status: data.success ? 'SUCCESS' : 'FAILED'
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'SET_UNIT',
        passport,
        error: err.message,
        status: 'PENDING_SYNC'
      };
    }
  }

  public async dismissPolice(passport: number, currentRankGroup?: string, currentUnitGroup?: string): Promise<FivemSyncResult> {
    try {
      const data = await this.request<{ success: boolean; message: string }>('/police/dismiss', {
        method: 'POST',
        body: JSON.stringify({ passport, rankGroup: currentRankGroup, unitGroup: currentUnitGroup })
      });
      return {
        success: data.success,
        action: 'DISMISS_POLICE',
        passport,
        message: data.message,
        status: data.success ? 'SUCCESS' : 'FAILED'
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'DISMISS_POLICE',
        passport,
        error: err.message,
        status: 'PENDING_SYNC'
      };
    }
  }

  public async isOnline(passport: number): Promise<boolean> {
    const char = await this.getCharacter(passport);
    return char?.isOnline || false;
  }
}
