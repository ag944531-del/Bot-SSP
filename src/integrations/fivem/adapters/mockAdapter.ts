import { IFiveMAdapter, CharacterInfo, FivemSyncResult, FivemServerStatus } from '../types.js';

export class MockFiveMAdapter implements IFiveMAdapter {
  public name = 'Mock (Ambiente de Testes / Simulação)';

  private mockCharacters = new Map<number, CharacterInfo>([
    [1, { passport: 1, name: 'Comandante Silva', firstname: 'Silva', isOnline: true, source: 1 }],
    [152, { passport: 152, name: 'Soldado Gomes', firstname: 'Gomes', isOnline: false, source: null }],
    [35, { passport: 35, name: 'Obscuro Gomes', firstname: 'Gomes', isOnline: true, source: 3 }]
  ]);

  private mockPolice = new Map<number, { rank: string; unit?: string }>();

  public async getStatus(): Promise<FivemServerStatus> {
    return {
      online: true,
      framework: 'vRP (Simulado)',
      onlinePlayers: 42,
      policeOnline: 8,
      latencyMs: 12,
      serverName: 'Cidade Mock Desenvolvimento',
      version: '1.0.0'
    };
  }

  public async getCharacter(passport: number): Promise<CharacterInfo | null> {
    return this.mockCharacters.get(passport) || {
      passport,
      name: `Cidadão Passaporte ${passport}`,
      firstname: 'Silva',
      isOnline: false,
      source: null
    };
  }

  public async addPoliceRole(passport: number, rankGroup?: string, unitGroup?: string): Promise<FivemSyncResult> {
    this.mockPolice.set(passport, { rank: rankGroup || 'PoliciaSoldado', unit: unitGroup });
    return {
      success: true,
      action: 'ADD_POLICE',
      passport,
      message: `Policial [Passaporte: ${passport}] adicionado ao grupo ${rankGroup || 'Policia'}.`,
      status: 'SUCCESS'
    };
  }

  public async setPoliceRank(passport: number, oldRankGroup?: string, newRankGroup?: string): Promise<FivemSyncResult> {
    const current = this.mockPolice.get(passport) || { rank: 'Policia' };
    current.rank = newRankGroup || 'Policia';
    this.mockPolice.set(passport, current);

    return {
      success: true,
      action: 'SET_RANK',
      passport,
      message: `Patente do passaporte ${passport} alterada de ${oldRankGroup || 'N/A'} para ${newRankGroup}.`,
      status: 'SUCCESS'
    };
  }

  public async setPoliceUnit(passport: number, oldUnitGroup?: string, newUnitGroup?: string): Promise<FivemSyncResult> {
    const current = this.mockPolice.get(passport) || { rank: 'Policia' };
    current.unit = newUnitGroup;
    this.mockPolice.set(passport, current);

    return {
      success: true,
      action: 'SET_UNIT',
      passport,
      message: `Unidade do passaporte ${passport} alterada para ${newUnitGroup || 'Geral'}.`,
      status: 'SUCCESS'
    };
  }

  public async dismissPolice(passport: number, currentRankGroup?: string, currentUnitGroup?: string): Promise<FivemSyncResult> {
    this.mockPolice.delete(passport);
    return {
      success: true,
      action: 'DISMISS_POLICE',
      passport,
      message: `Passaporte ${passport} exonerado e removido dos grupos da polícia.`,
      status: 'SUCCESS'
    };
  }

  public async isOnline(passport: number): Promise<boolean> {
    const char = this.mockCharacters.get(passport);
    return char ? char.isOnline : false;
  }
}
