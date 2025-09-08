export interface CompetencyValue {
  value: number;
  title: string;
  description: string;
  examples?: string[];
}

export interface CompetencyDefinition {
  id: string;
  name: string;
  description: string;
  values: Record<number, CompetencyValue>;
  category: 'technical' | 'soft' | 'leadership' | 'business';
  weight?: number; // Вес компетенции в общей оценке
}

// Динамическая генерация описаний компетенций
import CompetenciesService, { CompetencyId, GeneratedCompetencyDefinition } from '@/services/competenciesService';

// Кеш для сгенерированных компетенций
let competenciesCache: Record<string, CompetencyDefinition> | null = null;
let competenciesService: CompetenciesService | null = null;

// Функция для получения описания компетенции
export async function getCompetencyDefinition(competencyId: string): Promise<CompetencyDefinition> {
  if (!competenciesService) {
    competenciesService = new CompetenciesService();
  }

  const generated = await competenciesService.getCompetencyDefinition(competencyId as CompetencyId);
  return convertToCompetencyDefinition(generated);
}

// Функция для получения всех компетенций
export async function getAllCompetencyDefinitions(): Promise<Record<string, CompetencyDefinition>> {
  if (!competenciesService) {
    competenciesService = new CompetenciesService();
  }

  if (!competenciesCache) {
    const generated = await competenciesService.getAllCompetencyDefinitions();
    competenciesCache = {};

    Object.entries(generated).forEach(([id, generatedDef]) => {
      competenciesCache![id] = convertToCompetencyDefinition(generatedDef);
    });
  }

  return competenciesCache;
}

// Конвертация сгенерированного определения в стандартный формат
function convertToCompetencyDefinition(generated: GeneratedCompetencyDefinition): CompetencyDefinition {
  return {
    id: generated.id,
    name: generated.name,
    description: generated.description,
    category: generated.category,
    weight: generated.weight,
    values: generated.values
  };
}

export interface EmployeeCompetency {
  competencyId: string;
  employeeId: string;
  currentValue: number;
  targetValue?: number;
  assessedBy: string;
  assessedAt: Date;
  notes?: string;
  evidences?: string[]; // Примеры/доказательства
}

export interface CompetencyReport {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  overallScore: number;
  competencies: EmployeeCompetency[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  assessmentDate: Date;
}

// Стандартные компетенции системы
export const STANDARD_COMPETENCIES: Record<string, CompetencyDefinition> = {
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
    }
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
    }
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
    }
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
    }
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
    }
  }
};
