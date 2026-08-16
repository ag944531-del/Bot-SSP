import { logger } from '../utils/logger.js';

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  flush(): Promise<void>;
}

interface CacheItem<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * Provedor de Cache em Memória com suporte a TTL e Invalidação
 */
export class MemoryCacheProvider implements ICacheProvider {
  private store = new Map<string, CacheItem<any>>();

  public async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  public async flush(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Provedor Redis (Estrutura arquitetural preparada para conexão com cluster Redis)
 */
export class RedisCacheProvider implements ICacheProvider {
  private fallback = new MemoryCacheProvider();

  public async get<T>(key: string): Promise<T | null> {
    return this.fallback.get<T>(key);
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.fallback.set<T>(key, value, ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    return this.fallback.del(key);
  }

  public async delPattern(pattern: string): Promise<void> {
    return this.fallback.delPattern(pattern);
  }

  public async flush(): Promise<void> {
    return this.fallback.flush();
  }
}

class CacheManager {
  private provider: ICacheProvider;

  constructor() {
    this.provider = new MemoryCacheProvider();
  }

  public setProvider(provider: ICacheProvider) {
    this.provider = provider;
  }

  /**
   * Obtém um item do cache ou executa a função factory caso não exista (Cache-Aside pattern)
   */
  public async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    try {
      const cached = await this.provider.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }

      const fresh = await factory();
      if (fresh !== null && fresh !== undefined) {
        await this.provider.set(key, fresh, ttlSeconds);
      }
      return fresh;
    } catch (err) {
      logger.warn(`Erro no cache para chave ${key}, executando factory direta:`, err);
      return await factory();
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    return this.provider.get<T>(key);
  }

  public async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    return this.provider.set(key, value, ttlSeconds);
  }

  public async invalidate(key: string): Promise<void> {
    return this.provider.del(key);
  }

  public async invalidatePattern(pattern: string): Promise<void> {
    return this.provider.delPattern(pattern);
  }

  public async flush(): Promise<void> {
    return this.provider.flush();
  }
}

export const CacheService = new CacheManager();
