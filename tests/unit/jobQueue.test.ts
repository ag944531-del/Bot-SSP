import test from 'node:test';
import assert from 'node:assert';
import { JobQueueService } from '../../src/services/JobQueueService.js';

test('JobQueueService - Enfileiramento e Processamento Assíncrono de Jobs', async () => {
  let executedData: string | null = null;

  JobQueueService.registerHandler('EXPORT_CSV', async (job) => {
    executedData = job.data.fileName;
    return { exported: true, rows: 150 };
  });

  const job = await JobQueueService.add('EXPORT_CSV', { fileName: 'relatorio_teste.csv' });

  assert.strictEqual(job.status, 'PENDING');
  assert.strictEqual(job.type, 'EXPORT_CSV');

  // Aguardar processamento assíncrono na fila
  await new Promise((resolve) => setTimeout(resolve, 50));

  const completedJob = JobQueueService.getJob(job.id);
  assert.strictEqual(completedJob?.status, 'COMPLETED');
  assert.strictEqual(executedData, 'relatorio_teste.csv');
  assert.deepStrictEqual(completedJob?.result, { exported: true, rows: 150 });
});
