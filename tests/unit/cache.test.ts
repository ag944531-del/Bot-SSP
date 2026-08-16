import test from 'node:test';
import assert from 'node:assert';
import { CacheService } from '../../src/services/CacheService.js';

test('CacheService - Armazenamento, Recuperação, Invalidação e Cache-Aside', async () => {
  await CacheService.flush();

  // 1. Testar Set e Get
  await CacheService.set('guild:123:settings', { name: 'Polícia Militar' }, 60);
  const cached = await CacheService.get<{ name: string }>('guild:123:settings');
  assert.deepStrictEqual(cached, { name: 'Polícia Militar' });

  // 2. Testar Cache-Aside (getOrSet)
  let factoryCalls = 0;
  const factory = async () => {
    factoryCalls++;
    return { data: 'valor_banco' };
  };

  const result1 = await CacheService.getOrSet('test:factory:key', factory, 60);
  assert.deepStrictEqual(result1, { data: 'valor_banco' });
  assert.strictEqual(factoryCalls, 1);

  // Segunda chamada deve vir do cache sem chamar a factory novamente
  const result2 = await CacheService.getOrSet('test:factory:key', factory, 60);
  assert.deepStrictEqual(result2, { data: 'valor_banco' });
  assert.strictEqual(factoryCalls, 1);

  // 3. Testar Invalidação direta
  await CacheService.invalidate('test:factory:key');
  const afterInvalidation = await CacheService.get('test:factory:key');
  assert.strictEqual(afterInvalidation, null);

  // 4. Testar Invalidação por Padrão (Wildcard)
  await CacheService.set('guild:999:role:1', 'role_a', 60);
  await CacheService.set('guild:999:role:2', 'role_b', 60);
  await CacheService.set('guild:888:role:1', 'role_c', 60);

  await CacheService.invalidatePattern('guild:999:*');

  assert.strictEqual(await CacheService.get('guild:999:role:1'), null);
  assert.strictEqual(await CacheService.get('guild:999:role:2'), null);
  assert.strictEqual(await CacheService.get('guild:888:role:1'), 'role_c');
});
