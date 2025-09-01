import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  AlertTriangle,
  Download,
  FileText,
  Calendar,
  Filter,
  ArrowLeft,
  Target,
  Eye,
  Zap
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';
import { STANDARD_COMPETENCIES } from '@/types/competencies';
import { exportToCSV, exportToExcel, exportToPDF, generateCompetencyReport, generateDepartmentSummary } from '@/utils/export';

interface AnalyticsDashboardProps {
  user: AppUser;
  onBack: () => void;
}

interface AnalyticsData {
  totalEmployees: number;
  averageScore: number;
  topPerformers: number;
  needsImprovement: number;
  departmentStats: DepartmentStat[];
  competencyTrends: CompetencyTrend[];
  performanceDistribution: PerformanceLevel[];
  riskAnalysis: RiskAnalysis;
}

interface DepartmentStat {
  name: string;
  employeeCount: number;
  averageScore: number;
  trend: 'up' | 'down' | 'stable';
  topCompetency: string;
  weakestCompetency: string;
}

interface CompetencyTrend {
  competency: string;
  currentAverage: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  priority: 'high' | 'medium' | 'low';
}

interface PerformanceLevel {
  level: string;
  count: number;
  percentage: number;
  color: string;
}

interface RiskAnalysis {
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  criticalCompetencies: string[];
  recommendations: string[];
}

export function AnalyticsDashboard({ user, onBack }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'departments' | 'export'>('overview');
  const [timeFilter, setTimeFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Загрузка и анализ данных
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-employees');
      const employeeData: Employee[] = raw ? JSON.parse(raw) : [];
      setEmployees(employeeData);

      // Генерация аналитических данных
      const analytics = generateAnalytics(employeeData);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  }, [timeFilter, departmentFilter]);

  const generateAnalytics = (employeeData: Employee[]): AnalyticsData => {
    const employeesWithRatings = employeeData.filter(emp => emp.ratings);
    
    if (employeesWithRatings.length === 0) {
      return {
        totalEmployees: employeeData.length,
        averageScore: 0,
        topPerformers: 0,
        needsImprovement: 0,
        departmentStats: [],
        competencyTrends: [],
        performanceDistribution: [],
        riskAnalysis: {
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          criticalCompetencies: [],
          recommendations: []
        }
      };
    }

    // Основные метрики
    const scores = employeesWithRatings.map(emp => {
      const ratings = emp.ratings!;
      return Object.values(ratings).reduce((sum, score) => sum + score, 0) / Object.values(ratings).length;
    });

    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const topPerformers = scores.filter(score => score >= 4).length;
    const needsImprovement = scores.filter(score => score < 3).length;

    // Статистика по отделам
    const departments = Array.from(new Set(employeeData.map(emp => emp.position || 'Без отдела')));
    const departmentStats: DepartmentStat[] = departments.map(dept => {
      const deptEmployees = employeesWithRatings.filter(emp => (emp.position || 'Без отдела') === dept);
      if (deptEmployees.length === 0) {
        return {
          name: dept,
          employeeCount: 0,
          averageScore: 0,
          trend: 'stable' as const,
          topCompetency: 'Нет данных',
          weakestCompetency: 'Нет данных'
        };
      }

      const deptScores = deptEmployees.map(emp => {
        const ratings = emp.ratings!;
        return Object.values(ratings).reduce((sum, score) => sum + score, 0) / Object.values(ratings).length;
      });
      const deptAverage = deptScores.reduce((sum, score) => sum + score, 0) / deptScores.length;

      // Анализ компетенций отдела
      const competencyAverages: Record<string, number> = {};
      Object.keys(STANDARD_COMPETENCIES).forEach(comp => {
        const compScores = deptEmployees.map(emp => emp.ratings![comp as keyof typeof emp.ratings] || 0);
        competencyAverages[comp] = compScores.reduce((sum, score) => sum + score, 0) / compScores.length;
      });

      const sortedCompetencies = Object.entries(competencyAverages).sort(([,a], [,b]) => b - a);
      const topCompetency = STANDARD_COMPETENCIES[sortedCompetencies[0]?.[0]]?.name || 'Нет данных';
      const weakestCompetency = STANDARD_COMPETENCIES[sortedCompetencies[sortedCompetencies.length - 1]?.[0]]?.name || 'Нет данных';

      return {
        name: dept,
        employeeCount: deptEmployees.length,
        averageScore: deptAverage,
        trend: deptAverage >= 3.5 ? 'up' : deptAverage < 2.5 ? 'down' : 'stable',
        topCompetency,
        weakestCompetency
      };
    });

    // Тренды компетенций
    const competencyTrends: CompetencyTrend[] = Object.entries(STANDARD_COMPETENCIES).map(([compId, comp]) => {
      const compScores = employeesWithRatings.map(emp => emp.ratings![compId as keyof typeof emp.ratings] || 0);
      const currentAverage = compScores.reduce((sum, score) => sum + score, 0) / compScores.length;
      
      return {
        competency: comp.name,
        currentAverage,
        trend: currentAverage >= 3.5 ? 'up' : currentAverage < 2.5 ? 'down' : 'stable',
        change: Math.random() * 0.4 - 0.2, // Симуляция изменения
        priority: currentAverage < 2.5 ? 'high' : currentAverage < 3.5 ? 'medium' : 'low'
      };
    });

    // Распределение производительности
    const performanceDistribution: PerformanceLevel[] = [
      {
        level: 'Отличный (4.5-5.0)',
        count: scores.filter(score => score >= 4.5).length,
        percentage: (scores.filter(score => score >= 4.5).length / scores.length) * 100,
        color: 'bg-green-500'
      },
      {
        level: 'Хороший (3.5-4.4)',
        count: scores.filter(score => score >= 3.5 && score < 4.5).length,
        percentage: (scores.filter(score => score >= 3.5 && score < 4.5).length / scores.length) * 100,
        color: 'bg-blue-500'
      },
      {
        level: 'Удовлетворительный (2.5-3.4)',
        count: scores.filter(score => score >= 2.5 && score < 3.5).length,
        percentage: (scores.filter(score => score >= 2.5 && score < 3.5).length / scores.length) * 100,
        color: 'bg-yellow-500'
      },
      {
        level: 'Требует улучшения (<2.5)',
        count: scores.filter(score => score < 2.5).length,
        percentage: (scores.filter(score => score < 2.5).length / scores.length) * 100,
        color: 'bg-red-500'
      }
    ];

    // Анализ рисков
    const highRisk = scores.filter(score => score < 2.5).length;
    const mediumRisk = scores.filter(score => score >= 2.5 && score < 3.5).length;
    const lowRisk = scores.filter(score => score >= 3.5).length;

    const criticalCompetencies = competencyTrends
      .filter(trend => trend.priority === 'high')
      .map(trend => trend.competency);

    const recommendations = [
      ...(highRisk > 0 ? [`${highRisk} сотрудников нуждаются в срочном развитии`] : []),
      ...(criticalCompetencies.length > 0 ? [`Критические компетенции: ${criticalCompetencies.join(', ')}`] : []),
      ...(averageScore < 3 ? ['Общий уровень команды требует внимания'] : []),
      'Рекомендуется проведение индивидуальных планов развития',
      'Необходимо усилить программы обучения и ментринга'
    ].slice(0, 5);

    return {
      totalEmployees: employeeData.length,
      averageScore,
      topPerformers,
      needsImprovement,
      departmentStats,
      competencyTrends,
      performanceDistribution,
      riskAnalysis: {
        highRisk,
        mediumRisk,
        lowRisk,
        criticalCompetencies,
        recommendations
      }
    };
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf', type: 'competency' | 'department') => {
    const timestamp = new Date().toISOString().slice(0, 10);
    let data;
    let filename;

    if (type === 'competency') {
      data = generateCompetencyReport(employees);
      filename = `competency-report-${timestamp}`;
    } else {
      data = generateDepartmentSummary(employees);
      filename = `department-summary-${timestamp}`;
    }

    switch (format) {
      case 'csv':
        exportToCSV(data, `${filename}.csv`);
        break;
      case 'excel':
        exportToExcel(data, `${filename}.xls`);
        break;
      case 'pdf':
        exportToPDF(data, `${filename}.pdf`);
        break;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Загрузка аналитических данных...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-white">BI Аналитика</h1>
              <p className="text-gray-400 text-sm">Интеллектуальная аналитика компетенций и производительности</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
              <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="quarter">Квартал</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Навигация */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Eye className="h-4 w-4 mr-2" />
              Обзор
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <TrendingUp className="h-4 w-4 mr-2" />
              Тренды
            </TabsTrigger>
            <TabsTrigger value="departments" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Users className="h-4 w-4 mr-2" />
              Отделы
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </TabsTrigger>
          </TabsList>

          {/* Обзор */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI карточки */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-200">Всего сотрудников</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalEmployees}</div>
                  <p className="text-xs text-blue-200 mt-1">В системе оценки</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-200">Средний балл</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.averageScore.toFixed(1)}</div>
                  <p className="text-xs text-green-200 mt-1">По всем компетенциям</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-200">Топ исполнители</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-300">{analyticsData.topPerformers}</div>
                  <p className="text-xs text-purple-200 mt-1">Оценка 4+ баллов</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-600/20 to-red-800/20 border-orange-500/30 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-200">Требуют развития</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-300">{analyticsData.needsImprovement}</div>
                  <p className="text-xs text-orange-200 mt-1">Оценка менее 3 баллов</p>
                </CardContent>
              </Card>
            </div>

            {/* Распределение производительности */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Распределение производительности
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Анализ уровней производительности сотрудников
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performanceDistribution.map((level, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{level.level}</span>
                        <span className="text-sm text-gray-400">{level.count} чел. ({level.percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={level.percentage} className="h-2 bg-gray-700" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Анализ рисков */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Анализ рисков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-red-500/10 rounded-xl">
                    <div className="text-2xl font-bold text-red-400">{analyticsData.riskAnalysis.highRisk}</div>
                    <div className="text-sm text-red-300">Высокий риск</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-500/10 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-400">{analyticsData.riskAnalysis.mediumRisk}</div>
                    <div className="text-sm text-yellow-300">Средний риск</div>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-xl">
                    <div className="text-2xl font-bold text-green-400">{analyticsData.riskAnalysis.lowRisk}</div>
                    <div className="text-sm text-green-300">Низкий риск</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-300">Рекомендации:</h4>
                  <ul className="space-y-2">
                    {analyticsData.riskAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <Zap className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Остальные вкладки */}
          <TabsContent value="trends">
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Анализ трендов в разработке</h3>
              <p className="text-gray-400">Здесь будут детальные тренды по компетенциям и временные графики</p>
            </div>
          </TabsContent>

          <TabsContent value="departments">
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Аналитика по отделам в разработке</h3>
              <p className="text-gray-400">Здесь будет сравнительный анализ производительности отделов</p>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Экспорт отчетов
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Выгрузка данных в различных форматах
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Отчет по компетенциям */}
                <div className="p-4 bg-black/20 rounded-xl">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Отчет по компетенциям
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Детальная таблица всех сотрудников с их оценками по компетенциям
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleExport('csv', 'competency')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      onClick={() => handleExport('excel', 'competency')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => handleExport('pdf', 'competency')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>

                {/* Сводка по отделам */}
                <div className="p-4 bg-black/20 rounded-xl">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Сводка по отделам
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Агрегированная статистика по отделам и их производительности
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleExport('csv', 'department')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button 
                      onClick={() => handleExport('excel', 'department')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => handleExport('pdf', 'department')}
                      variant="outline" 
                      size="sm" 
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
