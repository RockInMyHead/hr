export interface AIService {
  clearCache(): void;
  getCacheStats(): { size: number; keys: string[] };
}

export interface ServiceResponse<T> {
  data: T;
  cached: boolean;
  timestamp: number;
}

export interface ErrorResponse {
  error: string;
  fallback?: any;
  timestamp: number;
}

export interface CompanyContext {
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry: string;
  organizationalStructure: 'hierarchical' | 'flat' | 'matrix';
  securityRequirements: 'basic' | 'standard' | 'high' | 'maximum';
  region?: string;
  culture?: string;
}

export interface ServiceMetrics {
  requestsCount: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorCount: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  metrics: ServiceMetrics;
  issues: string[];
}
