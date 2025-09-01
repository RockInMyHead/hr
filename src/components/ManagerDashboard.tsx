import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Award, 
  AlertTriangle, 
  Eye, 
  Search, 
  Filter,
  BarChart3,
  Star,
  ArrowLeft,
  UserCheck,
  Target,
  Lightbulb
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';
import { STANDARD_COMPETENCIES } from '@/types/competencies';

interface ManagerDashboardProps {
  user: AppUser;
  onBack: () => void;
}

interface EmployeeWithAnalysis extends Employee {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  potentialRating: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high';
}

interface TeamInsights {
  topPerformers: EmployeeWithAnalysis[];
  needsAttention: EmployeeWithAnalysis[];
  averageScore: number;
  competencyGaps: string[];
  teamStrengths: string[];
}

export function ManagerDashboard({ user, onBack }: ManagerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'insights' | 'development'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithAnalysis | null>(null);
  const [teamData, setTeamData] = useState<EmployeeWithAnalysis[]>([]);
  const [teamInsights, setTeamInsights] = useState<TeamInsights | null>(null);

  // Анализ сотрудника
  const analyzeEmployee = (employee: Employee): EmployeeWithAnalysis => {
    if (!employee.ratings) {
      return {
        ...employee,
        overallScore: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        potentialRating: 'low',
        riskLevel: 'high'
      };
    }

    const ratings = employee.ratings;
    const scores = Object.values(ratings);
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Определяем сильные стороны (компетенции с оценкой 4+)
    const strengths = Object.entries(ratings)
      .filter(([_, score]) => score >= 4)
      .map(([competency]) => STANDARD_COMPETENCIES[competency]?.name || competency);

    // Определяем слабые стороны (компетенции с оценкой менее 3)
    const weaknesses = Object.entries(ratings)
      .filter(([_, score]) => score < 3)
      .map(([competency]) => STANDARD_COMPETENCIES[competency]?.name || competency);

    // Генерируем рекомендации
    const recommendations = generateRecommendations(ratings, overallScore);

    // Определяем потенциал
    const potentialRating = overallScore >= 4 ? 'high' : overallScore >= 3 ? 'medium' : 'low';
    
    // Определяем уровень риска (обратная зависимость от общего балла)
    const riskLevel = overallScore >= 3.5 ? 'low' : overallScore >= 2.5 ? 'medium' : 'high';

    return {
      ...employee,
      overallScore,
      strengths,
      weaknesses,
      recommendations,
      potentialRating,
      riskLevel
    };
  };

  // Генерация рекомендаций
  const generateRecommendations = (ratings: any, overallScore: number): string[] => {
    const recommendations: string[] = [];

    // Рекомендации на основе слабых компетенций
    Object.entries(ratings).forEach(([competency, score]) => {
      if (score < 3) {
        const competencyName = STANDARD_COMPETENCIES[competency]?.name;
        switch (competency) {
          case 'communication':
            recommendations.push(`Развивать навыки коммуникации: тренинги по публичным выступлениям`);
            break;
          case 'leadership':
            recommendations.push(`Укреплять лидерские качества: ментoring, делегирование задач`);
            break;
          case 'productivity':
            recommendations.push(`Повышать эффективность: курсы по тайм-менеджменту`);
            break;
          case 'reliability':
            recommendations.push(`Развивать надежность: четкое планирование и выполнение обязательств`);
            break;
          case 'initiative':
            recommendations.push(`Стимулировать инициативность: больше творческих проектов`);
            break;
        }
      }
    });

    // Общие рекомендации
    if (overallScore < 2.5) {
      recommendations.push('Рассмотреть индивидуальный план развития с ментором');
      recommendations.push('Регулярные one-on-one встречи для отслеживания прогресса');
    } else if (overallScore >= 4) {
      recommendations.push('Рассмотреть для повышения или расширения зоны ответственности');
      recommendations.push('Может стать ментором для других сотрудников');
    }

    return recommendations.slice(0, 3); // Ограничиваем до 3 рекомендаций
  };

  // Загрузка и анализ данных команды
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-employees');
      const employees: Employee[] = raw ? JSON.parse(raw) : [];
      
      // Фильтруем сотрудников (в реальной системе это была бы команда менеджера)
      let teamEmployees = employees;
      
      // Если у пользователя указан rootEmployeeId, показываем его подчиненных
      if (user.rootEmployeeId) {
        teamEmployees = employees.filter(emp => 
          emp.managerId === user.rootEmployeeId || emp.id === user.rootEmployeeId
        );
      }

      // Анализируем каждого сотрудника
      const analyzedTeam = teamEmployees.map(analyzeEmployee);
      setTeamData(analyzedTeam);

      // Генерируем insights для команды
      if (analyzedTeam.length > 0) {
        const topPerformers = analyzedTeam
          .filter(emp => emp.overallScore >= 4)
          .sort((a, b) => b.overallScore - a.overallScore)
          .slice(0, 3);

        const needsAttention = analyzedTeam
          .filter(emp => emp.overallScore < 3)
          .sort((a, b) => a.overallScore - b.overallScore)
          .slice(0, 3);

        const averageScore = analyzedTeam.reduce((sum, emp) => sum + emp.overallScore, 0) / analyzedTeam.length;

        // Определяем общие пробелы в компетенциях
        const competencyCounts: Record<string, number> = {};
        analyzedTeam.forEach(emp => {
          emp.weaknesses.forEach(weakness => {
            competencyCounts[weakness] = (competencyCounts[weakness] || 0) + 1;
          });
        });
        
        const competencyGaps = Object.entries(competencyCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([competency]) => competency);

        // Определяем сильные стороны команды
        const strengthCounts: Record<string, number> = {};
        analyzedTeam.forEach(emp => {
          emp.strengths.forEach(strength => {
            strengthCounts[strength] = (strengthCounts[strength] || 0) + 1;
          });
        });
        
        const teamStrengths = Object.entries(strengthCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([strength]) => strength);

        setTeamInsights({
          topPerformers,
          needsAttention,
          averageScore,
          competencyGaps,
          teamStrengths
        });
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  }, [user.rootEmployeeId]);

  const filteredTeam = teamData.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 3) return 'text-blue-600 bg-blue-100 border-blue-200';
    if (score >= 2) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const getPotentialIcon = (potential: string) => {
    switch (potential) {
      case 'high': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'medium': return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      default: return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

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
              <h1 className="text-3xl font-bold text-white">Команда и компетенции</h1>
              <p className="text-gray-400 text-sm">Управление развитием сотрудников</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              <Users className="h-4 w-4 mr-1" />
              {teamData.length} сотрудников
            </Badge>
            {teamInsights && (
              <Badge className={getScoreColor(teamInsights.averageScore)}>
                <Award className="h-4 w-4 mr-1" />
                {teamInsights.averageScore.toFixed(1)} средний балл
              </Badge>
            )}
          </div>
        </div>

        {/* Навигация */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <BarChart3 className="h-4 w-4 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="employees" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Сотрудники
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Eye className="h-4 w-4 mr-2" />
              Анализ
            </TabsTrigger>
            <TabsTrigger value="development" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Target className="h-4 w-4 mr-2" />
              Развитие
            </TabsTrigger>
          </TabsList>

          {/* Обзор команды */}
          <TabsContent value="overview" className="space-y-6">
            {teamInsights && (
              <>
                {/* Ключевые метрики */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">Размер команды</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamData.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Активных сотрудников</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">Средний балл</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamInsights.averageScore.toFixed(1)}</div>
                      <p className="text-xs text-gray-400 mt-1">По всем компетенциям</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">Лидеры</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">{teamInsights.topPerformers.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Высокий потенциал</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-300">Требуют внимания</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-400">{teamInsights.needsAttention.length}</div>
                      <p className="text-xs text-gray-400 mt-1">Нуждаются в развитии</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Сильные и слабые стороны команды */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Сильные стороны команды
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamInsights.teamStrengths.map((strength, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            <span className="text-sm">{strength}</span>
                          </div>
                        ))}
                        {teamInsights.teamStrengths.length === 0 && (
                          <p className="text-gray-400 text-sm">Анализ сильных сторон недоступен</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/5 border-white/10 text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Зоны для развития
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {teamInsights.competencyGaps.map((gap, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-orange-500 rounded-full" />
                            <span className="text-sm">{gap}</span>
                          </div>
                        ))}
                        {teamInsights.competencyGaps.length === 0 && (
                          <p className="text-gray-400 text-sm">Серьезных пробелов не выявлено</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Список сотрудников */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск сотрудников..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTeam.map((employee) => (
                <Card key={employee.id} className="bg-white/5 border-white/10 text-white">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{employee.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {employee.position || 'Сотрудник'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getScoreColor(employee.overallScore)}>
                          {employee.overallScore.toFixed(1)} / 5.0
                        </Badge>
                        <div className="flex gap-1">
                          {getPotentialIcon(employee.potentialRating)}
                          {getRiskIcon(employee.riskLevel)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Компетенции */}
                    {employee.ratings && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-300">Компетенции:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(employee.ratings).map(([comp, score]) => (
                            <div key={comp} className="flex items-center justify-between">
                              <span className="text-gray-400 capitalize">{comp}</span>
                              <Badge className={getScoreColor(score)} variant="outline">
                                {score}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Сильные стороны */}
                    {employee.strengths.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Сильные стороны:</h4>
                        <div className="flex flex-wrap gap-1">
                          {employee.strengths.slice(0, 3).map((strength, i) => (
                            <Badge key={i} variant="outline" className="text-green-600 border-green-600 text-xs">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Зоны развития */}
                    {employee.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Зоны развития:</h4>
                        <div className="flex flex-wrap gap-1">
                          {employee.weaknesses.slice(0, 3).map((weakness, i) => (
                            <Badge key={i} variant="outline" className="text-orange-600 border-orange-600 text-xs">
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                          <Eye className="h-4 w-4 mr-2" />
                          Подробнее
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-black border-white/10 text-white max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{employee.name}</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Детальный анализ компетенций и рекомендации
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {/* Общая оценка */}
                          <div className="p-4 bg-white/5 rounded-xl">
                            <h4 className="font-medium mb-2">Общая оценка</h4>
                            <div className="flex items-center gap-4">
                              <Badge className={getScoreColor(employee.overallScore)}>
                                {employee.overallScore.toFixed(1)} / 5.0
                              </Badge>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Потенциал:</span>
                                {getPotentialIcon(employee.potentialRating)}
                                <span className="text-sm capitalize">{employee.potentialRating}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Риск:</span>
                                {getRiskIcon(employee.riskLevel)}
                                <span className="text-sm capitalize">{employee.riskLevel}</span>
                              </div>
                            </div>
                          </div>

                          {/* Рекомендации */}
                          {employee.recommendations.length > 0 && (
                            <div className="p-4 bg-blue-500/10 rounded-xl">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" />
                                Рекомендации по развитию
                              </h4>
                              <ul className="space-y-1 text-sm text-gray-300">
                                {employee.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTeam.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Сотрудники не найдены</h3>
                <p className="text-gray-400">Попробуйте изменить критерии поиска</p>
              </div>
            )}
          </TabsContent>

          {/* Остальные вкладки в разработке */}
          <TabsContent value="insights">
            <div className="text-center py-12">
              <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Углубленный анализ в разработке</h3>
              <p className="text-gray-400">Здесь будут сравнительные сводки и детальная аналитика</p>
            </div>
          </TabsContent>

          <TabsContent value="development">
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Планы развития в разработке</h3>
              <p className="text-gray-400">Здесь будут персональные планы развития для команды</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
