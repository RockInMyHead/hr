import React from 'react';
import { Card, CardContent } from './card';
import { Skeleton } from './skeleton';
import { AlertCircle, Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = 'Загрузка...',
  variant = 'spinner',
  size = 'md'
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return <SkeletonLoader size={size} />;
  }

  if (variant === 'pulse') {
    return <PulseLoader message={message} />;
  }

  return <SpinnerLoader message={message} size={size} />;
}

function SpinnerLoader({ message, size }: { message: string; size: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}

function SkeletonLoader({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const heightClasses = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-12'
  };

  return (
    <div className="space-y-3">
      <Skeleton className={`${heightClasses[size]} w-full`} />
      <Skeleton className={`${heightClasses[size]} w-3/4`} />
      <Skeleton className={`${heightClasses[size]} w-1/2`} />
    </div>
  );
}

function PulseLoader({ message }: { message: string }) {
  return (
    <div className="flex items-center space-x-2 p-4">
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <span className="text-gray-400 text-sm ml-2">{message}</span>
    </div>
  );
}

interface ErrorStateProps {
  error: string | Error;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({ error, onRetry, showRetry = true }: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Card className="bg-red-500/10 border-red-500/20">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-red-400 font-medium">Ошибка</h3>
            <p className="text-red-300 text-sm mt-1">{errorMessage}</p>
          </div>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition-colors"
            >
              Повторить
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      {icon && (
        <div className="text-gray-400">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
        {description && (
          <p className="text-gray-400 text-sm max-w-md">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface AsyncWrapperProps {
  loading: boolean;
  error: Error | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function AsyncWrapper({
  loading,
  error,
  loadingComponent,
  errorComponent,
  onRetry,
  children
}: AsyncWrapperProps) {
  if (loading) {
    return loadingComponent || <LoadingState />;
  }

  if (error) {
    return errorComponent || <ErrorState error={error} onRetry={onRetry} />;
  }

  return <>{children}</>;
}
