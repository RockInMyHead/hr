export type UserRole = 'administrator' | 'managing_director' | 'director' | 'manager' | 'employee';

export interface RolePermissions {
  // Основные функции
  canAccessHRChat: boolean;
  canAccessOrgChart: boolean;
  canAccessEmployees: boolean;
  canAccessAssessments: boolean;
  canAccessReports: boolean;

  // Управление пользователями
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageCompany: boolean;

  // Настройки и администрирование
  canAccessSettings: boolean;
  canGenerateInvites: boolean;
  canManageRoles: boolean;
  canViewAllData: boolean;

  // Ограничения
  maxInvitesPerDay?: number;
  maxAssessmentsPerMonth?: number;
}

// Импорт сервиса для динамической генерации
import { RolesService, GeneratedRolePermissions, GeneratedRoleInfo, RolesConfiguration } from '../services/rolesService';

// Кеш для сгенерированных разрешений
let rolesService: RolesService | null = null;
let rolesConfiguration: RolesConfiguration | null = null;

// Инициализация сервиса ролей
async function initializeRolesService(): Promise<void> {
  if (!rolesService) {
    rolesService = new RolesService();
  }
  if (!rolesConfiguration) {
    rolesConfiguration = await rolesService.generateRolesConfiguration(
      'medium', // размер компании
      'IT', // отрасль
      'hierarchical', // структура
      'standard' // безопасность
    );
  }
}

// Функция для получения разрешений роли
export async function getRolePermissions(roleId: UserRole): Promise<RolePermissions> {
  await initializeRolesService();

  const roleConfig = rolesConfiguration!.roles.find(r => r.roleId === roleId);
  if (roleConfig) {
    // Преобразуем GeneratedRolePermissions в RolePermissions
    const {
      roleId: _,
      businessContext: __,
      reasoning: ___,
      recommendedResponsibilities: ____,
      securityLevel: _____,
      ...permissions
    } = roleConfig;
    return permissions;
  }

  // Fallback к статичным разрешениям
  return getFallbackRolePermissions(roleId);
}

// Функция для получения всех разрешений ролей
export async function getAllRolePermissions(): Promise<Record<UserRole, RolePermissions>> {
  await initializeRolesService();

  const permissions: Record<UserRole, RolePermissions> = {} as Record<UserRole, RolePermissions>;

  for (const roleId of ['administrator', 'managing_director', 'director', 'manager', 'employee'] as UserRole[]) {
    permissions[roleId] = await getRolePermissions(roleId);
  }

  return permissions;
}

// Обратная совместимость - статичный объект для существующих компонентов
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  administrator: getFallbackRolePermissions('administrator'),
  managing_director: getFallbackRolePermissions('managing_director'),
  director: getFallbackRolePermissions('director'),
  manager: getFallbackRolePermissions('manager'),
  employee: getFallbackRolePermissions('employee'),
};

// Fallback разрешения для обратной совместимости
function getFallbackRolePermissions(roleId: UserRole): RolePermissions {
  const fallbackPermissions = {
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

  return fallbackPermissions[roleId];
}

export interface RoleInfo {
  name: string;
  description: string;
  color: string;
  icon: string;
}

// Функция для получения информации о роли
export async function getRoleInfo(roleId: UserRole): Promise<RoleInfo> {
  await initializeRolesService();

  const roleInfo = rolesConfiguration!.roleInfos.find(r => r.roleId === roleId);
  if (roleInfo) {
    // Преобразуем GeneratedRoleInfo в RoleInfo
    const {
      roleId: _,
      hierarchyLevel: __,
      typicalResponsibilities: ___,
      careerPath: ____,
      trainingRequirements: _____,
      ...info
    } = roleInfo;
    return info;
  }

  // Fallback к статичной информации
  return getFallbackRoleInfo(roleId);
}

// Функция для получения информации о всех ролях
export async function getAllRoleInfos(): Promise<Record<UserRole, RoleInfo>> {
  await initializeRolesService();

  const infos: Record<UserRole, RoleInfo> = {} as Record<UserRole, RoleInfo>;

  for (const roleId of ['administrator', 'managing_director', 'director', 'manager', 'employee'] as UserRole[]) {
    infos[roleId] = await getRoleInfo(roleId);
  }

  return infos;
}

// Обратная совместимость - статичный объект для существующих компонентов
export const ROLE_INFO: Record<UserRole, RoleInfo> = {
  administrator: getFallbackRoleInfo('administrator'),
  managing_director: getFallbackRoleInfo('managing_director'),
  director: getFallbackRoleInfo('director'),
  manager: getFallbackRoleInfo('manager'),
  employee: getFallbackRoleInfo('employee'),
};

// Fallback информация о ролях для обратной совместимости
function getFallbackRoleInfo(roleId: UserRole): RoleInfo {
  const fallbackInfos = {
    administrator: {
      name: 'Администратор',
      description: 'Полный доступ ко всем функциям системы',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '🔐',
    },
    managing_director: {
      name: 'Управляющий директор',
      description: 'Высшее руководство компании',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '👑',
    },
    director: {
      name: 'Директор',
      description: 'Высокий уровень управления компанией',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '⭐',
    },
    manager: {
      name: 'Руководитель',
      description: 'Управление отделом и сотрудниками',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '👔',
    },
    employee: {
      name: 'Сотрудник',
      description: 'Базовый доступ к HR функциям',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '👤',
    }
  };

  return fallbackInfos[roleId];
}