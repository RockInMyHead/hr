// Экспорт всех сервисов
export { default as RolesService } from './rolesService';
export { default as AnalyticsService } from './analyticsService';
export { default as BehaviorAnalysisService } from './behaviorAnalysisService';
export { default as CompetenciesService } from './competenciesService';
export { default as MBTIService } from './mbtiService';
export { default as MBTITypesService } from './mbtiTypesService';
export { default as RAGService } from './ragService';
export { default as ChecklistService } from './checklistService';
export { default as UnifiedInterviewService } from './unifiedInterviewService';

// Экспорт базовых классов и интерфейсов
export { BaseService } from './baseService';
export type { AIService, CompanyContext, ServiceHealth } from './types';

// Экспорт менеджера сервисов
export { default as serviceManager } from './serviceManager';

// Экспорт конфигурации
export { default as serviceConfig } from '../config/services';
export type { GlobalServiceConfig, ServiceConfiguration } from '../config/services';

// Экспорт декораторов
export * from '../utils/serviceDecorators';

// Удобные функции для быстрого доступа
export const services = {
  get roles() {
    return serviceManager.getService('roles');
  },
  get analytics() {
    return serviceManager.getService('analytics');
  },
  get behaviorAnalysis() {
    return serviceManager.getService('behaviorAnalysis');
  },
  get competencies() {
    return serviceManager.getService('competencies');
  },
  get mbti() {
    return serviceManager.getService('mbti');
  },
  get mbtiTypes() {
    return serviceManager.getService('mbtiTypes');
  },
  get rag() {
    return serviceManager.getService('rag');
  },
  get checklist() {
    return serviceManager.getService('checklist');
  },
  get unifiedInterview() {
    return serviceManager.getService('unifiedInterview');
  }
};

// Функция для инициализации всех сервисов
export async function initializeServices() {
  try {
    // Устанавливаем контекст компании
    const { getCompanyContext } = await import('../config/services');
    serviceManager.setCompanyContext(getCompanyContext());

    // Предварительная загрузка данных
    await serviceManager.preloadCommonData();

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }
}

// Функция для получения здоровья всех сервисов
export async function getServicesHealth() {
  return await serviceManager.getHealthStatus();
}

// Функция для очистки всех кешей
export function clearAllCaches() {
  serviceManager.clearAllCaches();
}
