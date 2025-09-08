import React, { useState, useEffect } from 'react';
import { LoadingState, ErrorState, EmptyState, AsyncWrapper } from './loading-states';
import { Button } from './button';
import { RefreshCw, AlertTriangle, Database } from 'lucide-react';

interface AsyncContentProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  onRetry?: () => void;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  children: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
  showRetry?: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
}

export function AsyncContent<T>({
  data,
  loading,
  error,
  onRetry,
  loadingMessage = 'Загрузка данных...',
  errorMessage,
  emptyMessage = 'Данные не найдены',
  emptyIcon = <Database className="h-12 w-12 text-gray-400" />,
  children,
  fallback,
  showRetry = true,
  autoRetry = false,
  retryDelay = 3000
}: AsyncContentProps<T>) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Автоматический повтор при ошибке
  useEffect(() => {
    if (autoRetry && error && retryCount < 3 && !isRetrying) {
      setIsRetrying(true);
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        onRetry?.();
        setIsRetrying(false);
      }, retryDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoRetry, retryCount, onRetry, retryDelay, isRetrying]);

  // Сброс счетчика повторных попыток при успешной загрузке
  useEffect(() => {
    if (!loading && !error) {
      setRetryCount(0);
    }
  }, [loading, error]);

  if (loading) {
    return (
      <div className="relative">
        <LoadingState message={loadingMessage} />
        {isRetrying && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Повторная попытка {retryCount}/3</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    const errorMsg = errorMessage || error.message || 'Произошла ошибка при загрузке данных';

    return (
      <div className="space-y-4">
        <ErrorState
          error={errorMsg}
          onRetry={showRetry ? () => {
            setRetryCount(0);
            onRetry?.();
          } : undefined}
          showRetry={showRetry}
        />
        {fallback}
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Данные отсутствуют"
        description={emptyMessage}
        icon={emptyIcon}
        action={onRetry ? {
          label: 'Обновить',
          onClick: () => {
            setRetryCount(0);
            onRetry();
          }
        } : undefined}
      />
    );
  }

  return <>{children(data)}</>;
}

// Компонент для работы с несколькими асинхронными операциями
interface MultiAsyncContentProps {
  operations: {
    key: string;
    data: any;
    loading: boolean;
    error: Error | null;
  }[];
  onRetry?: (key: string) => void;
  children: (results: Record<string, any>) => React.ReactNode;
  loadingMessage?: string;
  showIndividualRetries?: boolean;
}

export function MultiAsyncContent({
  operations,
  onRetry,
  children,
  loadingMessage = 'Загрузка данных...',
  showIndividualRetries = true
}: MultiAsyncContentProps) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  useEffect(() => {
    const newResults: Record<string, any> = {};
    const newLoadingStates: Record<string, boolean> = {};
    const newErrors: Record<string, Error | null> = {};

    operations.forEach(op => {
      newResults[op.key] = op.data;
      newLoadingStates[op.key] = op.loading;
      newErrors[op.key] = op.error;
    });

    setResults(newResults);
    setLoadingStates(newLoadingStates);
    setErrors(newErrors);
  }, [operations]);

  const isAnyLoading = Object.values(loadingStates).some(loading => loading);
  const hasAnyError = Object.values(errors).some(error => error !== null);
  const hasAllData = operations.every(op => op.data !== null && !op.loading && !op.error);

  const handleRetry = (key: string) => {
    onRetry?.(key);
  };

  const handleRetryAll = () => {
    operations.forEach(op => {
      if (op.error && onRetry) {
        onRetry(op.key);
      }
    });
  };

  if (isAnyLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (hasAnyError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Некоторые данные не удалось загрузить
          </h3>
          <Button
            onClick={handleRetryAll}
            variant="outline"
            size="sm"
            className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Повторить все
          </Button>
        </div>

        {operations.map(op => (
          op.error && (
            <ErrorState
              key={op.key}
              error={`${op.key}: ${op.error.message}`}
              onRetry={showIndividualRetries ? () => handleRetry(op.key) : undefined}
              showRetry={showIndividualRetries}
            />
          )
        ))}

        {/* Показываем данные, которые удалось загрузить */}
        {Object.keys(results).length > 0 && (
          <div className="mt-6">
            {children(results)}
          </div>
        )}
      </div>
    );
  }

  if (!hasAllData) {
    return (
      <EmptyState
        title="Данные загружаются"
        description="Некоторые данные еще не готовы"
        icon={<RefreshCw className="h-12 w-12 text-blue-400 animate-spin" />}
      />
    );
  }

  return <>{children(results)}</>;
}

// HOC для компонентов с асинхронной загрузкой
export function withAsyncLoading<P extends object>(
  Component: React.ComponentType<P>,
  asyncProps: keyof P
) {
  return function AsyncComponent(props: P) {
    const asyncProp = props[asyncProps] as any;

    return (
      <AsyncContent
        data={asyncProp?.data || null}
        loading={asyncProp?.loading || false}
        error={asyncProp?.error || null}
        onRetry={asyncProp?.refetch}
      >
        {(data) => <Component {...props} {...{ [asyncProps]: { ...asyncProp, data } }} />}
      </AsyncContent>
    );
  };
}
