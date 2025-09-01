import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { ROLE_INFO, ROLE_PERMISSIONS } from '@/types/roles';
import type { UserRole } from '@/types/roles';

interface RoleInfoCardProps {
  role: UserRole;
  isCurrentUser?: boolean;
}

const PermissionIndicator = ({ granted }: { granted: boolean }) => (
  granted ? (
    <CheckCircle className="h-4 w-4 text-green-600" />
  ) : (
    <XCircle className="h-4 w-4 text-gray-400" />
  )
);

export function RoleInfoCard({ role, isCurrentUser = false }: RoleInfoCardProps) {
  const roleInfo = ROLE_INFO[role];
  const permissions = ROLE_PERMISSIONS[role];

  const getRoleIcon = (roleType: UserRole) => {
    switch (roleType) {
      case 'administrator':
        return <Shield className="h-8 w-8" />;
      case 'manager':
        return <Users className="h-8 w-8" />;
      case 'employee':
        return <UserCheck className="h-8 w-8" />;
      default:
        return <UserCheck className="h-8 w-8" />;
    }
  };

  const getPermissionGroups = () => {
    return {
      'Основные функции': [
        { key: 'canAccessHRChat', label: 'HR Чат и интервью' },
        { key: 'canAccessOrgChart', label: 'Организационная структура' },
        { key: 'canAccessEmployees', label: 'Управление сотрудниками' },
        { key: 'canAccessAssessments', label: 'Оценки и компетенции' },
        { key: 'canAccessReports', label: 'Отчеты и аналитика' },
      ],
      'Управление пользователями': [
        { key: 'canCreateUsers', label: 'Создание пользователей' },
        { key: 'canEditUsers', label: 'Редактирование пользователей' },
        { key: 'canDeleteUsers', label: 'Удаление пользователей' },
        { key: 'canManageCompany', label: 'Управление компанией' },
      ],
      'Администрирование': [
        { key: 'canAccessSettings', label: 'Настройки системы' },
        { key: 'canGenerateInvites', label: 'Генерация инвайтов' },
        { key: 'canManageRoles', label: 'Управление ролями' },
        { key: 'canViewAllData', label: 'Просмотр всех данных' },
      ],
    };
  };

  return (
    <Card className={`transition-all duration-200 ${isCurrentUser ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
      {isCurrentUser && (
        <div className="absolute -top-2 -right-2">
          <Badge variant="default" className="bg-blue-500">Ваша роль</Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className={`p-4 rounded-full ${role === 'administrator' ? 'bg-red-100' : role === 'manager' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {getRoleIcon(role)}
          </div>
        </div>
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <span>{roleInfo.icon}</span>
          {roleInfo.name}
        </CardTitle>
        <CardDescription className="text-sm">
          {roleInfo.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {Object.entries(getPermissionGroups()).map(([groupName, groupPermissions]) => (
          <div key={groupName} className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-700 border-b pb-2">
              {groupName}
            </h4>
            <div className="space-y-2">
              {groupPermissions.map((permission) => (
                <div key={permission.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{permission.label}</span>
                  <PermissionIndicator granted={permissions[permission.key as keyof typeof permissions] as boolean} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Лимиты и ограничения */}
        {(permissions.maxInvitesPerDay || permissions.maxAssessmentsPerMonth) && (
          <div className="pt-4 border-t space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Ограничения:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {permissions.maxInvitesPerDay && permissions.maxInvitesPerDay > 0 && (
                <div>• {permissions.maxInvitesPerDay} инвайтов в день</div>
              )}
              {permissions.maxAssessmentsPerMonth && permissions.maxAssessmentsPerMonth > 0 && (
                <div>• {permissions.maxAssessmentsPerMonth} оценок в месяц</div>
              )}
              {(!permissions.maxInvitesPerDay || permissions.maxInvitesPerDay === 0) &&
               (!permissions.maxAssessmentsPerMonth || permissions.maxAssessmentsPerMonth === 0) && (
                <div>• Без ограничений</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}