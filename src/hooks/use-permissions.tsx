import { useMemo } from 'react';
import { ROLE_PERMISSIONS } from '@/types/roles';
import type { UserRole } from '@/types/roles';

export interface UserPermissions {
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

export function usePermissions(userRole: UserRole | undefined): UserPermissions {
  return useMemo(() => {
    if (!userRole) {
      return {
        canAccessHRChat: false,
        canAccessOrgChart: false,
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
      };
    }

    return ROLE_PERMISSIONS[userRole];
  }, [userRole]);
}

export function useRoleInfo(userRole: UserRole | undefined) {
  return useMemo(() => {
    if (!userRole) {
      return {
        name: 'Не авторизован',
        description: 'Пользователь не авторизован',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: '❓',
      };
    }

    const ROLE_INFO = {
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

    return ROLE_INFO[userRole];
  }, [userRole]);
}