import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Calendar, Briefcase, Edit2, Save, X, LogOut, Shield, Brain, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AppUser, AppUserRole, PrivacySettings as PrivacySettingsType } from "@/types/profile";
import { useRoleInfo } from "@/hooks/use-permissions";
import { RoleBadge } from "@/components/RoleBadge";
import HRCallWidget from "./HRCallWidget";
import { AvatarUpload } from "./AvatarUpload";
import { PrivacySettings } from "./PrivacySettings";
import { MBTIChatTest } from "./MBTIChatTest";

interface UserProfileProps {
  user: AppUser;
  onLogout: () => void;
  onStartChat?: () => void;
  onStartCompetency: () => void;
  onStartCall: () => void;
  onStartAIAssessment?: () => void;
  onStartSelfAssessment?: () => void;
  onStartSubordinateAssessment?: () => void;
  onOpenEmployees?: () => void;
  onStartRAGInterview?: () => void;
  onOpenHRSupervisor?: () => void;
  onOpenCompetencyProfile?: () => void;
  onOpenManagerDashboard?: () => void;
  onOpenAnalyticsDashboard?: () => void;
  onOpenAssessment360?: () => void;
  onOpenMBTITest?: () => void;
  onOpenMBTIChatTest?: () => void;
  onOpenOrgChart?: () => void;
  onOpenBulkInvitations?: () => void;
  onOpenEnhancedAIInterview?: () => void;
}

export function UserProfile({ user, onLogout, onStartChat, onStartCompetency, onStartCall, onStartAIAssessment, onStartSelfAssessment, onStartSubordinateAssessment, onOpenEmployees, onStartRAGInterview, onOpenHRSupervisor, onOpenCompetencyProfile, onOpenManagerDashboard, onOpenAnalyticsDashboard, onOpenAssessment360, onOpenMBTITest, onOpenMBTIChatTest, onOpenOrgChart, onOpenBulkInvitations, onOpenEnhancedAIInterview }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [stats, setStats] = useState<{ totalSessions: number; todayTimeMins: number; lastVisit: string }>({
    totalSessions: 0,
    todayTimeMins: 0,
    lastVisit: "—",
  });
  const [inviteUrl, setInviteUrl] = useState<string>("");

  // Получаем информацию о текущей роли
  const roleInfo = useRoleInfo(user.role);

  const handleSave = () => {
    try {
      const next: AppUser = { 
        ...user, 
        name: editedUser.name, 
        email: editedUser.email, 
        rootEmployeeId: editedUser.rootEmployeeId, 
        position: editedUser.position,
        avatar: editedUser.avatar,
        privacy: editedUser.privacy
      };
      localStorage.setItem('hr-chat-user', JSON.stringify(next));
      setIsEditing(false);
      window.location.reload();
    } catch {
      setIsEditing(false);
    }
  };

  const handleAvatarChange = (avatar: string | null) => {
    const updated = { ...editedUser, avatar: avatar || undefined };
    setEditedUser(updated);
    // Автоматически сохраняем аватар
    try {
      const next: AppUser = { ...user, avatar: avatar || undefined };
      localStorage.setItem('hr-chat-user', JSON.stringify(next));
      toast({
        title: 'Успешно',
        description: 'Аватар обновлен'
      });
      // Обновляем локальное состояние без перезагрузки
      Object.assign(user, next);
    } catch (error) {
      console.error('Failed to save avatar:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить аватар',
        variant: 'destructive'
      });
    }
  };

  const handlePrivacyChange = (privacy: PrivacySettingsType) => {
    const updated = { ...editedUser, privacy };
    setEditedUser(updated);
    // Автоматически сохраняем настройки приватности
    try {
      const next: AppUser = { ...user, privacy };
      localStorage.setItem('hr-chat-user', JSON.stringify(next));
      toast({
        title: 'Успешно',
        description: 'Настройки приватности сохранены'
      });
      // Обновляем локальное состояние без перезагрузки
      Object.assign(user, next);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки приватности',
        variant: 'destructive'
      });
    }
  };

  const ensureCompanyId = (): string => {
    // Если у пользователя уже есть companyId, используем его; иначе генерируем и сохраняем
    let companyId = user.companyId;
    if (!companyId) {
      companyId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const next: AppUser = { ...user, companyId };
      localStorage.setItem('hr-chat-user', JSON.stringify(next));
    }
    return companyId;
  };

  const generateInviteLink = () => {
    const companyId = ensureCompanyId();
    const url = new URL(window.location.href);
    url.searchParams.set('inviteCompanyId', companyId);
    setInviteUrl(url.toString());
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
    toast({ title: 'Инвайт-ссылка сгенерирована', description: 'Ссылка скопирована в буфер обмена' });
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Загрузка реальной статистики из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-chat-sessions');
      const sessions: Array<{ startedAt: string; endedAt: string }> = raw ? JSON.parse(raw) : [];
      const totalSessions = sessions.length;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();

      const todayTimeMs = sessions.reduce((sum, s) => {
        const st = new Date(s.startedAt).getTime();
        const en = new Date(s.endedAt).getTime();
        if (isNaN(st) || isNaN(en)) return sum;
        // Учитываем только завершённые сегодня сессии (или начавшиеся сегодня)
        if (st >= startOfTodayMs || en >= startOfTodayMs) {
          return sum + Math.max(0, en - st);
        }
        return sum;
      }, 0);

      const lastVisitISO = localStorage.getItem('hr-last-visit');
      const lastVisit = lastVisitISO
        ? new Date(lastVisitISO).toLocaleString('ru-RU')
        : (sessions[totalSessions - 1]?.endedAt
            ? new Date(sessions[totalSessions - 1].endedAt).toLocaleString('ru-RU')
            : '—');

      setStats({ totalSessions, todayTimeMins: Math.round(todayTimeMs / 60000), lastVisit });
    } catch (_e) {
      setStats({ totalSessions: 0, todayTimeMins: 0, lastVisit: '—' });
    }
  }, []);

  const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div>
            <h1 className="text-5xl font-bold text-white mb-3">Личный кабинет</h1>
            <p className="text-gray-400 text-xl">Добро пожаловать в HR Ассистент</p>
          </div>
          <Button onClick={onLogout} variant="outline" size="lg" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
            <LogOut className="h-5 w-5 mr-2" />
            Выйти
          </Button>
        </div>

        {/* Основная сетка */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          {/* Профиль пользователя - занимает 5 колонок */}
          <div className="xl:col-span-5">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
                <TabsTrigger value="profile" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                  <User className="h-4 w-4 mr-2" />
                  Профиль
                </TabsTrigger>
                <TabsTrigger value="avatar" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                  <User className="h-4 w-4 mr-2" />
                  Аватар
                </TabsTrigger>
                <TabsTrigger value="privacy" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                  <Shield className="h-4 w-4 mr-2" />
                  Приватность
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-white">Профиль пользователя</h2>
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Редактировать
                      </Button>
                    ) : (
                      <div className="flex gap-3">
                        <Button onClick={handleSave} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить
                        </Button>
                        <Button onClick={handleCancel} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                          <X className="h-4 w-4 mr-2" />
                          Отмена
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-8">
                    <div className="flex items-center gap-6 md:space-x-8">
                      <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-white/10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xl font-bold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-3">
                        <h3 className="text-2xl md:text-3xl font-bold text-white break-all">{user.name}</h3>
                        <p className="text-gray-400 text-sm md:text-xl break-all">{user.email}</p>
                        <div className="flex items-center gap-2">
                          <RoleBadge role={user.role} size="lg" />
                          {user.companyId && (
                            <div className="text-gray-300 text-sm">
                              Компания: {user.companyId.slice(0, 8)}…
                            </div>
                          )}
                        </div>
                        {user.position && (
                          <div className="text-gray-300 text-sm">Должность: {user.position}</div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-white/10 my-8"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-300">Имя</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="name"
                            value={editedUser.name}
                            onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                            disabled={!isEditing}
                            className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-300">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="email"
                            value={editedUser.email}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                            disabled={!isEditing}
                            className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                          />
                        </div>
                      </div>

                      {user.role === 'manager' && (
                        <div className="space-y-3 md:col-span-2">
                          <Label htmlFor="rootEmployeeId" className="text-sm font-medium text-gray-300">Мой Employee ID (корень отдела)</Label>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                            <Input
                              id="rootEmployeeId"
                              placeholder="Напр.: 1712849123123"
                              value={editedUser.rootEmployeeId ?? ''}
                              onChange={(e) => setEditedUser({ ...editedUser, rootEmployeeId: e.target.value })}
                              disabled={!isEditing}
                              className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label htmlFor="position" className="text-sm font-medium text-gray-300">Должность</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="position"
                            placeholder="Ваша должность"
                            value={editedUser.position ?? ''}
                            onChange={(e) => setEditedUser({ ...editedUser, position: e.target.value })}
                            disabled={!isEditing}
                            className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="joinDate" className="text-sm font-medium text-gray-300">Дата регистрации</Label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                          <Input
                            id="joinDate"
                            value="15.01.2024"
                            disabled
                            className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="avatar">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Аватар профиля</h2>
                    <p className="text-gray-400 mb-8">Загрузите фотографию для вашего профиля</p>
                    
                    <AvatarUpload
                      currentAvatar={user.avatar}
                      userName={user.name}
                      onAvatarChange={handleAvatarChange}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy">
                <PrivacySettings
                  settings={user.privacy || {
                    showEmail: false,
                    showPosition: true,
                    showContactInfo: false,
                    showInSearch: true,
                    allowDirectMessages: true,
                  }}
                  onSettingsChange={handlePrivacyChange}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Виджет звонка - занимает 3 колонки */}
          <div className="xl:col-span-3">
            <div className="sticky top-8">
              <HRCallWidget />
            </div>
          </div>

          {/* Быстрые действия и статистика - занимают 4 колонки */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Быстрые действия</h3>
                <p className="text-gray-400">Начните работу с HR ассистентом</p>
              </div>
              <div className="space-y-4">
                {/* RAG Собеседование (чат-версия) - доступно всем */}
                {onStartChat && (
                  <Button onClick={onStartChat} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl flex items-center justify-center gap-2">
                    <Brain className="w-5 h-5" />
                    HR-чат
                  </Button>
                )}

                {/* RAG Собеседование (полная версия) - только для администраторов */}
                {(user.role === 'administrator') && onStartRAGInterview && (
                  <Button onClick={onStartRAGInterview} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl flex items-center justify-center gap-2">
                    <Settings className="w-5 h-5" />
                    RAG HR Assistant (Admin)
                  </Button>
                )}

                {/* Мои компетенции - доступно всем */}
                {onOpenCompetencyProfile && (
                  <Button onClick={onOpenCompetencyProfile} className="w-full h-14 text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                    📊 Мои компетенции
                  </Button>
                )}

                {/* MBTI Тест личности - доступно всем */}
                {onOpenMBTIChatTest && (
                  <Button onClick={onOpenMBTIChatTest} className="w-full h-14 text-lg font-medium bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30 text-white hover:from-purple-600/30 hover:to-blue-600/30 rounded-xl">
                    🤖 MBTI Чат-тест
                  </Button>
                )}

                {/* 360° Оценка - доступно всем */}
                {onOpenAssessment360 && (
                  <Button onClick={onOpenAssessment360} className="w-full h-14 text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                    🎯 360° Оценка с ИИ
                  </Button>
                )}

                {/* Расширенное ИИ-интервью - доступно всем */}
                {onOpenEnhancedAIInterview && (
                  <Button onClick={onOpenEnhancedAIInterview} className="w-full h-14 text-lg font-medium bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl">
                    🤖 ИИ-Интервью для профиля
                  </Button>
                )}

                {/* Дополнительные инструменты доступны руководителям и администраторам */}
                {(user.role === 'manager' || user.role === 'director' || user.role === 'managing_director' || user.role === 'administrator') && (
                  <>
                    <Button onClick={onOpenEmployees} className="w-full h-14 text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                      {(user.role === 'administrator' || user.role === 'managing_director' || user.role === 'director') ? 'Управление сотрудниками' : 'Мой отдел'}
                    </Button>
                    
                    {/* Интерактивная оргструктура */}
                    {onOpenOrgChart && (
                      <Button onClick={onOpenOrgChart} className="w-full h-14 text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                        🏢 Интерактивная оргструктура
                      </Button>
                    )}
                    
                    {/* Дашборд команды для менеджеров и выше */}
                    {onOpenManagerDashboard && (
                      <Button onClick={onOpenManagerDashboard} className="w-full h-14 text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                        👥 Команда и компетенции
                      </Button>
                    )}
                  </>
                )}

                {/* HR Супервайзер - только для администраторов и управляющих директоров */}
                {(user.role === 'administrator' || user.role === 'managing_director') && onOpenHRSupervisor && (
                  <Button onClick={onOpenHRSupervisor} className="w-full h-14 text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl">
                    🔍 HR Супервайзер
                  </Button>
                )}

                {/* BI Аналитика - для администраторов и управляющих директоров */}
                {(user.role === 'administrator' || user.role === 'managing_director') && onOpenAnalyticsDashboard && (
                  <Button onClick={onOpenAnalyticsDashboard} className="w-full h-14 text-lg font-medium bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl">
                    📊 BI Аналитика
                  </Button>
                )}

                {/* Массовые приглашения - для администраторов и управляющих директоров */}
                {(user.role === 'administrator' || user.role === 'managing_director') && onOpenBulkInvitations && (
                  <Button onClick={onOpenBulkInvitations} className="w-full h-14 text-lg font-medium bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 rounded-xl">
                    📧 Массовые приглашения
                  </Button>
                )}

                {/* Инвайт доступен администратору, управляющему директору и директору */}
                {(user.role === 'administrator' || user.role === 'managing_director' || user.role === 'director') && (
                  <Button
                    onClick={generateInviteLink}
                    className="w-full max-w-full min-h-14 px-4 py-3 text-sm sm:text-lg font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl whitespace-normal break-words text-center leading-tight"
                  >
                    <span className="flex flex-wrap items-center justify-center gap-2 w-full text-center">
                      <span className="hidden md:inline break-words">Сгенерировать ссылку для регистрации сотрудников</span>
                      <span className="md:hidden break-words">Ссылка для регистрации</span>
                    </span>
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-6">Статистика</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl">
                  <div>
                    <span className="text-sm font-medium text-gray-300">Проведено интервью</span>
                    <p className="text-xs text-gray-500">За все время</p>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
                </div>
                <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl">
                  <div>
                    <span className="text-sm font-medium text-gray-300">Время в системе</span>
                    <p className="text-xs text-gray-500">Сегодня</p>
                  </div>
                  <div className="text-2xl font-bold text-white">{formatMinutes(stats.todayTimeMins)}</div>
                </div>
                <div className="flex justify-between items-center p-6 bg-white/5 rounded-2xl">
                  <div>
                    <span className="text-sm font-medium text-gray-300">Последний визит</span>
                    <p className="text-xs text-gray-500">Активность</p>
                  </div>
                  <div className="text-2xl font-bold text-white">{stats.lastVisit}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
