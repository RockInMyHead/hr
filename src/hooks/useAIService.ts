import { useState, useEffect, useCallback } from 'react';
import serviceManager from '../services/serviceManager';
import type { AIService } from '../services/types';

interface UseAIServiceOptions<T> {
  serviceName: string;
  methodName: string;
  args?: any[];
  dependencies?: any[];
  fallbackData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAIServiceReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAIService<T>({
  serviceName,
  methodName,
  args = [],
  dependencies = [],
  fallbackData,
  onSuccess,
  onError
}: UseAIServiceOptions<T>): UseAIServiceReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const service = serviceManager.getService<AIService>(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      const method = (service as any)[methodName];
      if (!method) {
        throw new Error(`Method ${methodName} not found in service ${serviceName}`);
      }

      const result = await method.apply(service, args);
      setData(result);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      if (fallbackData) {
        setData(fallbackData);
      }

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [serviceName, methodName, ...args, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Хук для работы с несколькими сервисами одновременно
export function useMultipleAIServices<T extends Record<string, any>>(
  services: {
    [K in keyof T]: {
      serviceName: string;
      methodName: string;
      args?: any[];
      fallbackData?: T[K];
    }
  }
): {
  data: Partial<T>;
  loading: boolean;
  errors: Partial<Record<keyof T, Error>>;
  refetch: (key?: keyof T) => void;
} {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof T, Error>>>({});

  const fetchServiceData = useCallback(async (key: keyof T) => {
    const config = services[key];
    if (!config) return;

    try {
      const service = serviceManager.getService<AIService>(config.serviceName);
      if (!service) {
        throw new Error(`Service ${config.serviceName} not found`);
      }

      const method = (service as any)[config.methodName];
      if (!method) {
        throw new Error(`Method ${config.methodName} not found in service ${config.serviceName}`);
      }

      const result = await method.apply(service, config.args || []);

      setData(prev => ({ ...prev, [key]: result }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');

      if (config.fallbackData) {
        setData(prev => ({ ...prev, [key]: config.fallbackData }));
      }

      setErrors(prev => ({ ...prev, [key]: error }));
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);

    const promises = Object.keys(services).map(key => fetchServiceData(key as keyof T));
    await Promise.allSettled(promises);

    setLoading(false);
  }, [fetchServiceData]);

  const refetch = useCallback((key?: keyof T) => {
    if (key) {
      fetchServiceData(key);
    } else {
      fetchAllData();
    }
  }, [fetchServiceData, fetchAllData]);

  useEffect(() => {
    fetchAllData();
  }, []);

  return { data, loading, errors, refetch };
}

// Хук для мониторинга здоровья сервисов
export function useServiceHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthStatus = await serviceManager.getHealthStatus();
        setHealth(healthStatus);
      } catch (error) {
        console.error('Failed to check service health:', error);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();

    // Проверяем здоровье каждые 5 минут
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { health, loading };
}

// Хук для работы с кешем сервисов
export function useServiceCache() {
  const [cacheStats, setCacheStats] = useState<any>(null);

  const refreshStats = () => {
    const stats = serviceManager.getGlobalCacheStats();
    setCacheStats(stats);
  };

  const clearAllCaches = () => {
    serviceManager.clearAllCaches();
    refreshStats();
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return { cacheStats, refreshStats, clearAllCaches };
}
