import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  TrendingUp,
  Target,
  Lightbulb,
  ArrowLeft,
  Star,
  CheckCircle,
  Circle,
  Info,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';
import { STANDARD_COMPETENCIES, type CompetencyDefinition } from '@/types/competencies';

interface CompetencyProfileProps {
  user: AppUser;
  onBack: () => void;
}

interface UserCompetencyData {
  competencyId: string;
  currentValue: number;
  targetValue?: number;
  category: string;
  lastAssessed?: Date;
  improvementPlan?: string[];
}

export function CompetencyProfile({ user, onBack }: CompetencyProfileProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'development'>('overview');
  const [userCompetencies, setUserCompetencies] = useState<UserCompetencyData[]>([]);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Загрузка данных о компетенциях пользователя
  useEffect(() => {
    loadCompetencyData();
  }, [user.email]);

  const loadCompetencyData = async () => {
    try {
      // Сначала пытаемся загрузить данные из API (результаты интервью)
      try {
        const userIdentifier = user.email || user.name || 'anonymous';
        const paramName = userIdentifier.includes('@') ? 'email' : 'userId';
        const response = await fetch(`/api/competency-assessments/latest?${paramName}=${encodeURIComponent(userIdentifier)}`);
        if (response.ok) {
          const apiAssessments = await response.json();

          if (apiAssessments && apiAssessments.length > 0) {
            const competencies: UserCompetencyData[] = apiAssessments.map((assessment: any) => ({
              competencyId: assessment.competencyId,
              currentValue: assessment.currentValue,
              targetValue: assessment.targetValue,
              category: assessment.category || STANDARD_COMPETENCIES[assessment.competencyId]?.category || 'soft',
              lastAssessed: new Date(assessment.lastAssessed),
              improvementPlan: assessment.improvementPlan ? JSON.parse(assessment.improvementPlan) : generateImprovementPlan(assessment.competencyId, assessment.currentValue)
            }));

            setUserCompetencies(competencies);
            setLastUpdated(new Date());
            console.log('Loaded competency data from API:', competencies.length, 'assessments');
            return;
          }
        }
      } catch (apiError) {
        console.warn('Failed to load competency data from API, falling back to localStorage:', apiError);
      }

      // Fallback: получаем данные из localStorage (employees)
      const raw = localStorage.getItem('hr-employees');
      const employees: Employee[] = raw ? JSON.parse(raw) : [];
      const currentEmployee = employees.find(emp => emp.email === user.email);

      if (currentEmployee && currentEmployee.ratings) {
        const competencies: UserCompetencyData[] = Object.entries(currentEmployee.ratings).map(([key, value]) => ({
          competencyId: key,
          currentValue: value,
          targetValue: Math.min(5, value + 1), // Целевое значение - на балл выше
          category: STANDARD_COMPETENCIES[key]?.category || 'soft',
          lastAssessed: new Date(), // В реальной системе это была бы дата последней оценки
          improvementPlan: generateImprovementPlan(key, value)
        }));

        setUserCompetencies(competencies);
        setLastUpdated(new Date());
        console.log('Loaded competency data from localStorage:', competencies.length, 'assessments');
      } else {
        // Если данных нет, пользователь еще не проходил оценку компетенций
        console.log('No competency data found - user has not completed any assessments');
        setUserCompetencies([]);
        setLastUpdated(null);
      }
    } catch (error) {
      console.error('Error loading competency data:', error);
      // В случае ошибки создаем минимальные данные
      setUserCompetencies([]);
    }
  };

  // Функция обновления данных
  const refreshData = async () => {
    setIsLoading(true);
    await loadCompetencyData();
    setIsLoading(false);
  };

  // Генерация плана развития на основе текущего уровня
  const generateImprovementPlan = (competencyId: string, currentValue: number): string[] => {
    const competency = STANDARD_COMPETENCIES[competencyId];
    if (!competency) return [];

    const currentLevel = competency.values[currentValue];
    const nextLevel = competency.values[Math.min(5, currentValue + 1)];
    
    if (!nextLevel) return [];

    // Базовые рекомендации на основе компетенции
    const plans: Record<string, string[]> = {
      communication: [
        'Практиковать активное слушание в ежедневных беседах',
        'Записаться на курс публичных выступлений',
        'Попросить обратную связь о стиле общения у коллег',
        'Изучить техники невербальной коммуникации'
      ],
      leadership: [
        'Возглавить небольшой проект или инициативу',
        'Найти ментора среди опытных руководителей',
        'Изучить книги по лидерству и управлению',
        'Практиковать делегирование задач'
      ],
      productivity: [
        'Освоить методы тайм-менеджмента (GTD, Pomodoro)',
        'Автоматизировать рутинные задачи',
        'Установить четкие приоритеты по методу Эйзенхауэра',
        'Измерять и анализировать свою эффективность'
      ],
      reliability: [
        'Вести учет всех обязательств в планировщике',
        'Устанавливать напоминания для важных задач',
        'Регулярно информировать о прогрессе работы',
        'Всегда держать слово, данное коллегам'
      ],
      initiative: [
        'Еженедельно предлагать одну идею для улучшения',
        'Изучать новые технологии и методы работы',
        'Участвовать в brainstorming сессиях',
        'Брать на себя дополнительные проекты'
      ]
    };

    return plans[competencyId] || ['Продолжать развиваться в данной области'];
  };

  const getCompetencyColor = (value: number) => {
    if (value >= 4.5) return 'text-green-600 bg-green-100 border-green-200';
    if (value >= 3.5) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (value >= 2.5) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getCompetencyLevel = (value: number) => {
    if (value >= 4.5) return 'Экспертный';
    if (value >= 3.5) return 'Продвинутый';
    if (value >= 2.5) return 'Компетентный';
    if (value >= 1.5) return 'Базовый';
    return 'Начальный';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '🔧';
      case 'soft': return '💝';
      case 'leadership': return '👑';
      case 'business': return '📊';
      default: return '⭐';
    }
  };

  const overallScore = userCompetencies.length > 0 
    ? userCompetencies.reduce((sum, comp) => sum + comp.currentValue, 0) / userCompetencies.length 
    : 0;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Мои компетенции</h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Профиль развития и достижений</span>
                {lastUpdated && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Обновлено: {lastUpdated.toLocaleDateString('ru-RU')} {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={refreshData}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Обновление...' : 'Обновить'}
            </Button>
            <Badge className={getCompetencyColor(overallScore)}>
              <Award className="h-4 w-4 mr-1" />
              {overallScore.toFixed(1)} / 5.0
            </Badge>
          </div>
        </div>

        {/* Навигация */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Award className="h-4 w-4 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="detailed" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Info className="h-4 w-4 mr-2" />
              Детали
            </TabsTrigger>
            <TabsTrigger value="development" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Target className="h-4 w-4 mr-2" />
              Развитие
            </TabsTrigger>
          </TabsList>

          {/* Обзор компетенций */}
          <TabsContent value="overview" className="space-y-6">
            {userCompetencies.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Компетенции не оценены
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    У вас еще нет оценок компетенций. Чтобы получить профиль компетенций, пройдите одно из следующих оцениваний:
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400">• AI собеседование с RAG</p>
                    <p className="text-sm text-gray-400">• Полное AI собеседование</p>
                    <p className="text-sm text-gray-400">• Оценка 360°</p>
                    <p className="text-sm text-gray-400">• AI оценка по чек-листу</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
            {/* Общая статистика */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Общий балл</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallScore.toFixed(1)} / 5.0</div>
                  <p className="text-xs text-gray-400 mt-1">{getCompetencyLevel(overallScore)} уровень</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Сильные стороны</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {userCompetencies.filter(c => c.currentValue >= 4).length}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Компетенций 4+ баллов</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Зоны роста</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    {userCompetencies.filter(c => c.currentValue < 3).length}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Компетенций для развития</p>
                </CardContent>
              </Card>
            </div>

            {/* Компетенции по категориям */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(
                userCompetencies.reduce((acc, comp) => {
                  if (!acc[comp.category]) acc[comp.category] = [];
                  acc[comp.category].push(comp);
                  return acc;
                }, {} as Record<string, UserCompetencyData[]>)
              ).map(([category, competencies]) => (
                <Card key={category} className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(category)}</span>
                      <span className="capitalize">{category === 'soft' ? 'Гибкие навыки' : category === 'technical' ? 'Технические' : category === 'leadership' ? 'Лидерство' : 'Бизнес'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {competencies.map((comp) => {
                      const competency = STANDARD_COMPETENCIES[comp.competencyId];
                      return (
                        <div key={comp.competencyId} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{competency.name}</span>
                            <Badge className={getCompetencyColor(comp.currentValue)}>
                              {comp.currentValue.toFixed(1)}
                            </Badge>
                          </div>
                          <Progress 
                            value={(comp.currentValue / 5) * 100} 
                            className="h-2 bg-gray-700"
                          />
                          <p className="text-xs text-gray-400">{competency.description}</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
              </>
            )}
          </TabsContent>

          {/* Детальный просмотр */}
          <TabsContent value="detailed" className="space-y-6">
            {userCompetencies.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardContent className="pt-6">
                  <p className="text-gray-300 text-center">
                    Нет данных о компетенциях для детального обзора.
                  </p>
                </CardContent>
              </Card>
            ) : (
            <div className="grid gap-6">
              {userCompetencies.map((comp) => {
                const competency = STANDARD_COMPETENCIES[comp.competencyId];
                const currentLevel = competency.values[comp.currentValue];
                
                return (
                  <Card key={comp.competencyId} className="bg-white/5 border-white/10 text-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(comp.category)}</span>
                          {competency.name}
                        </CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                              <Info className="h-4 w-4 mr-2" />
                              Все уровни
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-black border-white/10 text-white max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{competency.name}</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                {competency.description}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {Object.values(competency.values).map((level) => (
                                <div 
                                  key={level.value} 
                                  className={`p-4 rounded-xl border ${
                                    level.value === comp.currentValue 
                                      ? 'bg-blue-500/20 border-blue-500' 
                                      : 'bg-white/5 border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={getCompetencyColor(level.value)}>
                                      {level.value} балл
                                    </Badge>
                                    <span className="font-semibold">{level.title}</span>
                                    {level.value === comp.currentValue && (
                                      <CheckCircle className="h-4 w-4 text-blue-500" />
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-300 mb-2">{level.description}</p>
                                  {level.examples && level.examples.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="text-xs font-medium text-gray-400">Примеры:</span>
                                      <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                                        {level.examples.map((example, i) => (
                                          <li key={i}>{example}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <CardDescription className="text-gray-400">
                        {competency.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Текущий уровень */}
                        <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-blue-500" />
                            <span className="font-semibold text-blue-300">Ваш текущий уровень</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getCompetencyColor(comp.currentValue)}>
                              {comp.currentValue} балл
                            </Badge>
                            <span className="font-medium">{currentLevel.title}</span>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">{currentLevel.description}</p>
                          
                          {currentLevel.examples && currentLevel.examples.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-400 block mb-2">Что это означает:</span>
                              <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
                                {currentLevel.examples.map((example, i) => (
                                  <li key={i}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Целевой уровень */}
                        {comp.targetValue && comp.targetValue > comp.currentValue && (
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-5 w-5 text-green-500" />
                              <span className="font-semibold text-green-300">Цель развития</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getCompetencyColor(comp.targetValue)}>
                                {comp.targetValue} балл
                              </Badge>
                              <span className="font-medium">{competency.values[comp.targetValue].title}</span>
                            </div>
                            <p className="text-sm text-gray-300">{competency.values[comp.targetValue].description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}
          </TabsContent>

          {/* План развития */}
          <TabsContent value="development" className="space-y-6">
            {userCompetencies.length === 0 ? (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardContent className="pt-6">
                  <p className="text-gray-300 text-center">
                    План развития будет доступен после оценки компетенций.
                  </p>
                </CardContent>
              </Card>
            ) : (
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Персональный план развития
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Рекомендации для улучшения ваших компетенций
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {userCompetencies
                    .filter(comp => comp.currentValue < 4) // Показываем только те, что можно улучшить
                    .map((comp) => {
                      const competency = STANDARD_COMPETENCIES[comp.competencyId];
                      return (
                        <div key={comp.competencyId} className="p-4 bg-black/20 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{competency.name}</h3>
                            <Badge className={getCompetencyColor(comp.currentValue)}>
                              {comp.currentValue} → {comp.targetValue || comp.currentValue + 1}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-300">Рекомендуемые действия:</h4>
                            <ul className="space-y-2">
                              {comp.improvementPlan?.map((action, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Circle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-300">{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
