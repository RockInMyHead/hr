import { API_CONFIG } from '../config/api';
import type { CompetencyDefinition, CompetencyValue } from '../types/competencies';

export type CompetencyId = 'communication' | 'leadership' | 'productivity' | 'reliability' | 'initiative' | 'problem-solving' | 'teamwork' | 'adaptability' | 'innovation' | 'customer-focus';

export const COMPETENCY_IDS: CompetencyId[] = [
  'communication', 'leadership', 'productivity', 'reliability', 'initiative',
  'problem-solving', 'teamwork', 'adaptability', 'innovation', 'customer-focus'
];

export interface GeneratedCompetencyLevel {
  value: number;
  title: string;
  description: string;
  examples: string[];
}

export interface GeneratedCompetencyDefinition {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'soft' | 'leadership' | 'business';
  weight: number;
  values: Record<number, GeneratedCompetencyLevel>;
}

class CompetenciesService {
  private cache: Map<CompetencyId, GeneratedCompetencyDefinition> = new Map();
  private isGenerating: Set<CompetencyId> = new Set();

  // Получить описание компетенции
  async getCompetencyDefinition(competencyId: CompetencyId): Promise<GeneratedCompetencyDefinition> {
    // Проверяем кеш
    if (this.cache.has(competencyId)) {
      return this.cache.get(competencyId)!;
    }

    // Проверяем, не генерируется ли уже
    if (this.isGenerating.has(competencyId)) {
      // Ждем завершения генерации
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache.has(competencyId)) {
            resolve(this.cache.get(competencyId)!);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.isGenerating.add(competencyId);

    try {
      const definition = await this.generateCompetencyDefinition(competencyId);
      this.cache.set(competencyId, definition);
      return definition;
    } finally {
      this.isGenerating.delete(competencyId);
    }
  }

  // Генерировать определение компетенции через OpenAI
  private async generateCompetencyDefinition(competencyId: CompetencyId): Promise<GeneratedCompetencyDefinition> {
    try {
      const competencyNames: Record<CompetencyId, string> = {
        'communication': 'Коммуникация',
        'leadership': 'Лидерство',
        'productivity': 'Продуктивность',
        'reliability': 'Надежность',
        'initiative': 'Инициативность',
        'problem-solving': 'Решение проблем',
        'teamwork': 'Командная работа',
        'adaptability': 'Адаптивность',
        'innovation': 'Инновационность',
        'customer-focus': 'Ориентация на клиента'
      };

      const competencyName = competencyNames[competencyId];

      const prompt = `Создай подробное определение компетенции "${competencyName}" для системы оценки персонала.

Требуемый формат ответа (ТОЛЬКО JSON, без дополнительного текста):

{
  "id": "${competencyId}",
  "name": "${competencyName}",
  "description": "Краткое описание компетенции (1-2 предложения)",
  "category": "technical|soft|leadership|business",
  "weight": 1.2,
  "values": {
    "1": {
      "value": 1,
      "title": "Название уровня 1",
      "description": "Подробное описание уровня 1 (2-3 предложения)",
      "examples": ["Пример поведения 1", "Пример поведения 2", "Пример поведения 3"]
    },
    "2": {
      "value": 2,
      "title": "Название уровня 2",
      "description": "Подробное описание уровня 2 (2-3 предложения)",
      "examples": ["Пример поведения 1", "Пример поведения 2", "Пример поведения 3"]
    },
    "3": {
      "value": 3,
      "title": "Название уровня 3",
      "description": "Подробное описание уровня 3 (2-3 предложения)",
      "examples": ["Пример поведения 1", "Пример поведения 2", "Пример поведения 3"]
    },
    "4": {
      "value": 4,
      "title": "Название уровня 4",
      "description": "Подробное описание уровня 4 (2-3 предложения)",
      "examples": ["Пример поведения 1", "Пример поведения 2", "Пример поведения 3"]
    },
    "5": {
      "value": 5,
      "title": "Название уровня 5",
      "description": "Подробное описание уровня 5 (2-3 предложения)",
      "examples": ["Пример поведения 1", "Пример поведения 2", "Пример поведения 3"]
    }
  }
}

Уровни должны быть прогрессивными:
- Уровень 1: Начальный/базовый
- Уровень 2: Ниже среднего  
- Уровень 3: Средний/компетентный
- Уровень 4: Выше среднего/продвинутый
- Уровень 5: Экспертный/исключительный

Каждый уровень должен иметь:
- Четкое название
- Подробное описание проявлений
- 3 конкретных примера поведения

Категория должна быть одной из: technical, soft, leadership, business
Вес должен быть от 1.0 до 1.5`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const definition: GeneratedCompetencyDefinition = JSON.parse(response);

      return definition;
    } catch (error) {
      console.error(`Error generating competency definition for ${competencyId}:`, error);

      // Fallback определение
      return this.getFallbackDefinition(competencyId);
    }
  }

  // Получить все компетенции
  async getAllCompetencyDefinitions(): Promise<Record<CompetencyId, GeneratedCompetencyDefinition>> {
    const allDefinitions: Partial<Record<CompetencyId, GeneratedCompetencyDefinition>> = {};

    // Генерируем все компетенции параллельно
    const promises = COMPETENCY_IDS.map(async (competencyId) => {
      const definition = await this.getCompetencyDefinition(competencyId);
      return { competencyId, definition };
    });

    const results = await Promise.all(promises);

    results.forEach(({ competencyId, definition }) => {
      allDefinitions[competencyId] = definition;
    });

    return allDefinitions as Record<CompetencyId, GeneratedCompetencyDefinition>;
  }

  // Очистить кеш
  clearCache(): void {
    this.cache.clear();
    this.isGenerating.clear();
  }

  // Получить кешированные компетенции
  getCachedDefinitions(): Record<CompetencyId, GeneratedCompetencyDefinition> {
    const cached: Partial<Record<CompetencyId, GeneratedCompetencyDefinition>> = {};
    this.cache.forEach((definition, competencyId) => {
      cached[competencyId] = definition;
    });
    return cached as Record<CompetencyId, GeneratedCompetencyDefinition>;
  }

  // Fallback определения для случаев, когда API недоступен
  private getFallbackDefinition(competencyId: CompetencyId): GeneratedCompetencyDefinition {
    const fallbacks: Record<CompetencyId, GeneratedCompetencyDefinition> = {
      'communication': {
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
        }
      },
      'leadership': {
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
        }
      },
      'productivity': {
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
        }
      },
      'reliability': {
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
        }
      },
      'initiative': {
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
        }
      },
      'problem-solving': {
        id: 'problem-solving',
        name: 'Решение проблем',
        description: 'Способность анализировать проблемы и находить эффективные решения',
        category: 'technical',
        weight: 1.4,
        values: {
          1: {
            value: 1,
            title: 'Базовый уровень',
            description: 'Требует помощи в решении большинства проблем',
            examples: ['Затрудняется с анализом', 'Нуждается в готовых решениях', 'Избегает сложных задач']
          },
          2: {
            value: 2,
            title: 'Развивающийся уровень',
            description: 'Может решать простые проблемы с поддержкой',
            examples: ['Решает стандартные задачи', 'Нужна помощь в сложных случаях', 'Следует шаблонам']
          },
          3: {
            value: 3,
            title: 'Компетентный уровень',
            description: 'Самостоятельно решает большинство проблем',
            examples: ['Анализирует ситуации', 'Предлагает решения', 'Применяет системный подход']
          },
          4: {
            value: 4,
            title: 'Продвинутый уровень',
            description: 'Эффективно решает сложные проблемы, оптимизирует решения',
            examples: ['Разрабатывает инновационные подходы', 'Оптимизирует процессы', 'Предупреждает проблемы']
          },
          5: {
            value: 5,
            title: 'Экспертный уровень',
            description: 'Мастер решения проблем, создает новые методологии',
            examples: ['Создает новые подходы', 'Ментор по решению проблем', 'Трансформирует систему']
          }
        }
      },
      'teamwork': {
        id: 'teamwork',
        name: 'Командная работа',
        description: 'Способность эффективно работать в команде и способствовать ее успеху',
        category: 'soft',
        weight: 1.1,
        values: {
          1: {
            value: 1,
            title: 'Индивидуалист',
            description: 'Предпочитает работать самостоятельно, избегает групповой работы',
            examples: ['Работает в одиночку', 'Не участвует в командных активностях', 'Конфликтует с командой']
          },
          2: {
            value: 2,
            title: 'Наблюдатель',
            description: 'Участвует в командной работе, но не проявляет инициативы',
            examples: ['Выполняет свою часть работы', 'Не предлагает идеи', 'Пассивен в обсуждениях']
          },
          3: {
            value: 3,
            title: 'Участник',
            description: 'Активно участвует в командной работе, выполняет свою роль',
            examples: ['Вносит вклад в общую работу', 'Поддерживает коллег', 'Участвует в обсуждениях']
          },
          4: {
            value: 4,
            title: 'Лидер команды',
            description: 'Берет инициативу в командной работе, мотивирует других',
            examples: ['Организует командную работу', 'Мотивирует коллег', 'Разрешает конфликты']
          },
          5: {
            value: 5,
            title: 'Командный вдохновитель',
            description: 'Создает сильную командную культуру, вдохновляет на достижения',
            examples: ['Создает атмосферу доверия', 'Вдохновляет на высокие результаты', 'Развивает командный дух']
          }
        }
      },
      'adaptability': {
        id: 'adaptability',
        name: 'Адаптивность',
        description: 'Способность быстро адаптироваться к изменениям и новым условиям',
        category: 'soft',
        weight: 1.2,
        values: {
          1: {
            value: 1,
            title: 'Сопротивление изменениям',
            description: 'С трудом адаптируется к изменениям, предпочитает стабильность',
            examples: ['Сопротивляется новым процессам', 'Трудно перестраивается', 'Предпочитает привычное']
          },
          2: {
            value: 2,
            title: 'Ограниченная адаптивность',
            description: 'Может адаптироваться к небольшим изменениям с трудом',
            examples: ['Нужна помощь в адаптации', 'Долго привыкает к новому', 'Сопротивляется изменениям']
          },
          3: {
            value: 3,
            title: 'Гибкий',
            description: 'Хорошо адаптируется к изменениям в рабочей среде',
            examples: ['Быстро привыкает к новым задачам', 'Адаптирует подходы', 'Поддерживает изменения']
          },
          4: {
            value: 4,
            title: 'Высокая адаптивность',
            description: 'Легко адаптируется к любым изменениям, помогает другим',
            examples: ['Предвосхищает изменения', 'Помогает коллегам адаптироваться', 'Видит возможности в изменениях']
          },
          5: {
            value: 5,
            title: 'Мастер адаптации',
            description: 'Создает культуру адаптивности, ведет через трансформации',
            examples: ['Внедряет изменения', 'Создает гибкую культуру', 'Вдохновляет на адаптацию']
          }
        }
      },
      'innovation': {
        id: 'innovation',
        name: 'Инновационность',
        description: 'Способность генерировать новые идеи и внедрять инновации',
        category: 'business',
        weight: 1.3,
        values: {
          1: {
            value: 1,
            title: 'Консервативный',
            description: 'Предпочитает проверенные методы, избегает рисков',
            examples: ['Следует устоявшимся практикам', 'Не предлагает новые идеи', 'Избегает экспериментов']
          },
          2: {
            value: 2,
            title: 'Ограниченная инновационность',
            description: 'Иногда предлагает идеи, но редко внедряет их',
            examples: ['Идеи остаются на уровне предложений', 'Нужна мотивация для инноваций', 'Осторожен в экспериментах']
          },
          3: {
            value: 3,
            title: 'Инновационный',
            description: 'Регулярно предлагает и внедряет улучшения',
            examples: ['Предлагает улучшения процессов', 'Внедряет новые подходы', 'Поддерживает инновационную культуру']
          },
          4: {
            value: 4,
            title: 'Высокая инновационность',
            description: 'Создает инновационные решения, ведет проекты изменений',
            examples: ['Разрабатывает новые продукты/услуги', 'Внедряет прорывные идеи', 'Вдохновляет на инновации']
          },
          5: {
            value: 5,
            title: 'Инновационный лидер',
            description: 'Создает культуру инноваций, трансформирует организацию',
            examples: ['Создает инновационную стратегию', 'Внедряет культурные изменения', 'Визионер в своей области']
          }
        }
      },
      'customer-focus': {
        id: 'customer-focus',
        name: 'Ориентация на клиента',
        description: 'Способность понимать и удовлетворять потребности клиентов',
        category: 'business',
        weight: 1.4,
        values: {
          1: {
            value: 1,
            title: 'Низкая ориентация',
            description: 'Фокусируется на внутренних процессах, игнорирует клиентов',
            examples: ['Не учитывает потребности клиентов', 'Фокус на внутренних задачах', 'Игнорирует обратную связь']
          },
          2: {
            value: 2,
            title: 'Базовая ориентация',
            description: 'Выполняет требования клиентов, но не предвосхищает потребности',
            examples: ['Реагирует на запросы', 'Выполняет минимальные требования', 'Не инициирует улучшения']
          },
          3: {
            value: 3,
            title: 'Клиент-ориентированный',
            description: 'Активно работает над удовлетворением потребностей клиентов',
            examples: ['Предвосхищает потребности', 'Собирает обратную связь', 'Предлагает улучшения']
          },
          4: {
            value: 4,
            title: 'Высокая ориентация',
            description: 'Создает исключительный клиентский опыт, влияет на лояльность',
            examples: ['Создает wow-эффект', 'Персонализированный подход', 'Влияет на retention клиентов']
          },
          5: {
            value: 5,
            title: 'Клиентский чемпион',
            description: 'Создает культуру клиент-центричности, трансформирует подход к клиентам',
            examples: ['Создает клиентскую стратегию', 'Внедряет культурные изменения', 'Эталон клиентского сервиса']
          }
        }
      }
    };

    return fallbacks[competencyId] || {
      id: competencyId,
      name: competencyId,
      description: `Компетенция ${competencyId}`,
      category: 'soft',
      weight: 1.0,
      values: {
        1: {
          value: 1,
          title: 'Начальный уровень',
          description: 'Требует развития',
          examples: ['Нуждается в поддержке', 'Учится основам', 'Требует guidance']
        },
        2: {
          value: 2,
          title: 'Базовый уровень',
          description: 'Базовые знания и навыки',
          examples: ['Выполняет стандартные задачи', 'Нуждается в контроле', 'Развивается']
        },
        3: {
          value: 3,
          title: 'Средний уровень',
          description: 'Уверенное выполнение задач',
          examples: ['Самостоятельная работа', 'Хорошее качество', 'Активное развитие']
        },
        4: {
          value: 4,
          title: 'Продвинутый уровень',
          description: 'Высокие результаты и развитие других',
          examples: ['Внедряет улучшения', 'Менторство', 'Высокая эффективность']
        },
        5: {
          value: 5,
          title: 'Экспертный уровень',
          description: 'Лидер в своей области',
          examples: ['Инновации', 'Стратегическое мышление', 'Влияние на организацию']
        }
      }
    };
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
        max_tokens: 2000,
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

export default CompetenciesService;

