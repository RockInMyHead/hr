import { BaseService } from './baseService';
import type { UserRole, RolePermissions, RoleInfo } from '../types/roles';
import type { AIService, CompanyContext } from './types';

// Регистрируем сервис в менеджере
import serviceManager from './serviceManager';

export interface GeneratedRolePermissions extends RolePermissions {
  roleId: UserRole;
  businessContext: string;
  reasoning: string;
  recommendedResponsibilities: string[];
  securityLevel: 'maximum' | 'high' | 'medium' | 'low' | 'basic';
}

export interface GeneratedRoleInfo extends RoleInfo {
  roleId: UserRole;
  hierarchyLevel: number;
  typicalResponsibilities: string[];
  careerPath: string[];
  trainingRequirements: string[];
}

export interface RolesConfiguration {
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry: string;
  organizationalStructure: 'hierarchical' | 'flat' | 'matrix';
  securityRequirements: 'basic' | 'standard' | 'high' | 'maximum';
  roles: GeneratedRolePermissions[];
  roleInfos: GeneratedRoleInfo[];
  recommendations: string[];
}

class RolesService extends BaseService implements AIService {
  private companyContext: CompanyContext | null = null;

  constructor() {
    super();
  }

  public setCompanyContext(context: CompanyContext): void {
    this.companyContext = context;
  }

  public getCompanyContext(): CompanyContext | null {
    return this.companyContext;
  }

  // Генерация оптимальной системы ролей для компании
  async generateRolesConfiguration(
    companySize: string = 'medium',
    industry: string = 'IT',
    orgStructure: string = 'hierarchical',
    securityLevel: string = 'standard'
  ): Promise<RolesConfiguration> {
    const cacheKey = this.generateCacheKey('roles_config', companySize, industry, orgStructure, securityLevel);

    return this.withCache(
      cacheKey,
      async () => {
        try {
          const prompt = `Создай оптимальную систему ролей и разрешений для компании.

КОНТЕКСТ КОМПАНИИ:
- Размер: ${companySize}
- Отрасль: ${industry}
- Структура: ${orgStructure}
- Уровень безопасности: ${securityLevel}

ЗАДАЧА:
Сгенерируй систему ролей с оптимальными разрешениями для HR системы. Для каждой роли определи:

1. ПРАВА ДОСТУПА:
   - canAccessHRChat, canAccessOrgChart, canAccessEmployees
   - canAccessAssessments, canAccessReports
   - canCreateUsers, canEditUsers, canDeleteUsers, canManageCompany
   - canAccessSettings, canGenerateInvites, canManageRoles, canViewAllData
   - maxInvitesPerDay, maxAssessmentsPerMonth

2. ИНФОРМАЦИЯ О РОЛИ:
   - name, description, color, icon
   - hierarchyLevel, typicalResponsibilities
   - careerPath, trainingRequirements

РОЛИ ДЛЯ ГЕНЕРАЦИИ:
- administrator (администратор системы)
- managing_director (управляющий директор)
- director (директор)
- manager (руководитель)
- employee (сотрудник)

УЧТИ:
- Безопасность: чем выше роль, тем больше прав
- Эффективность: каждый должен иметь доступ к необходимым инструментам
- Масштабируемость: система должна работать для компаний разных размеров
- Лучшие практики: следуй принципам разделения полномочий

Верни результат в JSON формате:
{
  "companySize": "${companySize}",
  "industry": "${industry}",
  "organizationalStructure": "${orgStructure}",
  "securityRequirements": "${securityLevel}",
  "roles": [
    {
      "roleId": "administrator",
      "businessContext": "Техническое администрирование системы",
      "reasoning": "Обоснование разрешений для этой роли",
      "recommendedResponsibilities": ["список обязанностей"],
      "securityLevel": "maximum",
      "canAccessHRChat": true,
      "canAccessOrgChart": true,
      "canAccessEmployees": true,
      "canAccessAssessments": true,
      "canAccessReports": true,
      "canCreateUsers": true,
      "canEditUsers": true,
      "canDeleteUsers": true,
      "canManageCompany": true,
      "canAccessSettings": true,
      "canGenerateInvites": true,
      "canManageRoles": true,
      "canViewAllData": true,
      "maxInvitesPerDay": null,
      "maxAssessmentsPerMonth": null
    }
  ],
  "roleInfos": [
    {
      "roleId": "administrator",
      "name": "Администратор",
      "description": "Описание роли",
      "color": "bg-red-100 text-red-800 border-red-200",
      "icon": "🔐",
      "hierarchyLevel": 5,
      "typicalResponsibilities": ["список обязанностей"],
      "careerPath": ["карьерные ступени"],
      "trainingRequirements": ["требования к обучению"]
    }
  ],
  "recommendations": ["общие рекомендации по системе ролей"]
}`;

          const messages = [
            { role: 'system', content: prompt }
          ];

          const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
          // Удаляем кодовые ограждения перед парсингом JSON
          const cleanedResponse = response.replace(/```(?:json)?/g, '').trim();
          const configuration: RolesConfiguration = JSON.parse(cleanedResponse);
          return configuration;
        } catch (error) {
          console.error('Error generating roles configuration:', error);
          return this.getFallbackRolesConfiguration(companySize, industry, orgStructure, securityLevel);
        }
      },
      60 // Кеш на 60 минут
    );
  }

  // Генерация разрешений для конкретной роли
  async generateRolePermissions(
    roleId: UserRole,
    companyContext: {
      size: string;
      industry: string;
      structure: string;
      security: string;
    }
  ): Promise<GeneratedRolePermissions> {
    try {
      const prompt = `Определи оптимальные разрешения для роли ${roleId} в компании.

КОНТЕКСТ:
- Компания: ${companyContext.size} размер, отрасль ${companyContext.industry}
- Структура: ${companyContext.structure}
- Безопасность: ${companyContext.security}

РОЛЬ: ${roleId}

ЗАДАЧА:
Проанализируй, какие разрешения нужны для этой роли в данном контексте.
Учитывай принципы:
- Минимально необходимые права
- Разделение полномочий
- Масштабируемость
- Безопасность данных

Верни результат в JSON формате с полным набором разрешений.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      // Удаляем кодовые ограждения перед парсингом JSON
      const cleanedPermResponse = response.replace(/```(?:json)?/g, '').trim();
      const permissions: GeneratedRolePermissions = JSON.parse(cleanedPermResponse);

      return permissions;
    } catch (error) {
      console.error(`Error generating permissions for role ${roleId}:`, error);
      return this.getFallbackRolePermissions(roleId);
    }
  }

  // Генерация информации о роли
  async generateRoleInfo(
    roleId: UserRole,
    companyContext: {
      size: string;
      industry: string;
      structure: string;
    }
  ): Promise<GeneratedRoleInfo> {
    try {
      const prompt = `Создай описание и характеристики роли ${roleId}.

КОНТЕКСТ КОМПАНИИ:
- Размер: ${companyContext.size}
- Отрасль: ${companyContext.industry}
- Структура: ${companyContext.structure}

РОЛЬ: ${roleId}

ЗАДАЧА:
Сгенерируй полную информацию о роли:
- Название и описание
- Цветовая схема и иконка
- Уровень иерархии (1-5, где 5 - высший)
- Типичные обязанности
- Карьерный путь
- Требования к обучению

Верни результат в JSON формате.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      // Удаляем кодовые ограждения перед парсингом JSON
      const cleanedInfoResponse = response.replace(/```(?:json)?/g, '').trim();
      const roleInfo: GeneratedRoleInfo = JSON.parse(cleanedInfoResponse);

      return roleInfo;
    } catch (error) {
      console.error(`Error generating info for role ${roleId}:`, error);
      return this.getFallbackRoleInfo(roleId);
    }
  }

  // Анализ эффективности текущей системы ролей
  async analyzeRolesEffectiveness(
    currentRoles: Record<UserRole, RolePermissions>,
    companyMetrics: {
      employeeCount: number;
      departmentCount: number;
      securityIncidents: number;
      accessRequests: number;
    }
  ): Promise<{
    effectiveness: number; // 0-100
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    optimalRoles: UserRole[];
  }> {
    try {
      const prompt = `Проанализируй эффективность текущей системы ролей.

МЕТРИКИ КОМПАНИИ:
- Сотрудников: ${companyMetrics.employeeCount}
- Отделов: ${companyMetrics.departmentCount}
- Инцидентов безопасности: ${companyMetrics.securityIncidents}
- Запросов доступа: ${companyMetrics.accessRequests}

ТЕКУЩИЕ РОЛИ:
${Object.entries(currentRoles).map(([role, perms]) =>
  `${role}: ${Object.entries(perms).filter(([, value]) => value === true).length} разрешений`
).join('\n')}

ЗАДАЧА:
Оцени эффективность системы ролей по шкале 0-100.
Определи сильные и слабые стороны.
Дай конкретные рекомендации по улучшению.

Верни результат в JSON формате.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      // Удаляем кодовые ограждения перед парсингом JSON
      const cleanedAnalysisResponse = response.replace(/```(?:json)?/g, '').trim();
      return JSON.parse(cleanedAnalysisResponse);
    } catch (error) {
      console.error('Error analyzing roles effectiveness:', error);
      return {
        effectiveness: 70,
        strengths: ['Базовая система ролей настроена'],
        weaknesses: ['Требуется оптимизация под специфику компании'],
        recommendations: ['Провести аудит разрешений', 'Оптимизировать роли под бизнес-процессы'],
        optimalRoles: ['administrator', 'managing_director', 'director', 'manager', 'employee']
      };
    }
  }

  // Рекомендации по безопасности ролей
  async generateSecurityRecommendations(
    roles: Record<UserRole, RolePermissions>,
    securityLevel: string
  ): Promise<{
    overallSecurity: number;
    criticalPermissions: string[];
    securityRecommendations: string[];
    auditRecommendations: string[];
  }> {
    try {
      const prompt = `Проанализируй безопасность системы ролей.

ТРЕБУЕМЫЙ УРОВЕНЬ БЕЗОПАСНОСТИ: ${securityLevel}

ТЕКУЩИЕ РАЗРЕШЕНИЯ:
${Object.entries(roles).map(([role, perms]) =>
  `${role}: ${JSON.stringify(perms)}`
).join('\n')}

ЗАДАЧА:
1. Оцени общий уровень безопасности (0-100)
2. Выяви критические разрешения
3. Дай рекомендации по усилению безопасности
4. Предложи меры аудита

Верни результат в JSON формате.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      // Удаляем кодовые ограждения перед парсингом JSON
      const cleanedSecurityResponse = response.replace(/```(?:json)?/g, '').trim();
      return JSON.parse(cleanedSecurityResponse);
    } catch (error) {
      console.error('Error generating security recommendations:', error);
      return {
        overallSecurity: 75,
        criticalPermissions: ['canDeleteUsers', 'canManageRoles', 'canViewAllData'],
        securityRecommendations: ['Внедрить многофакторную аутентификацию', 'Регулярно проводить аудит доступа'],
        auditRecommendations: ['Ежемесячный аудит разрешений', 'Мониторинг использования привилегированных аккаунтов']
      };
    }
  }


  // Fallback конфигурация ролей
  private getFallbackRolesConfiguration(
    companySize: string,
    industry: string,
    orgStructure: string,
    securityLevel: string
  ): RolesConfiguration {
    return {
      companySize: companySize as any,
      industry,
      organizationalStructure: orgStructure as any,
      securityRequirements: securityLevel as any,
      roles: [
        this.getFallbackRolePermissions('administrator'),
        this.getFallbackRolePermissions('managing_director'),
        this.getFallbackRolePermissions('director'),
        this.getFallbackRolePermissions('manager'),
        this.getFallbackRolePermissions('employee')
      ],
      roleInfos: [
        this.getFallbackRoleInfo('administrator'),
        this.getFallbackRoleInfo('managing_director'),
        this.getFallbackRoleInfo('director'),
        this.getFallbackRoleInfo('manager'),
        this.getFallbackRoleInfo('employee')
      ],
      recommendations: [
        'Регулярно пересматривать разрешения пользователей',
        'Внедрять принцип наименьших привилегий',
        'Проводить аудит доступа пользователей'
      ]
    };
  }

  // Fallback разрешения для роли
  private getFallbackRolePermissions(roleId: UserRole): GeneratedRolePermissions {
    const basePermissions = {
      administrator: {
        canAccessHRChat: true,
        canAccessOrgChart: true,
        canAccessEmployees: true,
        canAccessAssessments: true,
        canAccessReports: true,
        canCreateUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageCompany: true,
        canAccessSettings: true,
        canGenerateInvites: true,
        canManageRoles: true,
        canViewAllData: true,
        maxInvitesPerDay: undefined,
        maxAssessmentsPerMonth: undefined,
      },
      managing_director: {
        canAccessHRChat: true,
        canAccessOrgChart: true,
        canAccessEmployees: true,
        canAccessAssessments: true,
        canAccessReports: true,
        canCreateUsers: true,
        canEditUsers: true,
        canDeleteUsers: true,
        canManageCompany: true,
        canAccessSettings: true,
        canGenerateInvites: true,
        canManageRoles: true,
        canViewAllData: true,
        maxInvitesPerDay: undefined,
        maxAssessmentsPerMonth: undefined,
      },
      director: {
        canAccessHRChat: true,
        canAccessOrgChart: true,
        canAccessEmployees: true,
        canAccessAssessments: true,
        canAccessReports: true,
        canCreateUsers: true,
        canEditUsers: true,
        canDeleteUsers: false,
        canManageCompany: true,
        canAccessSettings: false,
        canGenerateInvites: true,
        canManageRoles: false,
        canViewAllData: true,
        maxInvitesPerDay: undefined,
        maxAssessmentsPerMonth: undefined,
      },
      manager: {
        canAccessHRChat: true,
        canAccessOrgChart: true,
        canAccessEmployees: true,
        canAccessAssessments: true,
        canAccessReports: false,
        canCreateUsers: false,
        canEditUsers: true,
        canDeleteUsers: false,
        canManageCompany: false,
        canAccessSettings: false,
        canGenerateInvites: true,
        canManageRoles: false,
        canViewAllData: false,
        maxInvitesPerDay: 10,
        maxAssessmentsPerMonth: 50,
      },
      employee: {
        canAccessHRChat: true,
        canAccessOrgChart: true,
        canAccessEmployees: false,
        canAccessAssessments: false,
        canAccessReports: false,
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canManageCompany: false,
        canAccessSettings: false,
        canGenerateInvites: false,
        canManageRoles: false,
        canViewAllData: false,
        maxInvitesPerDay: 0,
        maxAssessmentsPerMonth: 5,
      }
    };

    return {
      roleId,
      businessContext: `Стандартная роль ${roleId}`,
      reasoning: 'Базовые разрешения для этой роли',
      recommendedResponsibilities: ['Выполнение основных обязанностей'],
      securityLevel: roleId === 'administrator' ? 'maximum' : roleId === 'employee' ? 'basic' : 'medium',
      ...basePermissions[roleId]
    } as GeneratedRolePermissions;
  }

  // Fallback информация о роли
  private getFallbackRoleInfo(roleId: UserRole): GeneratedRoleInfo {
    const baseInfos = {
      administrator: {
        name: 'Администратор',
        description: 'Полный доступ ко всем функциям системы',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '🔐',
        hierarchyLevel: 5,
        typicalResponsibilities: ['Администрирование системы', 'Управление пользователями'],
        careerPath: ['Специалист IT', 'Администратор'],
        trainingRequirements: ['Курс системного администрирования']
      },
      managing_director: {
        name: 'Управляющий директор',
        description: 'Высшее руководство компании',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '👑',
        hierarchyLevel: 5,
        typicalResponsibilities: ['Стратегическое управление', 'Принятие решений'],
        careerPath: ['Менеджер', 'Директор', 'Управляющий директор'],
        trainingRequirements: ['MBA', 'Курс лидерства']
      },
      director: {
        name: 'Директор',
        description: 'Высокий уровень управления компанией',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: '⭐',
        hierarchyLevel: 4,
        typicalResponsibilities: ['Управление отделом', 'Стратегическое планирование'],
        careerPath: ['Руководитель', 'Директор'],
        trainingRequirements: ['Курс управления', 'Специализация в отрасли']
      },
      manager: {
        name: 'Руководитель',
        description: 'Управление отделом и сотрудниками',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '👔',
        hierarchyLevel: 3,
        typicalResponsibilities: ['Управление командой', 'Контроль процессов'],
        careerPath: ['Специалист', 'Старший специалист', 'Руководитель'],
        trainingRequirements: ['Курс менеджмента', 'Навыки управления']
      },
      employee: {
        name: 'Сотрудник',
        description: 'Базовый доступ к HR функциям',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '👤',
        hierarchyLevel: 1,
        typicalResponsibilities: ['Выполнение рабочих задач', 'Саморазвитие'],
        careerPath: ['Стажер', 'Специалист', 'Старший специалист'],
        trainingRequirements: ['Введение в компанию', 'Профессиональные курсы']
      }
    };

    return {
      roleId,
      ...baseInfos[roleId]
    } as GeneratedRoleInfo;
  }

  // Очистить кеш
  clearCache(): void {
    this.cache.clear();
  }
}

// Создаем и регистрируем экземпляр сервиса
const rolesService = new RolesService();
serviceManager.registerService('roles', rolesService);

export default rolesService;
export { RolesService };
export type { RolesConfiguration, GeneratedRolePermissions, GeneratedRoleInfo };
