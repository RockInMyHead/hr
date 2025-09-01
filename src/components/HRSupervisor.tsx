import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Eye, 
  Search, 
  Filter,
  BarChart3,
  PieChart,
  Download,
  ArrowLeft
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';
import type { CompetencyReport } from '@/types/competencies';
import { STANDARD_COMPETENCIES } from '@/types/competencies';

interface HRSupervisorProps {
  user: AppUser;
  onBack: () => void;
}

interface DepartmentStats {
  department: string;
  employeeCount: number;
  averageScore: number;
  topPerformers: string[];
  needsAttention: string[];
}

interface CompetencyAnalysis {
  competencyId: string;
  averageScore: number;
  trend: 'up' | 'down' | 'stable';
  departmentBreakdown: Record<string, number>;
}

export function HRSupervisor({ user, onBack }: HRSupervisorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'analytics' | 'reports'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [competencyAnalysis, setCompetencyAnalysis] = useState<CompetencyAnalysis[]>([]);

  // Загрузка данных сотрудников
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-employees');
      const employeeData: Employee[] = raw ? JSON.parse(raw) : [];
      setEmployees(employeeData);
      
      // Анализ по отделам
      const departments = Array.from(new Set(employeeData.map(e => e.position || 'Без отдела')));
      const stats: DepartmentStats[] = departments.map(dept => {
        const deptEmployees = employeeData.filter(e => (e.position || 'Без отдела') === dept);
        const scores = deptEmployees
          .filter(e => e.ratings)
          .map(e => {
            const ratings = e.ratings!;
            return (ratings.communication + ratings.leadership + ratings.productivity + ratings.reliability + ratings.initiative) / 5;
          });
        
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        
        // Топ исполнители (оценка > 4)
        const topPerformers = deptEmployees
          .filter(e => e.ratings && Object.values(e.ratings).reduce((a, b) => a + b, 0) / 5 > 4)
          .map(e => e.name);
        
        // Нуждаются во внимании (оценка < 3)
        const needsAttention = deptEmployees
          .filter(e => e.ratings && Object.values(e.ratings).reduce((a, b) => a + b, 0) / 5 < 3)
          .map(e => e.name);

        return {
          department: dept,
          employeeCount: deptEmployees.length,
          averageScore,
          topPerformers,
          needsAttention
        };
      });
      
      setDepartmentStats(stats);

      // Анализ компетенций
      const competencies = Object.keys(STANDARD_COMPETENCIES);
      const analysis: CompetencyAnalysis[] = competencies.map(compId => {
        const scores = employeeData
          .filter(e => e.ratings)
          .map(e => e.ratings![compId as keyof typeof e.ratings] || 0);
        
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        
        // Разбивка по отделам
        const departmentBreakdown: Record<string, number> = {};
        departments.forEach(dept => {
          const deptEmployees = employeeData.filter(e => (e.position || 'Без отдела') === dept && e.ratings);
          const deptScores = deptEmployees.map(e => e.ratings![compId as keyof typeof e.ratings] || 0);
          departmentBreakdown[dept] = deptScores.length > 0 ? deptScores.reduce((a, b) => a + b, 0) / deptScores.length : 0;
        });

        return {
          competencyId: compId,
          averageScore,
          trend: 'stable' as const, // В реальной системе это был бы расчет на основе исторических данных
          departmentBreakdown
        };
      });
      
      setCompetencyAnalysis(analysis);
    } catch (error) {
      console.error('Error loading HR supervisor data:', error);
    }
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (emp.position || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || (emp.position || 'Без отдела') === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getCompetencyColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600 bg-green-100';
    if (score >= 3.5) return 'text-blue-600 bg-blue-100';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
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
              <h1 className="text-3xl font-bold text-white">HR Супервайзер</h1>
              <p className="text-gray-400 text-sm">Полный контроль над компетенциями и развитием сотрудников</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white">
              <Users className="h-4 w-4 mr-1" />
              {employees.length} сотрудников
            </Badge>
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
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <PieChart className="h-4 w-4 mr-2" />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              Отчеты
            </TabsTrigger>
          </TabsList>

          {/* Обзор */}
          <TabsContent value="overview" className="space-y-6">
            {/* Ключевые метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Всего сотрудников</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employees.length}</div>
                  <p className="text-xs text-gray-400 mt-1">Активных профилей</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Средний балл</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {departmentStats.length > 0 
                      ? (departmentStats.reduce((sum, dept) => sum + dept.averageScore, 0) / departmentStats.length).toFixed(1)
                      : '0.0'
                    }
                  </div>
                  <p className="text-xs text-gray-400 mt-1">По всем компетенциям</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Топ исполнители</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {departmentStats.reduce((sum, dept) => sum + dept.topPerformers.length, 0)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Оценка 4+ баллов</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Требуют внимания</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {departmentStats.reduce((sum, dept) => sum + dept.needsAttention.length, 0)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Оценка менее 3 баллов</p>
                </CardContent>
              </Card>
            </div>

            {/* Статистика по отделам */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Статистика по отделам
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Анализ компетенций и производительности по отделам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.department} className="p-4 bg-black/20 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{dept.department}</h3>
                        <Badge className={getCompetencyColor(dept.averageScore)}>
                          {dept.averageScore.toFixed(1)} / 5.0
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Сотрудников:</span>
                          <span className="ml-2 font-medium">{dept.employeeCount}</span>
                        </div>
                        
                        <div>
                          <span className="text-gray-400">Лидеры:</span>
                          <div className="ml-2">
                            {dept.topPerformers.length > 0 ? (
                              dept.topPerformers.map((name, i) => (
                                <Badge key={i} variant="outline" className="mr-1 mb-1 text-green-600 border-green-600">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-500">Нет</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-gray-400">Требуют развития:</span>
                          <div className="ml-2">
                            {dept.needsAttention.length > 0 ? (
                              dept.needsAttention.map((name, i) => (
                                <Badge key={i} variant="outline" className="mr-1 mb-1 text-red-600 border-red-600">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-green-400">Все в норме</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Анализ компетенций */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Анализ компетенций
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Средние показатели по ключевым компетенциям
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {competencyAnalysis.map((comp) => {
                    const competency = STANDARD_COMPETENCIES[comp.competencyId];
                    return (
                      <div key={comp.competencyId} className="p-4 bg-black/20 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{competency.name}</h4>
                          {getTrendIcon(comp.trend)}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={getCompetencyColor(comp.averageScore)}>
                            {comp.averageScore.toFixed(1)} / 5.0
                          </Badge>
                        </div>

                        {/* Прогресс бар */}
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(comp.averageScore / 5) * 100}%` }}
                          />
                        </div>

                        <p className="text-xs text-gray-400">{competency.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Остальные вкладки будут добавлены в следующих компонентах */}
          <TabsContent value="employees">
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Раздел "Сотрудники" в разработке</h3>
              <p className="text-gray-400">Здесь будет детальный просмотр всех сотрудников с их компетенциями</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="text-center py-12">
              <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">BI Аналитика в разработке</h3>
              <p className="text-gray-400">Здесь будут продвинутые аналитические дашборды и визуализации</p>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="text-center py-12">
              <Download className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Система отчетов в разработке</h3>
              <p className="text-gray-400">Здесь будет возможность экспорта отчетов в Excel и PDF</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
