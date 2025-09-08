import { API_CONFIG } from '../config/api';

export interface ServiceConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useCache?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export abstract class BaseService {
  protected cache = new Map<string, CacheEntry<any>>();
  protected defaultConfig: ServiceConfig = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1500,
    useCache: true
  };

  protected async callOpenAI(
    messages: any[],
    config: Partial<ServiceConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...this.defaultConfig, ...config };

    const response = await fetch(API_CONFIG.openaiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages,
        max_tokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ошибка получения ответа';
  }

  protected setCache<T>(key: string, data: T, ttlMinutes: number = 30): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  protected getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  protected generateCacheKey(...parts: string[]): string {
    return parts.join('_').replace(/\s+/g, '_').toLowerCase();
  }

  protected async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMinutes: number = 30
  ): Promise<T> {
    const cached = this.getCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.setCache(key, data, ttlMinutes);
    return data;
  }

  protected async withFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(errorMessage || 'Service operation failed:', error);
      return fallback;
    }
  }

  protected createSystemPrompt(context: string, task: string): string {
    return `${context}\n\nЗАДАЧА:\n${task}\n\nТребования:
- Будь максимально точным и полезным
- Учитывай контекст и специфику
- Предоставляй конструктивные рекомендации
- Используй профессиональный язык`;
  }

  protected parseJsonResponse<T>(response: string): T | null {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      return null;
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
