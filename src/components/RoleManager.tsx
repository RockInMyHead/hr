import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, Settings, BarChart3, UserCheck } from 'lucide-react';
import { ROLE_INFO, ROLE_PERMISSIONS } from '@/types/roles';
import type { UserRole } from '@/types/roles';

interface RoleManagerProps {
  currentUserRole: UserRole;
  onRoleChange?: (newRole: UserRole) => void;
  canManageRoles?: boolean;
}

const PermissionIcon = ({ permission }: { permission: boolean }) => (
  permission ? (
    <UserCheck className="h-4 w-4 text-green-600" />
  ) : (
    <Shield className="h-4 w-4 text-gray-400" />
  )
);

export function RoleManager({ currentUserRole, onRoleChange, canManageRoles = false }: RoleManagerProps) {
  const roles: UserRole[] = ['administrator', 'managing_director', 'director', 'manager', 'employee'];

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'administrator':
        return <Shield className="h-6 w-6" />;
      case 'managing_director':
        return <Shield className="h-6 w-6 text-purple-600" />;
      case 'director':
        return <BarChart3 className="h-6 w-6 text-orange-600" />;
      case 'manager':
        return <Users className="h-6 w-6" />;
      case 'employee':
        return <UserCheck className="h-6 w-6" />;
      default:
        return <UserCheck className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Управление ролями</h2>
        <p className="text-gray-600">Настройка прав доступа пользователей системы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const roleInfo = ROLE_INFO[role];
          const permissions = ROLE_PERMISSIONS[role];
          const isCurrentRole = role === currentUserRole;

          return (
            <Card key={role} className={`relative ${isCurrentRole ? 'ring-2 ring-blue-500' : ''}`}>
              {isCurrentRole && (
                <div className="absolute -top-2 -right-2">
                  <Badge variant="default" className="bg-blue-500">Текущая роль</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  <div className="p-3 rounded-full bg-gray-100">
                    {getRoleIcon(role)}
                  </div>
                </div>
                <CardTitle className="text-xl">{roleInfo.name}</CardTitle>
                <CardDescription>{roleInfo.description}</CardDescription>
                <Badge className={roleInfo.color}>
                  {roleInfo.icon} {roleInfo.name}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Основные функции:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canAccessHRChat} />
                      <span>HR Чат</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canAccessOrgChart} />
                      <span>Оргструктура</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canAccessEmployees} />
                      <span>Сотрудники</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canAccessAssessments} />
                      <span>Оценки</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canAccessReports} />
                      <span>Отчеты</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Управление:</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canCreateUsers} />
                      <span>Создание пользователей</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canEditUsers} />
                      <span>Редактирование пользователей</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canManageCompany} />
                      <span>Управление компанией</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionIcon permission={permissions.canGenerateInvites} />
                      <span>Генерация инвайтов</span>
                    </div>
                  </div>
                </div>

                {permissions.maxInvitesPerDay !== undefined && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Лимиты:</span>
                      {permissions.maxInvitesPerDay > 0 && (
                        <div>• {permissions.maxInvitesPerDay} инвайтов в день</div>
                      )}
                      {permissions.maxAssessmentsPerMonth && permissions.maxAssessmentsPerMonth > 0 && (
                        <div>• {permissions.maxAssessmentsPerMonth} оценок в месяц</div>
                      )}
                    </div>
                  </div>
                )}

                {canManageRoles && onRoleChange && !isCurrentRole && (
                  <Button
                    onClick={() => onRoleChange(role)}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Назначить роль
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

              {(currentUserRole === 'administrator' || currentUserRole === 'managing_director') && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Администрирование ролей
              </CardTitle>
              <CardDescription>
                Дополнительные возможности для руководства
              </CardDescription>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-12">
                <BarChart3 className="h-4 w-4 mr-2" />
                Просмотреть статистику ролей
              </Button>
              <Button variant="outline" className="h-12">
                <Settings className="h-4 w-4 mr-2" />
                Настроить права доступа
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}