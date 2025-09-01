import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Settings } from 'lucide-react';
import { RoleInfoCard } from '@/components/RoleInfoCard';
import { RoleManager } from '@/components/RoleManager';
import { ROLE_INFO } from '@/types/roles';
import type { UserRole } from '@/types/roles';

interface RoleManagementProps {
  onBack: () => void;
  currentUserRole: UserRole;
}

export function RoleManagement({ onBack, currentUserRole }: RoleManagementProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'management'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  const roles: UserRole[] = ['administrator', 'managing_director', 'director', 'manager', 'employee'];

  const filteredRoles = roles.filter(role => {
    const matchesSearch = ROLE_INFO[role].name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ROLE_INFO[role].description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedRole === 'all' || role === selectedRole;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Управление ролями</h1>
              <p className="text-gray-400 text-sm">Настройка прав доступа и управление пользователями</p>
            </div>
          </div>
        </div>

        {/* Табы */}
        <div className="flex gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('overview')}
            className="flex-1"
          >
            Обзор ролей
          </Button>
          {(currentUserRole === 'administrator' || currentUserRole === 'managing_director') && (
            <Button
              variant={activeTab === 'management' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('management')}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Управление
            </Button>
          )}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Фильтры */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Фильтры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Поиск</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Поиск по названию или описанию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-filter">Фильтр по роли</Label>
                    <Select value={selectedRole} onValueChange={(value: UserRole | 'all') => setSelectedRole(value)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="administrator">Администратор</SelectItem>
                        <SelectItem value="managing_director">Управляющий директор</SelectItem>
                        <SelectItem value="director">Директор</SelectItem>
                        <SelectItem value="manager">Руководитель</SelectItem>
                        <SelectItem value="employee">Сотрудник</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Список ролей */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRoles.map((role) => (
                <RoleInfoCard
                  key={role}
                  role={role}
                  isCurrentUser={role === currentUserRole}
                />
              ))}
            </div>

            {filteredRoles.length === 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Роли не найдены</h3>
                  <p className="text-gray-400">Попробуйте изменить параметры поиска или фильтра</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === 'management' && (currentUserRole === 'administrator' || currentUserRole === 'managing_director') && (
          <RoleManager
            currentUserRole={currentUserRole}
            canManageRoles={true}
          />
        )}
      </div>
    </div>
  );
}