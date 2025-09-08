import { BaseService } from './baseService';
import type { AIService, ServiceHealth, CompanyContext } from './types';

class ServiceManager extends BaseService {
  private services = new Map<string, AIService>();
  private companyContext: CompanyContext | null = null;

  constructor() {
    super();
  }

  public registerService(name: string, service: AIService): void {
    this.services.set(name, service);
  }

  public getService<T extends AIService>(name: string): T | null {
    return (this.services.get(name) as T) || null;
  }

  public setCompanyContext(context: CompanyContext): void {
    this.companyContext = context;
    // Обновляем контекст во всех зарегистрированных сервисах
    this.services.forEach(service => {
      if ('setCompanyContext' in service) {
        (service as any).setCompanyContext(context);
      }
    });
  }

  public getCompanyContext(): CompanyContext | null {
    return this.companyContext;
  }

  public getAllServices(): Map<string, AIService> {
    return new Map(this.services);
  }

  public async getHealthStatus(): Promise<ServiceHealth> {
    const services = Array.from(this.services.values());
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          // Проверяем, есть ли метод health check
          if ('getHealth' in service) {
            return await (service as any).getHealth();
          }
          return { status: 'healthy' as const, lastCheck: Date.now() };
        } catch (error) {
          return { status: 'unhealthy' as const, lastCheck: Date.now(), error };
        }
      })
    );

    const issues: string[] = [];
    let degradedCount = 0;
    let unhealthyCount = 0;

    healthChecks.forEach((result, index) => {
      if (result.status === 'rejected') {
        unhealthyCount++;
        issues.push(`Service ${index} failed health check`);
      } else if (result.value.status === 'unhealthy') {
        unhealthyCount++;
        issues.push(`Service ${index} is unhealthy`);
      } else if (result.value.status === 'degraded') {
        degradedCount++;
      }
    });

    const overallStatus = unhealthyCount > 0 ? 'unhealthy' :
                         degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      lastCheck: Date.now(),
      metrics: {
        requestsCount: 0, // TODO: Implement metrics collection
        cacheHits: 0,
        cacheMisses: 0,
        averageResponseTime: 0,
        errorCount: unhealthyCount
      },
      issues
    };
  }

  public clearAllCaches(): void {
    this.services.forEach(service => service.clearCache());
    super.clearCache();
  }

  public getGlobalCacheStats(): { totalSize: number; services: Record<string, { size: number; keys: string[] }> } {
    const services = Array.from(this.services.entries());
    const serviceStats: Record<string, { size: number; keys: string[] }> = {};

    services.forEach(([name, service]) => {
      serviceStats[name] = service.getCacheStats();
    });

    return {
      totalSize: Object.values(serviceStats).reduce((sum, stats) => sum + stats.size, 0),
      services: serviceStats
    };
  }

  public async preloadCommonData(): Promise<void> {
    if (!this.companyContext) return;

    const preloadPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        if ('preloadData' in service) {
          await (service as any).preloadData(this.companyContext);
        }
      } catch (error) {
        console.warn(`Failed to preload data for service ${name}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }
}

// Создаем глобальный экземпляр менеджера сервисов
export const serviceManager = new ServiceManager();

// Экспортируем для удобства
export default serviceManager;
