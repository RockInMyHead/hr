import { useMemo, useState, useEffect } from 'react';
import { getRolePermissions, getRoleInfo, ROLE_PERMISSIONS } from '@/types/roles';
import type { UserRole, RolePermissions, RoleInfo } from '@/types/roles';

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

export function usePermissions(userRole: UserRole | undefined): {
  permissions: UserPermissions;
  loading: boolean;
} {
  const [permissions, setPermissions] = useState<UserPermissions>({
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!userRole) {
        setPermissions({
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
        });
        setLoading(false);
        return;
      }

      try {
        const rolePermissions = await getRolePermissions(userRole);
        setPermissions(rolePermissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Fallback to static permissions
        setPermissions(ROLE_PERMISSIONS[userRole]);
      }
      setLoading(false);
    };

    loadPermissions();
  }, [userRole]);

  return { permissions, loading };
}

export function useRoleInfo(userRole: UserRole | undefined): {
  roleInfo: RoleInfo;
  loading: boolean;
} {
  const [roleInfo, setRoleInfo] = useState<RoleInfo>({
    name: 'Не авторизован',
    description: 'Пользователь не авторизован',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: '❓',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoleInfo = async () => {
      if (!userRole) {
        setRoleInfo({
          name: 'Не авторизован',
          description: 'Пользователь не авторизован',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
        });
        setLoading(false);
        return;
      }

      try {
        const info = await getRoleInfo(userRole);
        setRoleInfo(info);
      } catch (error) {
        console.error('Error loading role info:', error);
        // Fallback to static info
        const fallbackInfo = {
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
        setRoleInfo(fallbackInfo[userRole]);
      }
      setLoading(false);
    };

    loadRoleInfo();
  }, [userRole]);

  return { roleInfo, loading };
}