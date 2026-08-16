import test from 'node:test';
import assert from 'node:assert';
import { MockFiveMAdapter } from '../../src/integrations/fivem/adapters/mockAdapter.js';

test('FiveM Integration - Mock Adapter Character and Police Operations', async () => {
  const adapter = new MockFiveMAdapter();

  // 1. Status Check
  const status = await adapter.getStatus();
  assert.strictEqual(status.online, true);
  assert.strictEqual(status.onlinePlayers, 42);

  // 2. Consulta de Personagem
  const char = await adapter.getCharacter(152);
  assert.ok(char);
  assert.strictEqual(char.passport, 152);
  assert.strictEqual(char.name, 'Soldado Gomes');

  // 3. Adicionar Policial
  const hireResult = await adapter.addPoliceRole(152, 'PoliciaSoldado', 'ROTA');
  assert.strictEqual(hireResult.success, true);
  assert.strictEqual(hireResult.action, 'ADD_POLICE');

  // 4. Alterar Patente (Promoção)
  const rankResult = await adapter.setPoliceRank(152, 'PoliciaSoldado', 'PoliciaCabo');
  assert.strictEqual(rankResult.success, true);
  assert.strictEqual(rankResult.action, 'SET_RANK');

  // 5. Exoneração
  const dismissResult = await adapter.dismissPolice(152, 'PoliciaCabo', 'ROTA');
  assert.strictEqual(dismissResult.success, true);
  assert.strictEqual(dismissResult.action, 'DISMISS_POLICE');
});
