import { API_CONFIG } from '../config/api';

// Интерфейс для описания типа MBTI
export interface MBTITypeDescription {
  name: string;
  description: string;
  strengths: string[];
  challenges: string[];
  workStyle: string;
  managementTips: string[];
  careerSuggestions?: string[];
  relationships?: string;
  growthAreas?: string[];
}

// Все 16 типов MBTI
export const MBTI_TYPE_CODES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
] as const;

export type MBTITypeCode = typeof MBTI_TYPE_CODES[number];

class MBTITypesService {
  private cache: Map<MBTITypeCode, MBTITypeDescription> = new Map();
  private isGenerating: Set<MBTITypeCode> = new Set();

  // Получить описание типа MBTI
  async getMBTITypeDescription(typeCode: MBTITypeCode): Promise<MBTITypeDescription> {
    // Проверяем кеш
    if (this.cache.has(typeCode)) {
      return this.cache.get(typeCode)!;
    }

    // Проверяем, не генерируется ли уже
    if (this.isGenerating.has(typeCode)) {
      // Ждем завершения генерации
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache.has(typeCode)) {
            resolve(this.cache.get(typeCode)!);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.isGenerating.add(typeCode);

    try {
      const description = await this.generateMBTITypeDescription(typeCode);
      this.cache.set(typeCode, description);
      return description;
    } finally {
      this.isGenerating.delete(typeCode);
    }
  }

  // Генерировать описание типа через OpenAI
  private async generateMBTITypeDescription(typeCode: MBTITypeCode): Promise<MBTITypeDescription> {
    try {
      const prompt = `Создай подробное описание типа личности MBTI ${typeCode}.

Требуемый формат ответа (ТОЛЬКО JSON, без дополнительного текста):

{
  "name": "Название типа на русском",
  "description": "Краткое описание типа (2-3 предложения)",
  "strengths": ["Сильная сторона 1", "Сильная сторона 2", "Сильная сторона 3", "Сильная сторона 4"],
  "challenges": ["Слабая сторона 1", "Слабая сторона 2", "Слабая сторона 3"],
  "workStyle": "Описание рабочего стиля (1 предложение)",
  "managementTips": ["Совет по управлению 1", "Совет по управлению 2", "Совет по управлению 3"],
  "careerSuggestions": ["Карьерная рекомендация 1", "Карьерная рекомендация 2", "Карьерная рекомендация 3"],
  "relationships": "Описание в отношениях (1 предложение)",
  "growthAreas": ["Область развития 1", "Область развития 2", "Область развития 3"]
}

Учитывай особенности каждого измерения MBTI для типа ${typeCode}:
- I/E: Интроверсия/Экстраверсия
- S/N: Сенсорика/Интуиция  
- T/F: Мышление/Чувства
- J/P: Суждение/Восприятие

Сделай описание точным, полезным и основанным на проверенных характеристиках MBTI.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const description: MBTITypeDescription = JSON.parse(response);

      return description;
    } catch (error) {
      console.error(`Error generating MBTI description for ${typeCode}:`, error);

      // Fallback описание
      return this.getFallbackDescription(typeCode);
    }
  }

  // Fallback описания для случаев, когда API недоступен
  private getFallbackDescription(typeCode: MBTITypeCode): MBTITypeDescription {
    const fallbacks: Record<MBTITypeCode, MBTITypeDescription> = {
      'INTJ': {
        name: 'Архитектор',
        description: 'Стратегический мыслитель с планом на все случаи жизни',
        strengths: ['Стратегическое мышление', 'Независимость', 'Решительность', 'Настойчивость'],
        challenges: ['Излишний перфекционизм', 'Нетерпимость к неэффективности', 'Трудности в команде'],
        workStyle: 'Предпочитает работать самостоятельно над долгосрочными проектами',
        managementTips: ['Дайте автономию', 'Сосредоточьтесь на целях', 'Избегайте микроменеджмента'],
        careerSuggestions: ['Стратег', 'Архитектор систем', 'Аналитик', 'Планировщик'],
        relationships: 'Ценит глубокие интеллектуальные связи',
        growthAreas: ['Эмоциональная открытость', 'Работа в команде', 'Гибкость']
      },
      'ENFP': {
        name: 'Активист',
        description: 'Энтузиаст, творческий и общительный свободный дух',
        strengths: ['Креативность', 'Энтузиазм', 'Коммуникабельность', 'Гибкость'],
        challenges: ['Трудности с рутиной', 'Проблемы с концентрацией', 'Избегание конфликтов'],
        workStyle: 'Нуждается в разнообразии и творческих задачах',
        managementTips: ['Обеспечьте разнообразие', 'Поощряйте инновации', 'Дайте обратную связь'],
        careerSuggestions: ['Маркетолог', 'Тренер', 'Журналист', 'Консультант'],
        relationships: 'Искренний и поддерживающий партнер',
        growthAreas: ['Организованность', 'Детализация', 'Дисциплина']
      },
      // Добавляем базовые описания для остальных типов
      'INTP': {
        name: 'Логик',
        description: 'Инновационный изобретатель с безграничным любопытством',
        strengths: ['Аналитическое мышление', 'Креативность', 'Объективность', 'Независимость'],
        challenges: ['Отстраненность', 'Прокрастинация', 'Игнорирование деталей'],
        workStyle: 'Работает над сложными теоретическими проблемами',
        managementTips: ['Дайте свободу', 'Уважайте независимость', 'Обеспечьте ресурсы'],
        careerSuggestions: ['Программист', 'Исследователь', 'Аналитик', 'Изобретатель'],
        relationships: 'Интеллектуальный и вдумчивый партнер',
        growthAreas: ['Практичность', 'Социальные навыки', 'Реализация идей']
      },
      'ENTJ': {
        name: 'Командир',
        description: 'Харизматичный и уверенный лидер с стратегическим мышлением',
        strengths: ['Лидерство', 'Стратегическое планирование', 'Решительность', 'Эффективность'],
        challenges: ['Авторитарность', 'Нетерпимость к слабостям', 'Игнорирование чувств'],
        workStyle: 'Лидер крупных проектов и команд',
        managementTips: ['Дайте власть', 'Поддержите цели', 'Будьте прямолинейны'],
        careerSuggestions: ['CEO', 'Менеджер', 'Консультант', 'Предприниматель'],
        relationships: 'Сильный и поддерживающий партнер',
        growthAreas: ['Эмпатия', 'Гибкость', 'Работа с эмоциями']
      },
      'ENTP': {
        name: 'Полемист',
        description: 'Умный и любознательный мыслитель, всегда готовый к дебатам',
        strengths: ['Креативность', 'Адаптивность', 'Коммуникабельность', 'Стратегическое мышление'],
        challenges: ['Импульсивность', 'Недисциплинированность', 'Игнорирование рутины'],
        workStyle: 'Работает над инновационными проектами',
        managementTips: ['Дайте свободу', 'Поощряйте идеи', 'Обеспечьте разнообразие'],
        careerSuggestions: ['Предприниматель', 'Консультант', 'Маркетолог', 'Изобретатель'],
        relationships: 'Интересный и энергичный партнер',
        growthAreas: ['Дисциплина', 'Завершение проектов', 'Практичность']
      },
      'INFJ': {
        name: 'Адвокат',
        description: 'Творческий идейный вдохновитель, всегда готовый помочь',
        strengths: ['Эмпатия', 'Интуиция', 'Креативность', 'Преданность'],
        challenges: ['Переутомление', 'Идеализм', 'Трудности с критикой'],
        workStyle: 'Работает над значимыми проектами, помогающими людям',
        managementTips: ['Поддержите миссию', 'Уважайте ценности', 'Дайте автономию'],
        careerSuggestions: ['Психолог', 'Преподаватель', 'Писатель', 'Консультант'],
        relationships: 'Глубокий и заботливый партнер',
        growthAreas: ['Самозащита', 'Реализм', 'Границы']
      },
      'INFP': {
        name: 'Посредник',
        description: 'Поэтичный, добрый и альтруистичный свободный дух',
        strengths: ['Эмпатия', 'Креативность', 'Идеализм', 'Гибкость'],
        challenges: ['Неорганизованность', 'Чувствительность', 'Прокрастинация'],
        workStyle: 'Работает над творческими и значимыми проектами',
        managementTips: ['Поддержите ценности', 'Дайте гибкость', 'Поощряйте креативность'],
        careerSuggestions: ['Писатель', 'Психолог', 'Дизайнер', 'Учитель'],
        relationships: 'Нежный и понимающий партнер',
        growthAreas: ['Организация', 'Ассертивность', 'Практичность']
      },
      'ENFJ': {
        name: 'Протagonist',
        description: 'Харизматичный вдохновитель, всегда готовый помочь другим',
        strengths: ['Лидерство', 'Эмпатия', 'Коммуникабельность', 'Организация'],
        challenges: ['Переутомление', 'Игнорирование собственных нужд', 'Сверхответственность'],
        workStyle: 'Лидер команд, ориентированных на людей',
        managementTips: ['Поддержите миссию', 'Уважайте усилия', 'Дайте признание'],
        careerSuggestions: ['Учитель', 'HR менеджер', 'Консультант', 'Тренер'],
        relationships: 'Поддерживающий и заботливый партнер',
        growthAreas: ['Самозащита', 'Границы', 'Делегирование']
      },
      'ISTJ': {
        name: 'Логист',
        description: 'Практичный и фактологичный надежный труженик',
        strengths: ['Надежность', 'Практичность', 'Организованность', 'Внимание к деталям'],
        challenges: ['Жесткость', 'Сопротивление изменениям', 'Игнорирование эмоций'],
        workStyle: 'Работает над стабильными и предсказуемыми задачами',
        managementTips: ['Дайте структуру', 'Уважайте традиции', 'Обеспечьте стабильность'],
        careerSuggestions: ['Бухгалтер', 'Аудитор', 'Администратор', 'Инженер'],
        relationships: 'Надежный и стабильный партнер',
        growthAreas: ['Гибкость', 'Эмоциональная открытость', 'Адаптивность']
      },
      'ISFJ': {
        name: 'Защитник',
        description: 'Очень заботливый и гиперответственный защитник традиций',
        strengths: ['Заботливость', 'Надежность', 'Практичность', 'Внимательность'],
        challenges: ['Переутомление', 'Страх конфликтов', 'Игнорирование собственных нужд'],
        workStyle: 'Работает над задачами, помогающими людям',
        managementTips: ['Выразите благодарность', 'Дайте стабильность', 'Поддержите усилия'],
        careerSuggestions: ['Медсестра', 'Учитель', 'Секретарь', 'Социальный работник'],
        relationships: 'Заботливый и поддерживающий партнер',
        growthAreas: ['Ассертивность', 'Самозащита', 'Независимость']
      },
      'ESTJ': {
        name: 'Администратор',
        description: 'Отличный администратор, неутомимый труженик',
        strengths: ['Организация', 'Лидерство', 'Практичность', 'Надежность'],
        challenges: ['Авторитарность', 'Нетерпимость к отклонениям', 'Игнорирование чувств'],
        workStyle: 'Лидер структурированных команд и проектов',
        managementTips: ['Дайте власть', 'Поддержите правила', 'Будьте последовательны'],
        careerSuggestions: ['Менеджер', 'Администратор', 'Военный', 'Судья'],
        relationships: 'Надежный и структурированный партнер',
        growthAreas: ['Эмпатия', 'Гибкость', 'Работа с эмоциями']
      },
      'ESFJ': {
        name: 'Консул',
        description: 'Чрезвычайно заботливый, социальный и популярный человек',
        strengths: ['Заботливость', 'Социальность', 'Организация', 'Практичность'],
        challenges: ['Переутомление', 'Страх критики', 'Игнорирование собственных нужд'],
        workStyle: 'Работает в командах, помогая людям',
        managementTips: ['Выразите благодарность', 'Поддержите социальные аспекты', 'Будьте внимательны'],
        careerSuggestions: ['Учитель', 'HR менеджер', 'Медсестра', 'Социальный работник'],
        relationships: 'Заботливый и общительный партнер',
        growthAreas: ['Самостоятельность', 'Ассертивность', 'Границы']
      },
      'ISTP': {
        name: 'Виртуоз',
        description: 'Экспериментатор и мастер на все руки',
        strengths: ['Практичность', 'Адаптивность', 'Независимость', 'Технические навыки'],
        challenges: ['Импульсивность', 'Игнорирование планов', 'Трудности с выражением чувств'],
        workStyle: 'Работает над техническими задачами и ремонтом',
        managementTips: ['Дайте свободу', 'Уважайте независимость', 'Обеспечьте ресурсы'],
        careerSuggestions: ['Механик', 'Программист', 'Пилот', 'Хирург'],
        relationships: 'Надежный и практичный партнер',
        growthAreas: ['Планирование', 'Выражение эмоций', 'Социальные навыки']
      },
      'ISFP': {
        name: 'Артист',
        description: 'Гибкий и очаровательный артист, готовый исследовать',
        strengths: ['Креативность', 'Гибкость', 'Заботливость', 'Эстетическое чувство'],
        challenges: ['Импульсивность', 'Избегание конфликтов', 'Трудности с планированием'],
        workStyle: 'Работает над творческими и практическими задачами',
        managementTips: ['Дайте гибкость', 'Поддержите креативность', 'Уважайте индивидуальность'],
        careerSuggestions: ['Художник', 'Дизайнер', 'Музыкант', 'Ветеринар'],
        relationships: 'Нежный и заботливый партнер',
        growthAreas: ['Организация', 'Ассертивность', 'Долгосрочное планирование']
      },
      'ESTP': {
        name: 'Делец',
        description: 'Умный, энергичный и восприимчивый человек действия',
        strengths: ['Энергичность', 'Практичность', 'Адаптивность', 'Социальность'],
        challenges: ['Импульсивность', 'Нетерпение', 'Игнорирование планов'],
        workStyle: 'Работает над динамичными и практическими задачами',
        managementTips: ['Дайте свободу действий', 'Поддержите активность', 'Будьте гибки'],
        careerSuggestions: ['Продавец', 'Спортсмен', 'Предприниматель', 'Пожарный'],
        relationships: 'Энергичный и веселый партнер',
        growthAreas: ['Терпение', 'Планирование', 'Работа с деталями']
      },
      'ESFP': {
        name: 'Развлекатель',
        description: 'Самый общительный, спонтанный и принимающий энтузиаст',
        strengths: ['Общительность', 'Энергичность', 'Практичность', 'Заботливость'],
        challenges: ['Импульсивность', 'Избегание конфликтов', 'Трудности с планированием'],
        workStyle: 'Работает в социальных и динамичных средах',
        managementTips: ['Поддержите социальные аспекты', 'Дайте гибкость', 'Выразите благодарность'],
        careerSuggestions: ['Актер', 'Туристический гид', 'Продавец', 'Учитель'],
        relationships: 'Веселый и заботливый партнер',
        growthAreas: ['Организация', 'Долгосрочное планирование', 'Ассертивность']
      }
    };

    return fallbacks[typeCode] || {
      name: typeCode,
      description: `Тип личности ${typeCode} - уникальная комбинация характеристик`,
      strengths: ['Уникальность', 'Индивидуальность', 'Самобытность'],
      challenges: ['Адаптация', 'Понимание другими'],
      workStyle: 'Работает над индивидуальными задачами',
      managementTips: ['Уважайте индивидуальность', 'Дайте свободу', 'Поддержите развитие'],
      careerSuggestions: ['Индивидуальные проекты', 'Творческая работа'],
      relationships: 'Уникальный подход к отношениям',
      growthAreas: ['Адаптация', 'Коммуникация']
    };
  }

  // Получить все типы MBTI
  async getAllMBTITypes(): Promise<Record<MBTITypeCode, MBTITypeDescription>> {
    const allTypes: Partial<Record<MBTITypeCode, MBTITypeDescription>> = {};

    // Генерируем все типы параллельно
    const promises = MBTI_TYPE_CODES.map(async (typeCode) => {
      const description = await this.getMBTITypeDescription(typeCode);
      return { typeCode, description };
    });

    const results = await Promise.all(promises);

    results.forEach(({ typeCode, description }) => {
      allTypes[typeCode] = description;
    });

    return allTypes as Record<MBTITypeCode, MBTITypeDescription>;
  }

  // Очистить кеш
  clearCache(): void {
    this.cache.clear();
    this.isGenerating.clear();
  }

  // Получить кешированные типы
  getCachedTypes(): Record<MBTITypeCode, MBTITypeDescription> {
    const cached: Partial<Record<MBTITypeCode, MBTITypeDescription>> = {};
    this.cache.forEach((description, typeCode) => {
      cached[typeCode] = description;
    });
    return cached as Record<MBTITypeCode, MBTITypeDescription>;
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

export default MBTITypesService;

