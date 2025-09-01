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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  administrator: {
    // Полный доступ ко всем функциям
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

    maxInvitesPerDay: undefined, // без ограничений
    maxAssessmentsPerMonth: undefined,
  },

  managing_director: {
    // Управляющий директор - высшее руководство
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

    maxInvitesPerDay: undefined, // без ограничений
    maxAssessmentsPerMonth: undefined,
  },

  director: {
    // Директор - высокий уровень управления
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

    maxInvitesPerDay: undefined, // без ограничений
    maxAssessmentsPerMonth: undefined,
  },

  manager: {
    // Ограниченный доступ для руководителей
    canAccessHRChat: true,
    canAccessOrgChart: true,
    canAccessEmployees: true,
    canAccessAssessments: true,
    canAccessReports: false,

    canCreateUsers: false,
    canEditUsers: true, // может редактировать только своих подчиненных
    canDeleteUsers: false,
    canManageCompany: false,

    canAccessSettings: false,
    canGenerateInvites: true,
    canManageRoles: false,
    canViewAllData: false, // видит только свой отдел

    maxInvitesPerDay: 10,
    maxAssessmentsPerMonth: 50,
  },

  employee: {
    // Базовый доступ для сотрудников
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
  },
};

export interface RoleInfo {
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const ROLE_INFO: Record<UserRole, RoleInfo> = {
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
  },
};