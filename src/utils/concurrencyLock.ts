/**
 * Utilitário de Lock Concorrente em Memória (Mutex)
 * Previne condições de corrida e ações simultâneas sobre a mesma entidade.
 * Preparado para expansão futura com Redis.
 */
class ConcurrencyLockManager {
  private activeLocks = new Map<string, number>();

  /**
   * Tenta adquirir o lock para uma chave específica (ex: "guild:profile:123456")
   * @param key Identificador do recurso
   * @param ttlMs Tempo de vida máximo do lock em milissegundos (default: 10000ms)
   * @returns boolean Se o lock foi adquirido
   */
  public acquire(key: string, ttlMs: number = 10000): boolean {
    const now = Date.now();
    const existingExpiry = this.activeLocks.get(key);

    if (existingExpiry && existingExpiry > now) {
      return false; // Bloqueado por outra operação em andamento
    }

    this.activeLocks.set(key, now + ttlMs);
    return true;
  }

  /**
   * Libera o lock
   */
  public release(key: string): void {
    this.activeLocks.delete(key);
  }

  /**
   * Executa uma função protegida por lock exclusivo
   */
  public async runWithLock<T>(
    key: string,
    action: () => Promise<T>,
    ttlMs: number = 10000,
    lockErrorMsg: string = 'Uma operação conflitante já está em andamento para este recurso. Tente novamente em instantes.'
  ): Promise<T> {
    const acquired = this.acquire(key, ttlMs);
    if (!acquired) {
      throw new Error(lockErrorMsg);
    }

    try {
      return await action();
    } finally {
      this.release(key);
    }
  }
}

export const concurrencyLock = new ConcurrencyLockManager();
