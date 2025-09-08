import { API_CONFIG } from '../config/api';
import type { Employee } from '../types/employee';
import type { CompetencyDefinition } from '../types/competencies';

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

interface GeneratedRecommendations {
  riskRecommendations: string[];
  departmentRecommendations: string[];
  competencyRecommendations: string[];
  generalRecommendations: string[];
  priorityActions: string[];
}

class AnalyticsService {
  private cache: Map<string, GeneratedRecommendations> = new Map();

  // Генерация рекомендаций для анализа рисков
  async generateRiskRecommendations(riskAnalysis: RiskAnalysis, totalEmployees: number): Promise<string[]> {
    try {
      const cacheKey = `risk_${riskAnalysis.highRisk}_${riskAnalysis.mediumRisk}_${totalEmployees}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!.riskRecommendations;
      }

      const prompt = `Проанализируй данные о рисках в команде и сгенерируй конкретные рекомендации.

КОНТЕКСТ:
- Всего сотрудников: ${totalEmployees}
- Высокий риск: ${riskAnalysis.highRisk} сотрудников
- Средний риск: ${riskAnalysis.mediumRisk} сотрудников
- Низкий риск: ${riskAnalysis.lowRisk} сотрудников
- Критические компетенции: ${riskAnalysis.criticalCompetencies.join(', ')}

ЗАДАЧА:
Сгенерируй 5-7 конкретных рекомендаций по снижению рисков и улучшению производительности команды.
Рекомендации должны быть:
1. Конкретными и actionable
2. Приоритизированными по важности
3. Реалистичными для внедрения
4. Ориентированными на результат

Верни результат в JSON формате:
{
  "recommendations": [
    "Рекомендация 1 - срочная, высокоприоритетная",
    "Рекомендация 2 - среднесрочная",
    "Рекомендация 3 - долгосрочная",
    "Рекомендация 4 - профилактическая",
    "Рекомендация 5 - организационная"
  ]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const result = JSON.parse(response);

      const recommendations = result.recommendations || [];

      // Кешируем
      const cached = this.cache.get(cacheKey) || {
        riskRecommendations: [],
        departmentRecommendations: [],
        competencyRecommendations: [],
        generalRecommendations: [],
        priorityActions: []
      };
      cached.riskRecommendations = recommendations;
      this.cache.set(cacheKey, cached);

      return recommendations;
    } catch (error) {
      console.error('Error generating risk recommendations:', error);

      // Fallback рекомендации
      return [
        `${riskAnalysis.highRisk > 0 ? `${riskAnalysis.highRisk} сотрудников нуждаются в срочном развитии` : 'Команда в хорошем состоянии'}`,
        'Рекомендуется проведение индивидуальных планов развития',
        'Необходимо усилить программы обучения и ментринга',
        'Организовать регулярные performance reviews',
        'Внедрить систему обратной связи 360 градусов'
      ];
    }
  }

  // Генерация рекомендаций для отделов
  async generateDepartmentRecommendations(departmentStats: DepartmentStat[]): Promise<string[]> {
    try {
      const deptSummary = departmentStats.map(dept =>
        `${dept.name}: ${dept.employeeCount} чел., средний балл ${dept.averageScore.toFixed(1)}, тренд ${dept.trend}`
      ).join('\n');

      const cacheKey = `dept_${departmentStats.length}_${deptSummary.slice(0, 50)}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!.departmentRecommendations;
      }

      const prompt = `Проанализируй статистику по отделам и сгенерируй рекомендации по улучшению.

СТАТИСТИКА ПО ОТДЕЛАМ:
${deptSummary}

ЗАДАЧА:
Сгенерируй 4-6 рекомендаций по улучшению работы отделов:
1. Фокус на отстающих отделах
2. Поддержка успешных отделов
3. Перераспределение ресурсов
4. Лучшие практики
5. Межотдельное взаимодействие

Верни результат в JSON формате:
{
  "recommendations": [
    "Рекомендация 1 для отдела X",
    "Рекомендация 2 для распределения ресурсов",
    "Рекомендация 3 по best practices",
    "Рекомендация 4 по межотдельному взаимодействию"
  ]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const result = JSON.parse(response);

      const recommendations = result.recommendations || [];

      // Кешируем
      const cached = this.cache.get(cacheKey) || {
        riskRecommendations: [],
        departmentRecommendations: [],
        competencyRecommendations: [],
        generalRecommendations: [],
        priorityActions: []
      };
      cached.departmentRecommendations = recommendations;
      this.cache.set(cacheKey, cached);

      return recommendations;
    } catch (error) {
      console.error('Error generating department recommendations:', error);
      return [
        'Организовать обмен лучшими практиками между отделами',
        'Провести анализ загрузки и перераспределить ресурсы',
        'Внедрить единую систему KPI для всех отделов',
        'Организовать кросс-функциональные проекты'
      ];
    }
  }

  // Генерация рекомендаций по компетенциям
  async generateCompetencyRecommendations(competencyTrends: CompetencyTrend[]): Promise<string[]> {
    try {
      const compSummary = competencyTrends.map(trend =>
        `${trend.competency}: ${trend.currentAverage.toFixed(1)} (${trend.trend}), приоритет ${trend.priority}`
      ).join('\n');

      const cacheKey = `comp_${competencyTrends.length}_${compSummary.slice(0, 50)}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!.competencyRecommendations;
      }

      const prompt = `Проанализируй тренды компетенций и сгенерируй рекомендации по развитию.

ТРЕНДЫ КОМПЕТЕНЦИЙ:
${compSummary}

ЗАДАЧА:
Сгенерируй 5-7 рекомендаций по развитию компетенций:
1. Приоритет на критические компетенции
2. Программы обучения и тренинги
3. Система оценки и сертификации
4. Менторство и коучинг
5. Измерение прогресса

Верни результат в JSON формате:
{
  "recommendations": [
    "Разработать программу развития для компетенции X",
    "Организовать тренинги по компетенции Y",
    "Внедрить систему сертификации",
    "Создать программу менторства",
    "Организовать регулярную оценку прогресса"
  ]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const result = JSON.parse(response);

      const recommendations = result.recommendations || [];

      // Кешируем
      const cached = this.cache.get(cacheKey) || {
        riskRecommendations: [],
        departmentRecommendations: [],
        competencyRecommendations: [],
        generalRecommendations: [],
        priorityActions: []
      };
      cached.competencyRecommendations = recommendations;
      this.cache.set(cacheKey, cached);

      return recommendations;
    } catch (error) {
      console.error('Error generating competency recommendations:', error);
      return [
        'Разработать индивидуальные планы развития компетенций',
        'Организовать корпоративные тренинги по ключевым компетенциям',
        'Внедрить систему оценки и сертификации компетенций',
        'Создать программу менторства для развития навыков',
        'Организовать регулярный мониторинг прогресса'
      ];
    }
  }

  // Генерация общих рекомендаций
  async generateGeneralRecommendations(analyticsData: AnalyticsData): Promise<string[]> {
    try {
      const summary = `
Всего сотрудников: ${analyticsData.totalEmployees}
Средний балл: ${analyticsData.averageScore.toFixed(1)}
Топ исполнители: ${analyticsData.topPerformers}
Нуждаются в развитии: ${analyticsData.needsImprovement}
Высокий риск: ${analyticsData.riskAnalysis.highRisk}
Критические компетенции: ${analyticsData.riskAnalysis.criticalCompetencies.join(', ')}
      `.trim();

      const cacheKey = `general_${summary.replace(/\s+/g, '_').slice(0, 50)}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!.generalRecommendations;
      }

      const prompt = `На основе общей аналитики HR системы сгенерируй стратегические рекомендации.

ОБЩАЯ АНАЛИТИКА:
${summary}

ЗАДАЧА:
Сгенерируй 6-8 стратегических рекомендаций для улучшения HR системы:
1. Организационные изменения
2. Системы мотивации
3. Развитие талантов
4. Процессы оценки
5. Культура и вовлеченность
6. Технологии и автоматизация

Рекомендации должны быть:
- Стратегическими и долгосрочными
- Измеримыми и реалистичными
- Ориентированными на бизнес-результат

Верни результат в JSON формате:
{
  "recommendations": [
    "Стратегическая рекомендация 1",
    "Организационная рекомендация 2",
    "Рекомендация по мотивации 3",
    "Рекомендация по развитию 4",
    "Рекомендация по процессам 5",
    "Технологическая рекомендация 6"
  ]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const result = JSON.parse(response);

      const recommendations = result.recommendations || [];

      // Кешируем
      const cached = this.cache.get(cacheKey) || {
        riskRecommendations: [],
        departmentRecommendations: [],
        competencyRecommendations: [],
        generalRecommendations: [],
        priorityActions: []
      };
      cached.generalRecommendations = recommendations;
      this.cache.set(cacheKey, cached);

      return recommendations;
    } catch (error) {
      console.error('Error generating general recommendations:', error);
      return [
        'Внедрить комплексную систему управления талантами',
        'Разработать программу развития лидерских качеств',
        'Оптимизировать процессы оценки и обратной связи',
        'Создать культуру непрерывного обучения',
        'Внедрить современные HR технологии и автоматизацию',
        'Разработать конкурентоспособную систему компенсаций'
      ];
    }
  }

  // Генерация приоритетных действий
  async generatePriorityActions(analyticsData: AnalyticsData): Promise<string[]> {
    try {
      const urgentIssues = [];

      if (analyticsData.riskAnalysis.highRisk > 0) {
        urgentIssues.push(`${analyticsData.riskAnalysis.highRisk} сотрудников с высоким риском`);
      }

      if (analyticsData.needsImprovement > analyticsData.totalEmployees * 0.3) {
        urgentIssues.push('Большое количество сотрудников нуждаются в развитии');
      }

      if (analyticsData.riskAnalysis.criticalCompetencies.length > 0) {
        urgentIssues.push(`Критические компетенции: ${analyticsData.riskAnalysis.criticalCompetencies.join(', ')}`);
      }

      const cacheKey = `priority_${urgentIssues.join('_').slice(0, 50)}`;

      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!.priorityActions;
      }

      const prompt = `Определи самые приоритетные действия для HR команды на основе текущей ситуации.

СРОЧНЫЕ ПРОБЛЕМЫ:
${urgentIssues.join('\n')}

ОБЩАЯ СИТУАЦИЯ:
- Средний балл: ${analyticsData.averageScore.toFixed(1)}
- Топ исполнители: ${analyticsData.topPerformers}
- Нуждаются в развитии: ${analyticsData.needsImprovement}

ЗАДАЧА:
Сгенерируй 5 самых приоритетных действий для HR команды:
1. Критически важные (нужно сделать немедленно)
2. Высокий приоритет (нужно сделать в ближайшие 1-2 недели)
3. Средний приоритет (нужно сделать в ближайший месяц)
4. Профилактические меры
5. Стратегические инициативы

Верни результат в JSON формате:
{
  "priorityActions": [
    "🚨 СРОЧНО: Действие 1 (критическое)",
    "🔴 ВЫСОКИЙ: Действие 2 (1-2 недели)",
    "🟡 СРЕДНИЙ: Действие 3 (месяц)",
    "🟢 ПРОФИЛАКТИКА: Действие 4",
    "🔵 СТРАТЕГИЯ: Действие 5"
  ]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const result = JSON.parse(response);

      const priorityActions = result.priorityActions || [];

      // Кешируем
      const cached = this.cache.get(cacheKey) || {
        riskRecommendations: [],
        departmentRecommendations: [],
        competencyRecommendations: [],
        generalRecommendations: [],
        priorityActions: []
      };
      cached.priorityActions = priorityActions;
      this.cache.set(cacheKey, cached);

      return priorityActions;
    } catch (error) {
      console.error('Error generating priority actions:', error);
      return [
        '🚨 СРОЧНО: Провести анализ сотрудников с высоким риском',
        '🔴 ВЫСОКИЙ: Разработать план развития для отстающих сотрудников',
        '🟡 СРЕДНИЙ: Организовать тренинги по критическим компетенциям',
        '🟢 ПРОФИЛАКТИКА: Внедрить регулярную систему обратной связи',
        '🔵 СТРАТЕГИЯ: Разработать долгосрочный план развития талантов'
      ];
    }
  }

  // Комплексная генерация всех рекомендаций
  async generateAllRecommendations(analyticsData: AnalyticsData): Promise<GeneratedRecommendations> {
    try {
      const [riskRecs, deptRecs, compRecs, generalRecs, priorityActions] = await Promise.all([
        this.generateRiskRecommendations(analyticsData.riskAnalysis, analyticsData.totalEmployees),
        this.generateDepartmentRecommendations(analyticsData.departmentStats),
        this.generateCompetencyRecommendations(analyticsData.competencyTrends),
        this.generateGeneralRecommendations(analyticsData),
        this.generatePriorityActions(analyticsData)
      ]);

      return {
        riskRecommendations: riskRecs,
        departmentRecommendations: deptRecs,
        competencyRecommendations: compRecs,
        generalRecommendations: generalRecs,
        priorityActions
      };
    } catch (error) {
      console.error('Error generating all recommendations:', error);

      // Fallback
      return {
        riskRecommendations: ['Провести анализ рисков и разработать план действий'],
        departmentRecommendations: ['Оптимизировать распределение ресурсов между отделами'],
        competencyRecommendations: ['Разработать программу развития ключевых компетенций'],
        generalRecommendations: ['Внедрить комплексную систему управления талантами'],
        priorityActions: ['Определить и реализовать приоритетные действия']
      };
    }
  }

  // Очистить кеш
  clearCache(): void {
    this.cache.clear();
  }

  // Вызов OpenAI API
  private async callOpenAI(messages: any[], model: string = 'gpt-4o-mini'): Promise<string> {
    const response = await fetch(API_CONFIG.openaiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ошибка получения ответа';
  }
}

export default AnalyticsService;
export type { GeneratedRecommendations };

