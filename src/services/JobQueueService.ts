import { ProtocolService } from './ProtocolService.js';
import { logger } from '../utils/logger.js';

export type JobType =
  | 'GENERATE_PDF'
  | 'EXPORT_CSV'
  | 'DATABASE_BACKUP'
  | 'PROCESS_STATISTICS'
  | 'AUDIT_DISPATCH';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Job<T = any, R = any> {
  id: string;
  type: JobType;
  guildId?: string;
  requesterId?: string;
  data: T;
  status: JobStatus;
  result?: R;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobHandler<T = any, R = any> = (job: Job<T, R>) => Promise<R>;

class JobQueueManager {
  private queue: Job[] = [];
  private handlers = new Map<JobType, JobHandler>();
  private isProcessing = false;
  private concurrencyLimit = 3;
  private runningJobs = 0;

  /**
   * Registra o processador para um tipo de tarefa
   */
  public registerHandler<T = any, R = any>(type: JobType, handler: JobHandler<T, R>) {
    this.handlers.set(type, handler);
  }

  /**
   * Adiciona um novo job à fila de processamento assíncrono
   */
  public async add<T = any, R = any>(
    type: JobType,
    data: T,
    options?: {
      guildId?: string;
      requesterId?: string;
      maxAttempts?: number;
    }
  ): Promise<Job<T, R>> {
    const id = await ProtocolService.generate('JOB', options?.guildId);

    const job: Job<T, R> = {
      id,
      type,
      guildId: options?.guildId,
      requesterId: options?.requesterId,
      data,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      createdAt: new Date()
    };

    this.queue.push(job);
    logger.info(`📥 [JOB-QUEUE] Tarefa enfileirada [${job.id}] Tipo: ${job.type}`);

    // Disparar processamento sem bloquear o chamador
    setImmediate(() => this.processNext());

    return job;
  }

  /**
   * Processa os próximos jobs da fila respeitando o limite de concorrência
   */
  private async processNext() {
    if (this.runningJobs >= this.concurrencyLimit) return;

    const nextJob = this.queue.find((j) => j.status === 'PENDING');
    if (!nextJob) return;

    const handler = this.handlers.get(nextJob.type);
    if (!handler) {
      nextJob.status = 'FAILED';
      nextJob.error = `Nenhum handler registrado para a tarefa do tipo ${nextJob.type}`;
      logger.warn(`⚠️ [JOB-QUEUE] Handler ausente para job ${nextJob.id}`);
      return;
    }

    nextJob.status = 'PROCESSING';
    nextJob.startedAt = new Date();
    nextJob.attempts++;
    this.runningJobs++;

    logger.debug(`⚙️ [JOB-QUEUE] Processando tarefa [${nextJob.id}] (${nextJob.type}) - Tentativa ${nextJob.attempts}/${nextJob.maxAttempts}`);

    try {
      const result = await handler(nextJob);
      nextJob.status = 'COMPLETED';
      nextJob.result = result;
      nextJob.completedAt = new Date();
      logger.info(`✅ [JOB-QUEUE] Tarefa concluída [${nextJob.id}] Tipo: ${nextJob.type}`);
    } catch (err: any) {
      logger.error(`❌ [JOB-QUEUE] Erro no processamento do job [${nextJob.id}]:`, err);
      if (nextJob.attempts < nextJob.maxAttempts) {
        nextJob.status = 'PENDING'; // Reenfileirar para nova tentativa
      } else {
        nextJob.status = 'FAILED';
        nextJob.error = err.message || 'Erro durante a execução do job';
        nextJob.completedAt = new Date();
      }
    } finally {
      this.runningJobs--;
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Consulta o estado atual de um job
   */
  public getJob(id: string): Job | undefined {
    return this.queue.find((j) => j.id === id);
  }

  /**
   * Retorna métricas da fila
   */
  public getMetrics() {
    return {
      total: this.queue.length,
      pending: this.queue.filter((j) => j.status === 'PENDING').length,
      processing: this.queue.filter((j) => j.status === 'PROCESSING').length,
      completed: this.queue.filter((j) => j.status === 'COMPLETED').length,
      failed: this.queue.filter((j) => j.status === 'FAILED').length
    };
  }
}

export const JobQueueService = new JobQueueManager();
