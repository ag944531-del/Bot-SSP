export interface CharacterInfo {
  passport: number;
  name: string;
  firstname?: string;
  phone?: string;
  isOnline: boolean;
  source?: number | null;
}

export interface FivemSyncResult {
  success: boolean;
  action: string;
  passport: number;
  message?: string;
  error?: string;
  isOnline?: boolean;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'PENDING_SYNC';
}

export interface FivemServerStatus {
  online: boolean;
  framework: string;
  onlinePlayers: number;
  policeOnline: number;
  latencyMs: number;
  serverName?: string;
  version?: string;
}

export interface IFiveMAdapter {
  name: string;
  getStatus(): Promise<FivemServerStatus>;
  getCharacter(passport: number): Promise<CharacterInfo | null>;
  addPoliceRole(passport: number, rankGroup?: string, unitGroup?: string): Promise<FivemSyncResult>;
  setPoliceRank(passport: number, oldRankGroup?: string, newRankGroup?: string): Promise<FivemSyncResult>;
  setPoliceUnit(passport: number, oldUnitGroup?: string, newUnitGroup?: string): Promise<FivemSyncResult>;
  dismissPolice(passport: number, currentRankGroup?: string, currentUnitGroup?: string): Promise<FivemSyncResult>;
  isOnline(passport: number): Promise<boolean>;
}
