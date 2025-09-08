import { BaseService } from './baseService';
import type { CompetencyDefinition } from '../types/competencies';
import type { AIService, CompanyContext } from './types';

// Регистрируем сервис в менеджере
import serviceManager from './serviceManager';

// Определяем типы компетенций
export type CompetencyId =
  | 'communication'
  | 'leadership'
  | 'productivity'
  | 'reliability'
  | 'initiative'
  | 'technical_expertise'
  | 'problem_solving'
  | 'teamwork'
  | 'adaptability'
  | 'emotional_intelligence';

export interface GeneratedCompetencyDefinition {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'soft' | 'leadership' | 'business';
  weight: number;
  values: Record<number, {
    value: number;
    title: string;
    description: string;
    examples: string[];
  }>;
  businessContext?: string;
  reasoning?: string;
  developmentSuggestions?: string[];
}

export interface CompetenciesConfiguration {
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  organizationalStructure: 'hierarchical' | 'flat' | 'matrix';
  competencies: GeneratedCompetencyDefinition[];
  recommendations: string[];
  assessmentGuidelines: string[];
}

class CompetenciesService extends BaseService implements AIService {
  private companyContext: CompanyContext | null = null;

  constructor() {
    super();
    // Регистрируем сервис
    serviceManager.registerService('competencies', this);
  }

  public setCompanyContext(context: CompanyContext): void {
    this.companyContext = context;
  }

  public getCompanyContext(): CompanyContext | null {
    return this.companyContext;
  }

  // Получение определения конкретной компетенции
  async getCompetencyDefinition(competencyId: CompetencyId): Promise<GeneratedCompetencyDefinition> {
    const cacheKey = `competency_${competencyId}`;
    const cached = this.getCache<GeneratedCompetencyDefinition>(cacheKey);
    if (cached) {
      return cached;
    }

    // Генерируем определение компетенции
    const definition = await this.generateCompetencyDefinition(competencyId);

    // Кешируем результат
    this.setCache(cacheKey, definition);

    return definition;
  }

  // Получение всех определений компетенций
  async getAllCompetencyDefinitions(): Promise<Record<string, GeneratedCompetencyDefinition>> {
    const cacheKey = 'all_competencies';
    const cached = this.getCache<Record<string, GeneratedCompetencyDefinition>>(cacheKey);
    if (cached) {
      return cached;
    }

    const standardIds: CompetencyId[] = [
      'communication',
      'leadership',
      'productivity',
      'reliability',
      'initiative',
      'technical_expertise',
      'problem_solving',
      'teamwork',
      'adaptability',
      'emotional_intelligence'
    ];

    const competencies: Record<string, GeneratedCompetencyDefinition> = {};

    for (const id of standardIds) {
      competencies[id] = await this.generateCompetencyDefinition(id);
    }

    // Кешируем результат
    this.setCache(cacheKey, competencies);

    return competencies;
  }

  // Генерация конфигурации компетенций для компании
  async generateCompetenciesConfiguration(): Promise<CompetenciesConfiguration> {
    if (!this.companyContext) {
      throw new Error('Company context is required for competency configuration generation');
    }

    const cacheKey = 'competencies_config';
    const cached = this.getCache<CompetenciesConfiguration>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Для демо-версии возвращаем предопределенную конфигурацию
      // В реальной версии здесь был бы AI для генерации кастомных компетенций
      const config: CompetenciesConfiguration = {
        industry: this.companyContext.industry || 'general',
        companySize: this.companyContext.size || 'medium',
        organizationalStructure: this.companyContext.structure || 'hierarchical',
        competencies: await this.generateStandardCompetencies(),
        recommendations: [
          'Регулярно проводите оценку компетенций',
          'Используйте компетенции для планирования развития',
          'Свяжите компетенции с системой вознаграждения',
          'Обучайте менеджеров проведению оценки'
        ],
        assessmentGuidelines: [
          'Используйте поведенческие примеры',
          'Оценивайте на основе наблюдений',
          'Обсуждайте результаты с сотрудниками',
          'Устанавливайте конкретные цели развития'
        ]
      };

      this.setCache(cacheKey, config);
      return config;

    } catch (error) {
      console.error('Failed to generate competencies configuration:', error);
      throw new Error('Не удалось сгенерировать конфигурацию компетенций');
    }
  }

  // Генерация стандартных компетенций
  private async generateStandardCompetencies(): Promise<GeneratedCompetencyDefinition[]> {
    const competencies: GeneratedCompetencyDefinition[] = [];

    const standardIds: CompetencyId[] = [
      'communication',
      'leadership',
      'productivity',
      'reliability',
      'initiative',
      'technical_expertise',
      'problem_solving',
      'teamwork',
      'adaptability',
      'emotional_intelligence'
    ];

    for (const id of standardIds) {
      competencies.push(await this.generateCompetencyDefinition(id));
    }

    return competencies;
  }

  // Генерация определения конкретной компетенции
  private async generateCompetencyDefinition(competencyId: CompetencyId): Promise<GeneratedCompetencyDefinition> {
    // Предопределенные определения компетенций
    const definitions: Record<CompetencyId, GeneratedCompetencyDefinition> = {
      communication: {
        id: 'communication',
        name: 'Коммуникация',
        description: 'Способность эффективно общаться с коллегами, клиентами и руководством',
        category: 'soft',
        weight: 1.2,
        values: {
          1: {
            value: 1,
            title: 'Начальный уровень',
            description: 'Испытывает трудности в общении, часто возникают недопонимания',
            examples: ['Избегает публичных выступлений', 'Сложности в письменной речи', 'Конфликты из-за неясности']
          },
          2: {
            value: 2,
            title: 'Базовый уровень',
            description: 'Общается на базовом уровне, иногда требуется дополнительное разъяснение',
            examples: ['Может объяснить простые концепции', 'Участвует в командных обсуждениях', 'Иногда нуждается в повторении']
          },
          3: {
            value: 3,
            title: 'Компетентный уровень',
            description: 'Хорошо общается в большинстве ситуаций, ясно выражает мысли',
            examples: ['Четко формулирует идеи', 'Активно участвует в собраниях', 'Умеет слушать собеседника']
          },
          4: {
            value: 4,
            title: 'Продвинутый уровень',
            description: 'Отлично общается, адаптирует стиль под аудиторию, решает конфликты',
            examples: ['Ведет переговоры', 'Эффективно презентует', 'Разрешает недопонимания']
          },
          5: {
            value: 5,
            title: 'Экспертный уровень',
            description: 'Выдающиеся коммуникативные навыки, вдохновляет и мотивирует других',
            examples: ['Публичный спикер', 'Ментор по коммуникациям', 'Создает культуру открытого общения']
          }
        },
        businessContext: 'Критически важна для всех ролей в современной организации',
        reasoning: 'Эффективная коммуникация повышает продуктивность и снижает конфликты',
        developmentSuggestions: ['Курсы публичных выступлений', 'Тренинги по активному слушанию', 'Практика презентаций']
      },

      leadership: {
        id: 'leadership',
        name: 'Лидерство',
        description: 'Способность вести за собой, мотивировать команду и принимать решения',
        category: 'leadership',
        weight: 1.5,
        values: {
          1: {
            value: 1,
            title: 'Начальный уровень',
            description: 'Предпочитает следовать указаниям, избегает ответственности за решения',
            examples: ['Ждет четких инструкций', 'Не проявляет инициативы', 'Избегает конфликтных ситуаций']
          },
          2: {
            value: 2,
            title: 'Базовый уровень',
            description: 'Может взять на себя небольшую ответственность при поддержке',
            examples: ['Ведет небольшие проекты', 'Помогает новичкам', 'Предлагает простые решения']
          },
          3: {
            value: 3,
            title: 'Компетентный уровень',
            description: 'Уверенно руководит командой, принимает обоснованные решения',
            examples: ['Координирует работу группы', 'Делегирует задачи', 'Принимает решения в стандартных ситуациях']
          },
          4: {
            value: 4,
            title: 'Продвинутый уровень',
            description: 'Эффективно ведет команду через сложные ситуации, развивает других',
            examples: ['Управляет изменениями', 'Развивает сотрудников', 'Принимает сложные решения']
          },
          5: {
            value: 5,
            title: 'Экспертный уровень',
            description: 'Вдохновляющий лидер, создает видение, трансформирует организацию',
            examples: ['Стратегическое видение', 'Вдохновляет на достижения', 'Культурная трансформация']
          }
        },
        businessContext: 'Необходима для руководителей и специалистов с лидерскими функциями',
        reasoning: 'Хорошее лидерство повышает вовлеченность и продуктивность команды',
        developmentSuggestions: ['Лидерские тренинги', 'Менторство', 'Изучение кейсов успешного лидерства']
      },

      productivity: {
        id: 'productivity',
        name: 'Продуктивность',
        description: 'Эффективность выполнения задач и достижения результатов',
        category: 'business',
        weight: 1.3,
        values: {
          1: {
            value: 1,
            title: 'Низкая продуктивность',
            description: 'Часто не укладывается в сроки, низкое качество работы',
            examples: ['Постоянные переносы дедлайнов', 'Много ошибок в работе', 'Медленное выполнение задач']
          },
          2: {
            value: 2,
            title: 'Базовая продуктивность',
            description: 'Выполняет задачи с переменным качеством, иногда нарушает сроки',
            examples: ['Иногда опаздывает с задачами', 'Требуется контроль качества', 'Работает в стандартном темпе']
          },
          3: {
            value: 3,
            title: 'Хорошая продуктивность',
            description: 'Стабильно выполняет задачи в срок с хорошим качеством',
            examples: ['Соблюдает дедлайны', 'Качественная работа', 'Эффективное планирование']
          },
          4: {
            value: 4,
            title: 'Высокая продуктивность',
            description: 'Превосходит ожидания, оптимизирует процессы, высокое качество',
            examples: ['Опережает планы', 'Улучшает процессы', 'Помогает другим повысить эффективность']
          },
          5: {
            value: 5,
            title: 'Исключительная продуктивность',
            description: 'Выдающиеся результаты, внедряет инновации, образец для подражания',
            examples: ['Революционные улучшения', 'Наставник по продуктивности', 'Создает новые стандарты']
          }
        },
        businessContext: 'Критически важна для всех ролей, влияет на достижение бизнес-целей',
        reasoning: 'Высокая продуктивность напрямую влияет на результаты компании',
        developmentSuggestions: ['Техники тайм-менеджмента', 'Инструменты повышения эффективности', 'Методы оптимизации процессов']
      },

      reliability: {
        id: 'reliability',
        name: 'Надежность',
        description: 'Постоянство в качестве работы и выполнении обязательств',
        category: 'soft',
        weight: 1.1,
        values: {
          1: {
            value: 1,
            title: 'Ненадежный',
            description: 'Часто не выполняет обещания, непостоянное качество работы',
            examples: ['Забывает о договоренностях', 'Нестабильное качество', 'Нужен постоянный контроль']
          },
          2: {
            value: 2,
            title: 'Ограниченная надежность',
            description: 'Иногда подводит, требует напоминаний и контроля',
            examples: ['Нуждается в напоминаниях', 'Переменчивое качество', 'Иногда подводит команду']
          },
          3: {
            value: 3,
            title: 'Надежный',
            description: 'Можно рассчитывать в большинстве ситуаций, стабильное качество',
            examples: ['Держит слово', 'Стабильная работа', 'На него можно положиться']
          },
          4: {
            value: 4,
            title: 'Очень надежный',
            description: 'Всегда выполняет обязательства, стабильно высокое качество',
            examples: ['Всегда держит слово', 'Высокие стандарты', 'Опора для команды']
          },
          5: {
            value: 5,
            title: 'Исключительно надежный',
            description: 'Образец надежности, на которого равняются другие',
            examples: ['Безукоризненная репутация', 'Эталон надежности', 'Кризисный управляющий']
          }
        },
        businessContext: 'Важна для всех ролей, особенно критически важных процессов',
        reasoning: 'Надежность создает доверие и стабильность в работе команды',
        developmentSuggestions: ['Управление временем', 'Организационные навыки', 'Привычки высокой надежности']
      },

      initiative: {
        id: 'initiative',
        name: 'Инициативность',
        description: 'Способность самостоятельно выявлять проблемы и предлагать решения',
        category: 'soft',
        weight: 1.2,
        values: {
          1: {
            value: 1,
            title: 'Низкая инициативность',
            description: 'Работает только по указанию, не предлагает улучшений',
            examples: ['Ждет указаний', 'Не замечает проблем', 'Избегает дополнительной ответственности']
          },
          2: {
            value: 2,
            title: 'Ограниченная инициативность',
            description: 'Иногда предлагает идеи, но нужно поощрение',
            examples: ['Редкие предложения', 'Нужна мотивация', 'Осторожен в инициативах']
          },
          3: {
            value: 3,
            title: 'Проактивный',
            description: 'Регулярно предлагает улучшения, берет на себя дополнительные задачи',
            examples: ['Предлагает решения', 'Видит возможности', 'Инициирует проекты']
          },
          4: {
            value: 4,
            title: 'Высокая инициативность',
            description: 'Постоянно ищет способы улучшения, ведет инновационные проекты',
            examples: ['Драйвер изменений', 'Инновационные решения', 'Предвосхищает потребности']
          },
          5: {
            value: 5,
            title: 'Исключительная инициативность',
            description: 'Трансформационный лидер, создает новые возможности для организации',
            examples: ['Визионер', 'Создает новые направления', 'Вдохновляет на инновации']
          }
        },
        businessContext: 'Важна для инновационных компаний и команд',
        reasoning: 'Инициативность способствует постоянному улучшению и инновациям',
        developmentSuggestions: ['Креативное мышление', 'Методы решения проблем', 'Предпринимательские навыки']
      },

      technical_expertise: {
        id: 'technical_expertise',
        name: 'Техническая экспертиза',
        description: 'Глубокие знания и навыки в технической области',
        category: 'technical',
        weight: 1.4,
        values: {
          1: {
            value: 1,
            title: 'Базовые знания',
            description: 'Имеет минимальные технические знания, нуждается в постоянной поддержке',
            examples: ['Базовые операции', 'Нужна помощь в сложных задачах', 'Изучает основы']
          },
          2: {
            value: 2,
            title: 'Функциональные знания',
            description: 'Может выполнять стандартные задачи с минимальной помощью',
            examples: ['Стандартные процедуры', 'Решение типовых проблем', 'Базовое сопровождение']
          },
          3: {
            value: 3,
            title: 'Компетентный специалист',
            description: 'Хорошо разбирается в своей области, может решать сложные задачи',
            examples: ['Сложные задачи', 'Оптимизация процессов', 'Консультации коллег']
          },
          4: {
            value: 4,
            title: 'Эксперт',
            description: 'Глубокие знания, может решать уникальные проблемы и оптимизировать системы',
            examples: ['Инновационные решения', 'Архитектурные решения', 'Менторство']
          },
          5: {
            value: 5,
            title: 'Ведущий эксперт',
            description: 'Мировой уровень экспертизы, вносит вклад в развитие отрасли',
            examples: ['Публикации', 'Конференции', 'Прорывные инновации']
          }
        },
        businessContext: 'Критически важна для технических ролей',
        reasoning: 'Техническая экспертиза обеспечивает качество и инновации',
        developmentSuggestions: ['Сертификации', 'Курсы повышения квалификации', 'Исследовательская работа']
      },

      problem_solving: {
        id: 'problem_solving',
        name: 'Решение проблем',
        description: 'Способность анализировать ситуации и находить эффективные решения',
        category: 'soft',
        weight: 1.3,
        values: {
          1: {
            value: 1,
            title: 'Базовый анализ',
            description: 'Видит простые проблемы, нуждается в помощи с решениями',
            examples: ['Замечает очевидные проблемы', 'Нужна помощь в анализе', 'Простые решения']
          },
          2: {
            value: 2,
            title: 'Систематический подход',
            description: 'Может анализировать стандартные проблемы и находить решения',
            examples: ['Структурированный анализ', 'Стандартные решения', 'Документирование проблем']
          },
          3: {
            value: 3,
            title: 'Комплексный анализ',
            description: 'Глубоко анализирует сложные ситуации, находит оптимальные решения',
            examples: ['Многофакторный анализ', 'Креативные решения', 'Предотвращение проблем']
          },
          4: {
            value: 4,
            title: 'Стратегическое мышление',
            description: 'Видит системные проблемы, разрабатывает стратегические решения',
            examples: ['Системный анализ', 'Стратегическое планирование', 'Организационные изменения']
          },
          5: {
            value: 5,
            title: 'Инновационное мышление',
            description: 'Создает прорывные решения, меняет парадигмы',
            examples: ['Прорывные инновации', 'Новые методологии', 'Трансформация процессов']
          }
        },
        businessContext: 'Важна для всех ролей, особенно в условиях изменений',
        reasoning: 'Способность решать проблемы повышает эффективность и устойчивость',
        developmentSuggestions: ['Методы анализа', 'Креативные техники', 'Системное мышление']
      },

      teamwork: {
        id: 'teamwork',
        name: 'Командная работа',
        description: 'Способность эффективно работать в команде и способствовать ее успеху',
        category: 'soft',
        weight: 1.1,
        values: {
          1: {
            value: 1,
            title: 'Индивидуалист',
            description: 'Предпочитает работать самостоятельно, испытывает трудности в команде',
            examples: ['Работает один', 'Избегает групповых задач', 'Конфликты в команде']
          },
          2: {
            value: 2,
            title: 'Участник команды',
            description: 'Участвует в командной работе, но не берет инициативу',
            examples: ['Выполняет свою часть', 'Участвует в обсуждениях', 'Поддерживает коллег']
          },
          3: {
            value: 3,
            title: 'Активный участник',
            description: 'Активно участвует в команде, способствует достижению целей',
            examples: ['Вносит идеи', 'Помогает коллегам', 'Координирует работу']
          },
          4: {
            value: 4,
            title: 'Командный лидер',
            description: 'Берет ответственность за командные результаты, мотивирует других',
            examples: ['Лидерство в проектах', 'Мотивация команды', 'Разрешение конфликтов']
          },
          5: {
            value: 5,
            title: 'Командный архитектор',
            description: 'Создает высокоэффективные команды, развивает командную культуру',
            examples: ['Строительство команд', 'Культурные изменения', 'Командное развитие']
          }
        },
        businessContext: 'Критически важна для всех организаций',
        reasoning: 'Командная работа повышает эффективность и инновационность',
        developmentSuggestions: ['Командные тренинги', 'Развитие эмоционального интеллекта', 'Лидерские навыки']
      },

      adaptability: {
        id: 'adaptability',
        name: 'Адаптивность',
        description: 'Способность эффективно адаптироваться к изменениям и новым условиям',
        category: 'soft',
        weight: 1.2,
        values: {
          1: {
            value: 1,
            title: 'Сопротивление изменениям',
            description: 'Испытывает трудности с изменениями, предпочитает стабильность',
            examples: ['Сопротивление новому', 'Стресс от изменений', 'Задержки в адаптации']
          },
          2: {
            value: 2,
            title: 'Минимальная адаптация',
            description: 'Адаптируется к простым изменениям со временем',
            examples: ['Привыкает к новому', 'Нужна поддержка', 'Базовая гибкость']
          },
          3: {
            value: 3,
            title: 'Хорошая адаптивность',
            description: 'Быстро адаптируется к изменениям, поддерживает эффективность',
            examples: ['Быстрая адаптация', 'Поддержка изменений', 'Гибкость в работе']
          },
          4: {
            value: 4,
            title: 'Высокая адаптивность',
            description: 'Активно участвует в изменениях, помогает другим адаптироваться',
            examples: ['Драйвер изменений', 'Помощь коллегам', 'Инновационные подходы']
          },
          5: {
            value: 5,
            title: 'Трансформационный лидер',
            description: 'Создает культуру адаптивности, ведет через радикальные изменения',
            examples: ['Культурные трансформации', 'Управление изменениями', 'Визионерское лидерство']
          }
        },
        businessContext: 'Критически важна в быстро меняющейся бизнес-среде',
        reasoning: 'Адаптивность обеспечивает устойчивость и конкурентоспособность',
        developmentSuggestions: ['Управление изменениями', 'Гибкое мышление', 'Стресс-менеджмент']
      },

      emotional_intelligence: {
        id: 'emotional_intelligence',
        name: 'Эмоциональный интеллект',
        description: 'Способность понимать и управлять эмоциями своими и окружающих',
        category: 'soft',
        weight: 1.1,
        values: {
          1: {
            value: 1,
            title: 'Низкий ЭИ',
            description: 'Испытывает трудности с пониманием эмоций, часто вызывает конфликты',
            examples: ['Не понимает чувства других', 'Импульсивные реакции', 'Конфликты в общении']
          },
          2: {
            value: 2,
            title: 'Базовый ЭИ',
            description: 'Базовое понимание эмоций, иногда принимает неоптимальные решения',
            examples: ['Понимает базовые эмоции', 'Умеет слушать', 'Нуждается в развитии']
          },
          3: {
            value: 3,
            title: 'Развитый ЭИ',
            description: 'Хорошо понимает эмоции, эффективно управляет отношениями',
            examples: ['Эмпатичное общение', 'Управление эмоциями', 'Конструктивные решения']
          },
          4: {
            value: 4,
            title: 'Высокий ЭИ',
            description: 'Отлично понимает эмоциональную динамику, вдохновляет и мотивирует',
            examples: ['Вдохновляющее лидерство', 'Эмоциональная поддержка', 'Развитие других']
          },
          5: {
            value: 5,
            title: 'Мастер ЭИ',
            description: 'Создает эмоционально здоровую среду, трансформирует культуру',
            examples: ['Эмоциональная трансформация', 'Культурное лидерство', 'Менторство по ЭИ']
          }
        },
        businessContext: 'Критически важен для лидеров и работы с людьми',
        reasoning: 'Эмоциональный интеллект повышает эффективность команд и удовлетворенность',
        developmentSuggestions: ['Тренинги по эмоциональному интеллекту', 'Коучинг', 'Самоанализ']
      }
    };

    return definitions[competencyId] || definitions.communication;
  }

  // Предзагрузка данных
  async preloadData(context: CompanyContext): Promise<void> {
    this.setCompanyContext(context);

    // Предзагружаем основные компетенции
    await this.getAllCompetencyDefinitions();
  }

  // Проверка здоровья сервиса
  async getHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; lastCheck: number; details?: any }> {
    try {
      // Проверяем кеш
      const cacheStats = this.getCacheStats();

      return {
        status: 'healthy',
        lastCheck: Date.now(),
        details: {
          cacheSize: cacheStats.size,
          cacheKeys: cacheStats.keys
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        details: { error: error.message }
      };
    }
  }
}

// Создаем и экспортируем экземпляр сервиса
const competenciesService = new CompetenciesService();

export default competenciesService;
