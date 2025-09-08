import type { CompanyContext } from '../services/types';

export interface ServiceConfiguration {
  enabled: boolean;
  cache: {
    enabled: boolean;
    ttlMinutes: number;
  };
  retry: {
    enabled: boolean;
    maxRetries: number;
    delayMs: number;
  };
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
  };
  metrics: {
    enabled: boolean;
  };
}

export interface GlobalServiceConfig {
  company: CompanyContext;
  services: {
    roles: ServiceConfiguration;
    analytics: ServiceConfiguration;
    behaviorAnalysis: ServiceConfiguration;
    competencies: ServiceConfiguration;
    mbti: ServiceConfiguration;
    mbtiTypes: ServiceConfiguration;
    rag: ServiceConfiguration;
    checklist: ServiceConfiguration;
  };
  cache: {
    globalTtlMinutes: number;
    maxSize: number;
  };
  api: {
    timeout: number;
    retries: number;
  };
}

export const defaultServiceConfig: ServiceConfiguration = {
  enabled: true,
  cache: {
    enabled: true,
    ttlMinutes: 30
  },
  retry: {
    enabled: true,
    maxRetries: 3,
    delayMs: 1000
  },
  logging: {
    enabled: true,
    level: 'info'
  },
  metrics: {
    enabled: true
  }
};

export const globalConfig: GlobalServiceConfig = {
  company: {
    size: 'medium',
    industry: 'IT',
    organizationalStructure: 'hierarchical',
    securityRequirements: 'standard'
  },
  services: {
    roles: { ...defaultServiceConfig },
    analytics: { ...defaultServiceConfig },
    behaviorAnalysis: { ...defaultServiceConfig },
    competencies: { ...defaultServiceConfig },
    mbti: { ...defaultServiceConfig },
    mbtiTypes: { ...defaultServiceConfig },
    rag: { ...defaultServiceConfig },
    checklist: { ...defaultServiceConfig }
  },
  cache: {
    globalTtlMinutes: 60,
    maxSize: 1000
  },
  api: {
    timeout: 30000,
    retries: 3
  }
};

// Функции для работы с конфигурацией
export function getServiceConfig(serviceName: keyof GlobalServiceConfig['services']): ServiceConfiguration {
  return globalConfig.services[serviceName];
}

export function updateServiceConfig(
  serviceName: keyof GlobalServiceConfig['services'],
  config: Partial<ServiceConfiguration>
): void {
  globalConfig.services[serviceName] = {
    ...globalConfig.services[serviceName],
    ...config
  };
}

export function updateCompanyContext(context: Partial<CompanyContext>): void {
  globalConfig.company = {
    ...globalConfig.company,
    ...context
  };
}

export function getCompanyContext(): CompanyContext {
  return globalConfig.company;
}

export function resetToDefaults(): void {
  Object.assign(globalConfig, {
    company: {
      size: 'medium',
      industry: 'IT',
      organizationalStructure: 'hierarchical',
      securityRequirements: 'standard'
    },
    services: {
      roles: { ...defaultServiceConfig },
      analytics: { ...defaultServiceConfig },
      behaviorAnalysis: { ...defaultServiceConfig },
      competencies: { ...defaultServiceConfig },
      mbti: { ...defaultServiceConfig },
      mbtiTypes: { ...defaultServiceConfig },
      rag: { ...defaultServiceConfig },
      checklist: { ...defaultServiceConfig }
    }
  });
}

// Валидация конфигурации
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Проверяем компанию
  if (!globalConfig.company.size) {
    errors.push('Company size is required');
  }

  if (!globalConfig.company.industry) {
    errors.push('Company industry is required');
  }

  // Проверяем сервисы
  Object.entries(globalConfig.services).forEach(([serviceName, config]) => {
    if (config.cache.ttlMinutes < 0) {
      errors.push(`Invalid TTL for service ${serviceName}`);
    }

    if (config.retry.maxRetries < 0) {
      errors.push(`Invalid max retries for service ${serviceName}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// Экспорт конфигурации для использования в сервисах
export default globalConfig;

