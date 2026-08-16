import test from 'node:test';
import assert from 'node:assert';
import { ProtocolService } from '../../src/services/ProtocolService.js';

test('ProtocolService - Geração de Protocolos Padronizados', async () => {
  const currentYear = new Date().getFullYear();

  // Testar protocolo de prisão
  const prisonProtocol = await ProtocolService.generate('PR');
  assert.match(prisonProtocol, new RegExp(`^PR-${currentYear}-\\d{6}$`));

  // Testar protocolo de auditoria
  const auditProtocol = await ProtocolService.generate('AUD');
  assert.match(auditProtocol, new RegExp(`^AUD-${currentYear}-\\d{6}$`));

  // Testar protocolo de assinatura digital
  const signatureCode = ProtocolService.generateSignatureCode();
  assert.match(signatureCode, new RegExp(`^SIG-${currentYear}-\\d{6}$`));

  // Testar protocolo de erro
  const errorCode = ProtocolService.generateErrorCode();
  assert.match(errorCode, /^ERR-\d{8}-[A-Z0-9]{4}$/);
});
