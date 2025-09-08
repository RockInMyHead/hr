// Декораторы для сервисов

export function logServiceCall(serviceName: string, methodName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      console.log(`[${serviceName}] Calling ${methodName} with args:`, args);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        console.log(`[${serviceName}] ${methodName} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${serviceName}] ${methodName} failed after ${duration}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

export function measurePerformance(serviceName: string, methodName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metrics: { calls: number; totalTime: number; errors: number } = {
      calls: 0,
      totalTime: 0,
      errors: 0
    };

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();

      try {
        metrics.calls++;
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        metrics.totalTime += duration;

        return result;
      } catch (error) {
        metrics.errors++;
        throw error;
      }
    };

    // Добавляем метод для получения метрик
    target[`${propertyKey}Metrics`] = () => ({
      ...metrics,
      averageTime: metrics.calls > 0 ? metrics.totalTime / metrics.calls : 0,
      errorRate: metrics.calls > 0 ? (metrics.errors / metrics.calls) * 100 : 0
    });

    return descriptor;
  };
}

export function cacheResult(ttlMinutes: number = 30) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    descriptor.value = async function (...args: any[]) {
      const cacheKey = JSON.stringify(args);
      const now = Date.now();

      // Проверяем кеш
      const cached = cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < cached.ttl) {
        return cached.data;
      }

      // Вызываем оригинальный метод
      const result = await originalMethod.apply(this, args);

      // Сохраняем в кеш
      cache.set(cacheKey, {
        data: result,
        timestamp: now,
        ttl: ttlMinutes * 60 * 1000
      });

      return result;
    };

    // Добавляем метод для очистки кеша
    target[`${propertyKey}ClearCache`] = () => cache.clear();

    return descriptor;
  };
}

export function retryOnFailure(maxRetries: number = 3, delayMs: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt <= maxRetries) {
            console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

export function validateInput(validationFn: (args: any[]) => boolean | string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const validationResult = validationFn(args);

      if (validationResult !== true) {
        throw new Error(`Validation failed: ${validationResult}`);
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Класс для управления метриками
export class ServiceMetrics {
  private metrics = new Map<string, {
    calls: number;
    errors: number;
    totalTime: number;
    lastCall: number;
  }>();

  recordCall(serviceName: string, methodName: string, duration: number, error?: boolean) {
    const key = `${serviceName}.${methodName}`;
    const existing = this.metrics.get(key) || {
      calls: 0,
      errors: 0,
      totalTime: 0,
      lastCall: 0
    };

    existing.calls++;
    existing.totalTime += duration;
    existing.lastCall = Date.now();

    if (error) {
      existing.errors++;
    }

    this.metrics.set(key, existing);
  }

  getMetrics(serviceName?: string, methodName?: string) {
    if (serviceName && methodName) {
      const key = `${serviceName}.${methodName}`;
      return this.metrics.get(key);
    }

    if (serviceName) {
      const serviceMetrics: any = {};
      for (const [key, value] of this.metrics) {
        if (key.startsWith(`${serviceName}.`)) {
          const method = key.split('.')[1];
          serviceMetrics[method] = {
            ...value,
            averageTime: value.calls > 0 ? value.totalTime / value.calls : 0,
            errorRate: value.calls > 0 ? (value.errors / value.calls) * 100 : 0
          };
        }
      }
      return serviceMetrics;
    }

    // Все метрики
    const allMetrics: any = {};
    for (const [key, value] of this.metrics) {
      allMetrics[key] = {
        ...value,
        averageTime: value.calls > 0 ? value.totalTime / value.calls : 0,
        errorRate: value.calls > 0 ? (value.errors / value.calls) * 100 : 0
      };
    }
    return allMetrics;
  }

  clear() {
    this.metrics.clear();
  }
}

export const globalMetrics = new ServiceMetrics();
